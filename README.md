# Aplikasi Inventaris Barang & Peminjaman

Aplikasi manajemen inventaris barang yang dilengkapi sistem login (JWT), manajemen merk, lokasi, barang, dan peminjaman. Terdiri dari **Backend** (Express + PostgreSQL) dan **Frontend** (React + Vite + Tailwind CSS).

---

## Teknologi yang Digunakan

| Bagian | Teknologi |
|--------|-----------|
| Backend | Node.js, Express.js, PostgreSQL (`pg`), JSON Web Token (`jsonwebtoken`), `bcrypt`, `dotenv`, `cors`, `multer` (upload file), `exceljs` (import/export Excel) |
| Frontend | React, Vite, Tailwind CSS v4, `axios`, `react-router-dom`, `recharts` |

---

## Instalasi Aplikasi

### 1. Prasyarat
- Node.js (versi 18+)
- PostgreSQL
- npm

### 2. Siapkan Database
1. Buat database baru di PostgreSQL, contoh: `inventaris`.
2. Jalankan file `Backend/sql/schema.sql` di database tersebut (pgAdmin / psql). File ini otomatis membuat tabel: `roles`, `users`, `brands`, `locations`, `assets`, `asset_loans` beserta data awal role (`admin`, `user`).

### 3. Konfigurasi Backend
1. Masuk ke folder `Backend`.
2. Salin `.env` dan sesuaikan isinya dengan kredensial PostgreSQL kamu:

```
PORT=5000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=inventaris
JWT_SECRET=ganti_dengan_secret_panjang_acak
JWT_EXPIRES_IN=1d
```

3. Install dependensi:

```bash
cd Backend
npm install
```

### 4. Konfigurasi Frontend
Install dependensi:

```bash
cd Frontend
npm install
```

---

## Menjalankan Aplikasi

Jalankan dua terminal:

```bash
# Terminal 1 - Backend
cd Backend
npm run dev
```

```bash
# Terminal 2 - Frontend
cd Frontend
npm run dev
```

- Backend berjalan di: `http://localhost:5000`
- Frontend berjalan di: `http://localhost:5173` (buka di browser)

---

## Akun Login

Tidak ada user yang di-seed otomatis selain role. Buat akun terlebih dahulu lewat endpoint register.

**1. Buat akun admin** (boleh akses semua termasuk tambah/edit/hapus):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"admin\", \"password\": \"admin123\", \"role\": \"admin\"}"
```

**2. Buat akun user** (hanya bisa melihat data):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"user\", \"password\": \"user123\"}"
```

Atau daftar langsung lewat halaman **Register** di aplikasi (role otomatis `user`).

### Perbedaan Hak Akses
- **Admin** : bisa melihat, menambah, mengubah, dan menghapus data (merk, lokasi, barang, peminjaman) serta import/export Excel.
- **User** : hanya bisa melihat/membaca data, semua tombol aksi disembunyikan.

---

## Import & Export Excel

Halaman **Merk**, **Lokasi**, dan **Barang** dilengkapi fitur import dan export data ke file Excel (`.xlsx`):

- **Export Excel** : mengunduh seluruh data menjadi file `merk.xlsx`, `lokasi.xlsx`, atau `barang.xlsx`.
- **Import Excel** : mengunggah file `.xlsx` untuk menambahkan data secara massal (khusus admin). Baris pertama file harus berupa header kolom, contoh untuk barang:

| Kode Barang | Nama Barang | Merk | Tipe | Serial Number | Tahun Pembelian | Status | Lokasi | Pengguna | Keterangan |
|-------------|-------------|------|------|---------------|-----------------|--------|--------|----------|------------|
|             | Laptop Asus | Asus | X510UA | 123456789 | 2024 | aktif | Gudang IT | Budi | Unit baru |

> Catatan: kolom **Kode Barang** diisi otomatis oleh sistem, bisa dikosongkan pada file import. Barang yang gagal diimport (data tidak valid, merk/lokasi belum terdaftar, atau serial number duplikat) akan dilaporkan beserta alasan per baris.

---

## Struktur Database

```
roles
  id (PK), name (unique)

users
  id (PK), name (unique), password (hash), role_id (FK -> roles.id), created_at

brands                          -- master merk
  nama_merk (PK), keterangan

locations                       -- master lokasi
  nama_lokasi (PK), department

assets                          -- barang
  kode_barang (PK, otomatis IT-000001...)
  nama_barang, tipe, serial_number (unique), tahun_pembelian,
  merk (FK -> brands.nama_merk), lokasi (FK -> locations.nama_lokasi),
  status ('aktif','dipinjam','maintenence','rusak','dihapus'),
  pengguna, tanggal_input (otomatis), keterangan

asset_loans                     -- peminjaman
  id (PK), kode_barang (FK -> assets.kode_barang),
  nama_peminjam, departement, tanggal_pinjam, tanggal_kembali,
  status ('pinjam','kembali'), created_at
```

**Aturan otomatis:**
- `kode_barang` dibuat otomatis berformat `IT-000001`, `IT-000002`, dst. (sequence + trigger).
- Saat barang dipinjam → status barang otomatis menjadi `dipinjam`.
- Saat barang dikembalikan → status barang otomatis menjadi `aktif`.

---

## Struktur Folder

```
Project/
├── Backend/
│   ├── routes/          # auth, merk, lokasi, barang, peminjaman
│   ├── middleware/      # JWT auth & role
│   ├── sql/schema.sql   # struktur database
│   ├── db.js            # koneksi PostgreSQL
│   ├── index.js         # entry point Express
│   └── .env             # konfigurasi
└── Frontend/
    └── src/
        ├── pages/       # Login, Register, Dashboard, Merk, Lokasi, Barang, Peminjaman
        ├── components/  # Layout, Modal, Card, Breadcrumb, dll
        ├── api/axios.js # axios instance + interceptor token
        └── data/        # data hardcode dashboard
```
