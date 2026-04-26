import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuthState } from 'react-firebase-hooks/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import pgConfig from '../config/pgConfig'

const navItems = [
  { label: 'Dashboard', icon: '⚡', path: '/dashboard' },
  { label: 'Rooms', icon: '🏠', path: '/rooms' },
  { label: 'Tenants', icon: '👥', path: '/tenants' },
  { label: 'Bookings', icon: '📋', path: '/bookings' },
  { label: 'Payments', icon: '💰', path: '/payments' },
  { label: 'Expenses', icon: '🧾', path: '/expenses' },
  { label: 'Staff', icon: '👷', path: '/staff' },
  { label: 'Reports', icon: '📊', path: '/reports' },
  { label: 'Assets', icon: '📦', path: '/assets' },
  { label: 'Notifications', icon: '🔔', path: '/notifications' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
]

export default function Sidebar() {
  const [user] = useAuthState(auth)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-screen z-10">
      
      {/* LOGO */}
      <div className="p-5 border-b border-gray-800">
        <div className="text-xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">PGMS</div>
        <div className="text-gray-600 text-xs font-mono mt-0.5">{pgConfig.pg_name}</div>
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