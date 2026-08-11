export default function Card({ className = '', children }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${className}`}>
      {children}
    </div>
  )
}