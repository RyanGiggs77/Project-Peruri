-- Jalankan di database PostgreSQL kamu

-- Master Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('admin'), ('user')
ON CONFLICT (name) DO NOTHING;

-- Tabel users (login)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Merk (brands)
CREATE TABLE IF NOT EXISTS brands (
  nama_merk VARCHAR(50) PRIMARY KEY,
  keterangan TEXT
);

-- Master Lokasi (locations)
CREATE TABLE IF NOT EXISTS locations (
  nama_lokasi VARCHAR(100) PRIMARY KEY,
  department VARCHAR(100)
);

-- Barang (assets)
CREATE TABLE IF NOT EXISTS assets (
  kode_barang VARCHAR(20) PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  merk VARCHAR(50) REFERENCES brands(nama_merk) ON UPDATE CASCADE,
  tipe TEXT,
  serial_number INTEGER,
  tahun_pembelian INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif'
    CHECK (status IN ('aktif', 'dipinjam', 'maintenence', 'rusak', 'dihapus')),
  lokasi VARCHAR(100) REFERENCES locations(nama_lokasi) ON UPDATE CASCADE,
  pengguna TEXT,
  tanggal_input TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  keterangan TEXT,
  deleted_at TIMESTAMPTZ
);

-- Serial number unik hanya untuk barang yang tidak terhapus (soft delete)
CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_number_live_idx
  ON assets (serial_number)
  WHERE deleted_at IS NULL AND serial_number IS NOT NULL;

-- Index performa
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets (deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);
CREATE INDEX IF NOT EXISTS idx_assets_tanggal_input ON assets (tanggal_input DESC);
CREATE INDEX IF NOT EXISTS idx_assets_merk ON assets (merk) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_lokasi ON assets (lokasi) WHERE deleted_at IS NULL;

-- Sequence + trigger otomatis untuk kode_barang format IT-000001 (assets)
CREATE SEQUENCE IF NOT EXISTS asset_kode_seq START 1;

CREATE OR REPLACE FUNCTION asset_kode_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.kode_barang := 'IT-' || LPAD(nextval('asset_kode_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_kode_trigger ON assets;
CREATE TRIGGER asset_kode_trigger
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION asset_kode_trigger_fn();

-- Peminjaman (asset_loans)
CREATE TABLE IF NOT EXISTS asset_loans (
  id SERIAL PRIMARY KEY,
  kode_barang VARCHAR(20) NOT NULL REFERENCES assets(kode_barang) ON UPDATE CASCADE,
  nama_peminjam VARCHAR(100) NOT NULL,
  departement VARCHAR(100) NOT NULL,
  tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kembali DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pinjam'
    CHECK (status IN ('pinjam', 'kembali')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_loans_kode_barang ON asset_loans (kode_barang);
CREATE INDEX IF NOT EXISTS idx_asset_loans_status ON asset_loans (status);