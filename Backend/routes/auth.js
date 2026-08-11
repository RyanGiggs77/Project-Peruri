const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['admin', 'user'];

router.post('/register', async (req, res) => {
  const { name, password, role = 'user' } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name dan password wajib diisi' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Role harus "admin" atau "user"' });
  }

  try {
    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    const existing = await db.query('SELECT id FROM users WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Name sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, password, role_id) VALUES ($1, $2, $3) RETURNING id, name, created_at',
      [name, hashedPassword, roleRes.rows[0].id]
    );

    const user = { ...result.rows[0], role };
    const token = signToken(user);

    res.status(201).json({ message: 'Registrasi berhasil', user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/login', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name dan password wajib diisi' });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.password, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.name = $1`,
      [name]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Name atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Name atau password salah' });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;

    res.json({ message: 'Login berhasil', user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, r.name AS role, u.created_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;