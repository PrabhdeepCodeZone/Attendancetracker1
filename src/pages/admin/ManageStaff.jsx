import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Eye, Search, Loader2, Users, Mail, Phone, Building, Calendar, DollarSign, FileText, Upload, Table2, Download, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { toast } from '../../components/Toast'
import { useEmployees } from '../../hooks/useEmployees'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'employee-documents'

function AdminDocumentField({ label, urlKey, currentPath, employeeUserId, employeeId, onUploaded }) {
    const [uploading, setUploading] = useState(false)

    const handleView = async () => {
        if (!currentPath) return
        try {
            const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(currentPath, 60)
            if (error) throw error
            window.open(data.signedUrl, '_blank')
        } catch {
            toast.error('Could not open document')
        }
    }

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, WEBP, or PDF allowed'); return }
        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }

        setUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `${employeeUserId}/${urlKey}.${ext}`
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
            if (uploadErr) throw uploadErr
            const { error: dbErr } = await supabase.from('employees').update({ [urlKey]: path }).eq('id', employeeId)
            if (dbErr) throw dbErr
            onUploaded(urlKey, path)
            toast.success(`${label} uploaded`)
        } catch (err) {
            toast.error(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2">
                <FileText size={15} className={currentPath ? 'text-green-500' : 'text-slate-300'} />
                <span className="text-sm text-slate-700">{label}</span>
                {currentPath
                    ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Uploaded</span>
                    : <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full">Not uploaded</span>
                }
            </div>
            <div className="flex items-center gap-2">
                {currentPath && (
                    <button onClick={handleView} className="text-xs px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors font-medium">
                        View
                    </button>
                )}
                <label className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors font-medium cursor-pointer">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {currentPath ? 'Replace' : 'Upload'}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} disabled={uploading} />
                </label>
            </div>
        </div>
    )
}

const EMPTY_FORM = {
    name: '', email: '', password: '', phone: '', address: '',
    department: '', designation: '', join_date: '', salary: '',
}

function EmployeeForm({ form, setForm, errors, isEdit, isSubmitting }) {
    const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Management']

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    disabled={isEdit || isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'} ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {!isEdit && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.department ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.designation ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                />
                {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Join Date</label>
                <input
                    type="date"
                    value={form.join_date}
                    onChange={e => setForm({ ...form, join_date: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
                <input
                    type="number"
                    min="0"
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.salary ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                />
                {errors.salary && <p className="text-xs text-red-500 mt-1">{errors.salary}</p>}
            </div>

            <div className={`sm:col-span-${isEdit ? '2' : '2'}`}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                    rows={2}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
            </div>
        </div>
    )
}

const EXCEL_COLUMNS = ['name', 'email', 'password', 'department', 'designation', 'phone', 'join_date', 'salary', 'address']
const REQUIRED_COLS = ['name', 'email', 'password', 'department', 'designation']

function validateExcelRow(row) {
    const errs = []
    if (!row.name?.trim()) errs.push('Name required')
    if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) errs.push('Valid email required')
    if (!row.password || String(row.password).length < 6) errs.push('Password min 6 chars')
    if (!row.department?.trim()) errs.push('Department required')
    if (!row.designation?.trim()) errs.push('Designation required')
    if (row.salary && Number(row.salary) < 0) errs.push('Salary must be positive')
    return errs
}

export default function ManageStaff() {
    const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee } = useEmployees()
    const { user } = useAuth()
    const [adminName, setAdminName] = useState('')
    const [search, setSearch] = useState('')
    const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | 'view'
    const [selectedEmp, setSelectedEmp] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [viewDocUrls, setViewDocUrls] = useState({ id_proof_url: null, bank_detail_url: null })
    const [showImportModal, setShowImportModal] = useState(false)
    const [importRows, setImportRows] = useState([]) // [{ ...fields, _errors: [], _status: 'pending'|'success'|'error', _msg: '' }]
    const [isImporting, setIsImporting] = useState(false)
    const excelInputRef = useRef(null)

    useEffect(() => {
        if (user) {
            supabase.from('employees').select('name').eq('user_id', user.id).single()
                .then(({ data }) => setAdminName(data?.name || user.email?.split('@')[0] || 'Admin'))
        }
    }, [user])

    const filtered = employees.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase())
    )

    const validate = (isEdit) => {
        const errs = {}
        if (!form.name || form.name.trim() === '') errs.name = 'Full Name is required'
        if (!isEdit) {
            if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid Email is required'
            if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters'
        }
        if (!form.department) errs.department = 'Department is required'
        if (!form.designation || form.designation.trim() === '') errs.designation = 'Designation is required'
        if (form.salary && Number(form.salary) < 0) errs.salary = 'Salary must be a positive number'
        return errs
    }

    const handleAddOpen = () => {
        setForm(EMPTY_FORM)
        setErrors({})
        setModalMode('add')
    }

    const handleEditOpen = (emp) => {
        setSelectedEmp(emp)
        setForm({
            name: emp.name || '',
            email: emp.users?.email || '',
            password: '',
            phone: emp.phone || '',
            address: emp.address || '',
            department: emp.department || '',
            designation: emp.designation || '',
            join_date: emp.join_date || '',
            salary: emp.salary || '',
        })
        setErrors({})
        setModalMode('edit')
    }

    const handleSubmit = async () => {
        const isEdit = modalMode === 'edit'
        const errs = validate(isEdit)
        if (Object.keys(errs).length) { setErrors(errs); return }

        setIsSubmitting(true)
        setErrors({})

        try {
            if (isEdit) {
                await updateEmployee(selectedEmp.id, {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    department: form.department,
                    designation: form.designation.trim(),
                    join_date: form.join_date || null,
                    salary: form.salary ? Number(form.salary) : null,
                })
                toast.success('Employee updated successfully')
                setModalMode(null)
            } else {
                await addEmployee({
                    email: form.email.trim(),
                    password: form.password,
                    name: form.name.trim(),
                    department: form.department,
                    designation: form.designation.trim(),
                    phone: form.phone.trim() || undefined,
                    address: form.address.trim() || undefined,
                    join_date: form.join_date || undefined,
                    salary: form.salary ? Number(form.salary) : undefined,
                })
                toast.success('Employee created successfully')
                setModalMode(null)
            }
        } catch (err) {
            console.error('Employee save error:', err)
            // Error stays in modal, user can retry
            setErrors({ _form: err.message || 'Failed to save employee' })
            toast.error(err.message || 'Failed to save employee')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await deleteEmployee(deleteTarget.id)
            toast.success('Employee deleted successfully')
            setDeleteTarget(null)
        } catch (err) {
            console.error('Delete error:', err)
            toast.error(err.message || 'Failed to delete employee')
        } finally {
            setIsDeleting(false)
        }
    }

    const getFormChanges = () => {
        return Object.values(form).some(v => v !== '') && Object.values(form).join('') !== Object.values(EMPTY_FORM).join('');
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            EXCEL_COLUMNS,
            ['Jane Doe', 'jane@example.com', 'password123', 'Engineering', 'Developer', '9876543210', '2024-01-15', '50000', '123 Main St'],
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Employees')
        XLSX.writeFile(wb, 'employee_import_template.xlsx')
    }

    const handleExcelFile = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
                if (raw.length === 0) { toast.error('Excel file is empty'); return }
                const rows = raw.map(r => {
                    const row = {}
                    EXCEL_COLUMNS.forEach(col => {
                        row[col] = r[col] !== undefined ? String(r[col]).trim() : ''
                    })
                    row._errors = validateExcelRow(row)
                    row._status = 'pending'
                    row._msg = ''
                    return row
                })
                setImportRows(rows)
                setShowImportModal(true)
            } catch {
                toast.error('Could not read Excel file')
            }
        }
        reader.readAsArrayBuffer(file)
        e.target.value = ''
    }

    const removeImportRow = (idx) => {
        setImportRows(prev => prev.filter((_, i) => i !== idx))
    }

    const handleBulkImport = async () => {
        const valid = importRows.filter(r => r._errors.length === 0 && r._status !== 'success')
        if (valid.length === 0) { toast.error('No valid rows to import'); return }
        setIsImporting(true)
        let successCount = 0
        const updated = [...importRows]
        for (let i = 0; i < updated.length; i++) {
            if (updated[i]._errors.length > 0 || updated[i]._status === 'success') continue
            try {
                await addEmployee({
                    email: updated[i].email,
                    password: updated[i].password,
                    name: updated[i].name,
                    department: updated[i].department,
                    designation: updated[i].designation,
                    phone: updated[i].phone || undefined,
                    address: updated[i].address || undefined,
                    join_date: updated[i].join_date || undefined,
                    salary: updated[i].salary ? Number(updated[i].salary) : undefined,
                })
                updated[i] = { ...updated[i], _status: 'success', _msg: '' }
                successCount++
            } catch (err) {
                updated[i] = { ...updated[i], _status: 'error', _msg: err.message || 'Failed' }
            }
            setImportRows([...updated])
        }
        setIsImporting(false)
        toast.success(`${successCount} employee${successCount !== 1 ? 's' : ''} imported`)
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="Manage Staff" userName={adminName} role="admin" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Top bar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Staff Members</h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Manage your team ({employees.length} total)
                            </p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or department..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                            <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap cursor-pointer">
                                <Table2 size={16} /> Import Excel
                                <input type="file" accept=".xlsx,.xls" className="hidden" ref={excelInputRef} onChange={handleExcelFile} />
                            </label>
                            <button
                                onClick={handleAddOpen}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Employee
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex gap-4 animate-pulse">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <div key={j} className="h-6 bg-slate-100 rounded flex-1" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users size={48} className="text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 font-medium text-lg">No employees yet</p>
                                <p className="text-slate-400 text-sm mt-1 mb-6">Add your first employee to get started</p>
                                <button
                                    onClick={handleAddOpen}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium rounded-lg transition-colors"
                                >
                                    <Plus size={16} /> Add First Employee
                                </button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <Search size={48} className="text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium text-lg">No employees found for your search</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left">
                                            {['Name', 'Email', 'Department', 'Designation', 'Phone', 'Join Date', 'Salary', 'Actions'].map(h => (
                                                <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filtered.map(emp => (
                                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-slate-800">{emp.name}</div>
                                                </td>
                                                <td className="px-6 py-3 text-slate-500">{emp.users?.email || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{emp.department || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{emp.designation || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{emp.phone || '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN') : '—'}</td>
                                                <td className="px-6 py-3 text-slate-500">{emp.salary ? `₹${Number(emp.salary).toLocaleString('en-IN')}` : '—'}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedEmp(emp); setViewDocUrls({ id_proof_url: emp.id_proof_url || null, bank_detail_url: emp.bank_detail_url || null }); setModalMode('view') }}
                                                            className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                                                            title="View details"
                                                        ><Eye size={16} /></button>
                                                        <button
                                                            onClick={() => handleEditOpen(emp)}
                                                            className="p-1.5 hover:bg-amber-50 text-amber-500 rounded-lg transition-colors"
                                                            title="Edit employee"
                                                        ><Edit size={16} /></button>
                                                        <button
                                                            onClick={() => setDeleteTarget(emp)}
                                                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                                            title="Delete employee"
                                                        ><Trash2 size={16} /></button>
                                                    </div>
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

            {/* Add / Edit Modal */}
            <Modal
                isOpen={modalMode === 'add' || modalMode === 'edit'}
                onClose={() => {
                    if (getFormChanges() && modalMode === 'add') {
                        if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
                    }
                    setModalMode(null);
                }}
                title={modalMode === 'edit' ? 'Edit Employee' : 'Add New Employee'}
                size="lg"
            >
                {errors._form && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {errors._form}
                    </div>
                )}
                <EmployeeForm form={form} setForm={setForm} errors={errors} isEdit={modalMode === 'edit'} isSubmitting={isSubmitting} />
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button
                        onClick={() => setModalMode(null)}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                        {isSubmitting ? (modalMode === 'edit' ? 'Saving...' : 'Creating...') : (modalMode === 'edit' ? 'Save Changes' : 'Add Employee')}
                    </button>
                </div>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={modalMode === 'view'} onClose={() => setModalMode(null)} title="Employee Profile" size="md">
                {selectedEmp && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl uppercase">
                                {selectedEmp.name?.[0] || '?'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-xl">{selectedEmp.name}</h3>
                                <p className="text-slate-500">{selectedEmp.designation} · {selectedEmp.department}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                            <div className="flex items-start gap-3">
                                <Mail className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.users?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phone</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.phone || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Address</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.address || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Join Date</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.join_date ? new Date(selectedEmp.join_date).toLocaleDateString('en-IN') : '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <DollarSign className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Salary</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.salary ? `₹${Number(selectedEmp.salary).toLocaleString('en-IN')}` : '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Added On</p>
                                    <p className="text-slate-700 text-sm mt-0.5">{selectedEmp.created_at ? new Date(selectedEmp.created_at).toLocaleDateString('en-IN') : '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Documents</p>
                            <div className="border border-slate-100 rounded-xl px-3">
                                <AdminDocumentField
                                    label="ID Proof"
                                    urlKey="id_proof_url"
                                    currentPath={viewDocUrls.id_proof_url}
                                    employeeUserId={selectedEmp.user_id}
                                    employeeId={selectedEmp.id}
                                    onUploaded={(key, path) => setViewDocUrls(prev => ({ ...prev, [key]: path }))}
                                />
                                <AdminDocumentField
                                    label="Bank Details"
                                    urlKey="bank_detail_url"
                                    currentPath={viewDocUrls.bank_detail_url}
                                    employeeUserId={selectedEmp.user_id}
                                    employeeId={selectedEmp.id}
                                    onUploaded={(key, path) => setViewDocUrls(prev => ({ ...prev, [key]: path }))}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Import Excel Modal */}
            <Modal isOpen={showImportModal} onClose={() => { if (!isImporting) setShowImportModal(false) }} title="Import Employees from Excel" size="xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            {importRows.length} row{importRows.length !== 1 ? 's' : ''} loaded.{' '}
                            <span className="text-red-500">{importRows.filter(r => r._errors.length > 0).length} invalid</span>{', '}
                            <span className="text-emerald-600">{importRows.filter(r => r._status === 'success').length} imported</span>
                        </p>
                        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium">
                            <Download size={13} /> Download Template
                        </button>
                    </div>

                    <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-xl">
                        <table className="w-full text-xs min-w-175">
                            <thead className="sticky top-0 bg-slate-50">
                                <tr>
                                    {['#', 'Name', 'Email', 'Department', 'Designation', 'Phone', 'Join Date', 'Salary', 'Status', ''].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {importRows.map((row, idx) => (
                                    <tr key={idx} className={
                                        row._status === 'success' ? 'bg-emerald-50' :
                                        row._status === 'error' ? 'bg-red-50' :
                                        row._errors.length > 0 ? 'bg-amber-50' : ''
                                    }>
                                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{row.name || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.email || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.department || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.designation || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500">{row.phone || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.join_date || '—'}</td>
                                        <td className="px-3 py-2 text-slate-500">{row.salary || '—'}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {row._status === 'success' ? (
                                                <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle size={12} /> Imported</span>
                                            ) : row._status === 'error' ? (
                                                <span className="flex items-center gap-1 text-red-500 font-medium" title={row._msg}><AlertCircle size={12} /> {row._msg.slice(0, 30)}</span>
                                            ) : row._errors.length > 0 ? (
                                                <span className="text-amber-600 font-medium" title={row._errors.join(', ')}>{row._errors[0]}</span>
                                            ) : (
                                                <span className="text-slate-400">Ready</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row._status !== 'success' && (
                                                <button onClick={() => removeImportRow(idx)} disabled={isImporting} className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button onClick={() => setShowImportModal(false)} disabled={isImporting} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
                            Close
                        </button>
                        <button
                            onClick={handleBulkImport}
                            disabled={isImporting || importRows.every(r => r._errors.length > 0 || r._status === 'success')}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isImporting && <Loader2 size={15} className="animate-spin" />}
                            {isImporting ? 'Importing...' : `Import ${importRows.filter(r => r._errors.length === 0 && r._status !== 'success').length} Valid Row(s)`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Employee"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                loading={isDeleting}
            />
        </div>
    )
}
