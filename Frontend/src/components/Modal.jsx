export default function Modal({ title, maxWidth = 'max-w-md', onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}