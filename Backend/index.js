require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const merkRoutes = require('./routes/merk');
const lokasiRoutes = require('./routes/lokasi');
const barangRoutes = require('./routes/barang');
const peminjamanRoutes = require('./routes/peminjaman');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API Backend berjalan' });
});

app.use('/api/auth', authRoutes);
app.use('/api/merk', merkRoutes);
app.use('/api/lokasi', lokasiRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/peminjaman', peminjamanRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});