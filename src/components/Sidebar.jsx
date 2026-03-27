import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarCheck, ClipboardList,
    DollarSign, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/staff', label: 'Manage Staff', icon: Users },
    { to: '/admin/attendance/mark', label: 'Mark Attendance', icon: CalendarCheck },
    { to: '/admin/attendance/records', label: 'Attendance Records', icon: ClipboardList },
    { to: '/admin/salary', label: 'Salary Slips', icon: DollarSign },
]

const employeeLinks = [
    { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/attendance', label: 'My Attendance', icon: CalendarCheck },
    { to: '/employee/profile', label: 'My Profile', icon: Users },
    { to: '/employee/salary', label: 'My Salary Slip', icon: DollarSign },
]

export default function Sidebar({ role }) {
    const [isOpen, setIsOpen] = useState(false)
    const { signOut } = useAuth()
    const navigate = useNavigate()
    const links = role === 'admin' ? adminLinks : employeeLinks

    const isAdmin = role === 'admin'
    const accentColor = isAdmin
        ? 'bg-indigo-600 hover:bg-indigo-700'
        : 'bg-teal-600 hover:bg-teal-700'
    const activeBg = isAdmin ? 'bg-indigo-700' : 'bg-teal-700'
    const hoverBg = isAdmin ? 'hover:bg-indigo-500/30' : 'hover:bg-teal-500/30'
    const headerBg = isAdmin ? 'bg-indigo-900' : 'bg-teal-900'
    const sidebarBg = isAdmin ? 'bg-indigo-800' : 'bg-teal-800'
    const borderColor = isAdmin ? 'border-indigo-700' : 'border-teal-700'

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const SidebarContent = () => (
        <div className={`flex flex-col h-full ${sidebarBg}`}>
            <div className={`flex items-center gap-3 px-6 py-5 ${headerBg} border-b ${borderColor}`}>
                <div className={`w-8 h-8 rounded-lg ${accentColor} flex items-center justify-center`}>
                    <CalendarCheck size={16} className="text-white" />
                </div>
                <div>
                    <h1 className="text-white font-bold text-sm leading-none">AttendanceIQ</h1>
                    <p className="text-white/50 text-xs mt-0.5 capitalize">{role} Panel</p>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive
                                ? `${activeBg} text-white shadow-sm`
                                : `text-white/70 ${hoverBg} hover:text-white`
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon size={17} className={isActive ? 'text-white' : 'text-white/60 group-hover:text-white'} />
                                {label}
                                {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className={`px-3 pb-4 border-t ${borderColor} pt-3`}>
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150 w-full`}
                >
                    <LogOut size={17} />
                    Logout
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile toggle */}
            <button
                className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg ${accentColor} text-white shadow-lg`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <div className={`lg:hidden fixed left-0 top-0 h-full w-64 z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex flex-col w-64 min-h-screen flex-shrink-0">
                <SidebarContent />
            </div>
        </>
    )
}
