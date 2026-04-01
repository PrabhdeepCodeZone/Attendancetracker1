import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2, CalendarDays, Home, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
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
    const ms = new Date(end) - new Date(start)
    return Math.max(1, Math.round(ms / 86400000) + 1)
}

export default function MyRequests() {
    const { employeeProfile, user } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const [form, setForm] = useState({
        request_type: 'leave',
        start_date: '',
        end_date: '',
        reason: '',
    })

    const fetchRequests = useCallback(async () => {
        if (!employeeProfile?.id) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('employee_id', employeeProfile.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setRequests(data || [])
        } catch (err) {
            toast.error('Failed to load requests')
        } finally {
            setLoading(false)
        }
    }, [employeeProfile?.id])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.start_date || !form.end_date || !form.reason.trim()) {
            toast.error('Please fill in all fields')
            return
        }
        if (new Date(form.end_date) < new Date(form.start_date)) {
            toast.error('End date cannot be before start date')
            return
        }
        setSubmitting(true)
        try {
            const { error } = await supabase.from('leave_requests').insert({
                employee_id: employeeProfile.id,
                request_type: form.request_type,
                start_date: form.start_date,
                end_date: form.end_date,
                reason: form.reason.trim(),
            })
            if (error) throw error
            toast.success('Request submitted successfully')
            setShowForm(false)
            setForm({ request_type: 'leave', start_date: '', end_date: '', reason: '' })
            fetchRequests()
        } catch (err) {
            toast.error(err.message || 'Failed to submit request')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        setDeletingId(id)
        try {
            const { error } = await supabase
                .from('leave_requests')
                .delete()
                .eq('id', id)
            if (error) throw error
            toast.success('Request withdrawn')
            setRequests(prev => prev.filter(r => r.id !== id))
        } catch (err) {
            toast.error(err.message || 'Failed to withdraw request')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="employee" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="My Requests" userName={employeeProfile?.name} role="employee" />
                <main className="flex-1 p-4 lg:p-6 space-y-5">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Leave & WFH Requests</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Apply for leave or work from home</p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                        >
                            <Plus size={16} /> New Request
                        </button>
                    </div>

                    {/* Apply form modal */}
                    {showForm && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">New Request</h3>
                                    <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                                        <X size={18} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    {/* Type toggle */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Request Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(TYPE_CONFIG).map(([val, cfg]) => {
                                                const Icon = cfg.icon
                                                const active = form.request_type === val
                                                return (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, request_type: val }))}
                                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                    >
                                                        <Icon size={16} /> {cfg.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Start Date</label>
                                            <input
                                                type="date"
                                                value={form.start_date}
                                                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">End Date</label>
                                            <input
                                                type="date"
                                                value={form.end_date}
                                                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                                min={form.start_date || new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {form.start_date && form.end_date && new Date(form.end_date) >= new Date(form.start_date) && (
                                        <p className="text-xs text-teal-600 font-medium -mt-1">
                                            {dayCount(form.start_date, form.end_date)} day{dayCount(form.start_date, form.end_date) > 1 ? 's' : ''}
                                        </p>
                                    )}

                                    {/* Reason */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Reason</label>
                                        <textarea
                                            rows={3}
                                            value={form.reason}
                                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                            placeholder="Briefly explain your reason..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-60"
                                        >
                                            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                                            Submit Request
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Requests list */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="h-4 bg-slate-200 rounded w-32" />
                                        <div className="h-5 bg-slate-200 rounded-full w-20" />
                                    </div>
                                    <div className="mt-3 h-3 bg-slate-100 rounded w-48" />
                                    <div className="mt-2 h-3 bg-slate-100 rounded w-64" />
                                </div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                            <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No requests yet</p>
                            <p className="text-slate-400 text-sm mt-1">Click "New Request" to apply for leave or WFH</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(req => {
                                const typeCfg = TYPE_CONFIG[req.request_type]
                                const TypeIcon = typeCfg?.icon || CalendarDays
                                const days = dayCount(req.start_date, req.end_date)
                                return (
                                    <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg?.color}`}>
                                                    <TypeIcon size={17} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{typeCfg?.label}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {formatDate(req.start_date)} — {formatDate(req.end_date)}
                                                        <span className="ml-1.5 text-slate-300">·</span>
                                                        <span className="ml-1.5">{days} day{days > 1 ? 's' : ''}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <StatusBadge status={req.status} />
                                                {req.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        disabled={deletingId === req.id}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Withdraw request"
                                                    >
                                                        {deletingId === req.id
                                                            ? <Loader2 size={14} className="animate-spin" />
                                                            : <Trash2 size={14} />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3 pl-12">
                                            <p className="text-sm text-slate-600">
                                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reason: </span>
                                                {req.reason}
                                            </p>
                                            {req.status === 'rejected' && req.rejection_reason && (
                                                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                                    <p className="text-xs font-medium text-red-600 mb-0.5">Rejection Reason</p>
                                                    <p className="text-sm text-red-700">{req.rejection_reason}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2 pl-12">
                                            <p className="text-xs text-slate-400">
                                                Applied on {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
