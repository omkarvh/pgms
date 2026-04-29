import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'
import { sendNotification } from '../firebase/notifications'
import { useAuth } from '../context/AuthContext'

// Default capacity per room type
const typeCapacity = {
  single: 1,
  double: 2,
  triple: 3,
  dormitory: 6
}

const getStatusColor = (room) => {
  if (room.status === 'maintenance') return 'bg-red-500/10 border-red-500/30 text-red-400'
  if (room.status === 'reserved') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  const occupied = room.occupiedBeds || 0
  const capacity = room.capacity || typeCapacity[room.type] || 1
  if (occupied === 0) return 'bg-green-500/10 border-green-500/30 text-green-400'
  if (occupied >= capacity) return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
  return 'bg-orange-500/10 border-orange-500/30 text-orange-400'
}

const getStatusLabel = (room) => {
  if (room.status === 'maintenance') return 'Maintenance'
  if (room.status === 'reserved') return 'Reserved'
  const occupied = room.occupiedBeds || 0
  const capacity = room.capacity || typeCapacity[room.type] || 1
  if (occupied === 0) return 'Vacant'
  if (occupied >= capacity) return 'Full'
  return 'Partial'
}

// Capacity bar component
function CapacityBar({ occupied, capacity }) {
  const pct = capacity > 0 ? (occupied / capacity) * 100 : 0
  const color = pct === 0 ? 'bg-green-500' : pct >= 100 ? 'bg-indigo-500' : 'bg-orange-500'
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono opacity-70">{occupied}/{capacity} beds</span>
        <span className="text-xs font-mono opacity-70">{capacity - occupied} free</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
      </div>
      <div className="flex gap-1 mt-1.5">
        {Array.from({ length: capacity }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-sm ${i < occupied ? color : 'bg-white/10'}`}
          ></div>
        ))}
      </div>
    </div>
  )
}

export default function Rooms() {
  const { role } = useAuth()
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    number: '', type: 'single', monthlyRate: '', dailyRate: '',
    status: 'vacant', floor: '', amenities: '', capacity: 1
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const openAdd = () => {
    setEditRoom(null)
    setError('')
    setForm({ number: '', type: 'single', monthlyRate: '', dailyRate: '', status: 'vacant', floor: '', amenities: '', capacity: 1 })
    setShowModal(true)
  }

  const openEdit = (room) => {
    setEditRoom(room)
    setError('')
    setForm({
      number: room.number,
      type: room.type,
      monthlyRate: room.monthlyRate,
      dailyRate: room.dailyRate,
      status: room.status,
      floor: room.floor,
      amenities: room.amenities || '',
      capacity: room.capacity || typeCapacity[room.type] || 1
    })
    setShowModal(true)
  }

  const handleTypeChange = (type) => {
    setForm({ ...form, type, capacity: typeCapacity[type] || 1 })
  }

  const handleSave = async () => {
    if (!form.number) return setError('Room number is required')

    // Duplicate check
    const duplicate = rooms.find(r =>
      r.number === form.number && (!editRoom || r.id !== editRoom.id)
    )
    if (duplicate) return setError(`Room ${form.number} already exists`)

    setError('')
    const capacity = Number(form.capacity) || typeCapacity[form.type] || 1
    const data = {
      number: form.number,
      type: form.type,
      monthlyRate: Number(form.monthlyRate),
      dailyRate: Number(form.dailyRate),
      status: form.status,
      floor: form.floor,
      amenities: form.amenities,
      capacity,
      occupiedBeds: editRoom ? (editRoom.occupiedBeds || 0) : 0,
    }

    if (editRoom) {
      await updateDoc(doc(db, 'rooms', editRoom.id), data)
    } else {
      await addDoc(collection(db, 'rooms'), data)
      await sendNotification('info', '🏠 New Room Added', `Room ${form.number} (${form.type}, ${capacity} beds) added on Floor ${form.floor}`)
    }
    setShowModal(false)
  }

  const handleDelete = async (id, number) => {
    if (window.confirm('Delete this room?')) {
      await deleteDoc(doc(db, 'rooms', id))
      await sendNotification('info', '🏠 Room Deleted', `Room ${number} has been removed`)
    }
  }

  // Stats
  const totalBeds = rooms.reduce((s, r) => s + (r.capacity || typeCapacity[r.type] || 1), 0)
  const occupiedBeds = rooms.reduce((s, r) => s + (r.occupiedBeds || 0), 0)
  const availableBeds = totalBeds - occupiedBeds

  const byType = ['single', 'double', 'triple', 'dormitory'].map(t => ({
    type: t,
    rooms: rooms.filter(r => r.type === t).length,
    beds: rooms.filter(r => r.type === t).reduce((s, r) => s + (r.capacity || typeCapacity[t] || 1), 0),
    available: rooms.filter(r => r.type === t).reduce((s, r) => s + ((r.capacity || typeCapacity[t] || 1) - (r.occupiedBeds || 0)), 0)
  })).filter(t => t.rooms > 0)

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Rooms</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{rooms.length} rooms · {totalBeds} total beds</p>
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

        {/* BED STATS */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">Total Beds</p>
            <p className="text-2xl font-black text-white">{totalBeds}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">Occupied</p>
            <p className="text-2xl font-black text-indigo-400">{occupiedBeds}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">Available</p>
            <p className="text-2xl font-black text-green-400">{availableBeds}</p>
          </div>
        </div>

        {/* BY TYPE BREAKDOWN */}
        {byType.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Vacancy by Room Type</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {byType.map(t => (
                <div key={t.type} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs font-mono text-gray-500 capitalize mb-1">{t.type}</p>
                  <p className="text-lg font-black text-white">{t.available} <span className="text-xs text-gray-500">free</span></p>
                  <p className="text-xs text-gray-600 font-mono">{t.beds - t.available}/{t.beds} beds filled</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-gray-400 font-mono text-sm">No rooms yet. Add your first room.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms.map(room => {
              const capacity = room.capacity || typeCapacity[room.type] || 1
              const occupied = room.occupiedBeds || 0
              return (
                <div key={room.id} className={`border rounded-xl p-4 transition-all hover:scale-105 ${getStatusColor(room)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-black">{room.number}</span>
                    <span className="text-xs font-mono uppercase">{getStatusLabel(room)}</span>
                  </div>
                  <p className="text-xs opacity-70 mb-0.5 capitalize">{room.type} · Floor {room.floor}</p>
                  <p className="text-xs opacity-70 mb-1">{pgConfig.currency}{room.monthlyRate}/mo</p>

                  {/* CAPACITY BAR */}
                  <CapacityBar occupied={occupied} capacity={capacity} />

                  {room.amenities && <p className="text-xs opacity-50 mt-2 truncate">{room.amenities}</p>}

                  <div className="flex gap-2 mt-3">
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
              )
            })}
          </div>
        )}
      </main>

      {showModal && role === 'admin' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editRoom ? 'Edit Room' : 'Add Room'}</h3>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm mb-3">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-3">
              <input value={form.number} onChange={e => { setError(''); setForm({...form, number: e.target.value}) }}
                placeholder="Room Number (e.g. 101) *"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <select value={form.type} onChange={e => handleTypeChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="single">Single (1 bed)</option>
                <option value="double">Double (2 beds)</option>
                <option value="triple">Triple (3 beds)</option>
                <option value="dormitory">Dormitory (6 beds)</option>
              </select>

              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Bed Capacity</label>
                <input value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})}
                  placeholder="Number of beds" type="number" min="1" max="20"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                <p className="text-xs text-gray-600 font-mono mt-1">Auto-set based on type, you can override</p>
              </div>

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