import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, clearSession } from '../auth'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/merk', label: 'Merk', icon: '🏷️' },
  { to: '/lokasi', label: 'Lokasi', icon: '📍' },
  { to: '/barang', label: 'Barang', icon: '📦' },
  { to: '/peminjaman', label: 'Peminjaman', icon: '🔁' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = getUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <h1 className="text-lg font-bold text-slate-800">📦 Inventaris</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <span className="font-semibold text-slate-800">{user.name}</span>
                  <span className="ml-2 text-xs uppercase bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-start">
        {sidebarOpen && (
          <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 sticky top-0 h-screen">
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <span>{l.icon}</span>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
      </div>
    </div>
  )
}