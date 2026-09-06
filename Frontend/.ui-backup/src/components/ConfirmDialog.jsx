import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel = 'Hapus',
  tone = 'rose',
}) {
  if (!open) return null
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-rose-600 hover:bg-rose-700'
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg px-4 py-2 transition"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`text-sm disabled:opacity-50 text-white rounded-lg px-4 py-2 transition ${toneClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}