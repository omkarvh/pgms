import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, hasPermission } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), snap => {
      setUnreadCount(snap.docs.filter(d => !d.data().read).length)
    })
    return unsub
  }, [])

  const mainNav = [
    { label: 'Home', icon: '⚡', path: '/dashboard' },
    { label: 'Rooms', icon: '🏠', path: '/rooms', permKey: 'rooms_view' },
    { label: 'Tenants', icon: '👥', path: '/tenants', permKey: 'tenants_view' },
    { label: 'Payments', icon: '💰', path: '/payments', permKey: 'payments_view' },
  ].filter(item => !item.permKey || hasPermission(item.permKey))

  const adminExtra = [
    { label: 'Expenses', icon: '🧾', path: '/expenses' },
    { label: 'Staff', icon: '👷', path: '/staff' },
    { label: 'Reports', icon: '📊', path: '/reports' },
    { label: 'Assets', icon: '📦', path: '/assets' },
    { label: 'Notifs', icon: '🔔', path: '/notifications' },
    { label: 'Deletes', icon: '🗑️', path: '/delete-requests' },
    { label: 'Access', icon: '🔐', path: '/access-control' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ]

  const wardenExtra = [
    { label: 'Expenses', icon: '🧾', path: '/expenses', permKey: 'expenses_view' },
    { label: 'Notifs', icon: '🔔', path: '/notifications', permKey: 'notifications_view' },
  ].filter(item => !item.permKey || hasPermission(item.permKey))

  const extraItems = role === 'admin' ? adminExtra : wardenExtra

  return (
    <>
      {/* MORE MENU */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="fixed bottom-16 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 z-50" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">More Pages</p>
            <div className="grid grid-cols-4 gap-3">
              {extraItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setShowMore(false) }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-all
                    ${location.pathname === item.path ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400'}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center py-2 z-50 md:hidden">
        {mainNav.map((item) => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setShowMore(false) }}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold transition-all
              ${location.pathname === item.path ? 'text-indigo-400' : 'text-gray-600'}`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {/* MORE BUTTON */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold transition-all relative
            ${showMore ? 'text-indigo-400' : 'text-gray-600'}`}
        >
          <span className="text-xl">☰</span>
          More
          {unreadCount > 0 && (
            <span className="absolute top-0 right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>
    </>
  )
}