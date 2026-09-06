const express = require('express');
const ExcelJS = require('exceljs');
const multer = require('multer');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.xlsx$/i)) {
      cb(null, true);
    } else {
      cb(new Error('File harus berformat .xlsx'));
    }
  },
});

router.use(authenticateToken);

router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT nama_merk, keterangan FROM brands ORDER BY nama_merk'
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Merk');
    sheet.columns = [
      { header: 'Nama Merk', key: 'nama_merk', width: 25 },
      { header: 'Keterangan', key: 'keterangan', width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };
    result.rows.forEach((r) => sheet.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="data-merk-${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post(
  '/import',
  authenticateToken,
  authorizeRole('admin'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'File Excel wajib diunggah' });
    }

    const client = await db.pool.connect();
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];

      if (!sheet || sheet.rowCount < 2) {
        return res
          .status(400)
          .json({ message: 'File Excel kosong atau tidak memiliki data' });
      }

      const headerRow = sheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell) => {
        headers.push(String(cell.value || '').trim().toLowerCase());
      });
      if (headers[0] !== 'nama merk' || headers[1] !== 'keterangan') {
        return res.status(400).json({
          message: 'Header harus: "Nama Merk" dan "Keterangan"',
        });
      }

      const merkRes = await db.query('SELECT nama_merk FROM brands');
      const validSet = new Set(merkRes.rows.map((r) => r.nama_merk));

      const rowsToInsert = [];
      const errors = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const nama = String(row.getCell(1).value ?? '').trim();
        const keterangan = String(row.getCell(2).value ?? '').trim();
        if (nama === '' && keterangan === '') return;

        if (nama === '' || keterangan === '') {
          errors.push({ baris: rowNumber, pesan: 'Nama merk dan keterangan wajib diisi' });
          return;
        }

        if (validSet.has(nama)) {
          errors.push({ baris: rowNumber, pesan: `Merk "${nama}" sudah terdaftar` });
          return;
        }

        validSet.add(nama);
        rowsToInsert.push([nama, keterangan]);
      });

      if (rowsToInsert.length === 0) {
        return res.status(400).json({
          message: 'Tidak ada baris valid untuk diimport',
          inserted: 0,
          failed: errors.length,
          errors,
        });
      }

      await client.query('BEGIN');
      try {
        for (const [nama, keterangan] of rowsToInsert) {
          await client.query(
            'INSERT INTO brands (nama_merk, keterangan) VALUES ($1, $2)',
            [nama, keterangan]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      const inserted = rowsToInsert.length;
      res.json({
        message: `Import selesai: ${inserted} merk berhasil ditambahkan${errors.length > 0 ? `, ${errors.length} baris gagal` : ''}`,
        inserted,
        failed: errors.length,
        errors,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    } finally {
      client.release();
    }
  }
);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT nama_merk, keterangan FROM brands ORDER BY nama_merk'
    );
    res.json({ merk: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { nama_merk, keterangan } = req.body;

  if (!nama_merk || !keterangan) {
    return res.status(400).json({ message: 'Nama merk dan keterangan wajib diisi' });
  }

  try {
    const result = await db.query(
      'INSERT INTO brands (nama_merk, keterangan) VALUES ($1, $2) RETURNING nama_merk, keterangan',
      [nama_merk, keterangan]
    );
    res.status(201).json({ merk: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Merk sudah terdaftar' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.put('/:nama', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { nama_merk, keterangan } = req.body;
  const oldNama = req.params.nama;

  if (!nama_merk || !keterangan) {
    return res.status(400).json({ message: 'Nama merk dan keterangan wajib diisi' });
  }

  try {
    const result = await db.query(
      'UPDATE brands SET nama_merk = $1, keterangan = $2 WHERE nama_merk = $3 RETURNING nama_merk, keterangan',
      [nama_merk, keterangan, oldNama]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Merk tidak ditemukan' });
    }

    res.json({ merk: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Merk sudah terdaftar' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.delete('/:nama', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM brands WHERE nama_merk = $1 RETURNING nama_merk',
      [req.params.nama]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Merk tidak ditemukan' });
    }

    res.json({ message: 'Merk berhasil dihapus' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Merk sedang dipakai oleh barang' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;