import { useState, useEffect } from 'react'
import { FileText, Download, Loader2, DollarSign, Zap, RefreshCw, Search, X, Eye, Trash2 } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../components/Toast'
import { generateSalarySlipPDF, getSalarySlipPDFUrl } from '../../components/SalarySlipPDF'
import { useSalarySlips, getWorkingDays } from '../../hooks/useSalarySlips'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function SalarySlips() {
    const { user } = useAuth()
    const { slips, loading, generateSlip, bulkGenerateSlips, deleteSlip } = useSalarySlips()
    const [adminName, setAdminName] = useState('')
    const [employees, setEmployees] = useState([])
    const now = new Date()

    // Auto-generate state
    const [autoMonth, setAutoMonth] = useState(now.getMonth() + 1)
    const [autoYear, setAutoYear] = useState(now.getFullYear())
    const [customWorkingDays, setCustomWorkingDays] = useState(getWorkingDays(now.getFullYear(), now.getMonth() + 1))
    const [previews, setPreviews] = useState([])    // calculated rows before saving
    const [calculating, setCalculating] = useState(false)
    const [saving, setSaving] = useState(false)

    // Manual form state
    const [form, setForm] = useState({
        employeeId: '',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        basic_pay: '',
        deductions: '',
    })
    const [generating, setGenerating] = useState(false)
    const [downloadingId, setDownloadingId] = useState(null)
    const [viewingId, setViewingId] = useState(null)
    const [pdfDialog, setPdfDialog] = useState(null) // { url, title }
    const [deleteId, setDeleteId] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await deleteSlip(deleteId)
            toast.success('Salary slip deleted')
            setDeleteId(null)
        } catch (err) {
            toast.error(err.message || 'Failed to delete salary slip')
        } finally {
            setDeleting(false)
        }
    }

    // Filter state for All Salary Slips
    const [filterName, setFilterName] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [filterYear, setFilterYear] = useState('')

    const filteredSlips = slips.filter(slip => {
        const nameMatch = !filterName || (slip.employees?.name || '').toLowerCase().includes(filterName.toLowerCase())
        const monthMatch = !filterMonth || slip.month === Number(filterMonth)
        const yearMatch = !filterYear || slip.year === Number(filterYear)
        return nameMatch && monthMatch && yearMatch
    })

    useEffect(() => {
        if (user) {
            supabase.from('employees').select('name').eq('user_id', user.id).single()
                .then(({ data }) => setAdminName(data?.name || user.email?.split('@')[0] || 'Admin'))
            supabase.from('employees').select('id, name, designation, department, join_date, salary').order('name')
                .then(({ data }) => setEmployees(data || []))
        }
    }, [user])

    // ── Auto-calculate for all employees ──────────────────────────────────────
    const handleCalculate = async () => {
        if (employees.length === 0) { toast.error('No employees found'); return }
        setCalculating(true)
        setPreviews([])
        try {
            const workingDays = customWorkingDays > 0 ? customWorkingDays : getWorkingDays(autoYear, autoMonth)
            const startDate = `${autoYear}-${String(autoMonth).padStart(2, '0')}-01`
            const endDate   = `${autoYear}-${String(autoMonth).padStart(2, '0')}-31`

            const { data: attData, error: attErr } = await supabase
                .from('attendance')
                .select('employee_id, status')
                .gte('date', startDate)
                .lte('date', endDate)
            if (attErr) throw attErr

            // Group attendance by employee
            const attMap = {}
            attData?.forEach(r => {
                if (!attMap[r.employee_id]) attMap[r.employee_id] = { present: 0, absent: 0, half: 0 }
                if (r.status === 'present')   attMap[r.employee_id].present++
                else if (r.status === 'absent') attMap[r.employee_id].absent++
                else if (r.status === 'half-day') attMap[r.employee_id].half++
            })

            const rows = employees.map(emp => {
                const baseSalary  = Number(emp.salary) || 0
                const perDayRate  = workingDays > 0 ? baseSalary / workingDays : 0
                const att         = attMap[emp.id] || { present: 0, absent: 0, half: 0 }
                // present counts full, half-day counts 0.5
                const effectiveDays = att.present + att.half * 0.5
                const earned      = perDayRate * effectiveDays
                const deductions  = baseSalary - earned
                const netPay      = earned

                return {
                    employee_id:  emp.id,
                    name:         emp.name,
                    basic_pay:    baseSalary,
                    working_days: workingDays,
                    present_days: att.present,
                    absent_days:  att.absent,
                    half_days:    att.half,
                    per_day_rate: Math.round(perDayRate * 100) / 100,
                    deductions:   Math.round(deductions * 100) / 100,
                    net_pay:      Math.round(netPay * 100) / 100,
                }
            })

            setPreviews(rows)
        } catch (err) {
            console.error('Calculate error:', err)
            toast.error(err.message || 'Failed to calculate salaries')
        } finally {
            setCalculating(false)
        }
    }

    const handleSaveAll = async () => {
        if (previews.length === 0) return
        setSaving(true)
        try {
            await bulkGenerateSlips({ month: autoMonth, year: autoYear, generatedBy: user.id, previews })
            toast.success(`Salary slips generated for ${MONTHS[autoMonth - 1]} ${autoYear}`)
            setPreviews([])
        } catch (err) {
            console.error('Save error:', err)
            toast.error(err.message || 'Failed to save salary slips')
        } finally {
            setSaving(false)
        }
    }

    // ── Manual generate ───────────────────────────────────────────────────────
    const netPay = (Number(form.basic_pay) || 0) - (Number(form.deductions) || 0)

    const handleGenerate = async () => {
        if (!form.employeeId) { toast.error('Please select an employee'); return }
        if (!form.basic_pay)  { toast.error('Please enter basic pay'); return }
        setGenerating(true)
        try {
            await generateSlip({
                employee_id: form.employeeId,
                month: form.month,
                year: form.year,
                basic_pay: form.basic_pay,
                deductions: form.deductions || 0,
                generated_by: user.id,
            })
            toast.success('Salary slip generated successfully')
            setForm(p => ({ ...p, basic_pay: '', deductions: '' }))
        } catch (err) {
            console.error('Generate error:', err)
            toast.error(err.message || 'Failed to generate salary slip')
        } finally {
            setGenerating(false)
        }
    }

    // ── Download PDF ──────────────────────────────────────────────────────────
    const handleDownload = async (slip) => {
        setDownloadingId(slip.id)
        try {
            const employee = employees.find(e => e.id === slip.employee_id) || slip.employees || {}
            const startDate = `${slip.year}-${String(slip.month).padStart(2, '0')}-01`
            const endDate   = `${slip.year}-${String(slip.month).padStart(2, '0')}-31`
            const { data: attData } = await supabase
                .from('attendance')
                .select('status')
                .eq('employee_id', slip.employee_id)
                .gte('date', startDate)
                .lte('date', endDate)

            const present  = attData?.filter(r => r.status === 'present').length || 0
            const absent   = attData?.filter(r => r.status === 'absent').length || 0
            const halfDay  = attData?.filter(r => r.status === 'half-day').length || 0
            generateSalarySlipPDF({
                slip,
                employee: { ...employee, ...slip.employees },
                attendanceSummary: { present, absent, halfDay, total: attData?.length || 0 },
            })
        } catch (err) {
            console.error('Download error:', err)
            toast.error('Failed to generate PDF')
        } finally {
            setDownloadingId(null)
        }
    }

    const handleViewPDF = async (slip) => {
        setViewingId(slip.id)
        try {
            const employee = employees.find(e => e.id === slip.employee_id) || slip.employees || {}
            const url = getSalarySlipPDFUrl({ slip, employee: { ...employee, ...slip.employees } })
            const title = `${slip.employees?.name || 'Salary Slip'} — ${MONTHS[slip.month - 1]} ${slip.year}`
            setPdfDialog({ url, title, slip })
        } catch (err) {
            console.error('View error:', err)
            toast.error('Failed to open PDF')
        } finally {
            setViewingId(null)
        }
    }

    const closePdfDialog = () => {
        if (pdfDialog?.url) URL.revokeObjectURL(pdfDialog.url)
        setPdfDialog(null)
    }

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    return (
        <><div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Salary Slips" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">

                    {/* ── Auto Generate Section ── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Zap size={18} className="text-indigo-600" /> Auto Generate Salaries
                        </h3>

                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Month</label>
                                <select
                                    value={autoMonth}
                                    onChange={e => { const m = Number(e.target.value); setAutoMonth(m); setPreviews([]); setCustomWorkingDays(getWorkingDays(autoYear, m)) }}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Year</label>
                                <select
                                    value={autoYear}
                                    onChange={e => { const y = Number(e.target.value); setAutoYear(y); setPreviews([]); setCustomWorkingDays(getWorkingDays(y, autoMonth)) }}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Working Days <span className="text-slate-400 normal-case">(excl. Sundays)</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={customWorkingDays}
                                    onChange={e => { setCustomWorkingDays(Number(e.target.value)); setPreviews([]) }}
                                    className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                            <button
                                onClick={handleCalculate}
                                disabled={calculating}
                                className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm rounded-xl transition-colors disabled:opacity-60"
                            >
                                {calculating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                {calculating ? 'Calculating...' : 'Calculate'}
                            </button>
                        </div>

                        {/* Preview table */}
                        {previews.length > 0 && (
                            <div className="space-y-3">
                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-left">
                                                {['Employee', 'Base Salary', 'Working Days', 'Present', 'Half Day', 'Absent', 'Per Day Rate', 'Deductions', 'Net Pay'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {previews.map(row => (
                                                <tr key={row.employee_id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{row.name}</td>
                                                    <td className="px-4 py-3 text-slate-600">₹{Number(row.basic_pay).toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-slate-600 text-center">{row.working_days}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{row.present_days}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{row.half_days}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{row.absent_days}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">₹{row.per_day_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-3 text-red-600">₹{row.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">₹{row.net_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-60"
                                    >
                                        {saving && <Loader2 size={15} className="animate-spin" />}
                                        {saving ? 'Saving...' : `Save All ${previews.length} Slips`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Manual Generate Form ── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <DollarSign size={18} className="text-indigo-600" /> Manual Override
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Employee *</label>
                                <select
                                    value={form.employeeId}
                                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="">Select employee</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Month</label>
                                <select
                                    value={form.month}
                                    onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Year</label>
                                <select
                                    value={form.year}
                                    onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Basic Pay (₹) *</label>
                                <input
                                    type="number"
                                    value={form.basic_pay}
                                    onChange={e => setForm(p => ({ ...p, basic_pay: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Deductions (₹)</label>
                                <input
                                    type="number"
                                    value={form.deductions}
                                    onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Net Pay (Auto)</label>
                                <div className="px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-indigo-600">
                                    ₹ {netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-60"
                            >
                                {generating && <Loader2 size={15} className="animate-spin" />}
                                {generating ? 'Generating...' : 'Generate Slip'}
                            </button>
                        </div>
                    </div>

                    {/* ── All Salary Slips Table ── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 mr-auto">
                                <FileText size={16} className="text-indigo-600" />
                                <h3 className="text-base font-semibold text-slate-800">All Salary Slips</h3>
                            </div>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-44"
                                />
                            </div>
                            <select
                                value={filterMonth}
                                onChange={e => setFilterMonth(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">All Months</option>
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                            <select
                                value={filterYear}
                                onChange={e => setFilterYear(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {(filterName || filterMonth || filterYear) && (
                                <button
                                    onClick={() => { setFilterName(''); setFilterMonth(''); setFilterYear('') }}
                                    className="flex items-center gap-1 px-2.5 py-2 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl text-xs hover:bg-slate-50 transition-colors"
                                >
                                    <X size={13} /> Clear
                                </button>
                            )}
                        </div>
                        {loading ? (
                            <div className="p-6 space-y-3 animate-pulse">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        {Array.from({ length: 6 }).map((_, j) => <div key={j} className="h-4 bg-slate-200 rounded flex-1" />)}
                                    </div>
                                ))}
                            </div>
                        ) : slips.length === 0 ? (
                            <div className="py-16 text-center">
                                <FileText size={48} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No salary slips generated yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {filteredSlips.length === 0 && (
                                    <div className="py-12 text-center text-slate-500 text-sm">No slips match the selected filters</div>
                                )}
                                {filteredSlips.length > 0 && <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left">
                                            {['Employee', 'Month/Year', 'Working Days', 'Present', 'Absent', 'Basic Pay', 'Deductions', 'Net Pay', 'Action'].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredSlips.map(slip => (
                                            <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{slip.employees?.name || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{MONTHS[slip.month - 1]} {slip.year}</td>
                                                <td className="px-4 py-3 text-slate-500 text-center">{slip.working_days || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {slip.present_days != null
                                                        ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{slip.present_days}</span>
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {slip.absent_days != null
                                                        ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{slip.absent_days}</span>
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">₹{Number(slip.basic_pay).toLocaleString('en-IN')}</td>
                                                <td className="px-4 py-3 text-red-600">₹{Number(slip.deductions).toLocaleString('en-IN')}</td>
                                                <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">₹{Number(slip.net_pay).toLocaleString('en-IN')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleViewPDF(slip)}
                                                            disabled={viewingId === slip.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            {viewingId === slip.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} View
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(slip.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={13} /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>}
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </div>

        {/* ── PDF Viewer Dialog ── */}
        {pdfDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[90vh]">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-indigo-600" />
                            <span className="text-sm font-semibold text-slate-800">{pdfDialog.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { handleDownload(pdfDialog.slip); }}
                                disabled={downloadingId === pdfDialog.slip.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                            >
                                {downloadingId === pdfDialog.slip.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download
                            </button>
                            <button onClick={closePdfDialog} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={pdfDialog.url}
                        className="flex-1 w-full rounded-b-2xl"
                        title="Salary Slip PDF"
                    />
                </div>
            </div>
        )}

        {/* ── Delete Confirm Modal ── */}
        {deleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-100 rounded-xl"><Trash2 size={18} className="text-red-600" /></div>
                        <div>
                            <p className="font-semibold text-slate-800">Delete Salary Slip?</p>
                            <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => setDeleteId(null)} disabled={deleting} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                            {deleting && <Loader2 size={14} className="animate-spin" />}
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
