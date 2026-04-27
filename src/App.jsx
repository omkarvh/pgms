import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import Tenants from './pages/Tenants'
import Payments from './pages/Payments'
import Expenses from './pages/Expenses'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import Assets from './pages/Assets'
import Settings from './pages/Settings'
import DeleteRequests from './pages/DeleteRequests'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-mono">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (role === 'denied') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm font-mono">Your account is not authorized. Contact the admin.</p>
      </div>
    </div>
  )
  if (adminOnly && role !== 'admin') return <Navigate to="/dashboard" />
  return children
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute adminOnly><Staff /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute adminOnly><Assets /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
        <Route path="/delete-requests" element={<ProtectedRoute adminOnly><DeleteRequests /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </HashRouter>
  )
}

export default App