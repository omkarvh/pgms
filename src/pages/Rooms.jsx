import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'
import { sendNotification } from '../firebase/notifications'
import { useAuth } from '../context/AuthContext'

const statusColors = {
  vacant: 'bg-green-500/10 border-green-500/30 text-green-400',
  occupied: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  maintenance: 'bg-red-500/10 border-red-500/30 text-red-400',
  reserved: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
}

export default function Rooms() {
  const { role } = useAuth()
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [form, setForm] = useState({
    number: '', type: 'single', monthlyRate: '', dailyRate: '', status: 'vacant', floor: '', amenities: ''
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const openAdd = () => {
    setEditRoom(null)
    setForm({ number: '', type: 'single', monthlyRate: '', dailyRate: '', status: 'vacant', floor: '', amenities: '' })
    setShowModal(true)
  }

  const openEdit = (room) => {
    setEditRoom(room)
    setForm({
      number: room.number,
      type: room.type,
      monthlyRate: room.monthlyRate,
      dailyRate: room.dailyRate,
      status: room.status,
      floor: room.floor,
      amenities: room.amenities
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.number) return
    const data = {
      number: form.number,
      type: form.type,
      monthlyRate: Number(form.monthlyRate),
      dailyRate: Number(form.dailyRate),
      status: form.status,
      floor: form.floor,
      amenities: form.amenities,
    }
    if (editRoom) {
      await updateDoc(doc(db, 'rooms', editRoom.id), data)
    } else {
      await addDoc(collection(db, 'rooms'), data)
      await sendNotification('info', '🏠 New Room Added', `Room ${form.number} (${form.type}) added on Floor ${form.floor}`)
    }
    setShowModal(false)
  }

  const handleDelete = async (id, number) => {
    if (window.confirm('Delete this room?')) {
      await deleteDoc(doc(db, 'rooms', id))
      await sendNotification('info', '🏠 Room Deleted', `Room ${number} has been removed`)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Rooms</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{rooms.length}/{pgConfig.max_rooms} total</p>
          </div>
          {role === 'admin' && (
            <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
              + Add Room
            </button>
          )}
        </div>

        {role === 'warden' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-yellow-400 text-xs font-mono">
            🔑 Warden view — rooms are read only. Contact admin to add or remove rooms.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {['vacant', 'occupied', 'reserved', 'maintenance'].map(s => (
            <div key={s} className={`border rounded-xl p-4 ${statusColors[s]}`}>
              <p className="text-xs font-mono uppercase tracking-widest mb-1">{s}</p>
              <p className="text-2xl font-black">{rooms.filter(r => r.status === s).length}</p>
            </div>
          ))}
        </div>

        {rooms.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-gray-400 font-mono text-sm">No rooms yet. Add your first room.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms.map(room => (
              <div key={room.id} className={`border rounded-xl p-4 transition-all hover:scale-105 ${statusColors[room.status]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-black">{room.number}</span>
                  <span className="text-xs font-mono uppercase">{room.status}</span>
                </div>
                <p className="text-xs opacity-70 mb-1 capitalize">{room.type} · Floor {room.floor}</p>
                <p className="text-xs opacity-70 mb-3">{pgConfig.currency}{room.monthlyRate}/mo · {pgConfig.currency}{room.dailyRate}/day</p>
                {room.amenities && <p className="text-xs opacity-50 mb-3">{room.amenities}</p>}
                <div className="flex gap-2">
                  {role === 'admin' && (
                    <button onClick={() => openEdit(room)} className="flex-1 bg-white/10 hover:bg-white/20 text-xs py-1 rounded-lg transition-all">Edit</button>
                  )}
                  {role === 'admin' && (
                    <button onClick={() => handleDelete(room.id, room.number)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded-lg transition-all">Delete</button>
                  )}
                  {role === 'warden' && (
                    <div className="w-full text-center text-xs text-gray-600 font-mono py-1">View only</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && role === 'admin' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editRoom ? 'Edit Room' : 'Add Room'}</h3>
            <div className="space-y-3">
              <input value={form.number} onChange={e => setForm({...form, number: e.target.value})}
                placeholder="Room Number (e.g. 101)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dormitory">Dormitory</option>
              </select>
              <input value={form.floor} onChange={e => setForm({...form, floor: e.target.value})}
                placeholder="Floor (e.g. 1)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.monthlyRate} onChange={e => setForm({...form, monthlyRate: e.target.value})}
                placeholder="Monthly Rate (₹)" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.dailyRate} onChange={e => setForm({...form, dailyRate: e.target.value})}
                placeholder="Daily Rate (₹)" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
              <input value={form.amenities} onChange={e => setForm({...form, amenities: e.target.value})}
                placeholder="Amenities (e.g. WiFi, AC, Geyser)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">
                {editRoom ? 'Update' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}