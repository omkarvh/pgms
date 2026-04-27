import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import pgConfig from '../config/pgConfig'

const allNavItems = [
  { label: 'Dashboard', icon: '⚡', path: '/dashboard', adminOnly: false },
  { label: 'Rooms', icon: '🏠', path: '/rooms', adminOnly: false },
  { label: 'Tenants', icon: '👥', path: '/tenants', adminOnly: false },
  { label: 'Bookings', icon: '📋', path: '/bookings', adminOnly: false },
  { label: 'Payments', icon: '💰', path: '/payments', adminOnly: false },
  { label: 'Expenses', icon: '🧾', path: '/expenses', adminOnly: false },
  { label: 'Staff', icon: '👷', path: '/staff', adminOnly: true },
  { label: 'Reports', icon: '📊', path: '/reports', adminOnly: true },
  { label: 'Assets', icon: '📦', path: '/assets', adminOnly: true },
  { label: 'Notifications', icon: '🔔', path: '/notifications', adminOnly: false },
  { label: 'Delete Requests', icon: '🗑️', path: '/delete-requests', adminOnly: true },
  { label: 'Settings', icon: '⚙️', path: '/settings', adminOnly: true },
]
export default function Sidebar() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-screen z-10">

      {/* LOGO */}
      <div className="p-5 border-b border-gray-800">
        <div className="text-xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">PGMS</div>
        <div className="text-gray-600 text-xs font-mono mt-0.5">{pgConfig.pg_name}</div>
      </div>

      {/* ROLE BADGE */}
      <div className="px-5 py-2 border-b border-gray-800">
        <span className={`text-xs font-mono px-2 py-0.5 rounded-lg font-bold ${role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          {role === 'admin' ? '👑 Admin' : '🔑 Warden'}
        </span>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-semibold transition-all text-left
              ${location.pathname === item.path
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-gray-500 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {pgConfig.owner_name[0]}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{pgConfig.owner_name}</div>
            <div className="text-xs text-gray-600 font-mono">Owner</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-mono py-2 rounded-lg transition-all"
        >
          Logout
        </button>
      </div>

    </aside>
  )
}