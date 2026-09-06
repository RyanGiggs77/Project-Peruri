export default function StatCard({ label, value, color, icon }) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 cursor-default">
      <div
        className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-3 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
      >
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5 tracking-tight">{value}</p>
    </div>
  )
}
