import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Merk from './pages/Merk'
import Lokasi from './pages/Lokasi'
import Barang from './pages/Barang'
import Peminjaman from './pages/Peminjaman'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App