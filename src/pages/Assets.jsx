import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'

const categories = ['Furniture', 'Electronics', 'Appliances', 'Plumbing', 'Fixtures', 'Other']

const conditionColors = {
  good: 'text-green-400 bg-green-500/10',
  fair: 'text-yellow-400 bg-yellow-500/10',
  poor: 'text-red-400 bg-red-500/10',
}

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [filterRoom, setFilterRoom] = useState('all')
  const [form, setForm] = useState({
    name: '', category: 'Furniture', roomId: '', roomNumber: 'Common',
    condition: 'good', purchaseDate: '', cost: '', note: ''
  })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'assets'), snap => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const unsub2 = onSnapshot(collection(db, 'rooms'), snap => setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { unsub1(); unsub2() }
  }, [])

  const openAdd = () => {
    setEditAsset(null)
    setForm({ name: '', category: 'Furniture', roomId: '', roomNumber: 'Common', condition: 'good', purchaseDate: '', cost: '', note: '' })
    setShowModal(true)
  }

  const openEdit = (asset) => {
    setEditAsset(asset)
    setForm({
      name: asset.name, category: asset.category, roomId: asset.roomId,
      roomNumber: asset.roomNumber, condition: asset.condition,
      purchaseDate: asset.purchaseDate, cost: asset.cost, note: asset.note
    })
    setShowModal(true)
  }

  const handleRoomSelect = (e) => {
    const val = e.target.value
    if (val === 'common') {
      setForm({ ...form, roomId: '', roomNumber: 'Common' })
    } else {
      const room = rooms.find(r => r.id === val)
      if (room) setForm({ ...form, roomId: room.id, roomNumber: room.number })
    }
  }

  const handleSave = async () => {
    if (!form.name) return alert('Asset name is required')
    const data = {
      name: form.name, category: form.category, roomId: form.roomId,
      roomNumber: form.roomNumber, condition: form.condition,
      purchaseDate: form.purchaseDate, cost: Number(form.cost), note: form.note,
      createdAt: new Date().toISOString()
    }
    if (editAsset) {
      await updateDoc(doc(db, 'assets', editAsset.id), data)
    } else {
      await addDoc(collection(db, 'assets'), data)
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this asset?')) await deleteDoc(doc(db, 'assets', id))
  }

  const filtered = filterRoom === 'all' ? assets : assets.filter(a => a.roomNumber === filterRoom)
  const totalCost = assets.reduce((s, a) => s + (a.cost || 0), 0)
  const uniqueRooms = ['all', 'Common', ...rooms.map(r => r.number)]

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Assets</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{assets.length} items · Total value ₹{totalCost.toLocaleString()}</p>
          </div>
          <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Asset
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['good', 'fair', 'poor'].map(c => (
            <div key={c} className={`rounded-xl p-4 border ${conditionColors[c]} border-current border-opacity-30`}>
              <p className="text-xs font-mono uppercase tracking-widest mb-1 capitalize">{c}</p>
              <p className="text-2xl font-black">{assets.filter(a => a.condition === c).length}</p>
            </div>
          ))}
        </div>

        {/* ROOM FILTER */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {uniqueRooms.map(r => (
            <button key={r} onClick={() => setFilterRoom(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterRoom === r ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
              {r === 'all' ? 'All Rooms' : `Room ${r}`}
            </button>
          ))}
        </div>

        {/* ASSET LIST */}
        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-400 font-mono text-sm">No assets added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(asset => (
              <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold">{asset.name}</div>
                    <div className="text-gray-500 text-xs font-mono">{asset.category} · Room {asset.roomNumber}</div>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-lg capitalize ${conditionColors[asset.condition]}`}>{asset.condition}</span>
                </div>
                {asset.cost > 0 && <p className="text-xs text-gray-500 mb-1">💰 Cost: ₹{asset.cost.toLocaleString()}</p>}
                {asset.purchaseDate && <p className="text-xs text-gray-500 mb-1">📅 Purchased: {asset.purchaseDate}</p>}
                {asset.note && <p className="text-xs text-gray-600 mb-3">{asset.note}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(asset)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded-lg transition-all">Edit</button>
                  <button onClick={() => handleDelete(asset.id)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded-lg transition-all">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editAsset ? 'Edit Asset' : 'Add Asset'}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Asset Name * (e.g. Fan, Bed, AC)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select onChange={handleRoomSelect}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="common">Common Area</option>
                {rooms.map(r => <option key={r.id} value={r.id}>Room {r.number}</option>)}
              </select>

              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>

              <input value={form.cost} onChange={e => setForm({...form, cost: e.target.value})}
                placeholder="Purchase Cost (₹)" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})}
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                placeholder="Note (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">{editAsset ? 'Update' : 'Add Asset'}</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}