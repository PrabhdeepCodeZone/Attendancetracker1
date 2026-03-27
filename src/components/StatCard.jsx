export default function StatCard({ title, value, icon: Icon, color = 'indigo', subtitle }) {
    const colorMap = {
        indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-100' },
        green: { bg: 'bg-green-50', icon: 'bg-green-600', text: 'text-green-600', border: 'border-green-100' },
        red: { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-600', border: 'border-red-100' },
        yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-100' },
        teal: { bg: 'bg-teal-50', icon: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-100' },
        purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-100' },
        blue: { bg: 'bg-blue-50', icon: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-100' },
    }

    const c = colorMap[color] || colorMap.indigo

    return (
        <div className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
            <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center shadow-sm flex-shrink-0`}>
                {Icon && <Icon size={22} className="text-white" />}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
                <p className={`text-2xl font-bold ${c.text} leading-tight mt-0.5`}>{value ?? '—'}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
            </div>
        </div>
    )
}
