const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { cellText, sendWorkbook } = require('../utils/excel');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

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

router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT nama_lokasi, department FROM locations ORDER BY nama_lokasi'
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lokasi');
    sheet.columns = [
      { header: 'Nama Lokasi', key: 'nama_lokasi', width: 20 },
      { header: 'Department', key: 'department', width: 30 },
    ];
    result.rows.forEach((row) => sheet.addRow(row));
    await sendWorkbook(res, workbook, 'lokasi.xlsx');
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/import', authenticateToken, authorizeRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File wajib diupload' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ message: 'File Excel kosong atau tidak valid' });
    }

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nama_lokasi = cellText(row.getCell(1).value);
      const department = cellText(row.getCell(2).value);
      if (!nama_lokasi) return;
      rows.push({ nama_lokasi, department });
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang bisa diimport' });
    }

    let imported = 0;
    const errors = [];

    for (const r of rows) {
      try {
        await db.query(
          'INSERT INTO locations (nama_lokasi, department) VALUES ($1, $2)',
          [r.nama_lokasi, r.department]
        );
        imported++;
      } catch (err) {
        if (err.code === '23505') {
          errors.push(`Lokasi "${r.nama_lokasi}" sudah terdaftar`);
        } else {
          throw err;
        }
      }
    }

    res.json({ imported, errors });
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