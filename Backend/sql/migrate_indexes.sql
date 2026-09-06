-- Migrasi: index untuk mempercepat query yang sering dipakai

-- Tabel assets: filter soft delete + status + sorting + filter dropdown
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets (deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);
CREATE INDEX IF NOT EXISTS idx_assets_tanggal_input ON assets (tanggal_input DESC);
CREATE INDEX IF NOT EXISTS idx_assets_merk ON assets (merk) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_lokasi ON assets (lokasi) WHERE deleted_at IS NULL;

-- Tabel asset_loans: pencarian by kode_barang & status pinjaman aktif
CREATE INDEX IF NOT EXISTS idx_asset_loans_kode_barang ON asset_loans (kode_barang);
CREATE INDEX IF NOT EXISTS idx_asset_loans_status ON asset_loans (status);
