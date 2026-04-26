import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [salaries, setSalaries] = useState([])
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [form, setForm] = useState({ name: '', role: '', phone: '', monthlySalary: '', joinDate: '' })
  const [salaryForm, setSalaryForm] = useState({ amount: '', month: '', mode: 'cash', note: '', date: new Date().toISOString().slice(0, 10) })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'staff'), snap => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsub2 = onSnapshot(collection(db, 'salaries'), snap => {
      setSalaries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  const openAdd = () => {
    setEditStaff(null)
    setForm({ name: '', role: '', phone: '', monthlySalary: '', joinDate: '' })
    setShowStaffModal(true)
  }

  const openEdit = (s) => {
    setEditStaff(s)
    setForm({ name: s.name, role: s.role, phone: s.phone, monthlySalary: s.monthlySalary, joinDate: s.joinDate })
    setShowStaffModal(true)
  }

  const handleSaveStaff = async () => {
    if (!form.name || !form.role) return alert('Name and role are required')
    const data = { name: form.name, role: form.role, phone: form.phone, monthlySalary: Number(form.monthlySalary), joinDate: form.joinDate, status: 'active' }
    if (editStaff) {
      await updateDoc(doc(db, 'staff', editStaff.id), data)
    } else {
      await addDoc(collection(db, 'staff'), data)
    }
    setShowStaffModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this staff member?')) await deleteDoc(doc(db, 'staff', id))
  }

  const openSalary = (s) => {
    setSelectedStaff(s)
    setSalaryForm({ amount: s.monthlySalary, month: '', mode: 'cash', note: '', date: new Date().toISOString().slice(0, 10) })
    setShowSalaryModal(true)
  }

  const handlePaySalary = async () => {
    if (!salaryForm.amount) return alert('Amount is required')
    await addDoc(collection(db, 'salaries'), {
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      role: selectedStaff.role,
      amount: Number(salaryForm.amount),
      month: salaryForm.month,
      mode: salaryForm.mode,
      note: salaryForm.note,
      date: salaryForm.date,
      createdAt: new Date().toISOString()
    })
    // also add to expenses
    await addDoc(collection(db, 'expenses'), {
      category: 'Salary',
      amount: Number(salaryForm.amount),
      note: `Salary - ${selectedStaff.name} (${salaryForm.month})`,
      date: salaryForm.date,
      createdAt: new Date().toISOString()
    })
    setShowSalaryModal(false)
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const totalSalaryThisMonth = salaries.filter(s => s.date?.startsWith(thisMonth)).reduce((sum, s) => sum + s.amount, 0)

  const getPaidMonths = (staffId) => salaries.filter(s => s.staffId === staffId).map(s => s.month)

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Staff & Salary</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{staff.length} staff members</p>
          </div>
          <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Staff
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Total Staff</p>
            <p className="text-2xl font-black text-indigo-400">{staff.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Salary This Month</p>
            <p className="text-2xl font-black text-red-400">{pgConfig.currency}{totalSalaryThisMonth.toLocaleString()}</p>
          </div>
        </div>

        {/* STAFF LIST */}
        {staff.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">👷</p>
            <p className="text-gray-400 font-mono text-sm">No staff added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.map(s => (
              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black flex-shrink-0">
                    {s.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-gray-500 text-xs font-mono">{s.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-indigo-400">{pgConfig.currency}{s.monthlySalary?.toLocaleString()}</div>
                    <div className="text-gray-600 text-xs font-mono">/month</div>
                  </div>
                </div>

                {s.phone && <p className="text-xs text-gray-500 mb-1">📞 {s.phone}</p>}
                {s.joinDate && <p className="text-xs text-gray-500 mb-3">📅 Joined: {s.joinDate}</p>}

                {/* PAID MONTHS */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 font-mono mb-1">Paid months:</p>
                  <div className="flex flex-wrap gap-1">
                    {getPaidMonths(s.id).length === 0
                      ? <span className="text-xs text-gray-700 font-mono">None yet</span>
                      : getPaidMonths(s.id).map((m, i) => (
                        <span key={i} className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-lg font-mono">{m}</span>
                      ))
                    }
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openSalary(s)} className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-1.5 rounded-lg transition-all font-bold">Pay Salary</button>
                  <button onClick={() => openEdit(s)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded-lg transition-all">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded-lg transition-all">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SALARY HISTORY */}
        {salaries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Salary History</h3>
            <div className="space-y-3">
              {salaries.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => (
                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black flex-shrink-0">
                    {s.staffName?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{s.staffName}</div>
                    <div className="text-gray-500 text-xs font-mono">{s.role} · {s.month} · {s.date}</div>
                  </div>
                  <div className="font-black text-red-400">{pgConfig.currency}{s.amount?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editStaff ? 'Edit Staff' : 'Add Staff'}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full Name *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                placeholder="Role (e.g. Warden, Cleaner) *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="Phone Number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.monthlySalary} onChange={e => setForm({...form, monthlySalary: e.target.value})}
                placeholder="Monthly Salary (₹)" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})}
                type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowStaffModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSaveStaff} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">{editStaff ? 'Update' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}

      {/* SALARY MODAL */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Pay Salary</h3>
            <p className="text-gray-500 text-sm font-mono mb-4">{selectedStaff?.name} · {selectedStaff?.role}</p>
            <div className="space-y-3">
              <input value={salaryForm.amount} onChange={e => setSalaryForm({...salaryForm, amount: e.target.value})}
                placeholder="Amount (₹)" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={salaryForm.month} onChange={e => setSalaryForm({...salaryForm, month: e.target.value})}
                placeholder="For Month (e.g. April 2026)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <select value={salaryForm.mode} onChange={e => setSalaryForm({...salaryForm, mode: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
              </select>
              <input value={salaryForm.date} onChange={e => setSalaryForm({...salaryForm, date: e.target.value})}
                type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={salaryForm.note} onChange={e => setSalaryForm({...salaryForm, note: e.target.value})}
                placeholder="Note (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSalaryModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handlePaySalary} className="flex-1 bg-green-500 hover:bg-green-600 text-sm font-bold py-2.5 rounded-xl transition-all">Pay Salary</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}