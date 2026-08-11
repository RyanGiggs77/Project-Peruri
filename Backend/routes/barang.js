const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

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