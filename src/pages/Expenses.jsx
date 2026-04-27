import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'
import { useAuth } from '../context/AuthContext'

const categories = ['Electricity', 'Water', 'Salary', 'Repairs', 'Groceries', 'Internet', 'Maintenance', 'Misc']

const categoryColors = {
  Electricity: 'text-yellow-400 bg-yellow-500/10',
  Water: 'text-blue-400 bg-blue-500/10',
  Salary: 'text-indigo-400 bg-indigo-500/10',
  Repairs: 'text-red-400 bg-red-500/10',
  Groceries: 'text-green-400 bg-green-500/10',
  Internet: 'text-purple-400 bg-purple-500/10',
  Maintenance: 'text-orange-400 bg-orange-500/10',
  Misc: 'text-gray-400 bg-gray-500/10',
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const { role } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    category: 'Electricity', amount: '', note: '',
    date: new Date().toISOString().slice(0, 10)
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'expenses'), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date)))
    })
    return unsub
  }, [])

  if (role === 'warden') return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 md:ml-56 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm font-mono">You don't have permission to view expenses.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  )

  const handleSave = async () => {
    if (!form.amount) return alert('Amount is required')
    await addDoc(collection(db, 'expenses'), {
      category: form.category,
      amount: Number(form.amount),
      note: form.note,
      date: form.date,
      createdAt: new Date().toISOString()
    })
    setShowModal(false)
    setForm({ category: 'Electricity', amount: '', note: '', date: new Date().toISOString().slice(0, 10) })
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense?')) await deleteDoc(doc(db, 'expenses', id))
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth))
  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0)
  const filtered = filter === 'all' ? expenses : thisMonthExpenses

  const breakdown = categories.map(cat => ({
    cat,
    total: thisMonthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  })).filter(b => b.total > 0)

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Expenses</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">This month: {pgConfig.currency}{totalThisMonth.toLocaleString()}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Expense
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">This Month</p>
            <p className="text-2xl font-black text-red-400">{pgConfig.currency}{totalThisMonth.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">All Time</p>
            <p className="text-2xl font-black text-orange-400">{pgConfig.currency}{totalAll.toLocaleString()}</p>
          </div>
        </div>

        {breakdown.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">This Month Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {breakdown.map(b => (
                <div key={b.cat} className={`rounded-lg p-3 ${categoryColors[b.cat]}`}>
                  <p className="text-xs font-mono mb-1">{b.cat}</p>
                  <p className="font-black">{pgConfig.currency}{b.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>All</button>
          <button onClick={() => setFilter('month')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'month' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>This Month</button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-gray-400 font-mono text-sm">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(expense => (
              <div key={expense.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${categoryColors[expense.category]}`}>
                  {expense.category[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{expense.category}</div>
                  <div className="text-gray-500 text-xs font-mono">{expense.date}</div>
                  {expense.note && <div className="text-gray-600 text-xs mt-0.5">{expense.note}</div>}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="font-black text-red-400">{pgConfig.currency}{expense.amount.toLocaleString()}</div>
                  <button onClick={() => handleDelete(expense.id)} className="text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Expense</h3>
            <div className="space-y-3">
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="Amount (₹) *" type="number"
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
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">Save Expense</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}