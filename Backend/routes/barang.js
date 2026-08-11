const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { cellText, sendWorkbook } = require('../utils/excel');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const VALID_STATUS = ['aktif', 'dipinjam', 'maintenence', 'rusak', 'dihapus'];
const CURRENT_YEAR = new Date().getFullYear();

router.use(authenticateToken);

function validateBarang(body) {
  const {
    nama_barang,
    merk,
    tipe,
    serial_number,
    tahun_pembelian,
    status,
    lokasi,
    pengguna,
    keterangan,
  } = body;

  if (
    !nama_barang ||
    !merk ||
    !tipe ||
    serial_number === undefined ||
    serial_number === null ||
    serial_number === '' ||
    tahun_pembelian === undefined ||
    tahun_pembelian === null ||
    tahun_pembelian === '' ||
    !status ||
    !lokasi ||
    !pengguna ||
    !keterangan
  ) {
    return 'Semua field wajib diisi';
  }

  if (nama_barang.trim().length < 3) {
    return 'Nama barang minimal 3 karakter';
  }

  if (!Number.isInteger(Number(serial_number))) {
    return 'Serial number wajib berupa bilangan bulat';
  }

  const tahun = Number(tahun_pembelian);
  if (!Number.isInteger(tahun)) {
    return 'Tahun pembelian wajib berupa angka';
  }
  if (tahun > CURRENT_YEAR) {
    return 'Tahun pembelian tidak boleh melebihi tahun sekarang';
  }

  if (!VALID_STATUS.includes(status)) {
    return 'Status harus salah satu dari: aktif, dipinjam, maintenence, rusak, dihapus';
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.kode_barang, b.nama_barang, b.merk, b.tipe, b.serial_number,
              b.tahun_pembelian, b.status, b.lokasi, b.pengguna, b.tanggal_input, b.keterangan
       FROM assets b
       ORDER BY b.tanggal_input DESC`
    );
    res.json({ barang: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT kode_barang, nama_barang, merk, tipe, serial_number, tahun_pembelian,
              status, lokasi, pengguna, keterangan
       FROM assets ORDER BY tanggal_input DESC`
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Barang');
    sheet.columns = [
      { header: 'Kode Barang', key: 'kode_barang', width: 16 },
      { header: 'Nama Barang', key: 'nama_barang', width: 24 },
      { header: 'Merk', key: 'merk', width: 16 },
      { header: 'Tipe', key: 'tipe', width: 16 },
      { header: 'Serial Number', key: 'serial_number', width: 16 },
      { header: 'Tahun Pembelian', key: 'tahun_pembelian', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Lokasi', key: 'lokasi', width: 18 },
      { header: 'Pengguna', key: 'pengguna', width: 16 },
      { header: 'Keterangan', key: 'keterangan', width: 24 },
    ];
    result.rows.forEach((row) => sheet.addRow(row));
    await sendWorkbook(res, workbook, 'barang.xlsx');
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

    const [brandsResult, locationsResult] = await Promise.all([
      db.query('SELECT nama_merk FROM brands'),
      db.query('SELECT nama_lokasi FROM locations'),
    ]);
    const brandsSet = new Set(brandsResult.rows.map((r) => r.nama_merk));
    const locationsSet = new Set(locationsResult.rows.map((r) => r.nama_lokasi));

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item = {
        nama_barang: cellText(row.getCell(1).value),
        merk: cellText(row.getCell(2).value),
        tipe: cellText(row.getCell(3).value),
        serial_number: cellText(row.getCell(4).value),
        tahun_pembelian: cellText(row.getCell(5).value),
        status: cellText(row.getCell(6).value),
        lokasi: cellText(row.getCell(7).value),
        pengguna: cellText(row.getCell(8).value),
        keterangan: cellText(row.getCell(9).value),
      };
      if (!item.nama_barang && !item.merk && !item.tipe && !item.serial_number && !item.status && !item.lokasi) {
        return;
      }
      rows.push({ rowNumber, ...item });
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang bisa diimport' });
    }

    let imported = 0;
    const errors = [];

    for (const item of rows) {
      const error = validateBarang(item);
      if (error) {
        errors.push(`Baris ${item.rowNumber}: ${error}`);
        continue;
      }
      if (!brandsSet.has(item.merk)) {
        errors.push(`Baris ${item.rowNumber}: Merk "${item.merk}" tidak terdaftar`);
        continue;
      }
      if (!locationsSet.has(item.lokasi)) {
        errors.push(`Baris ${item.rowNumber}: Lokasi "${item.lokasi}" tidak terdaftar`);
        continue;
      }

      try {
        await db.query(
          `INSERT INTO assets (nama_barang, merk, tipe, serial_number, tahun_pembelian, status, lokasi, pengguna, keterangan)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.nama_barang,
            item.merk,
            item.tipe,
            Number(item.serial_number),
            Number(item.tahun_pembelian),
            item.status,
            item.lokasi,
            item.pengguna,
            item.keterangan,
          ]
        );
        imported++;
      } catch (err) {
        if (err.code === '23505') {
          errors.push(`Baris ${item.rowNumber}: Serial number ${item.serial_number} sudah dipakai`);
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

router.get('/:kode', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM assets WHERE kode_barang = $1', [
      req.params.kode,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    res.json({ barang: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const validation = validateBarang(req.body);
  if (validation) {
    return res.status(400).json({ message: validation });
  }

  const {
    nama_barang,
    merk,
    tipe,
    serial_number,
    tahun_pembelian,
    status,
    lokasi,
    pengguna,
    keterangan,
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO assets (nama_barang, merk, tipe, serial_number, tahun_pembelian, status, lokasi, pengguna, keterangan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING kode_barang, nama_barang, merk, tipe, serial_number, tahun_pembelian, status, lokasi, pengguna, tanggal_input, keterangan`,
      [
        nama_barang,
        merk,
        tipe,
        Number(serial_number),
        Number(tahun_pembelian),
        status,
        lokasi,
        pengguna,
        keterangan,
      ]
    );
    res.status(201).json({ barang: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Serial number sudah dipakai' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Merk atau lokasi tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.put('/:kode', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const validation = validateBarang(req.body);
  if (validation) {
    return res.status(400).json({ message: validation });
  }

  const {
    nama_barang,
    merk,
    tipe,
    serial_number,
    tahun_pembelian,
    status,
    lokasi,
    pengguna,
    keterangan,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE assets
       SET nama_barang = $1,
           merk = $2,
           tipe = $3,
           serial_number = $4,
           tahun_pembelian = $5,
           status = $6,
           lokasi = $7,
           pengguna = $8,
           keterangan = $9
       WHERE kode_barang = $10
       RETURNING *`,
      [
        nama_barang,
        merk,
        tipe,
        Number(serial_number),
        Number(tahun_pembelian),
        status,
        lokasi,
        pengguna,
        keterangan,
        req.params.kode,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    res.json({ barang: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Serial number sudah dipakai' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Merk atau lokasi tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.delete('/:kode', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM assets WHERE kode_barang = $1 RETURNING kode_barang',
      [req.params.kode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    res.json({ message: 'Barang berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;