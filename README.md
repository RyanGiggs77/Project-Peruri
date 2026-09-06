# Aplikasi Inventaris Barang & Peminjaman

Aplikasi manajemen inventaris barang yang dilengkapi sistem login (JWT), manajemen merk, lokasi, barang, dan peminjaman, termasuk dashboard statistik, import/export Excel, dan soft-delete (trash).

Terdiri dari:

- **Backend** — Express + PostgreSQL, siap dijalankan lokal maupun sebagai serverless function di Vercel.
- **Frontend** — React (Vite) + Tailwind CSS, dengan TanStack Query untuk caching data.

---

## Teknologi

| Bagian | Teknologi |
|--------|-----------|
| Backend | Node.js, Express.js, PostgreSQL (`pg`), `jsonwebtoken`, `bcrypt`, `helmet`, `express-rate-limit`, `multer` (upload), `exceljs` (import/export Excel) |
| Frontend | React, Vite, Tailwind CSS v4, TanStack Query, `axios`, `react-router-dom`, `recharts` |
| Deployment | Vercel (frontend + backend serverless), Neon (Postgres cloud) |

---

## Struktur Project

```
Project-Peruri/
|-- Backend/
|   |-- api/index.js        # entry point serverless Vercel
|   |-- routes/             # auth, merk, lokasi, barang, peminjaman, dashboard
|   |-- middleware/         # JWT auth & role (authenticateToken, authorizeRole)
|   |-- sql/
|   |   |-- schema.sql              # struktur database (lengkap untuk instalasi baru)
|   |   +-- migrate_*.sql           # migrasi untuk database yang sudah ada
|   |-- db.js               # koneksi PostgreSQL (mendukung SSL untuk cloud)
|   |-- index.js            # app Express (lokal: npm start; Vercel: via api/index.js)
|   +-- vercel.json         # konfigurasi deploy backend (region + rewrite)
|-- Frontend/
|   |-- src/
|   |   |-- pages/          # Login, Register, Dashboard, Merk, Lokasi, Barang, Peminjaman
|   |   |-- components/     # Layout, Modal, Card, Breadcrumb, ConfirmDialog, dll
|   |   |-- api/axios.js    # axios instance + interceptor token
|   |   +-- auth.js         # simpan/baca sesi (localStorage)
|   +-- vercel.json         # rewrite SPA (semua route ke index.html)
+-- README.md
```

---

## Menjalankan secara Lokal

### 1. Prasyarat
- Node.js 18+
- PostgreSQL lokal

### 2. Siapkan Database
1. Buat database baru, contoh: `peruri`.
2. Jalankan `Backend/sql/schema.sql` di database tersebut (psql / pgAdmin / SQL editor). File ini membuat semua tabel: `roles`, `users`, `brands`, `locations`, `assets`, `asset_loans`, termasuk seed role (`admin`, `user`), index, dan trigger `kode_barang`.

> `migrate_indexes.sql` dan `migrate_soft_delete.sql` hanya perlu untuk database yang dibuat dari schema lama. Instalasi baru cukup `schema.sql`.

### 3. Konfigurasi Backend
Buat file `Backend/.env`:

```env
PORT=5000

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=peruri

JWT_SECRET=ganti_dengan_secret_panjang_acak
JWT_EXPIRES_IN=1d
```

> `JWT_SECRET` sebaiknya di-generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
>
> Variabel `PGSSL=require` **tidak diperlukan** saat lokal; itu khusus database cloud yang mewajibkan SSL (lihat bagian Deployment).

Install & jalankan:

```bash
cd Backend
npm install
npm run dev     # http://localhost:5000
```

### 4. Konfigurasi Frontend

```bash
cd Frontend
npm install
npm run dev     # http://localhost:5173
```

Frontend otomatis mengarah ke `http://localhost:5000/api`. Jika backend berjalan di alamat lain, buat file `Frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Akun & Hak Akses

Registrasi (via halaman **Register** atau `POST /api/auth/register`) **selalu menghasilkan akun `user`** — role tidak dapat dipilih saat registrasi.

### Membuat akun admin
Admin dibuat manual lewat database (bukan lewat register):

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE name = 'nama_user_kamu';
```

> User harus sudah terdaftar terlebih dahulu. Ganti passwordnya setelahnya bila perlu.

### Hak akses

| Kemampuan | Admin | User |
|---|---|---|
| Melihat semua halaman & data | ✅ | ✅ |
| Export Excel (barang, peminjaman, merk, lokasi) | ✅ | ✅ |
| Tambah / edit / hapus data | ✅ | ❌ |
| Import Excel | ✅ | ❌ |
| Akses trash & hapus permanen barang | ✅ | ❌ |

Keamanan terkait:
- Login dibatasi **10 percobaan / 15 menit**, registrasi **5 percobaan / jam** per IP.
- Semua endpoint (kecuali login/register) memerlukan token JWT.

---

## Import & Export Excel

- **Export** — tersedia untuk semua user, di halaman Merk, Lokasi, Barang, dan Peminjaman. Mengunduh seluruh data sebagai `.xlsx`.
- **Import** — khusus admin. Baris pertama file harus berupa header kolom, contoh untuk barang:

| Kode Barang | Nama Barang | Merk | Tipe | Serial Number | Tahun Pembelian | Status | Lokasi | Pengguna | Keterangan |
|-------------|-------------|------|------|---------------|-----------------|--------|--------|----------|------------|
|             | Laptop Asus | Asus | X510UA | 123456789 | 2024 | aktif | Gudang IT | Budi | Unit baru |

> Kolom **Kode Barang** diisi otomatis oleh sistem (bisa dikosongkan saat import). Barang yang gagal diimport (data tidak valid, merk/lokasi belum terdaftar, serial number duplikat) dilaporkan per baris beserta alasannya.

---

## Deployment (Vercel + Neon)

### 1. Database — Neon
1. Buat project di [neon.tech](https://neon.tech), pilih region terdekat (mis. Singapore).
2. Jalankan `Backend/sql/schema.sql` + kedua file migrasi (bila relevan) di **SQL Editor** Neon.
3. Catat kredensial koneksi. Untuk backend **gunakan host versi pooled** (hostname berakhiran `-pooler`).

### 2. Backend — Vercel
- Import repo GitHub, set **Root Directory = `Backend`**, framework `Other`, build command kosong.
- Environment variables:

| Variabel | Contoh / Keterangan |
|---|---|
| `PGHOST` | `ep-xxx-pooler.ap-southeast-1.aws.neon.tech` (pooled!) |
| `PGPORT` | `5432` |
| `PGUSER` / `PGPASSWORD` / `PGDATABASE` | dari Neon |
| `PGSSL` | `require` (wajib untuk Neon) |
| `JWT_SECRET` | secret baru yang panjang & acak — jangan pakai yang lokal |
| `JWT_EXPIRES_IN` | `1d` |
| `CORS_ORIGIN` | URL frontend produksi, mis. `https://nama-app.vercel.app` |

- Routing serverless ditangani `Backend/api/index.js` + `Backend/vercel.json` (rewrite semua path + region `sin1`).

### 3. Frontend — Vercel
- Import repo yang sama, set **Root Directory = `Frontend`** (framework Vite terdeteksi otomatis).
- Environment variables:

| Variabel | Nilai |
|---|---|
| `VITE_API_URL` | `https://backend-kamu.vercel.app/api` (tanpa `/` di akhir) |

> `VITE_API_URL` di-*bake* saat build — set sebelum deploy pertama, dan redeploy jika berubah.

### 4. Setelah deploy
- Buka URL backend → harus muncul `{"message":"API Backend berjalan"}`.
- Registrasi akun lewat aplikasi, lalu jadikan admin via SQL Editor Neon (perintah di atas).
- Jangan pernah commit file `.env` — semua secret dikelola lewat dashboard Vercel.

---

## Struktur Database

```
roles
  id (PK), name (unique)                     -- seed: admin, user

users
  id (PK), name (unique), password (hash bcrypt),
  role_id (FK -> roles.id), created_at

brands                                       -- master merk
  nama_merk (PK), keterangan

locations                                    -- master lokasi
  nama_lokasi (PK), department

assets                                       -- barang
  kode_barang (PK, otomatis IT-000001, IT-000002, ...)
  nama_barang, tipe, serial_number, tahun_pembelian,
  merk (FK -> brands), lokasi (FK -> locations),
  status ('aktif' | 'dipinjam' | 'maintenence' | 'rusak' | 'dihapus'),
  pengguna, tanggal_input, keterangan,
  deleted_at                                 -- NULL = aktif; terisi = ada di trash

asset_loans                                  -- peminjaman
  id (PK), kode_barang (FK -> assets),
  nama_peminjam, departement, tanggal_pinjam, tanggal_kembali,
  status ('pinjam' | 'kembali'), created_at
```

**Aturan otomatis:**
- `kode_barang` dibuat trigger dari sequence (`asset_kode_seq`), berformat `IT-000001`, dst.
- Serial number unik **hanya untuk barang yang tidak sedang di-trash** (`deleted_at IS NULL`) — serial barang terhapus bisa dipakai ulang.
- Saat barang dipinjam → status barang otomatis `dipinjam`; saat dikembalikan → otomatis `aktif`.
- Menghapus barang = soft delete (pindah ke trash); penghapusan permanen hanya dari menu Trash oleh admin.
