export default function Modal({ title, maxWidth = 'max-w-md', onClose, children }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 animate-fade-in" />

      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} p-6 animate-modal-in max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}
