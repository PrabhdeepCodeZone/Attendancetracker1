import { LogOut, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar({ title, userName, role }) {
    const { signOut } = useAuth()
    const navigate = useNavigate()

    const isAdmin = role === 'admin'
    const borderAccent = isAdmin ? 'border-indigo-100' : 'border-teal-100'
    const textAccent = isAdmin ? 'text-indigo-600' : 'text-teal-600'
    const bgAccent = isAdmin ? 'bg-indigo-50 hover:bg-indigo-100' : 'bg-teal-50 hover:bg-teal-100'
    const avatarBg = isAdmin ? 'bg-indigo-600' : 'bg-teal-600'

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '??'

    return (
        <header className={`bg-white border-b ${borderAccent} px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm`}>
            <div className="pl-10 lg:pl-0">
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
                <button className={`p-2 rounded-lg ${bgAccent} transition-colors`}>
                    <Bell size={18} className={textAccent} />
                </button>

                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold`}>
                        {initials}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800 leading-none">{userName || 'User'}</p>
                        <p className={`text-xs ${textAccent} capitalize mt-0.5`}>{role}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut size={15} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    )
}
