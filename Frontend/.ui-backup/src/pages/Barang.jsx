import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import Breadcrumb from '../components/Breadcrumb'
import ConfirmDialog from '../components/ConfirmDialog'
import { Input, Select, Textarea } from '../components/form'
import { isAdmin } from '../auth'

const PAGE_SIZE = 8

const STATUS_OPTIONS = ['aktif', 'dipinjam', 'maintenence', 'rusak', 'dihapus']
const CURRENT_YEAR = new Date().getFullYear()

const STATUS_STYLE = {
  aktif: 'bg-emerald-100 text-emerald-700',
  dipinjam: 'bg-amber-100 text-amber-700',
  maintenence: 'bg-violet-100 text-violet-700',
  rusak: 'bg-rose-100 text-rose-700',
  dihapus: 'bg-slate-200 text-slate-600',
}

const emptyForm = {
  nama_barang: '',
  merk: '',
  tipe: '',
  serial_number: '',
  tahun_pembelian: '',
  status: 'aktif',
  lokasi: '',
  pengguna: '',
  keterangan: '',
}

export default function Barang() {
  const [barangList, setBarangList] = useState([])
  const [merkList, setMerkList] = useState([])
  const [lokasiList, setLokasiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState('aktif')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [permanentTarget, setPermanentTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMerk, setFilterMerk] = useState('')
  const [filterLokasi, setFilterLokasi] = useState('')
  const [sortTahun, setSortTahun] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [barangRes, merkRes, lokasiRes] = await Promise.all([
        api.get('/barang'),
        api.get('/merk'),
        api.get('/lokasi'),
      ])
      setBarangList(barangRes.data.barang)
      setMerkList(merkRes.data.merk)
      setLokasiList(lokasiRes.data.lokasi)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data barang')
    } finally {
      setLoading(false)
    }
  }

  async function fetchBarang() {
    try {
      const res = await api.get(view === 'trash' ? '/barang/trash' : '/barang')
      setBarangList(res.data.barang)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data barang')
    }
  }

  async function switchView(next) {
    setView(next)
    setPage(1)
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await api.get(next === 'trash' ? '/barang/trash' : '/barang')
      setBarangList(res.data.barang)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data barang')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let items = barangList.filter((b) => {
      const matchSearch =
        !search || b.nama_barang.toLowerCase().includes(search.toLowerCase())
      const matchStatus = !filterStatus || b.status === filterStatus
      const matchMerk = !filterMerk || b.merk === filterMerk
      const matchLokasi = !filterLokasi || b.lokasi === filterLokasi
      return matchSearch && matchStatus && matchMerk && matchLokasi
    })

    if (sortTahun === 'asc') {
      items = [...items].sort(
        (a, b) => (a.tahun_pembelian ?? 0) - (b.tahun_pembelian ?? 0)
      )
    } else if (sortTahun === 'desc') {
      items = [...items].sort(
        (a, b) => (b.tahun_pembelian ?? 0) - (a.tahun_pembelian ?? 0)
      )
    }

    return items
  }, [barangList, search, filterStatus, filterMerk, filterLokasi, sortTahun])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetToFirstPage() {
    setPage(1)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(b) {
    setEditing(b)
    setForm({
      nama_barang: b.nama_barang,
      merk: b.merk || '',
      tipe: b.tipe || '',
      serial_number: b.serial_number ?? '',
      tahun_pembelian: b.tahun_pembelian ?? '',
      status: b.status,
      lokasi: b.lokasi || '',
      pengguna: b.pengguna || '',
      keterangan: b.keterangan || '',
    })
    setError('')
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function buildPayload() {
    return {
      ...form,
      serial_number: form.serial_number === '' ? null : Number(form.serial_number),
      tahun_pembelian:
        form.tahun_pembelian === '' ? null : Number(form.tahun_pembelian),
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (form.nama_barang.trim().length < 3) {
      setError('Nama barang minimal 3 karakter')
      setSubmitting(false)
      return
    }

    if (
      form.tahun_pembelian !== '' &&
      Number(form.tahun_pembelian) > CURRENT_YEAR
    ) {
      setError('Tahun pembelian tidak boleh melebihi tahun sekarang')
      setSubmitting(false)
      return
    }

    try {
      const payload = buildPayload()
      if (editing) {
        await api.put(`/barang/${encodeURIComponent(editing.kode_barang)}`, payload)
        setSuccess('Barang berhasil diperbarui')
      } else {
        await api.post('/barang', payload)
        setSuccess('Barang berhasil ditambahkan')
      }
      setModalOpen(false)
      await fetchBarang()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data barang')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.delete(`/barang/${encodeURIComponent(deleteTarget.kode_barang)}`)
      setDeleteTarget(null)
      setSuccess('Barang berhasil dihapus (masuk trash)')
      await fetchBarang()
    } catch (err) {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus barang')
    } finally {
      setDeleting(false)
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.post(`/barang/${encodeURIComponent(restoreTarget.kode_barang)}/restore`)
      setRestoreTarget(null)
      setSuccess('Barang berhasil dipulihkan')
      await fetchBarang()
    } catch (err) {
      setRestoreTarget(null)
      setError(err.response?.data?.message || 'Gagal memulihkan barang')
    } finally {
      setDeleting(false)
    }
  }

  async function handlePermanent() {
    if (!permanentTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.delete(
        `/barang/${encodeURIComponent(permanentTarget.kode_barang)}/permanent`
      )
      setPermanentTarget(null)
      setSuccess('Barang berhasil dihapus permanen')
      await fetchBarang()
    } catch (err) {
      setPermanentTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus barang permanen')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Barang' }]} />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Master Barang</h2>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => view !== 'aktif' && switchView('aktif')}
                className={`text-xs rounded-lg px-3 py-1.5 transition ${
                  view === 'aktif'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Aktif
              </button>
              {isAdmin() && (
                <button
                  onClick={() => view !== 'trash' && switchView('trash')}
                  className={`text-xs rounded-lg px-3 py-1.5 transition ${
                    view === 'trash'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Trash
                </button>
              )}
            </div>
          </div>
          {isAdmin() && view === 'aktif' && (
            <button
              onClick={openAdd}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
            >
              + Tambah Barang
            </button>
          )}
        </div>

        <div className="mb-4 space-y-3">
          <Alert type="success" message={success} />
          <Alert type="error" message={error} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              type="text"
              name="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                resetToFirstPage()
              }}
              placeholder="Cari nama barang..."
            />

            <Select
              name="filterStatus"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                resetToFirstPage()
              }}
            >
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Select
              name="filterMerk"
              value={filterMerk}
              onChange={(e) => {
                setFilterMerk(e.target.value)
                resetToFirstPage()
              }}
            >
              <option value="">Semua Merk</option>
              {merkList.map((m) => (
                <option key={m.nama_merk} value={m.nama_merk}>
                  {m.nama_merk}
                </option>
              ))}
            </Select>

            <Select
              name="filterLokasi"
              value={filterLokasi}
              onChange={(e) => {
                setFilterLokasi(e.target.value)
                resetToFirstPage()
              }}
            >
              <option value="">Semua Lokasi</option>
              {lokasiList.map((l) => (
                <option key={l.nama_lokasi} value={l.nama_lokasi}>
                  {l.nama_lokasi}
                </option>
              ))}
            </Select>

            <Select
              name="sortTahun"
              value={sortTahun}
              onChange={(e) => {
                setSortTahun(e.target.value)
                resetToFirstPage()
              }}
            >
              <option value="">Tanpa Urutan</option>
              <option value="desc">Tahun Terbaru</option>
              <option value="asc">Tahun Terlama</option>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Memuat data...</p>
          ) : pageItems.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Tidak ada data barang yang cocok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Kode</th>
                    <th className="px-6 py-3 font-medium">Nama Barang</th>
                    <th className="px-6 py-3 font-medium">Merk</th>
                    <th className="px-6 py-3 font-medium">Tipe</th>
                    <th className="px-6 py-3 font-medium">Serial</th>
                    <th className="px-6 py-3 font-medium">Tahun</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Lokasi</th>
                    <th className="px-6 py-3 font-medium">Pengguna</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((b) => (
                    <tr key={b.kode_barang}>
                      <td className="px-6 py-3 font-mono text-slate-500">{b.kode_barang}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{b.nama_barang}</td>
                      <td className="px-6 py-3 text-slate-600">{b.merk || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{b.tipe || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{b.serial_number ?? '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{b.tahun_pembelian ?? '-'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            STATUS_STYLE[b.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{b.lokasi || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{b.pengguna || '-'}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {isAdmin() ? (
                          view === 'trash' ? (
                            <>
                              <button
                                onClick={() => setRestoreTarget(b)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => setPermanentTarget(b)}
                                className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 transition"
                              >
                                Hapus Permanen
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(b)}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteTarget(b)}
                                className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 transition"
                              >
                                Hapus
                              </button>
                            </>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Menampilkan {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg px-3 py-1.5 transition"
                >
                  ‹ Prev
                </button>
                <span className="text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg px-3 py-1.5 transition"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Edit Barang (${editing.kode_barang})` : 'Tambah Barang'}
          maxWidth="max-w-2xl"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
                Kode Barang: <span className="font-mono font-medium">{editing.kode_barang}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Barang *"
                type="text"
                name="nama_barang"
                value={form.nama_barang}
                onChange={handleChange}
                required
                minLength="3"
                placeholder="Contoh: Laptop Asus (min. 3 karakter)"
              />

              <Select
                label="Merk *"
                name="merk"
                value={form.merk}
                onChange={handleChange}
                required
              >
                <option value="">-- Pilih Merk --</option>
                {merkList.map((m) => (
                  <option key={m.nama_merk} value={m.nama_merk}>
                    {m.nama_merk}
                  </option>
                ))}
              </Select>

              <Input
                label="Tipe *"
                type="text"
                name="tipe"
                value={form.tipe}
                onChange={handleChange}
                required
                placeholder="Contoh: X510UA"
              />

              <Input
                label="Serial Number *"
                type="number"
                name="serial_number"
                value={form.serial_number}
                onChange={handleChange}
                required
                placeholder="Contoh: 123456789"
              />

              <Input
                label="Tahun Pembelian *"
                type="number"
                name="tahun_pembelian"
                value={form.tahun_pembelian}
                onChange={handleChange}
                required
                max={CURRENT_YEAR}
                placeholder="Contoh: 2024"
              />

              <Select
                label="Status *"
                name="status"
                value={form.status}
                onChange={handleChange}
                required
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>

              <Select
                label="Lokasi *"
                name="lokasi"
                value={form.lokasi}
                onChange={handleChange}
                required
              >
                <option value="">-- Pilih Lokasi --</option>
                {lokasiList.map((l) => (
                  <option key={l.nama_lokasi} value={l.nama_lokasi}>
                    {l.nama_lokasi}
                  </option>
                ))}
              </Select>

              <Input
                label="Pengguna *"
                type="text"
                name="pengguna"
                value={form.pengguna}
                onChange={handleChange}
                required
                placeholder="Nama pengguna barang"
              />
            </div>

            <Textarea
              label="Keterangan *"
              name="keterangan"
              value={form.keterangan}
              onChange={handleChange}
              rows="3"
              placeholder="Keterangan"
              required
            />

            {error && <Alert type="error" message={error} />}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-4 py-2 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Barang"
        message={`Yakin ingin menghapus barang "${deleteTarget?.kode_barang} - ${deleteTarget?.nama_barang}"? Barang akan dipindahkan ke trash dan bisa dipulihkan.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        title="Pulihkan Barang"
        message={`Yakin ingin memulihkan barang "${restoreTarget?.kode_barang} - ${restoreTarget?.nama_barang}" dari trash?`}
        confirmLabel="Restore"
        tone="emerald"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={!!permanentTarget}
        title="Hapus Permanen"
        message={`Yakin ingin menghapus PERMANEN barang "${permanentTarget?.kode_barang} - ${permanentTarget?.nama_barang}"? Tindakan ini tidak bisa dibatalkan!`}
        confirmLabel="Hapus Permanen"
        onConfirm={handlePermanent}
        onCancel={() => setPermanentTarget(null)}
        loading={deleting}
      />
    </Layout>
  )
}