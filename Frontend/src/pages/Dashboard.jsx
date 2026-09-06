import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import api from '../api/axios'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'

const STATUS_COLORS = {
  aktif: '#10b981',
  dipinjam: '#f59e0b',
  maintenence: '#8b5cf6',
  rusak: '#f43f5e',
  dihapus: '#64748b',
}

const STATUS_LABELS = {
  aktif: 'Aktif',
  dipinjam: 'Dipinjam',
  maintenence: 'Maintenance',
  rusak: 'Rusak',
  dihapus: 'Dihapus',
}

export default function Dashboard() {
  const { data, isPending: loading, error: queryError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  })

  const error = queryError
    ? queryError.response?.data?.message || 'Gagal memuat statistik'
    : ''

  const statCards = data
    ? [
        {
          label: 'Total Barang',
          value: data.stats.barang_total,
          color: 'bg-blue-500',
          icon: '📦',
        },
        {
          label: 'Barang Aktif',
          value: data.stats.barang_aktif,
          color: 'bg-emerald-500',
          icon: '✅',
        },
        {
          label: 'Barang Dipinjam',
          value: data.stats.barang_dipinjam,
          color: 'bg-amber-500',
          icon: '📤',
        },
        {
          label: 'Barang Rusak',
          value: data.stats.barang_rusak,
          color: 'bg-rose-500',
          icon: '⚠️',
        },
        {
          label: 'Barang Maintenance',
          value: data.stats.barang_maintenance,
          color: 'bg-violet-500',
          icon: '🔧',
        },
        {
          label: 'Barang Dihapus',
          value: data.stats.barang_dihapus,
          color: 'bg-slate-500',
          icon: '🗑',
        },
      ]
    : []

  const statusData = (data?.perStatus ?? []).map((s) => ({
    name: STATUS_LABELS[s.name] || s.name,
    value: s.value,
    color: STATUS_COLORS[s.name] || '#94a3b8',
  }))

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />

        {error && (
          <div className="rounded-lg bg-rose-100 text-rose-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Ringkasan Barang</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat statistik...</p>
          ) : !error && (
            <div className="grid grid-cols-6 gap-4">
              {statCards.map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} color={s.color} icon={s.icon} />
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-800 mb-4">Jumlah Total Barang per Merk</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.perMerk ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-800 mb-4">Jumlah Barang Berdasarkan Status</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-slate-800 mb-4">Jumlah Barang Berdasarkan Lokasi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.perLokasi ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#10b981" name="Total" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>
      </div>
    </Layout>
  )
}
