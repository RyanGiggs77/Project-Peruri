const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

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