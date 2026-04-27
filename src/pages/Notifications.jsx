import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'

const typeColors = {
  due: 'bg-red-500/10 border-red-500/30 text-red-400',
  booking: 'bg-green-500/10 border-green-500/30 text-green-400',
  expense: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  info: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
}

const typeIcons = {
  due: '⚠️',
  booking: '🏠',
  expense: '🧾',
  info: 'ℹ️',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const { role } = useAuth()

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), snap => {
      setNotifications(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      )
    })
    return unsub
  }, [])

  const markRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true })
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })))
  }

  const deleteNotif = async (id) => {
    await deleteDoc(doc(db, 'notifications', id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Notifications</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
              Mark All Read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-400 font-mono text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`border rounded-xl p-4 flex items-start gap-4 transition-all ${typeColors[notif.type]} ${!notif.read ? 'opacity-100' : 'opacity-50'}`}
              >
                <div className="text-2xl flex-shrink-0">{typeIcons[notif.type]}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-white">{notif.title}</div>
                  <div className="text-xs mt-0.5 opacity-80">{notif.message}</div>
                  <div className="text-xs font-mono opacity-50 mt-1">{notif.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!notif.read && (
                    <button onClick={() => markRead(notif.id)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all">
                      ✓
                    </button>
                  )}
                  {role === 'admin' && (
                    <button onClick={() => deleteNotif(notif.id)} className="text-xs bg-white/10 hover:bg-red-500/30 px-2 py-1 rounded-lg transition-all">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}