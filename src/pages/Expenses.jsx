import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { usePgConfig } from '../context/PgConfigContext'
import { useAuth } from '../context/AuthContext'
import { requestDelete } from '../firebase/deleteRequests'
import { sendNotification } from '../firebase/notifications'
import { uploadFile } from '../firebase/uploadFile'

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
  const pgConfig = usePgConfig()
  const [expenses, setExpenses] = useState([])
  const { role } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    category: 'Groceries',
    amount: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
    attachment: null
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'expenses'), snap => {
      setExpenses(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      )
    })
    return unsub
  }, [])

  const handleSave = async () => {
    if (!form.amount) return alert('Amount is required')
    setUploading(true)
    try {
      let attachmentData = null
      if (form.attachment) {
        attachmentData = await uploadFile(form.attachment)
      }
      await addDoc(collection(db, 'expenses'), {
        category: form.category,
        amount: Number(form.amount),
        note: form.note,
        date: form.date,
        addedBy: role,
        attachment: attachmentData,
        createdAt: new Date().toISOString()
      })
      await sendNotification(
        'expense',
        '🧾 New Expense Added',
        `${form.category} — ₹${Number(form.amount).toLocaleString()} added by ${role}${form.note ? ` (${form.note})` : ''}`
      )
      setShowModal(false)
      setForm({
        category: 'Groceries',
        amount: '',
        note: '',
        date: new Date().toISOString().slice(0, 10),
        attachment: null
      })
    } catch (err) {
      alert('Error saving expense: ' + err.message)
    }
    setUploading(false)
  }

  const handleDelete = (expense) => {
    if (role === 'admin') {
      setDeleteTarget(expense)
    } else {
      requestDelete('expenses', expense.id, `${expense.category} - ${pgConfig.currency}${expense.amount}`)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteDoc(doc(db, 'expenses', deleteTarget.id))
    setDeleteTarget(null)
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth))
  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0)
  const filtered = (() => {
    let list = filter === 'month' ? thisMonthExpenses : expenses
    if (filterFrom) list = list.filter(e => e.date >= filterFrom)
    if (filterTo) list = list.filter(e => e.date <= filterTo)
    return list
  })()

  const breakdown = categories.map(cat => ({
    cat,
    total: thisMonthExpenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0)
  })).filter(b => b.total > 0)

  const AttachmentLink = ({ attachment }) => {
    if (!attachment || !attachment.url) return null
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-indigo-400 font-mono mt-1 block hover:underline"
      >
        📎 View attachment
      </a>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Expenses</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">
              This month: {pgConfig.currency}{totalThisMonth.toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
          >
            + Add Expense
          </button>
        </div>

        {role === 'warden' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-yellow-400 text-xs font-mono">
            ⚠️ You can add expenses. To delete, send a request to admin.
          </div>
        )}

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

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => { setFilter('all'); setFilterFrom(''); setFilterTo('') }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' && !filterFrom && !filterTo ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
          >
            All
          </button>
          <button
            onClick={() => { setFilter('month'); setFilterFrom(''); setFilterTo('') }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'month' && !filterFrom && !filterTo ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
          >
            This Month
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 w-[130px]" />
            <span className="text-gray-600 text-xs">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 w-[130px]" />
            {(filterFrom || filterTo) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                className="text-gray-600 hover:text-red-400 text-xs transition-all">Clear</button>
            )}
          </div>
        </div>
        {(filterFrom || filterTo) && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-500 text-xs font-mono">
              {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · {pgConfig.currency}{filtered.reduce((s, e) => s + e.amount, 0).toLocaleString()}
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-gray-400 font-mono text-sm">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(expense => (
              <div key={expense.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${categoryColors[expense.category]}`}>
                  {expense.category[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{expense.category}</div>
                  <div className="text-gray-500 text-xs font-mono">{expense.date}</div>
                  {expense.note && (
                    <div className="text-gray-600 text-xs mt-0.5">{expense.note}</div>
                  )}
                  {expense.addedBy && (
                    <div className="text-gray-700 text-xs font-mono">by {expense.addedBy}</div>
                  )}
                  <AttachmentLink attachment={expense.attachment} />
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="font-black text-red-400">
                    {pgConfig.currency}{expense.amount.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleDelete(expense)}
                    className={`text-xs transition-all ${role === 'admin' ? 'text-gray-600 hover:text-red-400' : 'text-yellow-600 hover:text-yellow-400'}`}
                    title={role === 'admin' ? 'Delete' : 'Request Delete'}
                  >
                    {role === 'admin' ? '✕' : '⚑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add Expense</h3>
            <div className="space-y-3">
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="Amount (₹) *"
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                value={form.note}
                onChange={e => setForm({...form, note: e.target.value})}
                placeholder="Note (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">
                  Attachment (optional — bill/receipt)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setForm({...form, attachment: e.target.files[0]})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500"
                />
                {form.attachment && (
                  <p className="text-xs text-green-400 font-mono mt-1">✓ {form.attachment.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-400 font-black">!</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Delete Expense?</h3>
            <p className="text-gray-400 text-sm mb-1">{deleteTarget.category} — {pgConfig.currency}{deleteTarget.amount.toLocaleString()}</p>
            <p className="text-gray-600 text-xs mb-1">{deleteTarget.date}</p>
            {deleteTarget.note && <p className="text-gray-600 text-xs mb-1">{deleteTarget.note}</p>}
            <p className="text-red-400/70 text-xs mt-3 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">No, Keep</button>
              <button onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-sm font-bold py-2.5 rounded-xl transition-all">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}