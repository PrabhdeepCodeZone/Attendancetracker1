    import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CalendarCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { signIn, userRole, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (authLoading) return

        if (userRole === 'admin') navigate('/admin/dashboard', { replace: true })
        else if (userRole === 'employee') navigate('/employee/dashboard', { replace: true })
    }, [authLoading, navigate, userRole])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!email || !password) {
            setError('Please enter your email and password.')
            return
        }
        setLoading(true)
        try {
            await signIn(email, password)
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || 'Invalid credentials. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-teal-700 flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/20">
                        <CalendarCheck size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">CI/CD ssjs Test 1</h1>
                    <p className="text-indigo-200 mt-1 text-sm">Sign in to your account</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-white mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all text-sm"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all text-sm"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3">
                                <p className="text-red-200 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-white/20 pt-5">
                        <div className="grid grid-cols-2 gap-3 text-center text-xs text-white/60">
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="font-semibold text-white mb-0.5">Admin</p>
                                <p>Full access to all modules</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="font-semibold text-white mb-0.5">Employee</p>
                                <p>View personal records</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-white/40 text-xs mt-6">
                    © {new Date().getFullYear()} AttendanceIQ. All rights reserved.
                </p>
            </div>
        </div>
    )
}
