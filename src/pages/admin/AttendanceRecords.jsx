import { useState, useEffect, useMemo } from 'react'
import { Download, Filter, ClipboardList } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

const STATUS_BADGE = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    'half-day': 'bg-yellow-100 text-yellow-700',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AttendanceRecords() {
    const { user } = useAuth()
    const [adminName, setAdminName] = useState('')
    const [employees, setEmployees] = useState([])
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const now = new Date()
    const [filters, setFilters] = useState({
        employeeId: '',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
    })

    useEffect(() => {
        if (user) {
            supabase.from('employees').select('name').eq('user_id', user.id).single()
                .then(({ data }) => setAdminName(data?.name || user.email?.split('@')[0] || 'Admin'))
            supabase.from('employees').select('id, name').order('name')
                .then(({ data }) => setEmployees(data || []))
        }
    }, [user])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const { month, year, employeeId } = filters
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                const endDay = new Date(year, month, 0).getDate()
                const endDate = `${year}-${String(month).padStart(2, '0')}-${endDay}`

                let query = supabase
                    .from('attendance')
                    .select('*, employees(name, department)')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false })

                if (employeeId) query = query.eq('employee_id', employeeId)

                const { data, error } = await query
                if (error) throw error
                setRecords(data || [])
            } catch (err) {
                console.error('Load records error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [filters])

    const summary = useMemo(() => {
        const present = records.filter(r => r.status === 'present').length
        const absent = records.filter(r => r.status === 'absent').length
        const halfDay = records.filter(r => r.status === 'half-day').length
        const total = records.length
        const pct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0
        return { present, absent, halfDay, total, pct }
    }, [records])

    const exportCSV = () => {
        const headers = ['Employee', 'Department', 'Date', 'Status']
        const rows = records.map(r => [
            r.employees?.name || '',
            r.employees?.department || '',
            r.date,
            r.status,
        ])
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-${MONTHS[filters.month - 1]}-${filters.year}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Attendance Records" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={16} className="text-indigo-600" />
                            <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select
                                value={filters.employeeId}
                                onChange={e => setFilters(p => ({ ...p, employeeId: e.target.value }))}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">All Employees</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <select
                                value={filters.month}
                                onChange={e => setFilters(p => ({ ...p, month: Number(e.target.value) }))}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                            <select
                                value={filters.year}
                                onChange={e => setFilters(p => ({ ...p, year: Number(e.target.value) }))}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <button
                                onClick={exportCSV}
                                className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-xl transition-colors"
                            >
                                <Download size={15} /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Present', value: summary.present, color: 'bg-green-100 text-green-700' },
                            { label: 'Absent', value: summary.absent, color: 'bg-red-100 text-red-700' },
                            { label: 'Half-Day', value: summary.halfDay, color: 'bg-yellow-100 text-yellow-700' },
                            { label: 'Attendance %', value: `${summary.pct}%`, color: 'bg-indigo-100 text-indigo-700' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-2xl p-4 ${color}`}>
                                <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
                                <p className="text-2xl font-bold mt-1">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3 animate-pulse">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-4 bg-slate-200 rounded flex-1" />)}
                                    </div>
                                ))}
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-16 text-center">
                                <ClipboardList size={48} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No records found for the selected filters</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left">
                                            {['Employee', 'Department', 'Date', 'Status', 'Time'].map(h => (
                                                <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {records.map(rec => (
                                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-slate-800">{rec.employees?.name || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{rec.employees?.department || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_BADGE[rec.status] || ''}`}>
                                                        {rec.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-400 text-xs">
                                                    {rec.created_at ? new Date(rec.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
