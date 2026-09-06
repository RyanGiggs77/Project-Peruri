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

const EXPORT_COLUMNS = [
  { header: 'Nama Barang', key: 'nama_barang', width: 30 },
  { header: 'Merk', key: 'merk', width: 18 },
  { header: 'Tipe', key: 'tipe', width: 20 },
  { header: 'Serial Number', key: 'serial_number', width: 18 },
  { header: 'Tahun Pembelian', key: 'tahun_pembelian', width: 18 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Lokasi', key: 'lokasi', width: 25 },
  { header: 'Pengguna', key: 'pengguna', width: 20 },
  { header: 'Keterangan', key: 'keterangan', width: 30 },
];

const HEADER_MAP = {
  'nama barang': 'nama_barang',
  merk: 'merk',
  tipe: 'tipe',
  'serial number': 'serial_number',
  'tahun pembelian': 'tahun_pembelian',
  status: 'status',
  lokasi: 'lokasi',
  pengguna: 'pengguna',
  keterangan: 'keterangan',
};

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

function buildFilterQuery(query, deletedCondition) {
  const where = [deletedCondition];
  const params = [];

  if (query.search) {
    params.push(`%${query.search}%`);
    where.push(`nama_barang ILIKE $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    where.push(`status = $${params.length}`);
  }
  if (query.merk) {
    params.push(query.merk);
    where.push(`merk = $${params.length}`);
  }
  if (query.lokasi) {
    params.push(query.lokasi);
    where.push(`lokasi = $${params.length}`);
  }

  let orderSql = 'ORDER BY tanggal_input DESC';
  if (query.sort === 'asc') {
    orderSql = 'ORDER BY tahun_pembelian ASC NULLS LAST';
  } else if (query.sort === 'desc') {
    orderSql = 'ORDER BY tahun_pembelian DESC NULLS LAST';
  }

  return { whereSql: where.join(' AND '), params, orderSql };
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const { whereSql, params, orderSql } = buildFilterQuery(req.query, 'deleted_at IS NULL');

    const totalRes = await db.query(
      `SELECT COUNT(*) AS total FROM assets WHERE ${whereSql}`,
      params
    );

    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT kode_barang, nama_barang, merk, tipe, serial_number,
              tahun_pembelian, status, lokasi, pengguna, tanggal_input, keterangan
       FROM assets
       WHERE ${whereSql}
       ${orderSql}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      barang: result.rows,
      total: Number(totalRes.rows[0].total),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.get('/trash', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const { whereSql, params, orderSql } = buildFilterQuery(req.query, 'deleted_at IS NOT NULL');

    const totalRes = await db.query(
      `SELECT COUNT(*) AS total FROM assets WHERE ${whereSql}`,
      params
    );

    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT kode_barang, nama_barang, merk, tipe, serial_number,
              tahun_pembelian, status, lokasi, pengguna, tanggal_input,
              keterangan, deleted_at
       FROM assets
       WHERE ${whereSql}
       ${orderSql}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      barang: result.rows,
      total: Number(totalRes.rows[0].total),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT nama_barang, merk, tipe, serial_number, tahun_pembelian,
              status, lokasi, pengguna, keterangan
       FROM assets
       WHERE deleted_at IS NULL
       ORDER BY tanggal_input DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Barang');
    sheet.columns = EXPORT_COLUMNS;
    sheet.getRow(1).font = { bold: true };

    result.rows.forEach((r) => {
      sheet.addRow({
        ...r,
        serial_number: r.serial_number ?? '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="data-barang-${new Date().toISOString().slice(0, 10)}.xlsx"`
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

      // Baca header, petakan ke nama field
      const headerRow = sheet.getRow(1);
      const colFields = {};
      headerRow.eachCell((cell, colNumber) => {
        const key = String(cell.value || '').trim().toLowerCase();
        if (HEADER_MAP[key]) colFields[colNumber] = HEADER_MAP[key];
      });

      const required = Object.values(HEADER_MAP);
      const missing = required.filter((f) => !Object.values(colFields).includes(f));
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Kolom tidak lengkap. Wajib ada: ${missing.join(', ')}`,
        });
      }

      // Ambil data valid untuk merk & lokasi
      const merkRes = await db.query('SELECT nama_merk FROM brands');
      const lokasiRes = await db.query('SELECT nama_lokasi FROM locations');
      const validMerk = new Set(merkRes.rows.map((r) => r.nama_merk));
      const validLokasi = new Set(lokasiRes.rows.map((r) => r.nama_lokasi));

      const rows = [];
      const errors = [];
      const serialsInFile = new Set();

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const obj = {};
        let empty = true;
        for (const [colNumber, field] of Object.entries(colFields)) {
          const value = row.getCell(Number(colNumber)).value;
          const text =
            value === null || value === undefined
              ? ''
              : typeof value === 'object' && value.result !== undefined
                ? String(value.result)
                : String(value);
          obj[field] = text.trim();
          if (text.trim() !== '') empty = false;
        }
        if (empty) return;

        if (obj.serial_number !== '') obj.serial_number = Number(obj.serial_number);
        if (obj.tahun_pembelian !== '') obj.tahun_pembelian = Number(obj.tahun_pembelian);

        if (!validMerk.has(obj.merk)) {
          errors.push({ baris: rowNumber, pesan: `Merk "${obj.merk}" tidak terdaftar` });
          return;
        }
        if (!validLokasi.has(obj.lokasi)) {
          errors.push({ baris: rowNumber, pesan: `Lokasi "${obj.lokasi}" tidak terdaftar` });
          return;
        }
        const validation = validateBarang(obj);
        if (validation) {
          errors.push({ baris: rowNumber, pesan: validation });
          return;
        }
        if (serialsInFile.has(obj.serial_number)) {
          errors.push({ baris: rowNumber, pesan: 'Serial number duplikat di dalam file' });
          return;
        }
        serialsInFile.add(obj.serial_number);
        rows.push({ ...obj, baris: rowNumber });
      });

      if (rows.length > 0) {
        const serials = rows.map((r) => r.serial_number);
        const dupRes = await db.query(
          `SELECT serial_number FROM assets
           WHERE serial_number = ANY($1) AND deleted_at IS NULL`,
          [serials]
        );
        const existing = new Set(dupRes.rows.map((r) => r.serial_number));

        await client.query('BEGIN');
        const insertedRows = [];
        for (const r of rows) {
          if (existing.has(r.serial_number)) {
            errors.push({ baris: r.baris, pesan: `Serial number ${r.serial_number} sudah dipakai` });
            continue;
          }
          try {
            const ins = await client.query(
              `INSERT INTO assets (nama_barang, merk, tipe, serial_number, tahun_pembelian, status, lokasi, pengguna, keterangan)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING kode_barang`,
              [
                r.nama_barang,
                r.merk,
                r.tipe,
                r.serial_number,
                r.tahun_pembelian,
                r.status,
                r.lokasi,
                r.pengguna,
                r.keterangan,
              ]
            );
            insertedRows.push(ins.rows[0].kode_barang);
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          }
        }
        await client.query('COMMIT');

        return res.json({
          message: `Import selesai: ${insertedRows.length} barang berhasil ditambahkan${errors.length > 0 ? `, ${errors.length} baris gagal` : ''}`,
          inserted: insertedRows.length,
          failed: errors.length,
          errors,
        });
      }

      res.status(400).json({
        message: 'Tidak ada baris valid untuk diimport',
        inserted: 0,
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

router.get('/:kode', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM assets WHERE kode_barang = $1 AND deleted_at IS NULL',
      [req.params.kode]
    );

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
       WHERE kode_barang = $10 AND deleted_at IS NULL
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
      `UPDATE assets
       SET deleted_at = NOW(), status = 'dihapus'
       WHERE kode_barang = $1 AND deleted_at IS NULL
       RETURNING kode_barang`,
      [req.params.kode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Barang tidak ditemukan' });
    }

    res.json({ message: 'Barang berhasil dihapus (masuk trash)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post(
  '/:kode/restore',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const cur = await client.query(
        'SELECT kode_barang, status FROM assets WHERE kode_barang = $1 AND deleted_at IS NOT NULL FOR UPDATE',
        [req.params.kode]
      );
      if (cur.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Barang tidak ditemukan di trash' });
      }

      const activeLoan = await client.query(
        "SELECT id FROM asset_loans WHERE kode_barang = $1 AND status = 'pinjam'",
        [req.params.kode]
      );

      let newStatus = cur.rows[0].status;
      if (activeLoan.rows.length > 0) {
        newStatus = 'dipinjam';
      } else if (newStatus === 'dihapus') {
        newStatus = 'aktif';
      }

      const result = await client.query(
        'UPDATE assets SET deleted_at = NULL, status = $1 WHERE kode_barang = $2 RETURNING kode_barang, status',
        [newStatus, req.params.kode]
      );

      await client.query('COMMIT');
      res.json({ message: 'Barang berhasil dipulihkan', barang: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    } finally {
      client.release();
    }
  }
);

router.delete(
  '/:kode/permanent',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const cur = await client.query(
        'SELECT kode_barang FROM assets WHERE kode_barang = $1 AND deleted_at IS NOT NULL FOR UPDATE',
        [req.params.kode]
      );
      if (cur.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Barang tidak ditemukan di trash (hanya barang terhapus yang bisa dihapus permanen)' });
      }

      await client.query('DELETE FROM asset_loans WHERE kode_barang = $1', [
        req.params.kode,
      ]);
      await client.query('DELETE FROM assets WHERE kode_barang = $1', [
        req.params.kode,
      ]);

      await client.query('COMMIT');
      res.json({ message: 'Barang berhasil dihapus permanen' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;