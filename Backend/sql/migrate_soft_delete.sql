-- Migrasi soft delete untuk tabel assets
-- Jalankan di database PostgreSQL yang sudah ada

-- 1. Kolom penanda data terhapus (NULL = aktif, ada nilai = terhapus/soft deleted)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Serial number unik hanya untuk barang yang TIDAK terhapus
--    (agar serial barang di trash bisa dipakai ulang oleh barang baru)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_serial_number_key') THEN
    ALTER TABLE assets DROP CONSTRAINT assets_serial_number_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS assets_serial_number_live_idx
  ON assets (serial_number)
  WHERE deleted_at IS NULL AND serial_number IS NOT NULL;
