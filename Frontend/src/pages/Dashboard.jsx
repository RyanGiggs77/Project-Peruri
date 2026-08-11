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
import { stats, brandData, statusData, categoryData } from '../data/inventory'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'

export default function Dashboard() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Ringkasan Barang</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} color={s.color} icon={s.icon} />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-800 mb-4">Jumlah Total Barang per Kategori</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
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
            <h3 className="font-semibold text-slate-800 mb-4">Jumlah Barang Berdasarkan Merk</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
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