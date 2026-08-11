import { useEffect, useState } from 'react'
import api from '../api/axios'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import Breadcrumb from '../components/Breadcrumb'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportExportButtons from '../components/ImportExportButtons'
import { Input } from '../components/form'
import { isAdmin } from '../auth'

const emptyForm = { nama_lokasi: '', department: '' }

export default function Lokasi() {
  const [lokasiList, setLokasiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchLokasi()
  }, [])

  async function fetchLokasi() {
    try {
      const res = await api.get('/lokasi')
      setLokasiList(res.data.lokasi)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data lokasi')
    } finally {
      setLoading(false)
    }
  }

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (editing) {
        await api.put(`/lokasi/${encodeURIComponent(editing.nama_lokasi)}`, form)
        setSuccess('Lokasi berhasil diperbarui')
      } else {
        await api.post('/lokasi', form)
        setSuccess('Lokasi berhasil ditambahkan')
      }
      setModalOpen(false)
      await fetchLokasi()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data lokasi')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.delete(`/lokasi/${encodeURIComponent(deleteTarget.nama_lokasi)}`)
      setDeleteTarget(null)
      setSuccess('Lokasi berhasil dihapus')
      await fetchLokasi()
    } catch (err) {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus lokasi')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Lokasi' }]} />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Master Lokasi</h2>
          <div className="flex items-center gap-2">
            <ImportExportButtons
              base="/lokasi"
              filename="lokasi"
              onImported={fetchLokasi}
              onSuccess={(m) => setSuccess(m)}
              onError={(m) => setError(m)}
            />
            {isAdmin() && (
              <button
                onClick={openAdd}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
              >
                + Tambah Lokasi
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <Alert type="success" message={success} />
          <Alert type="error" message={error} />
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
                  <th className="px-6 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lokasiList.map((l) => (
                  <tr key={l.nama_lokasi}>
                    <td className="px-6 py-3 font-medium text-slate-800">{l.nama_lokasi}</td>
                    <td className="px-6 py-3 text-slate-600">{l.department || '-'}</td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {isAdmin() ? (
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
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
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
        title="Hapus Lokasi"
        message={`Yakin ingin menghapus lokasi "${deleteTarget?.nama_lokasi}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Layout>
  )
}