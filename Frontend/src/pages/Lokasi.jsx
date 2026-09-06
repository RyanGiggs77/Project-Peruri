import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import Breadcrumb from '../components/Breadcrumb'
import ConfirmDialog from '../components/ConfirmDialog'
import { Input } from '../components/form'
import { isAdmin } from '../auth'

const emptyForm = { nama_lokasi: '', department: '' }

export default function Lokasi() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const {
    data: lokasiList = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['lokasi'],
    queryFn: async () => {
      const res = await api.get('/lokasi')
      return res.data.lokasi
    },
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing) {
        await api.put(`/lokasi/${encodeURIComponent(editing.nama_lokasi)}`, payload)
      } else {
        await api.post('/lokasi', payload)
      }
    },
    onSuccess: () => {
      setModalOpen(false)
      setSuccess(editing ? 'Lokasi berhasil diperbarui' : 'Lokasi berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['lokasi'] })
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal menyimpan data lokasi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (namaLokasi) =>
      api.delete(`/lokasi/${encodeURIComponent(namaLokasi)}`),
    onSuccess: () => {
      setDeleteTarget(null)
      setSuccess('Lokasi berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['lokasi'] })
    },
    onError: (err) => {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus lokasi')
    },
  })

  const importMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/lokasi/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      setSuccess(res.data.message)
      setImportResult(res.data.errors?.length ? res.data.errors : null)
      queryClient.invalidateQueries({ queryKey: ['lokasi'] })
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal mengimpor file')
    },
  })

  const loadError = queryError
    ? queryError.response?.data?.message || 'Gagal memuat data lokasi'
    : ''

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(l) {
    setEditing(l)
    setForm({ nama_lokasi: l.nama_lokasi, department: l.department || '' })
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
    saveMutation.mutate(form)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setError('')
    deleteMutation.mutate(deleteTarget.nama_lokasi)
  }

  async function handleExport() {
    setError('')
    setExporting(true)
    try {
      const res = await api.get('/lokasi/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `data-lokasi-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setSuccess('Data lokasi berhasil diekspor')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengekspor data lokasi')
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
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Lokasi' }]} />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Master Lokasi</h2>
          {isAdmin() && (
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
                + Tambah Lokasi
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Memuat data...</p>
          ) : lokasiList.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Belum ada data lokasi.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Nama Lokasi</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  {isAdmin() && <th className="px-6 py-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lokasiList.map((l) => (
                  <tr key={l.nama_lokasi}>
                    <td className="px-6 py-3 font-medium text-slate-800">{l.nama_lokasi}</td>
                    <td className="px-6 py-3 text-slate-600">{l.department || '-'}</td>
                    {isAdmin() && (
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <>
                          <button
                            onClick={() => openEdit(l)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(l)}
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
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Lokasi' : 'Tambah Lokasi'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lokasi"
              type="text"
              name="nama_lokasi"
              value={form.nama_lokasi}
              onChange={handleChange}
              required
              placeholder="Contoh: Ruang Server"
            />

            <Input
              label="Department *"
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Contoh: IT"
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
        title="Hapus Lokasi"
        message={`Yakin ingin menghapus lokasi "${deleteTarget?.nama_lokasi}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </Layout>
  )
}