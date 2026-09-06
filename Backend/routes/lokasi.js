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
      'SELECT nama_lokasi, department FROM locations ORDER BY nama_lokasi'
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lokasi');
    sheet.columns = [
      { header: 'Nama Lokasi', key: 'nama_lokasi', width: 30 },
      { header: 'Department', key: 'department', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    result.rows.forEach((r) => sheet.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="data-lokasi-${new Date().toISOString().slice(0, 10)}.xlsx"`
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
      if (headers[0] !== 'nama lokasi' || headers[1] !== 'department') {
        return res.status(400).json({
          message: 'Header harus: "Nama Lokasi" dan "Department"',
        });
      }

      const lokasiRes = await db.query('SELECT nama_lokasi FROM locations');
      const validSet = new Set(lokasiRes.rows.map((r) => r.nama_lokasi));

      const rowsToInsert = [];
      const errors = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const nama = String(row.getCell(1).value ?? '').trim();
        const department = String(row.getCell(2).value ?? '').trim();
        if (nama === '' && department === '') return;

        if (nama === '' || department === '') {
          errors.push({ baris: rowNumber, pesan: 'Nama lokasi dan department wajib diisi' });
          return;
        }

        if (validSet.has(nama)) {
          errors.push({ baris: rowNumber, pesan: `Lokasi "${nama}" sudah terdaftar` });
          return;
        }

        validSet.add(nama);
        rowsToInsert.push([nama, department]);
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
        for (const [nama, department] of rowsToInsert) {
          await client.query(
            'INSERT INTO locations (nama_lokasi, department) VALUES ($1, $2)',
            [nama, department]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      const inserted = rowsToInsert.length;
      res.json({
        message: `Import selesai: ${inserted} lokasi berhasil ditambahkan${errors.length > 0 ? `, ${errors.length} baris gagal` : ''}`,
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
      'SELECT nama_lokasi, department FROM locations ORDER BY nama_lokasi'
    );
    res.json({ lokasi: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { nama_lokasi, department } = req.body;

  if (!nama_lokasi || !department) {
    return res.status(400).json({ message: 'Nama lokasi dan department wajib diisi' });
  }

  try {
    const result = await db.query(
      'INSERT INTO locations (nama_lokasi, department) VALUES ($1, $2) RETURNING nama_lokasi, department',
      [nama_lokasi, department]
    );
    res.status(201).json({ lokasi: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Lokasi sudah terdaftar' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.put('/:nama', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { nama_lokasi, department } = req.body;
  const oldNama = req.params.nama;

  if (!nama_lokasi || !department) {
    return res.status(400).json({ message: 'Nama lokasi dan department wajib diisi' });
  }

  try {
    const result = await db.query(
      'UPDATE locations SET nama_lokasi = $1, department = $2 WHERE nama_lokasi = $3 RETURNING nama_lokasi, department',
      [nama_lokasi, department, oldNama]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
    }

    res.json({ lokasi: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Lokasi sudah terdaftar' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.delete('/:nama', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM locations WHERE nama_lokasi = $1 RETURNING nama_lokasi',
      [req.params.nama]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
    }

    res.json({ message: 'Lokasi berhasil dihapus' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Lokasi sedang dipakai oleh barang' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;