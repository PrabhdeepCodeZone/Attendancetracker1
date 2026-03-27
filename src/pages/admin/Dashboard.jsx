import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, TrendingUp, CalendarPlus, UserPlus, Clock } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import StatCard from '../../components/StatCard'
import { CardSkeleton } from '../../components/LoadingSkeleton'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const STATUS_BADGE = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    'half-day': 'bg-yellow-100 text-yellow-700',
}

export default function AdminDashboard() {
    const { user } = useAuth()
    const [stats, setStats] = useState(null)
    const [recentAttendance, setRecentAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [adminName, setAdminName] = useState('')

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const today = new Date().toISOString().split('T')[0]
                const startOfMonth = `${today.slice(0, 7)}-01`

                const [{ count: totalEmployees }, { data: todayAtt }, { data: monthAtt }, { data: recent }] = await Promise.all([
                    supabase.from('employees').select('*', { count: 'exact', head: true }),
                    supabase.from('attendance').select('status').eq('date', today),
                    supabase.from('attendance').select('status').gte('date', startOfMonth).lte('date', today),
                    supabase.from('attendance')
                        .select('*, employees(name, department)')
                        .order('date', { ascending: false })
                        .limit(20),
                ])

                const todayPresent = todayAtt?.filter(r => r.status === 'present').length || 0
                const todayAbsent = todayAtt?.filter(r => r.status === 'absent').length || 0
                const monthPresent = monthAtt?.filter(r => r.status === 'present').length || 0
                const monthHalf = monthAtt?.filter(r => r.status === 'half-day').length || 0
                const monthTotal = monthAtt?.length || 0
                const monthPct = monthTotal > 0 ? Math.round(((monthPresent + monthHalf * 0.5) / monthTotal) * 100) : 0

                setStats({ totalEmployees: totalEmployees || 0, todayPresent, todayAbsent, monthPct })
                setRecentAttendance(recent || [])

                if (user) {
                    const { data: emp } = await supabase.from('employees').select('name').eq('user_id', user.id).single()
                    setAdminName(emp?.name || user.email?.split('@')[0] || 'Admin')
                }
            } catch (err) {
                console.error('Dashboard load error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Dashboard" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard title="Total Employees" value={stats?.totalEmployees} icon={Users} color="indigo" />
                                <StatCard title="Present Today" value={stats?.todayPresent} icon={UserCheck} color="green" />
                                <StatCard title="Absent Today" value={stats?.todayAbsent} icon={UserX} color="red" />
                                <StatCard title="Month Attendance" value={`${stats?.monthPct}%`} icon={TrendingUp} color="purple" subtitle="This month" />
                            </>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/admin/attendance/mark"
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                        >
                            <CalendarPlus size={16} />
                            Mark Today's Attendance
                        </Link>
                        <Link
                            to="/admin/staff"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 transition-colors shadow-sm"
                        >
                            <UserPlus size={16} />
                            Add New Staff
                        </Link>
                    </div>

                    {/* Recent Attendance */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-600" />
                            <h3 className="text-base font-semibold text-slate-800">Recent Attendance</h3>
                            <span className="ml-auto text-xs text-slate-400">Last 7 days</span>
                        </div>

                        {loading ? (
                            <div className="p-6 space-y-3 animate-pulse">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-4 bg-slate-200 rounded flex-1" />
                                        <div className="h-4 bg-slate-200 rounded w-24" />
                                        <div className="h-4 bg-slate-200 rounded w-20" />
                                        <div className="h-4 bg-slate-200 rounded w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : recentAttendance.length === 0 ? (
                            <div className="py-12 text-center">
                                <CalendarPlus size={40} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">No attendance records found</p>
                                <Link to="/admin/attendance/mark" className="text-indigo-600 text-sm font-medium hover:underline mt-1 inline-block">
                                    Mark attendance now →
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left">
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentAttendance.map((rec) => (
                                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-slate-800">{rec.employees?.name || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{rec.employees?.department || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_BADGE[rec.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {rec.status}
                                                    </span>
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
