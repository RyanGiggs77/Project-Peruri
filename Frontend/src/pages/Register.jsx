import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { setSession } from '../auth'
import Alert from '../components/Alert'
import { Input } from '../components/form'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/register', form)
      setSession(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registrasi gagal, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/25">
            📦
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Akun Baru</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem Inventaris Barang</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 p-8">
          <div className="mb-4">
            <Alert type="error" message={error} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Masukkan nama"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Masukkan password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-all duration-200 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-[0.98]"
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Masuk sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
