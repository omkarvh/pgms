import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'
import { sendNotification } from '../firebase/notifications'

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editTenant, setEditTenant] = useState(null)
  const [tab, setTab] = useState('active')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', roomId: '', roomNumber: '',
    rentMode: 'monthly', joinDate: '', idType: '', idNumber: '', advance: '', emergencyContact: ''
  })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'tenants'), snap => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsub2 = onSnapshot(collection(db, 'rooms'), snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  const vacantRooms = rooms.filter(r => r.status === 'vacant')

  const openAdd = () => {
    setEditTenant(null)
    setForm({ name: '', phone: '', email: '', roomId: '', roomNumber: '', rentMode: 'monthly', joinDate: '', idType: '', idNumber: '', advance: '', emergencyContact: '' })
    setShowModal(true)
  }

  const openEdit = (tenant) => {
    setEditTenant(tenant)
    setForm({
      name: tenant.name, phone: tenant.phone, email: tenant.email,
      roomId: tenant.roomId, roomNumber: tenant.roomNumber,
      rentMode: tenant.rentMode, joinDate: tenant.joinDate,
      idType: tenant.idType, idNumber: tenant.idNumber,
      advance: tenant.advance, emergencyContact: tenant.emergencyContact
    })
    setShowModal(true)
  }

  const handleRoomSelect = (e) => {
    const room = rooms.find(r => r.id === e.target.value)
    if (room) setForm({ ...form, roomId: room.id, roomNumber: room.number })
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.roomId) return alert('Name, Phone and Room are required')
    const data = {
      name: form.name, phone: form.phone, email: form.email,
      roomId: form.roomId, roomNumber: form.roomNumber,
      rentMode: form.rentMode, joinDate: form.joinDate,
      idType: form.idType, idNumber: form.idNumber,
      advance: Number(form.advance), emergencyContact: form.emergencyContact,
      status: 'active', createdAt: new Date().toISOString()
    }
    if (editTenant) {
      await updateDoc(doc(db, 'tenants', editTenant.id), data)
    } else {
      await addDoc(collection(db, 'tenants'), data)
      await updateDoc(doc(db, 'rooms', form.roomId), { status: 'occupied' })
      await sendNotification(
        'booking',
        '🏠 New Tenant Added',
        `${form.name} has been added to Room ${form.roomNumber} (${form.rentMode})`
      )
    }
    setShowModal(false)
  }

  const handleCheckout = async (tenant) => {
    if (!window.confirm(`Checkout ${tenant.name}?`)) return
    await updateDoc(doc(db, 'tenants', tenant.id), { status: 'left', leftDate: new Date().toISOString() })
    await updateDoc(doc(db, 'rooms', tenant.roomId), { status: 'vacant' })
  }

  const activeTenants = tenants.filter(t => t.status === 'active')
  const leftTenants = tenants.filter(t => t.status === 'left')
  const displayed = tab === 'active' ? activeTenants : leftTenants

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Tenants</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{activeTenants.length} active · {leftTenants.length} past</p>
          </div>
          <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Tenant
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Active ({activeTenants.length})
          </button>
          <button onClick={() => setTab('left')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'left' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Past Tenants ({leftTenants.length})
          </button>
        </div>

        {/* TENANT LIST */}
        {displayed.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-400 font-mono text-sm">No {tab} tenants yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map(tenant => (
              <div key={tenant.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                    {tenant.name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{tenant.name}</div>
                    <div className="text-gray-500 text-xs font-mono">Room {tenant.roomNumber} · {tenant.rentMode}</div>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-xs text-gray-500">📞 {tenant.phone}</p>
                  {tenant.email && <p className="text-xs text-gray-500">✉️ {tenant.email}</p>}
                  <p className="text-xs text-gray-500">📅 Joined: {tenant.joinDate}</p>
                  {tenant.advance > 0 && <p className="text-xs text-gray-500">💰 Advance: {pgConfig.currency}{tenant.advance}</p>}
                </div>
                {tab === 'active' && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(tenant)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded-lg transition-all">Edit</button>
                    <button onClick={() => handleCheckout(tenant)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded-lg transition-all">Checkout</button>
                  </div>
                )}
                {tab === 'left' && (
                  <p className="text-xs text-gray-600 font-mono">Left: {tenant.leftDate?.slice(0,10)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editTenant ? 'Edit Tenant' : 'Add Tenant'}</h3>

            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full Name *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="Phone Number *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <select value={form.roomId} onChange={handleRoomSelect}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">Select Room *</option>
                {vacantRooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.number} · {pgConfig.currency}{r.monthlyRate}/mo</option>
                ))}
              </select>

              <select value={form.rentMode} onChange={e => setForm({...form, rentMode: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>

              <input value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})}
                type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <select value={form.idType} onChange={e => setForm({...form, idType: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">ID Type</option>
                <option value="aadhar">Aadhar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="dl">Driving License</option>
              </select>

              <input value={form.idNumber} onChange={e => setForm({...form, idNumber: e.target.value})}
                placeholder="ID Number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.advance} onChange={e => setForm({...form, advance: e.target.value})}
                placeholder="Advance Amount (₹)" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.emergencyContact} onChange={e => setForm({...form, emergencyContact: e.target.value})}
                placeholder="Emergency Contact Number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">
                {editTenant ? 'Update' : 'Add Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}