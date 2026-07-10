import { useState, useEffect } from 'react'
import { CalendarCheck, Loader2 } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../lib/toast'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

const STATUS_OPTIONS = ['present', 'absent', 'half-day']
const STATUS_STYLE = {
    present: 'bg-green-500 text-white',
    absent: 'bg-red-500 text-white',
    'half-day': 'bg-yellow-400 text-white',
}

export default function MarkAttendance() {
    const { user } = useAuth()
    const today = new Date().toISOString().split('T')[0]
    const [date, setDate] = useState(today)
    const [employees, setEmployees] = useState([])
    const [attendance, setAttendance] = useState({}) // { empId: status }
    const [selected, setSelected] = useState(new Set()) // selected employee ids
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [adminName, setAdminName] = useState('')

    useEffect(() => {
        if (user) {
            supabase.from('employees').select('name').eq('user_id', user.id).single()
                .then(({ data }) => setAdminName(data?.name || user.email?.split('@')[0] || 'Admin'))
        }
    }, [user])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setSelected(new Set())
            try {
                const { data: empData, error: empErr } = await supabase
                    .from('employees')
                    .select('id, name, department, designation')
                    .order('name')
                if (empErr) throw empErr

                const { data: attData, error: attErr } = await supabase
                    .from('attendance')
                    .select('employee_id, status')
                    .eq('date', date)
                if (attErr) throw attErr

                const existingMap = {}
                attData?.forEach(r => { existingMap[r.employee_id] = r.status })

                setEmployees(empData || [])
                const init = {}
                empData?.forEach(e => { init[e.id] = existingMap[e.id] || 'present' })
                setAttendance(init)
            } catch (err) {
                console.error('Load error:', err)
                toast.error('Failed to load employees')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [date])

    const allSelected = employees.length > 0 && selected.size === employees.length
    const someSelected = selected.size > 0

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(new Set())
        } else {
            setSelected(new Set(employees.map(e => e.id)))
        }
    }

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const markSelected = (status) => {
        if (!someSelected) return
        setAttendance(prev => {
            const updated = { ...prev }
            selected.forEach(id => { updated[id] = status })
            return updated
        })
    }

    const handleSubmit = async () => {
        if (!user) return
        setSaving(true)
        try {
            const records = employees.map(e => ({
                employee_id: e.id,
                date,
                status: attendance[e.id] || 'absent',
                marked_by: user.id,
            }))
            const { error } = await supabase
                .from('attendance')
                .upsert(records, { onConflict: 'employee_id,date' })
            if (error) throw error
            toast.success(`Attendance saved for ${date}`)
        } catch (err) {
            console.error('Save error:', err)
            toast.error(err.message || 'Failed to save attendance')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Mark Attendance" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Controls */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                max={today}
                                onChange={e => setDate(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2 sm:ml-auto flex-wrap">
                            <button
                                onClick={() => markSelected('present')}
                                disabled={!someSelected}
                                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Mark Present
                            </button>
                            <button
                                onClick={() => markSelected('absent')}
                                disabled={!someSelected}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Mark Absent
                            </button>
                        </div>
                    </div>

                    {/* Employee list */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3 animate-pulse">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <div className="w-5 h-5 bg-slate-200 rounded" />
                                        <div className="w-9 h-9 bg-slate-200 rounded-full" />
                                        <div className="h-4 bg-slate-200 rounded flex-1" />
                                        <div className="h-8 bg-slate-200 rounded w-48" />
                                    </div>
                                ))}
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="py-16 text-center">
                                <CalendarCheck size={48} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No employees found. Add employees first.</p>
                            </div>
                        ) : (
                            <>
                                {/* List header with select-all */}
                                <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                    />
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {someSelected ? `${selected.size} selected` : 'Select All'}
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-50">
                                    {employees.map(emp => (
                                        <div
                                            key={emp.id}
                                            className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${selected.has(emp.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
                                                checked={selected.has(emp.id)}
                                                onChange={() => toggleSelect(emp.id)}
                                            />
                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                                {emp.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 text-sm truncate">{emp.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{emp.department} · {emp.designation}</p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                {STATUS_OPTIONS.map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => setAttendance(prev => ({ ...prev, [emp.id]: status }))}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${attendance[emp.id] === status
                                                            ? `${STATUS_STYLE[status]} border-transparent shadow-sm`
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {status === 'half-day' ? 'Half' : status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Submit */}
                    {!loading && employees.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-60"
                            >
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
