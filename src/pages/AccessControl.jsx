import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const allPermissions = [
  { key: 'rooms_view', label: 'View Rooms', icon: '🏠' },
  { key: 'tenants_view', label: 'View Tenants', icon: '👥' },
  { key: 'tenants_add', label: 'Add Tenants', icon: '➕' },
  { key: 'tenants_checkout', label: 'Checkout Tenants', icon: '🚪' },
  { key: 'payments_view', label: 'View Payments', icon: '💰' },
  { key: 'payments_add', label: 'Add Payments', icon: '💳' },
  { key: 'expenses_view', label: 'View Expenses', icon: '🧾' },
  { key: 'expenses_add', label: 'Add Expenses', icon: '➕' },
  { key: 'notifications_view', label: 'View Notifications', icon: '🔔' },
]

export default function AccessControl() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  if (role !== 'admin') return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 md:ml-56 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm font-mono">Only admin can manage access control.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  )

  const togglePermission = async (userId, permKey, currentPerms) => {
  setSaving(userId + permKey)
  const perms = currentPerms || {}
  
  // If permissions object doesn't exist yet, initialize all as true first
  if (!currentPerms) {
    const initialPerms = {}
    allPermissions.forEach(p => { initialPerms[p.key] = true })
    initialPerms[permKey] = false
    await updateDoc(doc(db, 'users', userId), { permissions: initialPerms })
  } else {
    const currentVal = perms[permKey] !== false
    const updated = { ...perms, [permKey]: !currentVal }
    await updateDoc(doc(db, 'users', userId), { permissions: updated })
  }
  setSaving(null)
}

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'warden' ? 'warden' : 'warden'
    if (window.confirm(`Change this user's role?`)) {
      await updateDoc(doc(db, 'users', userId), { role: newRole })
    }
  }

  const removeUser = async (userId, email) => {
    if (window.confirm(`Remove ${email} from the system? They will no longer be able to login.`)) {
      await deleteDoc(doc(db, 'users', userId))
    }
  }

  const wardens = users.filter(u => u.role === 'warden')
  const admins = users.filter(u => u.role === 'admin')

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Access Control</h2>
          <p className="text-gray-500 font-mono text-xs mt-0.5">Manage user roles and permissions</p>
        </div>

        {/* ADMIN ACCOUNTS */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span>👑</span> Admin Accounts ({admins.length})
          </h3>
          {admins.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{user.email}</div>
                <div className="text-xs font-mono text-indigo-400">Full Access · Cannot be modified</div>
              </div>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg font-mono">ADMIN</span>
            </div>
          ))}
        </div>

        {/* WARDEN ACCOUNTS */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span>🔑</span> Warden Accounts ({wardens.length})
          </h3>

          {wardens.length === 0 ? (
            <p className="text-gray-600 text-sm font-mono text-center py-4">No wardens added yet.</p>
          ) : (
            <div className="space-y-4">
              {wardens.map(user => (
                <div key={user.id} className="border border-gray-700 rounded-xl p-4">

                  {/* WARDEN HEADER */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{user.email}</div>
                      <div className="text-xs font-mono text-yellow-400">Warden Account</div>
                    </div>
                    <button
                      onClick={() => removeUser(user.id, user.email)}
                      className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Remove
                    </button>
                  </div>

                  {/* PERMISSIONS */}
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Permissions</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allPermissions.map(perm => {
                      const isEnabled = user.permissions?.[perm.key] !== false
                      const isSaving = saving === user.id + perm.key
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                            ${isEnabled
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-gray-800 border-gray-700'
                            }`}
                          onClick={() => togglePermission(user.id, perm.key, user.permissions)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{perm.icon}</span>
                            <span className="text-xs font-semibold">{perm.label}</span>
                          </div>
                          <div className={`w-8 h-4 rounded-full transition-all relative ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HOW TO ADD NEW USER */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-bold mb-3 text-sm text-gray-400 uppercase font-mono tracking-widest">How to Add New User</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>1. Go to <span className="text-indigo-400 font-mono">Firebase Console → Firestore → users</span></p>
            <p>2. Click <span className="text-indigo-400 font-mono">Add document</span></p>
            <p>3. Add fields: <span className="text-indigo-400 font-mono">email</span> (their Gmail) and <span className="text-indigo-400 font-mono">role</span> = <span className="text-green-400 font-mono">warden</span></p>
            <p>4. They can now login and you can manage their permissions here</p>
          </div>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}