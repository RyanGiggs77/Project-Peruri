import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [view, setView] = useState('aktif')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [permanentTarget, setPermanentTarget] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMerk, setFilterMerk] = useState('')
  const [filterLokasi, setFilterLokasi] = useState('')
  const [sortTahun, setSortTahun] = useState('')
  const [page, setPage] = useState(1)

  // Master data (cache dibagi dengan halaman Merk & Lokasi, staleTime panjang)
  const { data: merkList = [] } = useQuery({
    queryKey: ['merk'],
    queryFn: async () => (await api.get('/merk')).data.merk,
    staleTime: 5 * 60 * 1000,
  })
  const { data: lokasiList = [] } = useQuery({
    queryKey: ['lokasi'],
    queryFn: async () => (await api.get('/lokasi')).data.lokasi,
    staleTime: 5 * 60 * 1000,
  })

  // List barang: queryKey mengikuti semua filter aktif
  const barangQuery = useQuery({
    queryKey: ['barang', { view, search, filterStatus, filterMerk, filterLokasi, sortTahun, page }],
    queryFn: async () => {
      const endpoint = view === 'trash' ? '/barang/trash' : '/barang'
      const params = {}
      if (search) params.search = search
      if (filterStatus) params.status = filterStatus
      if (filterMerk) params.merk = filterMerk
      if (filterLokasi) params.lokasi = filterLokasi
      if (sortTahun) params.sort = sortTahun
      params.page = page
      params.limit = PAGE_SIZE
      const res = await api.get(endpoint, { params })
      return res.data
    },
    placeholderData: keepPreviousData,
  })
  const barangList = barangQuery.data?.barang ?? []
  const total = barangQuery.data?.total ?? 0
  const loading = barangQuery.isPending
  const loadError = barangQuery.error
    ? barangQuery.error.response?.data?.message || 'Gagal memuat data barang'
    : ''

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const invalidateBarang = () => queryClient.invalidateQueries({ queryKey: ['barang'] })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing) {
        await api.put(`/barang/${encodeURIComponent(editing.kode_barang)}`, payload)
      } else {
        await api.post('/barang', payload)
      }
    },
    onSuccess: () => {
      setModalOpen(false)
      setSuccess(editing ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan')
      invalidateBarang()
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal menyimpan data barang')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (kode) => api.delete(`/barang/${encodeURIComponent(kode)}`),
    onSuccess: () => {
      setDeleteTarget(null)
      setSuccess('Barang berhasil dihapus (masuk trash)')
      invalidateBarang()
    },
    onError: (err) => {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus barang')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (kode) => api.post(`/barang/${encodeURIComponent(kode)}/restore`),
    onSuccess: () => {
      setRestoreTarget(null)
      setSuccess('Barang berhasil dipulihkan')
      invalidateBarang()
    },
    onError: (err) => {
      setRestoreTarget(null)
      setError(err.response?.data?.message || 'Gagal memulihkan barang')
    },
  })

  const permanentMutation = useMutation({
    mutationFn: (kode) => api.delete(`/barang/${encodeURIComponent(kode)}/permanent`),
    onSuccess: () => {
      setPermanentTarget(null)
      setSuccess('Barang berhasil dihapus permanen')
      invalidateBarang()
    },
    onError: (err) => {
      setPermanentTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus barang permanen')
    },
  })

  const importMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/barang/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      setSuccess(res.data.message)
      setImportResult(res.data.errors?.length ? res.data.errors : null)
      invalidateBarang()
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal mengimpor file')
    },
  })

  async function switchView(next) {
    setView(next)
    setPage(1)
    setError('')
    setSuccess('')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageItems = barangList

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

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.nama_barang.trim().length < 3) {
      setError('Nama barang minimal 3 karakter')
      return
    }

    if (
      form.tahun_pembelian !== '' &&
      Number(form.tahun_pembelian) > CURRENT_YEAR
    ) {
      setError('Tahun pembelian tidak boleh melebihi tahun sekarang')
      return
    }

    saveMutation.mutate(buildPayload())
  }

  function handleDelete() {
    if (!deleteTarget) return
    setError('')
    deleteMutation.mutate(deleteTarget.kode_barang)
  }

  async function handleExport() {
    setError('')
    setExporting(true)
    try {
      const res = await api.get('/barang/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `data-barang-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setSuccess('Data barang berhasil diekspor')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengekspor data barang')
    } finally {
      setExporting(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    const formData = new FormData()
    formData.append('file', file)
    importMutation.mutate(formData)
    e.target.value = ''
  }

  function handleRestore() {
    if (!restoreTarget) return
    setError('')
    restoreMutation.mutate(restoreTarget.kode_barang)
  }

  function handlePermanent() {
    if (!permanentTarget) return
    setError('')
    permanentMutation.mutate(permanentTarget.kode_barang)
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Barang' }]} />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                className="text-sm bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-lg px-4 py-2 transition"
              >
                {importMutation.isPending ? 'Mengimpor...' : 'Import Excel'}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
              >
                {exporting ? 'Mengekspor...' : 'Export Excel'}
              </button>
              <button
                onClick={openAdd}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
              >
                + Tambah Barang
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 space-y-3">
          <Alert type="success" message={success} />
          <Alert type="error" message={error || loadError} />
          {importResult && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <p className="font-medium mb-1">Baris yang gagal diimport:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {importResult.map((e, i) => (
                  <li key={i}>
                    Baris {e.baris}: {e.pesan}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setImportResult(null)}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              type="text"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
          ) : pageItems.length === 0 && !loadError ? (
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
                    {isAdmin() && <th className="px-6 py-3 font-medium text-right">Aksi</th>}
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
                      {isAdmin() && (
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {view === 'trash' ? (
                            <>
                              <button
                                onClick={() => setRestoreTarget(b)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                                disabled={restoreMutation.isPending}
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => setPermanentTarget(b)}
                                className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 transition"
                                disabled={permanentMutation.isPending}
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
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Menampilkan {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} dari {total} data
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
                disabled={saveMutation.isPending}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
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
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        title="Pulihkan Barang"
        message={`Yakin ingin memulihkan barang "${restoreTarget?.kode_barang} - ${restoreTarget?.nama_barang}" dari trash?`}
        confirmLabel="Restore"
        tone="emerald"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
        loading={restoreMutation.isPending}
      />

      <ConfirmDialog
        open={!!permanentTarget}
        title="Hapus Permanen"
        message={`Yakin ingin menghapus PERMANEN barang "${permanentTarget?.kode_barang} - ${permanentTarget?.nama_barang}"? Tindakan ini tidak bisa dibatalkan!`}
        confirmLabel="Hapus Permanen"
        onConfirm={handlePermanent}
        onCancel={() => setPermanentTarget(null)}
        loading={permanentMutation.isPending}
      />
    </Layout>
  )
}