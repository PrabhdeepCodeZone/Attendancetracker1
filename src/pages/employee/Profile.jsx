import { useState, useMemo } from 'react'
import { Pencil, Save, Loader2, User, Upload, FileText, Eye, X } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { toast } from '../../lib/toast'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

const INFO_FIELDS = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email', fromUser: true },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'join_date', label: 'Join Date', isDate: true },
    { key: 'salary', label: 'Monthly Salary', isCurrency: true },
]

const BUCKET = 'employee-documents'

function DocumentUpload({ label, description, urlKey, currentUrl, userId, employeeId, onUploaded }) {
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowed.includes(file.type)) {
            toast.error('Only JPG, PNG, WEBP, or PDF files are allowed')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be under 5MB')
            return
        }

        setUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `${userId}/${urlKey}.${ext}`

            const { error: uploadErr } = await supabase.storage
                .from(BUCKET)
                .upload(path, file, { upsert: true })
            if (uploadErr) throw uploadErr

            // Store signed URL path in DB (not public URL since bucket is private)
            const { error: dbErr } = await supabase
                .from('employees')
                .update({ [urlKey]: path })
                .eq('id', employeeId)
            if (dbErr) throw dbErr

            onUploaded(urlKey, path)
            toast.success(`${label} uploaded successfully`)
        } catch (err) {
            console.error('Upload error:', err)
            toast.error(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handlePreview = async () => {
        if (!currentUrl) return
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(currentUrl, 60)
            if (error) throw error
            setPreviewUrl(data.signedUrl)
        } catch {
            toast.error('Could not open document')
        }
    }

    const isPdf = currentUrl?.endsWith('.pdf')

    return (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>

            {currentUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                        <FileText size={13} />
                        Uploaded
                    </div>
                    <button
                        onClick={handlePreview}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-medium transition-colors"
                    >
                        <Eye size={13} /> View
                    </button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        Replace
                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} disabled={uploading} />
                    </label>
                </div>
            ) : (
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${uploading ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'}`}>
                    {uploading
                        ? <><Loader2 size={18} className="animate-spin text-teal-600" /><span className="text-sm text-teal-600">Uploading...</span></>
                        : <><Upload size={18} className="text-slate-400" /><span className="text-sm text-slate-500">Click to upload <span className="text-xs">(JPG, PNG, PDF · max 5MB)</span></span></>
                    }
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} disabled={uploading} />
                </label>
            )}

            {/* Preview modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="relative bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <p className="font-medium text-slate-700 text-sm">{label}</p>
                            <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        {isPdf ? (
                            <iframe src={previewUrl} className="w-full h-[75vh]" title={label} />
                        ) : (
                            <img src={previewUrl} alt={label} className="w-full object-contain max-h-[75vh]" />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Profile() {
    const { employeeProfile, user } = useAuth()
    const [editing, setEditing] = useState(false)
    const [phone, setPhone] = useState(employeeProfile?.phone || '')
    const [address, setAddress] = useState(employeeProfile?.address || '')
    const [saving, setSaving] = useState(false)
    const [docUrls, setDocUrls] = useState({
        id_proof_url: employeeProfile?.id_proof_url || null,
        bank_detail_url: employeeProfile?.bank_detail_url || null,
    })

    const completeness = useMemo(() => {
        if (!employeeProfile) return 0
        const fields = ['name', 'phone', 'address', 'department', 'designation', 'join_date', 'salary']
        const filled = fields.filter(f => employeeProfile[f]).length
        const docsFilled = (docUrls.id_proof_url ? 1 : 0) + (docUrls.bank_detail_url ? 1 : 0)
        return Math.round(((filled + docsFilled) / (fields.length + 2)) * 100)
    }, [employeeProfile, docUrls])

    const handleSave = async () => {
        if (!employeeProfile) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('employees')
                .update({ phone, address })
                .eq('id', employeeProfile.id)
            if (error) throw error
            toast.success('Profile updated successfully')
            setEditing(false)
        } catch (err) {
            console.error('Profile save error:', err)
            toast.error(err.message || 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleDocUploaded = (key, path) => {
        setDocUrls(prev => ({ ...prev, [key]: path }))
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar role="employee" />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar title="My Profile" userName={employeeProfile?.name} role="employee" />
                <main className="flex-1 p-4 lg:p-6 space-y-6">
                    {/* Profile header */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl border border-white/30">
                                {employeeProfile?.name?.[0]?.toUpperCase() || <User size={28} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{employeeProfile?.name || 'Employee'}</h2>
                                <p className="text-teal-100 text-sm mt-0.5">{employeeProfile?.designation} · {employeeProfile?.department}</p>
                            </div>
                        </div>
                        <div className="mt-5 relative">
                            <div className="flex justify-between text-xs text-teal-100 mb-1.5">
                                <span>Profile Completeness</span>
                                <span>{completeness}%</span>
                            </div>
                            <div className="w-full bg-teal-500/40 rounded-full h-2">
                                <div
                                    className="bg-white rounded-full h-2 transition-all duration-500"
                                    style={{ width: `${completeness}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-semibold text-slate-800">Personal Information</h3>
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditing(false); setPhone(employeeProfile?.phone || ''); setAddress(employeeProfile?.address || '') }}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {INFO_FIELDS.map(({ key, label, fromUser, isDate, isCurrency }) => {
                                const rawVal = fromUser ? user?.email : employeeProfile?.[key]
                                const displayVal = isCurrency
                                    ? (rawVal ? `₹${Number(rawVal).toLocaleString('en-IN')}` : '—')
                                    : isDate
                                        ? (rawVal ? new Date(rawVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—')
                                        : rawVal || '—'
                                return (
                                    <div key={key}>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                                        <p className="text-slate-800 font-medium mt-1 text-sm">{displayVal}</p>
                                    </div>
                                )
                            })}

                            {/* Phone — editable */}
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</p>
                                {editing ? (
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Enter phone number"
                                    />
                                ) : (
                                    <p className="text-slate-800 font-medium mt-1 text-sm">{phone || '—'}</p>
                                )}
                            </div>

                            {/* Address — editable */}
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</p>
                                {editing ? (
                                    <textarea
                                        rows={2}
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                        placeholder="Enter address"
                                    />
                                ) : (
                                    <p className="text-slate-800 font-medium mt-1 text-sm">{address || '—'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Documents card */}
                    {employeeProfile && user && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Documents</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DocumentUpload
                                    label="ID Proof"
                                    description="Aadhaar, PAN, Passport, or any govt. issued ID"
                                    urlKey="id_proof_url"
                                    currentUrl={docUrls.id_proof_url}
                                    userId={user.id}
                                    employeeId={employeeProfile.id}
                                    onUploaded={handleDocUploaded}
                                />
                                <DocumentUpload
                                    label="Bank Details"
                                    description="Cancelled cheque or bank passbook first page"
                                    urlKey="bank_detail_url"
                                    currentUrl={docUrls.bank_detail_url}
                                    userId={user.id}
                                    employeeId={employeeProfile.id}
                                    onUploaded={handleDocUploaded}
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
