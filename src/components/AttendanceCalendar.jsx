import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_STYLES = {
    present: 'bg-green-500 text-white',
    absent: 'bg-red-500 text-white',
    'half-day': 'bg-yellow-400 text-white',
    default: 'bg-slate-100 text-slate-400',
}

export default function AttendanceCalendar({ year, month, attendanceMap = {}, onMonthChange }) {
    // month is 1-indexed
    const firstDay = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month])
    const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month])
    const today = new Date()

    const handlePrev = () => {
        if (month === 1) onMonthChange?.(year - 1, 12)
        else onMonthChange?.(year, month - 1)
    }

    const handleNext = () => {
        if (month === 12) onMonthChange?.(year + 1, 1)
        else onMonthChange?.(year, month + 1)
    }

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <h3 className="text-sm font-semibold text-slate-800">
                    {monthName} {year}
                </h3>
                <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronRight size={18} className="text-slate-600" />
                </button>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {days.map(d => (
                        <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for first day offset */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const status = attendanceMap[dateStr]
                        const styleClass = STATUS_STYLES[status] || STATUS_STYLES.default
                        const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day

                        return (
                            <div
                                key={day}
                                title={status || 'Not marked'}
                                className={`relative aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${styleClass} ${isToday ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 border-t border-slate-100 pt-3">
                    {[
                        { color: 'bg-green-500', label: 'Present' },
                        { color: 'bg-red-500', label: 'Absent' },
                        { color: 'bg-yellow-400', label: 'Half-Day' },
                        { color: 'bg-slate-200', label: 'Not Marked' },
                    ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-sm ${color}`} />
                            <span className="text-xs text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
