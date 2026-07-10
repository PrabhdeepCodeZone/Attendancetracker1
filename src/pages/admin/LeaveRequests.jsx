import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, CalendarDays, Home, Clock, CheckCircle, XCircle, Search, Banknote, Ban } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../lib/toast'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

const STATUS_CONFIG = {
    pending:  { label: 'Pending',  color: 'text-amber-600 bg-amber-50 border-amber-200',  icon: Clock },
    approved: { label: 'Approved', color: 'text-green-600 bg-green-50 border-green-200',  icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'text-red-600  bg-red-50   border-red-200',    icon: XCircle },
}

const TYPE_CONFIG = {
    leave:          { label: 'Leave',          icon: CalendarDays, color: 'text-indigo-600 bg-indigo-50' },
    work_from_home: { label: 'Work From Home', icon: Home,         color: 'text-teal-600  bg-teal-50'   },
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
            <Icon size={11} /> {cfg.label}
        </span>
    )
}

function formatDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayCount(start, end) {
    return Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1)
}

export default function LeaveRequests() {
    const { user } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('all')
    const [search, setSearch] = useState('')
    const [adminName, setAdminName] = useState('')

    useEffect(() => {
        if (!user) return
        supabase.from('employees').select('name').eq('user_id', user.id).single()
            .then(({ data }) => setAdminName(data?.name || user.email?.split('@')[0] || 'Admin'))
    }, [user])

    // Approve modal state (for leave type only)
    const [approveModal, setApproveModal] = useState(null) // { id, employeeId, startDate, endDate }
    const [approveLeaveType, setApproveLeaveType] = useState('paid')

    // Reject modal state
    const [rejectModal, setRejectModal] = useState(null) // { id }
    const [rejectionReason, setRejectionReason] = useState('')
    const [actionLoading, setActionLoading] = useState(null) // id being acted on

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .select(`
                    *,
                    employees (
                        id,
                        name,
                        department,
                        designation
                    )
                `)
                .order('created_at', { ascending: false })
            if (error) throw error
            setRequests(data || [])
        } catch {
            toast.error('Failed to load requests')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    // Returns all dates between start and end (inclusive), skipping Sundays
    const getDatesBetween = (startStr, endStr) => {
        const dates = []
        const current = new Date(startStr)
        const end = new Date(endStr)
        while (current <= end) {
            if (current.getDay() !== 0) dates.push(current.toISOString().split('T')[0])
            current.setDate(current.getDate() + 1)
        }
        return dates
    }

    const applyAttendance = async (employeeId, startDate, endDate, attendanceStatus) => {
        const dates = getDatesBetween(startDate, endDate)
        if (dates.length === 0) return 0
        const records = dates.map(date => ({ employee_id: employeeId, date, status: attendanceStatus }))
        const { error } = await supabase
            .from('attendance')
            .upsert(records, { onConflict: 'employee_id,date' })
        if (error) throw error
        return dates.length
    }

    // WFH approval — always marks present, no modal needed
    const handleApproveWFH = async (req) => {
        setActionLoading(req.id)
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status: 'approved', rejection_reason: null })
                .eq('id', req.id)
            if (error) throw error
            const count = await applyAttendance(req.employees.id, req.start_date, req.end_date, 'present')
            toast.success(`WFH approved — ${count} day${count !== 1 ? 's' : ''} marked as Present`)
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', rejection_reason: null } : r))
        } catch (err) {
            toast.error(err.message || 'Failed to approve')
        } finally {
            setActionLoading(null)
        }
    }

    // Leave approval — confirm paid/unpaid first, then apply
    const handleApproveLeaveSubmit = async () => {
        const { id, employeeId, startDate, endDate } = approveModal
        const attendanceStatus = approveLeaveType === 'paid' ? 'present' : 'absent'
        setActionLoading(id)
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status: 'approved', rejection_reason: null })
                .eq('id', id)
            if (error) throw error
            const count = await applyAttendance(employeeId, startDate, endDate, attendanceStatus)
            toast.success(`Leave approved (${approveLeaveType}) — ${count} day${count !== 1 ? 's' : ''} marked as ${attendanceStatus}`)
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', rejection_reason: null } : r))
            setApproveModal(null)
        } catch (err) {
            toast.error(err.message || 'Failed to approve')
        } finally {
            setActionLoading(null)
        }
    }

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason')
            return
        }
        const id = rejectModal.id
        setActionLoading(id)
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status: 'rejected', rejection_reason: rejectionReason.trim() })
                .eq('id', id)
            if (error) throw error
            toast.success('Request rejected')
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: 'rejected', rejection_reason: rejectionReason.trim() } : r
            ))
            setRejectModal(null)
            setRejectionReason('')
        } catch (err) {
            toast.error(err.message || 'Failed to reject')
        } finally {
            setActionLoading(null)
        }
    }

    const filtered = requests.filter(r => {
        const matchStatus = filterStatus === 'all' || r.status === filterStatus
        const matchSearch = !search || r.employees?.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.employees?.department?.toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Leave Requests" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-5">

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-100' },
                            { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
                            { label: 'Approved', value: stats.approved, color: 'text-green-700', bg: 'bg-green-50' },
                            { label: 'Rejected', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50' },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or department..."
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
                            {['all', 'pending', 'approved', 'rejected'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Request list */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                                            <div className="space-y-1.5">
                                                <div className="h-4 bg-slate-200 rounded w-28" />
                                                <div className="h-3 bg-slate-100 rounded w-20" />
                                            </div>
                                        </div>
                                        <div className="h-5 bg-slate-200 rounded-full w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                            <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No requests found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map(req => {
                                const typeCfg = TYPE_CONFIG[req.request_type]
                                const TypeIcon = typeCfg?.icon || CalendarDays
                                const days = dayCount(req.start_date, req.end_date)
                                const isPending = req.status === 'pending'
                                const isActing = actionLoading === req.id

                                return (
                                    <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                            {/* Left: employee + type */}
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg?.color}`}>
                                                    <TypeIcon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-slate-800 text-sm">{req.employees?.name || 'Unknown'}</p>
                                                        <span className="text-slate-300 text-xs">·</span>
                                                        <p className="text-xs text-slate-500">{req.employees?.department}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">{typeCfg?.label} · {formatDate(req.start_date)} — {formatDate(req.end_date)} ({days} day{days > 1 ? 's' : ''})</p>
                                                    <p className="text-sm text-slate-600 mt-2">
                                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reason: </span>
                                                        {req.reason}
                                                    </p>
                                                    {req.status === 'rejected' && req.rejection_reason && (
                                                        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg inline-block max-w-full">
                                                            <p className="text-xs font-medium text-red-600 mb-0.5">Rejection Reason</p>
                                                            <p className="text-sm text-red-700">{req.rejection_reason}</p>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        Applied {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: status + actions */}
                                            <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                                                <StatusBadge status={req.status} />
                                                {isPending && (
                                                    <div className="flex gap-2 mt-1">
                                                        <button
                                                            onClick={() => {
                                                                if (req.request_type === 'work_from_home') {
                                                                    handleApproveWFH(req)
                                                                } else {
                                                                    setApproveLeaveType('paid')
                                                                    setApproveModal({ id: req.id, employeeId: req.employees.id, startDate: req.start_date, endDate: req.end_date })
                                                                }
                                                            }}
                                                            disabled={isActing}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            {isActing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => { setRejectModal({ id: req.id }); setRejectionReason('') }}
                                                            disabled={isActing}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-colors disabled:opacity-60"
                                                        >
                                                            <XCircle size={12} /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Paid / Unpaid approve modal */}
            {approveModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">Approve Leave</h3>
                            <button onClick={() => setApproveModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">Select the leave type. This will determine how attendance is recorded for the leave period.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setApproveLeaveType('paid')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${approveLeaveType === 'paid' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <Banknote size={22} className={approveLeaveType === 'paid' ? 'text-green-600' : 'text-slate-400'} />
                                    <span className={`text-sm font-semibold ${approveLeaveType === 'paid' ? 'text-green-700' : 'text-slate-500'}`}>Paid</span>
                                    <span className="text-xs text-slate-400 text-center">Marked as Present</span>
                                </button>
                                <button
                                    onClick={() => setApproveLeaveType('unpaid')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${approveLeaveType === 'unpaid' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <Ban size={22} className={approveLeaveType === 'unpaid' ? 'text-orange-500' : 'text-slate-400'} />
                                    <span className={`text-sm font-semibold ${approveLeaveType === 'unpaid' ? 'text-orange-600' : 'text-slate-500'}`}>Unpaid</span>
                                    <span className="text-xs text-slate-400 text-center">Marked as Absent</span>
                                </button>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setApproveModal(null)}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApproveLeaveSubmit}
                                    disabled={actionLoading === approveModal?.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-60"
                                >
                                    {actionLoading === approveModal?.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                    Confirm Approval
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject reason modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">Reject Request</h3>
                            <button
                                onClick={() => { setRejectModal(null); setRejectionReason('') }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">Please provide a reason for rejecting this request. The employee will be able to see this.</p>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
                                <textarea
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="e.g. Team meeting scheduled, insufficient leave balance..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => { setRejectModal(null); setRejectionReason('') }}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectSubmit}
                                    disabled={actionLoading === rejectModal?.id || !rejectionReason.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60"
                                >
                                    {actionLoading === rejectModal?.id ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                                    Reject Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
