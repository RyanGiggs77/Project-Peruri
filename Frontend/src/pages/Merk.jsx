import { useEffect, useState } from 'react'
import api from '../api/axios'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import Breadcrumb from '../components/Breadcrumb'
import ConfirmDialog from '../components/ConfirmDialog'
import { Input, Textarea } from '../components/form'
import { isAdmin } from '../auth'

const emptyForm = { nama_merk: '', keterangan: '' }

export default function Merk() {
  const [merkList, setMerkList] = useState([])
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
    fetchMerk()
  }, [])

  async function fetchMerk() {
    try {
      const res = await api.get('/merk')
      setMerkList(res.data.merk)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data merk')
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

  function openEdit(m) {
    setEditing(m)
    setForm({ nama_merk: m.nama_merk, keterangan: m.keterangan || '' })
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
        await api.put(`/merk/${encodeURIComponent(editing.nama_merk)}`, form)
        setSuccess('Merk berhasil diperbarui')
      } else {
        await api.post('/merk', form)
        setSuccess('Merk berhasil ditambahkan')
      }
      setModalOpen(false)
      await fetchMerk()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data merk')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.delete(`/merk/${encodeURIComponent(deleteTarget.nama_merk)}`)
      setDeleteTarget(null)
      setSuccess('Merk berhasil dihapus')
      await fetchMerk()
    } catch (err) {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus merk')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Merk' }]} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Master Merk</h2>
          {isAdmin() && (
            <button
              onClick={openAdd}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
            >
              + Tambah Merk
            </button>
          )}
        </div>

        <div className="mb-4 space-y-3">
          <Alert type="success" message={success} />
          {/* <Alert type="error" message={error} /> */}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Memuat data...</p>
          ) : merkList.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Belum ada data merk.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Nama Merk</th>
                  <th className="px-6 py-3 font-medium">Keterangan</th>
                  <th className="px-6 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {merkList.map((m) => (
                  <tr key={m.nama_merk}>
                    <td className="px-6 py-3 font-medium text-slate-800">{m.nama_merk}</td>
                    <td className="px-6 py-3 text-slate-600">{m.keterangan || '-'}</td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {isAdmin() ? (
                        <>
                          <button
                            onClick={() => openEdit(m)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 mr-2 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
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
        <Modal title={editing ? 'Edit Merk' : 'Tambah Merk'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Merk"
              type="text"
              name="nama_merk"
              value={form.nama_merk}
              onChange={handleChange}
              required
              placeholder="Contoh: Asus"
            />

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
        title="Hapus Merk"
        message={`Yakin ingin menghapus merk "${deleteTarget?.nama_merk}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Layout>
  )
}