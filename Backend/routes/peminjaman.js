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

const VALID_STATUS = ['pinjam', 'kembali'];

function excelDateToISO(value) {
  // ExcelJS membaca tanggal sebagai objek { result: 'YYYY-MM-DD...' } saat date1904 off
  if (value && typeof value === 'object' && value.result) {
    return String(value.result).slice(0, 10);
  }
  // Angka serial date Excel
  if (typeof value === 'number' && value > 0) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

router.use(authenticateToken);

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.kode_barang, b.nama_barang, p.nama_peminjam, p.departement,
              p.tanggal_pinjam, p.tanggal_kembali, p.status
       FROM asset_loans p
       JOIN assets b ON b.kode_barang = p.kode_barang
       ORDER BY p.tanggal_pinjam DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Peminjaman');
    sheet.columns = [
      { header: 'Kode Barang', key: 'kode_barang', width: 15 },
      { header: 'Nama Barang', key: 'nama_barang', width: 30 },
      { header: 'Nama Peminjam', key: 'nama_peminjam', width: 25 },
      { header: 'Departement', key: 'departement', width: 25 },
      { header: 'Tanggal Pinjam', key: 'tanggal_pinjam', width: 16 },
      { header: 'Tanggal Kembali', key: 'tanggal_kembali', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    result.rows.forEach((r) =>
      sheet.addRow({
        ...r,
        tanggal_pinjam: r.tanggal_pinjam ? String(r.tanggal_pinjam).slice(0, 10) : '',
        tanggal_kembali: r.tanggal_kembali ? String(r.tanggal_kembali).slice(0, 10) : '',
      })
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="data-peminjaman-${new Date().toISOString().slice(0, 10)}.xlsx"`
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
      const expected = [
        'kode barang',
        'nama barang',
        'nama peminjam',
        'departement',
        'tanggal pinjam',
        'tanggal kembali',
        'status',
      ];
      const missing = expected.filter((h, i) => headers[i] !== h);
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Kolom tidak sesuai. Header harus: ${expected.join(', ')}`,
        });
      }

      const rowsToInsert = [];
      const errors = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const kode_barang = String(row.getCell(1).value ?? '').trim();
        const nama_peminjam = String(row.getCell(3).value ?? '').trim();
        const departement = String(row.getCell(4).value ?? '').trim();
        const tanggalPinjamRaw = row.getCell(5).value;
        const tanggalKembaliRaw = row.getCell(6).value;
        const status = String(row.getCell(7).value ?? '').trim().toLowerCase();
        if (tanggalKembaliRaw === null || tanggalKembaliRaw === undefined || tanggalKembaliRaw === '') {
          // boleh kosong
        }
        const tanggal_pinjam = excelDateToISO(tanggalPinjamRaw);
        const tanggal_kembali = excelDateToISO(tanggalKembaliRaw);

        if (kode_barang === '' && nama_peminjam === '') return;

        if (!kode_barang || !nama_peminjam || !departement || !tanggal_pinjam || !status) {
          errors.push({ baris: rowNumber, pesan: 'Kode barang, nama peminjam, departement, tanggal pinjam, dan status wajib diisi' });
          return;
        }
        if (!VALID_STATUS.includes(status)) {
          errors.push({ baris: rowNumber, pesan: 'Status harus "pinjam" atau "kembali"' });
          return;
        }
        if (status === 'kembali' && !tanggal_kembali) {
          errors.push({ baris: rowNumber, pesan: 'Tanggal kembali wajib diisi saat status "kembali"' });
          return;
        }

        rowsToInsert.push({ baris: rowNumber, kode_barang, nama_peminjam, departement, tanggal_pinjam, tanggal_kembali, status });
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
      const insertedRows = [];

      for (const r of rowsToInsert) {
        const barang = await client.query(
          'SELECT status, deleted_at FROM assets WHERE kode_barang = $1 FOR UPDATE',
          [r.kode_barang]
        );
        if (barang.rows.length === 0 || barang.rows[0].deleted_at) {
          errors.push({ baris: r.baris, pesan: `Barang "${r.kode_barang}" tidak ditemukan` });
          continue;
        }

        const activeLoan = await client.query(
          "SELECT id FROM asset_loans WHERE kode_barang = $1 AND status = 'pinjam'",
          [r.kode_barang]
        );
        if (r.status === 'pinjam' && activeLoan.rows.length > 0) {
          errors.push({ baris: r.baris, pesan: `Barang "${r.kode_barang}" sedang dipinjam` });
          continue;
        }

        await client.query(
          `INSERT INTO asset_loans (kode_barang, nama_peminjam, departement, tanggal_pinjam, tanggal_kembali, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [r.kode_barang, r.nama_peminjam, r.departement, r.tanggal_pinjam, r.tanggal_kembali, r.status]
        );

        // Sinkronkan status barang
        if (r.status === 'pinjam') {
          await client.query("UPDATE assets SET status = 'dipinjam' WHERE kode_barang = $1", [
            r.kode_barang,
          ]);
        } else if (activeLoan.rows.length > 0) {
          await client.query("UPDATE assets SET status = 'aktif' WHERE kode_barang = $1", [
            r.kode_barang,
          ]);
        }

        insertedRows.push(r.baris);
      }

      await client.query('COMMIT');

      res.json({
        message: `Import selesai: ${insertedRows.length} peminjaman berhasil ditambahkan${errors.length > 0 ? `, ${errors.length} baris gagal` : ''}`,
        inserted: insertedRows.length,
        failed: errors.length,
        errors,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
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
      `SELECT p.id, p.kode_barang, b.nama_barang, p.nama_peminjam, p.departement,
              p.tanggal_pinjam, p.tanggal_kembali, p.status, p.created_at
       FROM asset_loans p
       JOIN assets b ON b.kode_barang = p.kode_barang
       ORDER BY p.tanggal_pinjam DESC`
    );
    res.json({ peminjaman: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { kode_barang, nama_peminjam, departement, tanggal_pinjam } = req.body;

  if (!kode_barang || !nama_peminjam || !departement || !tanggal_pinjam) {
    return res.status(400).json({
      message: 'Barang, nama peminjam, departement, dan tanggal pinjam wajib diisi',
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const barang = await client.query(
      'SELECT status, deleted_at FROM assets WHERE kode_barang = $1',
      [kode_barang]
    );
    if (barang.rows.length === 0 || barang.rows[0].deleted_at) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }
    if (barang.rows[0].status === 'dipinjam') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Barang sedang dipinjam' });
    }

    const result = await client.query(
      `INSERT INTO asset_loans (kode_barang, nama_peminjam, departement, tanggal_pinjam, status)
       VALUES ($1, $2, $3, $4, 'pinjam')
       RETURNING *`,
      [kode_barang, nama_peminjam, departement, tanggal_pinjam]
    );

    await client.query("UPDATE assets SET status = 'dipinjam' WHERE kode_barang = $1", [
      kode_barang,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ peminjaman: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Barang tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  } finally {
    client.release();
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const {
    kode_barang,
    nama_peminjam,
    departement,
    tanggal_pinjam,
    tanggal_kembali,
    status,
  } = req.body;

  if (!kode_barang || !nama_peminjam || !departement || !tanggal_pinjam || !status) {
    return res.status(400).json({
      message: 'Barang, nama peminjam, departement, tanggal pinjam, dan status wajib diisi',
    });
  }

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ message: 'Status harus "pinjam" atau "kembali"' });
  }

  if (status === 'kembali' && !tanggal_kembali) {
    return res.status(400).json({ message: 'Tanggal kembali wajib diisi saat barang dikembalikan' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cur = await client.query(
      'SELECT kode_barang, status FROM asset_loans WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Peminjaman tidak ditemukan' });
    }
    const old = cur.rows[0];

    const barang = await client.query(
      'SELECT status, deleted_at FROM assets WHERE kode_barang = $1',
      [kode_barang]
    );
    if (barang.rows.length === 0 || barang.rows[0].deleted_at) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    if (status === 'kembali') {
      await client.query("UPDATE assets SET status = 'aktif' WHERE kode_barang = $1", [
        kode_barang,
      ]);
      if (old.kode_barang !== kode_barang && old.status === 'pinjam') {
        await client.query("UPDATE assets SET status = 'aktif' WHERE kode_barang = $1", [
          old.kode_barang,
        ]);
      }
    } else {
      const isNewBorrower = old.status === 'kembali' || old.kode_barang !== kode_barang;
      if (isNewBorrower) {
        const active = await client.query(
          "SELECT id FROM asset_loans WHERE kode_barang = $1 AND status = 'pinjam' AND id <> $2",
          [kode_barang, req.params.id]
        );
        if (active.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'Barang sedang dipinjam' });
        }
        await client.query("UPDATE assets SET status = 'dipinjam' WHERE kode_barang = $1", [
          kode_barang,
        ]);
        if (old.kode_barang !== kode_barang && old.status === 'pinjam') {
          await client.query("UPDATE assets SET status = 'aktif' WHERE kode_barang = $1", [
            old.kode_barang,
          ]);
        }
      }
    }

    const result = await client.query(
      `UPDATE asset_loans
       SET kode_barang = $1, nama_peminjam = $2, departement = $3,
           tanggal_pinjam = $4, tanggal_kembali = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [kode_barang, nama_peminjam, departement, tanggal_pinjam, tanggal_kembali || null, status, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ peminjaman: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Barang tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  } finally {
    client.release();
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cur = await client.query(
      'SELECT kode_barang, status FROM asset_loans WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Peminjaman tidak ditemukan' });
    }
    const record = cur.rows[0];

    await client.query('DELETE FROM asset_loans WHERE id = $1', [req.params.id]);

    if (record.status === 'pinjam') {
      await client.query("UPDATE assets SET status = 'aktif' WHERE kode_barang = $1", [
        record.kode_barang,
      ]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Peminjaman berhasil dihapus' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  } finally {
    client.release();
  }
});

module.exports = router;