import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'
import { uploadFile } from '../firebase/uploadFile'

const avatarColors = [
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-green-500 to-teal-500',
  'from-yellow-500 to-orange-500',
  'from-blue-500 to-cyan-500',
]
const getAvatarColor = (name) => avatarColors[name?.charCodeAt(0) % avatarColors.length] || avatarColors[0]

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [salaries, setSalaries] = useState([])
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [showFireModal, setShowFireModal] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [tab, setTab] = useState('active')
  const [expandedId, setExpandedId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fireDate, setFireDate] = useState(new Date().toISOString().slice(0, 10))
  const [fireReason, setFireReason] = useState('')

  const [form, setForm] = useState({
    name: '', role: '', phone: '', monthlySalary: '', joinDate: '',
    address: '', idType: '', idNumber: '',
    staffPhoto: null, idPhoto: null, addressProof: null
  })
  const [salaryForm, setSalaryForm] = useState({
    amount: '', month: '', mode: 'cash', note: '',
    date: new Date().toISOString().slice(0, 10)
  })

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
    setForm({ name: '', role: '', phone: '', monthlySalary: '', joinDate: '', address: '', idType: '', idNumber: '', staffPhoto: null, idPhoto: null, addressProof: null })
    setShowStaffModal(true)
  }

  const openEdit = (s) => {
    setEditStaff(s)
    setForm({
      name: s.name, role: s.role, phone: s.phone,
      monthlySalary: s.monthlySalary, joinDate: s.joinDate,
      address: s.address || '', idType: s.idType || '', idNumber: s.idNumber || '',
      staffPhoto: null, idPhoto: null, addressProof: null
    })
    setShowStaffModal(true)
  }

  const handleSaveStaff = async () => {
    if (!form.name || !form.role) return alert('Name and role are required')
    setUploading(true)
    try {
      let staffPhotoData = editStaff?.staffPhotoData || null
      let idPhotoData = editStaff?.idPhotoData || null
      let addressProofData = editStaff?.addressProofData || null
      if (form.staffPhoto) staffPhotoData = await uploadFile(form.staffPhoto)
      if (form.idPhoto) idPhotoData = await uploadFile(form.idPhoto)
      if (form.addressProof) addressProofData = await uploadFile(form.addressProof)

      const data = {
        name: form.name, role: form.role, phone: form.phone,
        monthlySalary: Number(form.monthlySalary), joinDate: form.joinDate,
        address: form.address, idType: form.idType, idNumber: form.idNumber,
        staffPhotoData, idPhotoData, addressProofData,
        status: 'active'
      }
      if (editStaff) {
        await updateDoc(doc(db, 'staff', editStaff.id), data)
      } else {
        await addDoc(collection(db, 'staff'), data)
      }
      setShowStaffModal(false)
    } catch (err) {
      alert('Error saving: ' + err.message)
    }
    setUploading(false)
  }

  const openFire = (s) => {
    setSelectedStaff(s)
    setFireDate(new Date().toISOString().slice(0, 10))
    setFireReason('')
    setShowFireModal(true)
  }

  const handleFire = async () => {
    if (!window.confirm(`Mark ${selectedStaff.name} as fired/left?`)) return
    await updateDoc(doc(db, 'staff', selectedStaff.id), {
      status: 'left',
      leftDate: fireDate,
      leftReason: fireReason
    })
    setShowFireModal(false)
  }

  const openSalary = (s) => {
    setSelectedStaff(s)
    setSalaryForm({ amount: s.monthlySalary, month: '', mode: 'cash', note: '', date: new Date().toISOString().slice(0, 10) })
    setShowSalaryModal(true)
  }

  const handlePaySalary = async () => {
    if (!salaryForm.amount) return alert('Amount is required')
    await addDoc(collection(db, 'salaries'), {
      staffId: selectedStaff.id, staffName: selectedStaff.name,
      role: selectedStaff.role, amount: Number(salaryForm.amount),
      month: salaryForm.month, mode: salaryForm.mode,
      note: salaryForm.note, date: salaryForm.date,
      createdAt: new Date().toISOString()
    })
    await addDoc(collection(db, 'expenses'), {
      category: 'Salary', amount: Number(salaryForm.amount),
      note: `Salary - ${selectedStaff.name} (${salaryForm.month})`,
      date: salaryForm.date, createdAt: new Date().toISOString()
    })
    setShowSalaryModal(false)
  }

  const getDaysWorked = (s) => {
    const start = new Date(s.joinDate)
    const end = s.leftDate ? new Date(s.leftDate) : new Date()
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return isNaN(diff) ? '-' : diff
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const totalSalaryThisMonth = salaries.filter(s => s.date?.startsWith(thisMonth)).reduce((sum, s) => sum + s.amount, 0)
  const getPaidMonths = (staffId) => salaries.filter(s => s.staffId === staffId).map(s => s.month)

  const activeStaff = staff.filter(s => s.status === 'active' || !s.status)
  const leftStaff = staff.filter(s => s.status === 'left')
  const displayed = tab === 'active' ? activeStaff : leftStaff

  // STAFF CARD COMPONENT
  const StaffCard = ({ s }) => {
    const isExpanded = expandedId === s.id
    return (
      <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-500/50' : 'border-gray-800 hover:border-gray-700'}`}>

        {/* MAIN ROW */}
        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
          {s.staffPhotoData?.url ? (
            <img src={s.staffPhotoData.url} alt={s.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40 flex-shrink-0" />
          ) : (
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(s.name)} flex items-center justify-center text-white font-black text-xl flex-shrink-0`}>
              {s.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{s.name}</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${s.status === 'left' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {s.status === 'left' ? '○ Left' : '● Active'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">{s.role}</span>
              <span className="text-xs text-gray-500 font-mono">📞 {s.phone}</span>
              <span className="text-xs text-indigo-400 font-mono">{pgConfig.currency}{s.monthlySalary?.toLocaleString()}/mo</span>
            </div>
          </div>
          <div className={`text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
        </div>

        {/* EXPANDED */}
        {isExpanded && (
          <div className="border-t border-gray-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Personal Details</p>
                <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">📞</span><span className="text-sm text-gray-300">{s.phone}</span></div>
                {s.address && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs mt-0.5">📍</span><span className="text-sm text-gray-300">{s.address}</span></div>}
                {s.idType && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">🪪</span><span className="text-sm text-gray-300">{s.idType?.toUpperCase()}: {s.idNumber}</span></div>}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {s.staffPhotoData?.url && <a href={s.staffPhotoData.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline font-mono bg-indigo-500/10 px-2 py-1 rounded-lg">📷 Photo</a>}
                  {s.idPhotoData?.url && <a href={s.idPhotoData.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline font-mono bg-indigo-500/10 px-2 py-1 rounded-lg">🪪 ID</a>}
                  {s.addressProofData?.url && <a href={s.addressProofData.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline font-mono bg-indigo-500/10 px-2 py-1 rounded-lg">🏠 Address Proof</a>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Employment Details</p>
                <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">💼</span><span className="text-sm text-gray-300">{s.role}</span></div>
                {s.joinDate && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">📅</span><span className="text-sm text-gray-300">Joined: {s.joinDate}</span></div>}
                {s.leftDate && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">🚪</span><span className="text-sm text-gray-300">Left: {s.leftDate}</span></div>}
                {s.leftReason && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs mt-0.5">📝</span><span className="text-sm text-gray-300">Reason: {s.leftReason}</span></div>}
                <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">⏱</span><span className="text-sm text-gray-300">{getDaysWorked(s)} days worked</span></div>

                {/* PAID MONTHS */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 font-mono mb-1">Paid months:</p>
                  <div className="flex flex-wrap gap-1">
                    {getPaidMonths(s.id).length === 0
                      ? <span className="text-xs text-gray-700 font-mono">None yet</span>
                      : getPaidMonths(s.id).map((m, i) => (
                        <span key={i} className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-lg font-mono">{m}</span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            {tab === 'active' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <button onClick={() => openSalary(s)} className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-2 rounded-lg transition-all font-bold">💰 Pay Salary</button>
                <button onClick={() => { openEdit(s); setExpandedId(null) }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-2 rounded-lg transition-all">✏️ Edit</button>
                <button onClick={() => openFire(s)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-2 rounded-lg transition-all">🚪 Fire/Left</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Staff & Salary</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{activeStaff.length} active · {leftStaff.length} past</p>
          </div>
          <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Staff
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Active Staff</p>
            <p className="text-2xl font-black text-indigo-400">{activeStaff.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Salary This Month</p>
            <p className="text-2xl font-black text-red-400">{pgConfig.currency}{totalSalaryThisMonth.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Past Staff</p>
            <p className="text-2xl font-black text-gray-400">{leftStaff.length}</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Active ({activeStaff.length})
          </button>
          <button onClick={() => setTab('left')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'left' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
            Past Staff ({leftStaff.length})
          </button>
        </div>

        {/* STAFF LIST */}
        {displayed.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">👷</p>
            <p className="text-gray-400 font-mono text-sm">No {tab} staff.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {displayed.map(s => <StaffCard key={s.id} s={s} />)}
          </div>
        )}

        {/* SALARY HISTORY */}
        {salaries.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Salary History</h3>
            <div className="space-y-3">
              {salaries.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => (
                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(s.staffName)} flex items-center justify-center text-white font-black flex-shrink-0`}>
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

      {/* ADD/EDIT STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editStaff ? 'Edit Staff' : 'Add Staff'}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full Name *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                placeholder="Role (e.g. Warden, Cleaner) *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="Phone Number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Home Address" rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
              <input value={form.monthlySalary} onChange={e => setForm({...form, monthlySalary: e.target.value})}
                placeholder="Monthly Salary (₹)" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
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

              {/* PHOTO UPLOADS */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">Documents (Optional)</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">📷 Staff Photo</label>
                    <input type="file" accept="image/*" onChange={e => setForm({...form, staffPhoto: e.target.files[0]})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                    {form.staffPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.staffPhoto.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">🪪 ID Proof (Aadhar/PAN)</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setForm({...form, idPhoto: e.target.files[0]})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                    {form.idPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.idPhoto.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">🏠 Address Proof</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setForm({...form, addressProof: e.target.files[0]})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                    {form.addressProof && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.addressProof.name}</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowStaffModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSaveStaff} disabled={uploading}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {uploading ? 'Uploading...' : editStaff ? 'Update' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIRE/LEFT MODAL */}
      {showFireModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Mark as Left/Fired</h3>
            <p className="text-gray-500 text-sm font-mono mb-4">{selectedStaff?.name} · {selectedStaff?.role}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Date of Leaving</label>
                <input value={fireDate} onChange={e => setFireDate(e.target.value)} type="date"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <textarea value={fireReason} onChange={e => setFireReason(e.target.value)}
                placeholder="Reason (resigned / fired / contract ended etc)" rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowFireModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleFire} className="flex-1 bg-red-500 hover:bg-red-600 text-sm font-bold py-2.5 rounded-xl transition-all">Confirm</button>
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