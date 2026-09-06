import { Link } from 'react-router-dom'

export default function Breadcrumb({ items }) {
  return (
    <nav className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">/</span>}
              {item.to && !isLast ? (
                <Link to={item.to} className="text-blue-600 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={`font-medium ${isLast ? 'text-slate-800' : ''}`}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}