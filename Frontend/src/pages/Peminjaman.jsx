import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import Breadcrumb from '../components/Breadcrumb'
import ConfirmDialog from '../components/ConfirmDialog'
import { Input, Select } from '../components/form'
import { isAdmin } from '../auth'

const STATUS_STYLE = {
  pinjam: 'bg-amber-100 text-amber-700',
  kembali: 'bg-emerald-100 text-emerald-700',
}

function formatDate(value) {
  if (!value) return '-'
  const [y, m, d] = String(value).slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const emptyForm = {
  kode_barang: '',
  nama_peminjam: '',
  departement: '',
  tanggal_pinjam: today(),
  tanggal_kembali: '',
}

export default function Peminjaman() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const {
    data: list = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['peminjaman'],
    queryFn: async () => (await api.get('/peminjaman')).data.peminjaman,
  })

  // Daftar barang untuk dropdown form; cache dibagi dengan halaman Barang
  const { data: barangList = [] } = useQuery({
    queryKey: ['barang', { view: 'aktif', page: 1 }],
    queryFn: async () => {
      const res = await api.get('/barang', { params: { page: 1, limit: 100 } })
      return res.data.barang
    },
    staleTime: 30 * 1000,
  })

  const invalidatePeminjaman = () =>
    queryClient.invalidateQueries({ queryKey: ['peminjaman'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload = {
          kode_barang: form.kode_barang,
          nama_peminjam: form.nama_peminjam,
          departement: form.departement,
          tanggal_pinjam: form.tanggal_pinjam,
          status: editing.status === 'kembali' ? 'kembali' : 'pinjam',
          tanggal_kembali:
            editing.status === 'kembali' ? form.tanggal_kembali : null,
        }
        await api.put(`/peminjaman/${editing.id}`, payload)
      } else {
        await api.post('/peminjaman', {
          kode_barang: form.kode_barang,
          nama_peminjam: form.nama_peminjam,
          departement: form.departement,
          tanggal_pinjam: form.tanggal_pinjam,
        })
      }
    },
    onSuccess: () => {
      setModalOpen(false)
      setSuccess(editing ? 'Peminjaman berhasil diperbarui' : 'Peminjaman berhasil ditambahkan')
      invalidatePeminjaman()
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal menyimpan data peminjaman')
    },
  })

  const returnMutation = useMutation({
    mutationFn: (target) =>
      api.put(`/peminjaman/${target.id}`, {
        kode_barang: target.kode_barang,
        nama_peminjam: target.nama_peminjam,
        departement: target.departement,
        tanggal_pinjam: target.tanggal_pinjam.slice(0, 10),
        tanggal_kembali: today(),
        status: 'kembali',
      }),
    onSuccess: () => {
      setReturnTarget(null)
      setSuccess('Barang berhasil dikembalikan')
      invalidatePeminjaman()
    },
    onError: (err) => {
      setReturnTarget(null)
      setError(err.response?.data?.message || 'Gagal mengembalikan barang')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/peminjaman/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      setSuccess('Peminjaman berhasil dihapus')
      invalidatePeminjaman()
    },
    onError: (err) => {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus peminjaman')
    },
  })

  const importMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/peminjaman/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      setSuccess(res.data.message)
      setImportResult(res.data.errors?.length ? res.data.errors : null)
      invalidatePeminjaman()
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal mengimpor file')
    },
  })

  const loadError = queryError
    ? queryError.response?.data?.message || 'Gagal memuat data peminjaman'
    : ''

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      kode_barang: p.kode_barang,
      nama_peminjam: p.nama_peminjam,
      departement: p.departement,
      tanggal_pinjam: p.tanggal_pinjam.slice(0, 10),
      tanggal_kembali: p.tanggal_kembali ? p.tanggal_kembali.slice(0, 10) : '',
    })
    setError('')
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    saveMutation.mutate()
  }

  function handleReturn() {
    if (!returnTarget) return
    setError('')
    setSuccess('')
    returnMutation.mutate(returnTarget)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setError('')
    deleteMutation.mutate(deleteTarget.id)
  }

  const barangOptions = editing
    ? barangList
    : barangList.filter((b) => b.status !== 'dipinjam')

  async function handleExport() {
    setError('')
    setExporting(true)
    try {
      const res = await api.get('/peminjaman/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `data-peminjaman-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setSuccess('Data peminjaman berhasil diekspor')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengekspor data peminjaman')
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Peminjaman' }]} />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Data Peminjaman</h2>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin() && (
              <>
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
              </>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
            >
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
            {isAdmin() && (
              <button
                onClick={openAdd}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
              >
                + Tambah Peminjaman
              </button>
            )}
          </div>
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Memuat data...</p>
          ) : list.length === 0 && !loadError ? (
            <p className="p-6 text-sm text-slate-500">Belum ada data peminjaman.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Kode Barang</th>
                    <th className="px-6 py-3 font-medium">Nama Barang</th>
                    <th className="px-6 py-3 font-medium">Peminjam</th>
                    <th className="px-6 py-3 font-medium">Departement</th>
                    <th className="px-6 py-3 font-medium">Tgl Pinjam</th>
                    <th className="px-6 py-3 font-medium">Tgl Kembali</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    {isAdmin() && <th className="px-6 py-3 font-medium text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-3 font-mono text-slate-500">{p.kode_barang}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{p.nama_barang}</td>
                      <td className="px-6 py-3 text-slate-600">{p.nama_peminjam}</td>
                      <td className="px-6 py-3 text-slate-600">{p.departement || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{formatDate(p.tanggal_pinjam)}</td>
                      <td className="px-6 py-3 text-slate-600">{formatDate(p.tanggal_kembali)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {p.status === 'pinjam' ? 'Pinjam' : 'Dikembalikan'}
                        </span>
                      </td>
                      {isAdmin() && (
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <>
                            <button
                              onClick={() => openEdit(p)}
                              className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                            >
                              Edit
                            </button>
                            {p.status === 'pinjam' && (
                              <button
                                onClick={() => setReturnTarget(p)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                              >
                                Kembalikan
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 transition"
                            >
                              Hapus
                            </button>
                          </>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Peminjaman' : 'Tambah Peminjaman'}
          maxWidth="max-w-md"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Barang *"
              name="kode_barang"
              value={form.kode_barang}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Barang --</option>
              {barangOptions.map((b) => (
                <option key={b.kode_barang} value={b.kode_barang}>
                  {b.kode_barang} - {b.nama_barang}
                </option>
              ))}
            </Select>

            <Input
              label="Nama Peminjam *"
              type="text"
              name="nama_peminjam"
              value={form.nama_peminjam}
              onChange={handleChange}
              required
              placeholder="Nama peminjam"
            />

            <Input
              label="Departement *"
              type="text"
              name="departement"
              value={form.departement}
              onChange={handleChange}
              required
              placeholder="Contoh: IT"
            />

            <Input
              label="Tanggal Pinjam *"
              type="date"
              name="tanggal_pinjam"
              value={form.tanggal_pinjam}
              onChange={handleChange}
              required
            />

            {editing?.status === 'kembali' && (
              <Input
                label="Tanggal Kembali *"
                type="date"
                name="tanggal_kembali"
                value={form.tanggal_kembali}
                onChange={handleChange}
                required
              />
            )}

            {editing && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
                Status:{' '}
                <span className="font-medium">
                  {editing.status === 'pinjam' ? 'Pinjam' : 'Dikembalikan'}
                </span>
              </div>
            )}

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
        title="Hapus Peminjaman"
        message={`Yakin ingin menghapus peminjaman "${deleteTarget?.kode_barang
          } - ${deleteTarget?.nama_peminjam}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!returnTarget}
        title="Kembalikan Barang"
        message={`Konfirmasi pengembalian barang "${returnTarget?.kode_barang} - ${returnTarget?.nama_barang
          }"? Status barang akan otomatis menjadi aktif.`}
        onConfirm={handleReturn}
        onCancel={() => setReturnTarget(null)}
        loading={returnMutation.isPending}
        confirmLabel="Kembalikan"
      />
    </Layout>
  )
}