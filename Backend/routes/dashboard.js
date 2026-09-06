const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', async (req, res) => {
  try {
    const totals = await db.query(
      `SELECT
         COUNT(*) AS barang_total,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'aktif') AS barang_aktif,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'dipinjam') AS barang_dipinjam,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'rusak') AS barang_rusak,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'maintenence') AS barang_maintenance,
         COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS barang_dihapus
       FROM assets`
    );

    const perMerk = await db.query(
      `SELECT merk AS name, COUNT(*) AS total
       FROM assets
       WHERE deleted_at IS NULL AND merk IS NOT NULL
       GROUP BY merk
       ORDER BY total DESC`
    );

    const perStatus = await db.query(
      `SELECT status AS name, COUNT(*) AS value
       FROM assets
       GROUP BY status`
    );

    const perLokasi = await db.query(
      `SELECT lokasi AS name, COUNT(*) AS total
       FROM assets
       WHERE deleted_at IS NULL AND lokasi IS NOT NULL
       GROUP BY lokasi
       ORDER BY total DESC`
    );

    const s = totals.rows[0];
    res.json({
      stats: {
        barang_total: Number(s.barang_total),
        barang_aktif: Number(s.barang_aktif),
        barang_dipinjam: Number(s.barang_dipinjam),
        barang_rusak: Number(s.barang_rusak),
        barang_maintenance: Number(s.barang_maintenance),
        barang_dihapus: Number(s.barang_dihapus),
      },
      perMerk: perMerk.rows.map((r) => ({ name: r.name, total: Number(r.total) })),
      perStatus: perStatus.rows.map((r) => ({ name: r.name, value: Number(r.value) })),
      perLokasi: perLokasi.rows.map((r) => ({ name: r.name, total: Number(r.total) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;
