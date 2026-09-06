import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Merk = lazy(() => import('./pages/Merk'))
const Lokasi = lazy(() => import('./pages/Lokasi'))
const Barang = lazy(() => import('./pages/Barang'))
const Peminjaman = lazy(() => import('./pages/Peminjaman'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      Memuat halaman...
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/merk"
            element={
              <ProtectedRoute>
                <Merk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lokasi"
            element={
              <ProtectedRoute>
                <Lokasi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/barang"
            element={
              <ProtectedRoute>
                <Barang />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peminjaman"
            element={
              <ProtectedRoute>
                <Peminjaman />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App