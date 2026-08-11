import { useEffect, useState } from 'react'
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

const emptyForm = {
  kode_barang: '',
  nama_peminjam: '',
  departement: '',
  tanggal_pinjam: new Date().toISOString().slice(0, 10),
  tanggal_kembali: '',
}

export default function Peminjaman() {
  const [list, setList] = useState([])
  const [barangList, setBarangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returning, setReturning] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [peminjamanRes, barangRes] = await Promise.all([
        api.get('/peminjaman'),
        api.get('/barang'),
      ])
      setList(peminjamanRes.data.peminjaman)
      setBarangList(barangRes.data.barang)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data peminjaman')
    } finally {
      setLoading(false)
    }
  }

  async function fetchList() {
    try {
      const [peminjamanRes, barangRes] = await Promise.all([
        api.get('/peminjaman'),
        api.get('/barang'),
      ])
      setList(peminjamanRes.data.peminjaman)
      setBarangList(barangRes.data.barang)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data peminjaman')
    }
  }

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
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
        setSuccess('Peminjaman berhasil diperbarui')
      } else {
        await api.post('/peminjaman', {
          kode_barang: form.kode_barang,
          nama_peminjam: form.nama_peminjam,
          departement: form.departement,
          tanggal_pinjam: form.tanggal_pinjam,
        })
        setSuccess('Peminjaman berhasil ditambahkan')
      }
      setModalOpen(false)
      await fetchList()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data peminjaman')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReturn() {
    if (!returnTarget) return
    setError('')
    setSuccess('')
    setReturning(true)

    const today = new Date().toISOString().slice(0, 10)
    try {
      await api.put(`/peminjaman/${returnTarget.id}`, {
        kode_barang: returnTarget.kode_barang,
        nama_peminjam: returnTarget.nama_peminjam,
        departement: returnTarget.departement,
        tanggal_pinjam: returnTarget.tanggal_pinjam.slice(0, 10),
        tanggal_kembali: today,
        status: 'kembali',
      })
      setReturnTarget(null)
      setSuccess('Barang berhasil dikembalikan')
      await fetchList()
    } catch (err) {
      setReturnTarget(null)
      setError(err.response?.data?.message || 'Gagal mengembalikan barang')
    } finally {
      setReturning(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError('')
    setDeleting(true)

    try {
      await api.delete(`/peminjaman/${deleteTarget.id}`)
      setDeleteTarget(null)
      setSuccess('Peminjaman berhasil dihapus')
      await fetchList()
    } catch (err) {
      setDeleteTarget(null)
      setError(err.response?.data?.message || 'Gagal menghapus peminjaman')
    } finally {
      setDeleting(false)
    }
  }

  const barangOptions = editing
    ? barangList
    : barangList.filter((b) => b.status !== 'dipinjam')

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/' }, { label: 'Peminjaman' }]} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Data Peminjaman</h2>
          {isAdmin() && (
            <button
              onClick={openAdd}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition"
            >
              + Tambah Peminjaman
            </button>
          )}
        </div>

        <div className="mb-4 space-y-3">
          <Alert type="success" message={success} />
          <Alert type="error" message={error} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Memuat data...</p>
          ) : list.length === 0 ? (
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
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-3 font-mono text-slate-500">{p.kode_barang}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{p.nama_barang}</td>
                      <td className="px-6 py-3 text-slate-600">{p.nama_peminjam}</td>
                      <td className="px-6 py-3 text-slate-600">{p.departement || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{p.tanggal_pinjam}</td>
                      <td className="px-6 py-3 text-slate-600">{p.tanggal_kembali || '-'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {p.status === 'pinjam' ? 'Pinjam' : 'Dikembalikan'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {isAdmin() ? (
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
        title="Hapus Peminjaman"
        message={`Yakin ingin menghapus peminjaman "${deleteTarget?.kode_barang
          } - ${deleteTarget?.nama_peminjam}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={!!returnTarget}
        title="Kembalikan Barang"
        message={`Konfirmasi pengembalian barang "${returnTarget?.kode_barang} - ${returnTarget?.nama_barang
          }"? Status barang akan otomatis menjadi aktif.`}
        onConfirm={handleReturn}
        onCancel={() => setReturnTarget(null)}
        loading={returning}
        confirmLabel="Kembalikan"
      />
    </Layout>
  )
}