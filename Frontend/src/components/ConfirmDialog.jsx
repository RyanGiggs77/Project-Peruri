import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel = 'Hapus',
}) {
  if (!open) return null
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
          className="text-sm bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}