const styles = {
  error: 'bg-rose-50 border-rose-200 text-rose-600',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-600',
}

export default function Alert({ type = 'error', message }) {
  if (!message) return null
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  )
}