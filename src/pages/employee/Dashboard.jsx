import { useState, useEffect } from 'react'
import { UserCheck, UserX, Clock, TrendingUp } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import AttendanceCalendar from '../../components/AttendanceCalendar'
import { CardSkeleton } from '../../components/LoadingSkeleton'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const STATUS_BADGE = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    'half-day': 'bg-yellow-100 text-yellow-700',
}

export default function EmployeeDashboard() {
    const { user, employeeProfile } = useAuth()
    const [stats, setStats] = useState(null)
    const [attendanceMap, setAttendanceMap] = useState({})
    const [recentList, setRecentList] = useState([])
    const [loading, setLoading] = useState(true)
    const now = new Date()
    const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
    const [calYear, setCalYear] = useState(now.getFullYear())

    useEffect(() => {
        const load = async () => {
            if (!employeeProfile) return
            setLoading(true)
            try {
                const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
                const today = now.toISOString().split('T')[0]

                const [{ data: monthAtt }, { data: recent }] = await Promise.all([
                    supabase.from('attendance')
                        .select('date, status')
                        .eq('employee_id', employeeProfile.id)
                        .gte('date', startOfMonth)
                        .lte('date', today),
                    supabase.from('attendance')
                        .select('date, status')
                        .eq('employee_id', employeeProfile.id)
                        .order('date', { ascending: false })
                        .limit(10),
                ])

                const present = monthAtt?.filter(r => r.status === 'present').length || 0
                const absent = monthAtt?.filter(r => r.status === 'absent').length || 0
                const halfDay = monthAtt?.filter(r => r.status === 'half-day').length || 0
                const total = monthAtt?.length || 0
                const pct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0

                setStats({ present, absent, halfDay, pct })

                const map = {}
                monthAtt?.forEach(r => { map[r.date] = r.status })
                setAttendanceMap(map)
                setRecentList(recent || [])
            } catch (err) {
                console.error('Employee dashboard load error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeProfile])

    const handleMonthChange = async (year, month) => {
        setCalYear(year)
        setCalMonth(month)
        if (!employeeProfile) return
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${endDay}`
        const { data } = await supabase
            .from('attendance')
            .select('date, status')
            .eq('employee_id', employeeProfile.id)
            .gte('date', startDate)
            .lte('date', endDate)
        const map = {}
        data?.forEach(r => { map[r.date] = r.status })
        setAttendanceMap(map)
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="employee" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="My Dashboard" userName={employeeProfile?.name} role="employee" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Welcome */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-sm">
                        <p className="text-teal-100 text-sm">Welcome back,</p>
                        <h2 className="text-2xl font-bold mt-0.5">{employeeProfile?.name || 'Employee'} 👋</h2>
                        <p className="text-teal-100 text-sm mt-1">{employeeProfile?.designation} · {employeeProfile?.department}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard title="Present" value={stats?.present} icon={UserCheck} color="green" subtitle="This month" />
                                <StatCard title="Absent" value={stats?.absent} icon={UserX} color="red" subtitle="This month" />
                                <StatCard title="Half-Day" value={stats?.halfDay} icon={Clock} color="yellow" subtitle="This month" />
                                <StatCard title="Attendance" value={`${stats?.pct}%`} icon={TrendingUp} color="teal" subtitle="This month" />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <AttendanceCalendar
                            year={calYear}
                            month={calMonth}
                            attendanceMap={attendanceMap}
                            onMonthChange={handleMonthChange}
                        />

                        {/* Recent list */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800">Recent Attendance</h3>
                            </div>
                            {recentList.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 text-sm">No attendance records yet</div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {recentList.map(rec => (
                                        <div key={rec.date} className="flex items-center justify-between px-5 py-3">
                                            <p className="text-sm text-slate-700">{new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
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
