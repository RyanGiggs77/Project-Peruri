import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getUser, clearSession } from '../auth'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/merk', label: 'Merk', icon: '🏷️' },
  { to: '/lokasi', label: 'Lokasi', icon: '📍' },
  { to: '/barang', label: 'Barang', icon: '📦' },
  { to: '/peminjaman', label: 'Peminjaman', icon: '🔁' },
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const user = getUser()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // Sidebar terbuka hanya jika state tersimpan true DAN layar desktop;
  // di mobile selalu mulai tertutup (mode overlay).
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth >= 768 &&
      localStorage.getItem('sidebarOpen') !== 'false'
  )

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen))
  }, [sidebarOpen])

  // Tutup overlay sidebar saat pindah halaman di mobile
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [location.pathname, isDesktop])

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/70 z-40">
        <div className="flex items-center justify-between px-4 py-3 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition active:scale-95"
              title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
              aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
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
            <Link to="/" className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              📦 Inventaris
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm rounded-xl px-2 py-1.5 hover:bg-slate-100 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <span className="text-[11px] uppercase tracking-wide bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                      {user.role}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20 animate-pop-in">
                      <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                        <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                        <span className="text-[11px] uppercase bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                          {user.role}
                        </span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition flex items-center gap-2"
                      >
                        <span>⏻</span> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-16 min-h-screen">
        {/* Backdrop overlay: hanya tampil saat sidebar terbuka di mobile */}
        {sidebarOpen && !isDesktop && (
          <div
            className="fixed inset-0 top-16 bg-slate-900/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-16 bottom-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col z-30 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                  }`
                }
              >
                <span className="text-base transition-transform duration-200 group-hover:scale-110">{l.icon}</span>
                <span className="whitespace-nowrap">{l.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 text-center">Sistem Inventaris Barang</p>
          </div>
        </aside>

        <main
          className={`flex-1 min-w-0 px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'md:ml-64' : 'ml-0'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
