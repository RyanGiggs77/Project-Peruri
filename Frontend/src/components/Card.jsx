export default function Card({ className = '', children }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/60 ${className}`}
    >
      {children}
    </div>
  )
}
