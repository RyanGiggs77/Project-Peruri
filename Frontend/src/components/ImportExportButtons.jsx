import { useRef } from 'react'
import api from '../api/axios'
import { isAdmin } from '../auth'

export default function ImportExportButtons({
  base,
  filename,
  onImported,
  onSuccess,
  onError,
}) {
  const fileRef = useRef(null)

  async function handleExport() {
    try {
      const res = await api.get(`${base}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      onError?.(err.response?.data?.message || 'Gagal export data')
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await api.post(`${base}/import`, fd)
      const { imported, errors } = res.data
      let message = `Berhasil import ${imported} data`
      if (errors && errors.length > 0) {
        message += `, ${errors.length} gagal (${errors.slice(0, 5).join('; ')})`
      }
      onSuccess?.(message)
      onImported?.()
    } catch (err) {
      onError?.(err.response?.data?.message || 'Gagal import data')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 transition"
      >
        Export Excel
      </button>
      {isAdmin() && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 transition"
          >
            Import Excel
          </button>
        </>
      )}
    </div>
  )
}
