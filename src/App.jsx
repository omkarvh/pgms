import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Lazy load all pages
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Rooms = lazy(() => import('./pages/Rooms'))
const Tenants = lazy(() => import('./pages/Tenants'))
const Payments = lazy(() => import('./pages/Payments'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Staff = lazy(() => import('./pages/Staff'))
const Reports = lazy(() => import('./pages/Reports'))
const Assets = lazy(() => import('./pages/Assets'))
const Settings = lazy(() => import('./pages/Settings'))
const DeleteRequests = lazy(() => import('./pages/DeleteRequests'))
const Notifications = lazy(() => import('./pages/Notifications'))
const AccessControl = lazy(() => import('./pages/AccessControl'))
const Analytics = lazy(() => import('./pages/Analytics'))

const PageLoader = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-500 text-xs font-mono">Loading...</p>
    </div>
  </div>
)

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'denied') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm font-mono">Your account is not authorized. Contact the admin.</p>
      </div>
    </div>
  )
  if (adminOnly && role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/access-control" element={<ProtectedRoute adminOnly><AccessControl /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute adminOnly><Analytics /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App