import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { usePgConfig } from '../context/PgConfigContext'
import { sendNotification } from '../firebase/notifications'
import { useAuth } from '../context/AuthContext'

const typeCapacity = { single: 1, double: 2, triple: 3, dormitory: 6 }

export default function Bookings() {
  const pgConfig = usePgConfig()
  const { role } = useAuth()
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', roomId: '', roomNumber: '',
    rentMode: 'monthly', moveInDate: '', idType: '', idNumber: '',
    advance: '', emergencyContact: '', address: '', notes: ''
  })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'bookings'), snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.moveInDate) - new Date(b.moveInDate)))
    })
    const unsub2 = onSnapshot(collection(db, 'rooms'), snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  const getReservedBeds = (roomId) => {
    return bookings.filter(b => b.roomId === roomId && b.status === 'confirmed').length
  }

  const availableRooms = rooms.filter(r => {
    if (r.status === 'maintenance') return false
    const capacity = r.capacity || typeCapacity[r.type] || 1
    const occupied = r.occupiedBeds || 0
    const reserved = getReservedBeds(r.id)
    return (occupied + reserved) < capacity
  })

  const handleRoomSelect = (e) => {
    const room = rooms.find(r => r.id === e.target.value)
    if (room) setForm({ ...form, roomId: room.id, roomNumber: room.number })
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.roomId || !form.moveInDate)
      return alert('Name, Phone, Room and Move-in Date are required')
    if (!form.advance || Number(form.advance) <= 0)
      return alert('Advance amount is required for booking')

    await addDoc(collection(db, 'bookings'), {
      name: form.name, phone: form.phone, email: form.email,
      roomId: form.roomId, roomNumber: form.roomNumber,
      rentMode: form.rentMode, moveInDate: form.moveInDate,
      idType: form.idType, idNumber: form.idNumber,
      advance: Number(form.advance), emergencyContact: form.emergencyContact,
      address: form.address, notes: form.notes,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    })

    await sendNotification('booking', 'Advance Booking Created', `${form.name} booked Room ${form.roomNumber} for ${form.moveInDate} (Advance: ${pgConfig.currency}${Number(form.advance).toLocaleString('en-IN')})`)

    setShowModal(false)
    setForm({ name: '', phone: '', email: '', roomId: '', roomNumber: '', rentMode: 'monthly', moveInDate: '', idType: '', idNumber: '', advance: '', emergencyContact: '', address: '', notes: '' })
  }

  const handleCheckIn = async (booking) => {
    // Add as active tenant
    await addDoc(collection(db, 'tenants'), {
      name: booking.name, phone: booking.phone, email: booking.email,
      roomId: booking.roomId, roomNumber: booking.roomNumber,
      rentMode: booking.rentMode, joinDate: booking.moveInDate,
      idType: booking.idType, idNumber: booking.idNumber,
      advance: booking.advance, emergencyContact: booking.emergencyContact,
      address: booking.address, notes: booking.notes,
      idPhotoData: null, tenantPhotoData: null,
      status: 'active', createdAt: new Date().toISOString()
    })

    // Update room occupancy
    const roomSnap = await getDoc(doc(db, 'rooms', booking.roomId))
    if (roomSnap.exists()) {
      const roomData = roomSnap.data()
      const newOccupied = (roomData.occupiedBeds || 0) + 1
      await updateDoc(doc(db, 'rooms', booking.roomId), {
        occupiedBeds: newOccupied,
        status: 'occupied'
      })
    }

    // Mark booking as checked in
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'checked_in' })

    await sendNotification('booking', 'Booking Checked In', `${booking.name} has checked into Room ${booking.roomNumber}`)
    setConfirmAction(null)
  }

  const handleCancel = async (booking) => {
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' })
    await sendNotification('info', 'Booking Cancelled', `${booking.name}'s booking for Room ${booking.roomNumber} has been cancelled`)
    setConfirmAction(null)
  }

  const getDaysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Today'
    return `${diff}d away`
  }

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const checkedIn = bookings.filter(b => b.status === 'checked_in')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const totalAdvance = confirmed.reduce((s, b) => s + (b.advance || 0), 0)

  const [tab, setTab] = useState('confirmed')
  const displayed = tab === 'confirmed' ? confirmed : tab === 'checked_in' ? checkedIn : cancelled

  const statusStyle = {
    confirmed: 'bg-indigo-500/20 text-indigo-400',
    checked_in: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }

  const statusLabel = {
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    cancelled: 'Cancelled',
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Advance Bookings</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">
              {confirmed.length} upcoming · {pgConfig.currency}{totalAdvance.toLocaleString('en-IN')} advance collected
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + New Booking
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Upcoming</p>
            <p className="text-2xl font-black text-indigo-400">{confirmed.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Checked In</p>
            <p className="text-2xl font-black text-green-400">{checkedIn.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Advance Collected</p>
            <p className="text-2xl font-black text-yellow-400">{pgConfig.currency}{totalAdvance.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button onClick={() => setTab('confirmed')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === 'confirmed' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Upcoming ({confirmed.length})
          </button>
          <button onClick={() => setTab('checked_in')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === 'checked_in' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Checked In ({checkedIn.length})
          </button>
          <button onClick={() => setTab('cancelled')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === 'cancelled' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Cancelled ({cancelled.length})
          </button>
        </div>

        {/* LIST */}
        {displayed.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 font-mono text-sm">No {tab === 'confirmed' ? 'upcoming' : tab === 'checked_in' ? 'checked in' : 'cancelled'} bookings.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(booking => {
              const isExpanded = expandedId === booking.id
              const room = rooms.find(r => r.id === booking.roomId)
              const daysUntil = getDaysUntil(booking.moveInDate)
              const isOverdue = daysUntil.includes('overdue')

              return (
                <div key={booking.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-500/50' : 'border-gray-800 hover:border-gray-700'}`}>
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl border-2 border-white/10 flex-shrink-0">
                      {booking.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{booking.name}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusStyle[booking.status]}`}>
                          {statusLabel[booking.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500 font-mono">Room {booking.roomNumber}</span>
                        <span className="text-xs text-gray-500 font-mono">{booking.phone}</span>
                        <span className={`text-xs font-mono ${isOverdue && booking.status === 'confirmed' ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                          {booking.moveInDate} ({daysUntil})
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-yellow-400 text-sm">{pgConfig.currency}{booking.advance?.toLocaleString('en-IN')}</div>
                      <div className="text-gray-600 text-xs font-mono">advance</div>
                    </div>
                    <div className={`text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-800 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Personal Details</p>
                          {booking.email && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">@</span><span className="text-sm text-gray-300">{booking.email}</span></div>}
                          <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">Ph</span><span className="text-sm text-gray-300">{booking.phone}</span></div>
                          {booking.address && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs w-4 mt-0.5">Addr</span><span className="text-sm text-gray-300">{booking.address}</span></div>}
                          {booking.emergencyContact && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">SOS</span><span className="text-sm text-gray-300">{booking.emergencyContact}</span></div>}
                          {booking.idType && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">ID</span><span className="text-sm text-gray-300">{booking.idType?.toUpperCase()}: {booking.idNumber}</span></div>}
                          {booking.notes && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs w-4 mt-0.5">Note</span><span className="text-sm text-gray-300 whitespace-pre-wrap">{booking.notes}</span></div>}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Booking Info</p>
                          <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">Room</span><span className="text-sm text-gray-300">Room {booking.roomNumber} · {room?.type || ''} · {booking.rentMode}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">Move-in</span><span className="text-sm text-gray-300">{booking.moveInDate}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">Advance</span><span className="text-sm text-yellow-400 font-bold">{pgConfig.currency}{booking.advance?.toLocaleString('en-IN')}</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">Booked on</span><span className="text-sm text-gray-300">{booking.createdAt?.slice(0, 10)}</span></div>
                        </div>
                      </div>

                      {booking.status === 'confirmed' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                          <button onClick={() => setConfirmAction({ type: 'checkin', booking })}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-2.5 rounded-lg transition-all font-semibold">
                            Check In
                          </button>
                          <button onClick={() => setConfirmAction({ type: 'cancel', booking })}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-2.5 rounded-lg transition-all font-semibold">
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ADD BOOKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">New Advance Booking</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full Name *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone Number *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Home Address (optional)" rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
              <select value={form.roomId} onChange={handleRoomSelect}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">Select Room *</option>
                {availableRooms.map(r => {
                  const capacity = r.capacity || typeCapacity[r.type] || 1
                  const free = capacity - (r.occupiedBeds || 0) - getReservedBeds(r.id)
                  return (
                    <option key={r.id} value={r.id}>
                      Room {r.number} · {r.type} · {free} bed{free !== 1 ? 's' : ''} free · {pgConfig.currency}{r.monthlyRate}/mo
                    </option>
                  )
                })}
              </select>
              <select value={form.rentMode} onChange={e => setForm({ ...form, rentMode: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Move-in Date *</label>
                <input value={form.moveInDate} onChange={e => setForm({ ...form, moveInDate: e.target.value })}
                  type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <select value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">ID Type</option>
                <option value="aadhar">Aadhar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="dl">Driving License</option>
              </select>
              <input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                placeholder="ID Number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Advance Amount * (required for booking)</label>
                <input value={form.advance} onChange={e => setForm({ ...form, advance: e.target.value })}
                  placeholder="Advance Amount (₹) *" type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="Emergency Contact Number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)" rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">Book Now</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction.type === 'checkin' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <span className={`text-2xl font-black ${confirmAction.type === 'checkin' ? 'text-green-400' : 'text-red-400'}`}>
                {confirmAction.type === 'checkin' ? '>' : '!'}
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1">
              {confirmAction.type === 'checkin' ? 'Check In Tenant?' : 'Cancel Booking?'}
            </h3>
            <p className="text-gray-400 text-sm mb-1">{confirmAction.booking.name} · Room {confirmAction.booking.roomNumber}</p>
            <p className="text-gray-600 text-xs mb-4">
              {confirmAction.type === 'checkin'
                ? 'This will add them as an active tenant and occupy a bed in the room.'
                : 'This booking will be marked as cancelled.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">No, Go Back</button>
              <button onClick={() => confirmAction.type === 'checkin' ? handleCheckIn(confirmAction.booking) : handleCancel(confirmAction.booking)}
                className={`flex-1 text-sm font-bold py-2.5 rounded-xl transition-all ${confirmAction.type === 'checkin' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {confirmAction.type === 'checkin' ? 'Yes, Check In' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
