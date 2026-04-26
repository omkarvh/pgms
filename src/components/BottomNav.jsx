import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const allNavItems = [
  { label: 'Home', icon: '⚡', path: '/dashboard', adminOnly: false },
  { label: 'Rooms', icon: '🏠', path: '/rooms', adminOnly: false },
  { label: 'Tenants', icon: '👥', path: '/tenants', adminOnly: false },
  { label: 'Finance', icon: '💰', path: '/payments', adminOnly: false },
  { label: 'Reports', icon: '📊', path: '/reports', adminOnly: true },
  { label: 'More', icon: '⚙️', path: '/settings', adminOnly: true },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()

  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center py-2 z-50 md:hidden">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 px-4 py-1 text-xs font-semibold transition-all
            ${location.pathname === item.path ? 'text-indigo-400' : 'text-gray-600'}`}
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}