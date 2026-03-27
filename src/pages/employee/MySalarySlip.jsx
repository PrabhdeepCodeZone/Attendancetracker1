import { useState, useEffect } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../components/Toast'
import { generateSalarySlipPDF } from '../../components/SalarySlipPDF'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MySalarySlip() {
    const { employeeProfile } = useAuth()
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [slip, setSlip] = useState(null)
    const [attendanceSummary, setAttendanceSummary] = useState(null)
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        const load = async () => {
            if (!employeeProfile) return
            setLoading(true)
            setSlip(null)
            setAttendanceSummary(null)
            try {
                const { data: slipData, error: slipErr } = await supabase
                    .from('salary_slips')
                    .select('*')
                    .eq('employee_id', employeeProfile.id)
                    .eq('month', month)
                    .eq('year', year)
                    .single()

                if (slipErr && slipErr.code !== 'PGRST116') throw slipErr

                if (slipData) {
                    setSlip(slipData)
                    // Fetch attendance summary
                    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
                    const { data: attData } = await supabase
                        .from('attendance')
                        .select('status')
                        .eq('employee_id', employeeProfile.id)
                        .gte('date', startDate)
                        .lte('date', endDate)

                    const present = attData?.filter(r => r.status === 'present').length || 0
                    const absent = attData?.filter(r => r.status === 'absent').length || 0
                    const halfDay = attData?.filter(r => r.status === 'half-day').length || 0
                    setAttendanceSummary({ present, absent, halfDay, total: (attData?.length || 0) })
                }
            } catch (err) {
                console.error('Load slip error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [employeeProfile, month, year])

    const handleDownload = async () => {
        if (!slip || !employeeProfile) return
        setDownloading(true)
        try {
            generateSalarySlipPDF({ slip, employee: employeeProfile, attendanceSummary })
        } catch (err) {
            console.error('Download error:', err)
            toast.error('Failed to generate PDF')
        } finally {
            setDownloading(false)
        }
    }

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="employee" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="My Salary Slip" userName={employeeProfile?.name} role="employee" />
                <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-2xl">
                    {/* Selector */}
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

                    {/* Slip content */}
                    {loading ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex items-center justify-center">
                            <Loader2 size={32} className="animate-spin text-teal-600" />
                        </div>
                    ) : !slip ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex flex-col items-center gap-3 text-center">
                            <FileText size={48} className="text-slate-300" />
                            <p className="text-slate-600 font-medium">Salary slip not yet generated for this month</p>
                            <p className="text-slate-400 text-sm">Please contact your administrator</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="bg-teal-700 px-6 py-5 text-white">
                                <h2 className="text-lg font-bold">My Company</h2>
                                <p className="text-teal-100 text-sm mt-0.5">Salary Slip — {MONTHS[slip.month - 1]} {slip.year}</p>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Employee info */}
                                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        ['Name', employeeProfile?.name],
                                        ['Designation', employeeProfile?.designation],
                                        ['Department', employeeProfile?.department],
                                        ['Join Date', employeeProfile?.join_date ? new Date(employeeProfile.join_date).toLocaleDateString('en-IN') : '—'],
                                    ].map(([label, val]) => (
                                        <div key={label}>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                                            <p className="text-slate-800 font-medium mt-0.5">{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Earnings */}
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Earnings</h4>
                                    <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Monthly Salary</span>
                                        <span className="font-semibold text-slate-800">₹{Number(slip.basic_pay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {slip.working_days > 0 && (
                                        <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                                            <span className="text-slate-500">Per Day Rate <span className="text-xs">({slip.working_days} working days)</span></span>
                                            <span className="text-slate-600">₹{Number(slip.per_day_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {slip.present_days != null && (
                                        <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                                            <span className="text-slate-500">
                                                Days Worked
                                                <span className="text-xs ml-1">
                                                    ({slip.present_days} present{slip.half_days > 0 ? ` + ${slip.half_days} half-day` : ''})
                                                </span>
                                            </span>
                                            <span className="text-green-600 font-medium">
                                                {slip.present_days + slip.half_days * 0.5} days
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Deductions */}
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deductions</h4>
                                    {slip.absent_days > 0 && slip.per_day_rate > 0 && (
                                        <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                                            <span className="text-slate-500">Absent Deduction <span className="text-xs">({slip.absent_days} days × ₹{Number(slip.per_day_rate).toLocaleString('en-IN')})</span></span>
                                            <span className="text-red-500">−₹{(slip.absent_days * slip.per_day_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Total Deductions</span>
                                        <span className="font-semibold text-red-600">₹{Number(slip.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Net Pay */}
                                <div className="bg-teal-50 rounded-xl px-5 py-4 flex justify-between items-center">
                                    <span className="text-teal-800 font-semibold">Net Pay</span>
                                    <span className="text-2xl font-bold text-teal-700">₹{Number(slip.net_pay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>

                                {/* Attendance */}
                                {attendanceSummary && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attendance Summary</h4>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { label: 'Present', value: attendanceSummary.present, color: 'bg-green-100 text-green-700' },
                                                { label: 'Absent', value: attendanceSummary.absent, color: 'bg-red-100 text-red-700' },
                                                { label: 'Half-Day', value: attendanceSummary.halfDay, color: 'bg-yellow-100 text-yellow-700' },
                                                { label: 'Total', value: attendanceSummary.total, color: 'bg-slate-100 text-slate-700' },
                                            ].map(({ label, value, color }) => (
                                                <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                                                    <p className="text-lg font-bold">{value}</p>
                                                    <p className="text-xs mt-0.5 opacity-70">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Download */}
                                <button
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-60"
                                >
                                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
