import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const icons = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error: <XCircle size={18} className="text-red-500" />,
    info: <AlertCircle size={18} className="text-blue-500" />,
}

const bgMap = {
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
}

function ToastItem({ id, type, message, onRemove }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(id), 3000)
        return () => clearTimeout(timer)
    }, [id, onRemove])

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgMap[type]} max-w-sm w-full animate-in slide-in-from-top-4 duration-300 pointer-events-auto`}>
            <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>
            <p className="text-sm font-medium text-slate-700 flex-1">{message}</p>
            <button onClick={() => onRemove(id)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={15} />
            </button>
        </div>
    )
}

let toastFn = null

export function ToastContainer() {
    const [toasts, setToasts] = useState([])

    const addToast = (message, type = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, type, message }])
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    useEffect(() => {
        toastFn = addToast
        return () => { toastFn = null }
    }, [])

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <ToastItem key={t.id} {...t} onRemove={removeToast} />
            ))}
        </div>
    )
}

export const toast = {
    success: (msg) => toastFn?.(msg, 'success'),
    error: (msg) => toastFn?.(msg, 'error'),
    info: (msg) => toastFn?.(msg, 'info'),
}
