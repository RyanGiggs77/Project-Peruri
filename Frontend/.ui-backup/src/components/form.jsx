const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function Input({ label, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}
      <input {...props} className={inputClass} />
    </div>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}
      <textarea {...props} className={inputClass} />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}
      <select {...props} className={inputClass}>
        {children}
      </select>
    </div>
  )
}