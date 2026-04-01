import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import AttendanceCalendar from '../../components/AttendanceCalendar'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STATUS_BADGE = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    'half-day': 'bg-yellow-100 text-yellow-700',
}

export default function MyAttendance() {
    const { employeeProfile } = useAuth()
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!employeeProfile) return
            setLoading(true)
            try {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                const endDay = new Date(year, month, 0).getDate()
                const endDate = `${year}-${String(month).padStart(2, '0')}-${endDay}`
                const { data, error } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('employee_id', employeeProfile.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false })
                if (error) throw error
                setRecords(data || [])
            } catch (err) {
                console.error('Load attendance error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [employeeProfile, month, year])

    const attendanceMap = useMemo(() => {
        return records.reduce((acc, r) => { acc[r.date] = r.status; return acc }, {})
    }, [records])

    const summary = useMemo(() => {
        const present = records.filter(r => r.status === 'present').length
        const absent = records.filter(r => r.status === 'absent').length
        const halfDay = records.filter(r => r.status === 'half-day').length
        const total = records.length
        const pct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0
        return { present, absent, halfDay, total, pct }
    }, [records])

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="employee" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="My Attendance" userName={employeeProfile?.name} role="employee" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Filter */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-3">
                        <select
                            value={month}
                            onChange={e => setMonth(Number(e.target.value))}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { label: 'Total Days', value: summary.total, color: 'bg-slate-100 text-slate-700' },
                            { label: 'Present', value: summary.present, color: 'bg-green-100 text-green-700' },
                            { label: 'Absent', value: summary.absent, color: 'bg-red-100 text-red-700' },
                            { label: 'Half-Day', value: summary.halfDay, color: 'bg-yellow-100 text-yellow-700' },
                            { label: 'Percentage', value: `${summary.pct}%`, color: 'bg-teal-100 text-teal-700' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-2xl p-4 ${color}`}>
                                <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
                                <p className="text-2xl font-bold mt-1">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <AttendanceCalendar
                            year={year}
                            month={month}
                            attendanceMap={attendanceMap}
                            onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
                        />

                        {/* Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800">Daily Records — {MONTHS[month - 1]} {year}</h3>
                            </div>
                            {loading ? (
                                <div className="p-5 space-y-2 animate-pulse">
                                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-slate-200 rounded-lg" />)}
                                </div>
                            ) : records.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 text-sm">No records for this period</div>
                            ) : (
                                <div className="divide-y divide-slate-50 overflow-y-auto max-h-80">
                                    {records.map(rec => (
                                        <div key={rec.id} className="flex items-center justify-between px-5 py-3">
                                            <p className="text-sm text-slate-700">{new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_BADGE[rec.status] || ''}`}>
                                                {rec.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
