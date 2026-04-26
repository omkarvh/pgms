import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    tenantId: '', tenantName: '', roomNumber: '', amount: '',
    mode: 'cash', month: '', note: '', date: new Date().toISOString().slice(0, 10)
  })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'payments'), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date)))
    })
    const unsub2 = onSnapshot(collection(db, 'tenants'), snap => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === 'active'))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  const handleTenantSelect = (e) => {
    const tenant = tenants.find(t => t.id === e.target.value)
    if (tenant) setForm({ ...form, tenantId: tenant.id, tenantName: tenant.name, roomNumber: tenant.roomNumber })
  }

  const handleSave = async () => {
    if (!form.tenantId || !form.amount) return alert('Tenant and amount are required')
    await addDoc(collection(db, 'payments'), {
      tenantId: form.tenantId,
      tenantName: form.tenantName,
      roomNumber: form.roomNumber,
      amount: Number(form.amount),
      mode: form.mode,
      month: form.month,
      note: form.note,
      date: form.date,
      createdAt: new Date().toISOString()
    })
    setShowModal(false)
    setForm({ tenantId: '', tenantName: '', roomNumber: '', amount: '', mode: 'cash', month: '', note: '', date: new Date().toISOString().slice(0, 10) })
  }

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthTotal = payments.filter(p => p.date?.startsWith(thisMonth)).reduce((sum, p) => sum + p.amount, 0)

  const modeColors = {
    cash: 'bg-green-500/10 text-green-400',
    upi: 'bg-indigo-500/10 text-indigo-400',
    bank: 'bg-yellow-500/10 text-yellow-400',
  }

  const filtered = filter === 'all' ? payments : payments.filter(p => p.date?.startsWith(thisMonth))

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Payments</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">Total collected: {pgConfig.currency}{totalCollected.toLocaleString()}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Record Payment
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">This Month</p>
            <p className="text-2xl font-black text-green-400">{pgConfig.currency}{thisMonthTotal.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Total Records</p>
            <p className="text-2xl font-black text-indigo-400">{payments.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 col-span-2 md:col-span-1">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">All Time</p>
            <p className="text-2xl font-black text-yellow-400">{pgConfig.currency}{totalCollected.toLocaleString()}</p>
          </div>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            All
          </button>
          <button onClick={() => setFilter('month')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'month' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            This Month
          </button>
        </div>

        {/* PAYMENTS LIST */}
        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-400 font-mono text-sm">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(payment => (
              <div key={payment.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-indigo-500 flex items-center justify-center text-white font-black flex-shrink-0">
                  {payment.tenantName?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{payment.tenantName}</div>
                  <div className="text-gray-500 text-xs font-mono">Room {payment.roomNumber} · {payment.date} {payment.month && `· ${payment.month}`}</div>
                  {payment.note && <div className="text-gray-600 text-xs mt-0.5">{payment.note}</div>}
                </div>
                <div className="text-right">
                  <div className="font-black text-green-400">{pgConfig.currency}{payment.amount.toLocaleString()}</div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${modeColors[payment.mode]}`}>{payment.mode.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Record Payment</h3>
            <div className="space-y-3">

              <select value={form.tenantId} onChange={handleTenantSelect}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">Select Tenant *</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} · Room {t.roomNumber}</option>
                ))}
              </select>

              <input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="Amount (₹) *" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <select value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
              </select>

              <input value={form.month} onChange={e => setForm({...form, month: e.target.value})}
                placeholder="For Month (e.g. April 2026)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              <input value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                placeholder="Note (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">Save Payment</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}