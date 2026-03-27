import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastContainer } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import ManageStaff from './pages/admin/ManageStaff'
import MarkAttendance from './pages/admin/MarkAttendance'
import AttendanceRecords from './pages/admin/AttendanceRecords'
import SalarySlips from './pages/admin/SalarySlips'
import EmployeeDashboard from './pages/employee/Dashboard'
import MyAttendance from './pages/employee/MyAttendance'
import Profile from './pages/employee/Profile'
import MySalarySlip from './pages/employee/MySalarySlip'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
          />
          <Route
            path="/admin/staff"
            element={<ProtectedRoute requiredRole="admin"><ManageStaff /></ProtectedRoute>}
          />
          <Route
            path="/admin/attendance/mark"
            element={<ProtectedRoute requiredRole="admin"><MarkAttendance /></ProtectedRoute>}
          />
          <Route
            path="/admin/attendance/records"
            element={<ProtectedRoute requiredRole="admin"><AttendanceRecords /></ProtectedRoute>}
          />
          <Route
            path="/admin/salary"
            element={<ProtectedRoute requiredRole="admin"><SalarySlips /></ProtectedRoute>}
          />

          {/* Employee routes */}
          <Route
            path="/employee/dashboard"
            element={<ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>}
          />
          <Route
            path="/employee/attendance"
            element={<ProtectedRoute requiredRole="employee"><MyAttendance /></ProtectedRoute>}
          />
          <Route
            path="/employee/profile"
            element={<ProtectedRoute requiredRole="employee"><Profile /></ProtectedRoute>}
          />
          <Route
            path="/employee/salary"
            element={<ProtectedRoute requiredRole="employee"><MySalarySlip /></ProtectedRoute>}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
