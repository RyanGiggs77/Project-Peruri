const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUS = ['pinjam', 'kembali'];

router.use(authenticateToken);

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
      'SELECT status FROM assets WHERE kode_barang = $1',
      [kode_barang]
    );
    if (barang.rows.length === 0) {
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

    const barang = await client.query('SELECT status FROM assets WHERE kode_barang = $1', [
      kode_barang,
    ]);
    if (barang.rows.length === 0) {
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