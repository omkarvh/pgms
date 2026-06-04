import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { usePgConfig } from '../context/PgConfigContext'
import { getBillLink, copyBillLink } from './PublicBill'

const generateBillPDF = (payment, tenant, pgConfig) => {
  const date = new Date(payment.date)
  const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const receiptNo = `RCP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt - ${payment.tenantName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; width: 80mm; margin: 0 auto; padding: 6mm; }
  .header { text-align: center; padding-bottom: 4mm; border-bottom: 2px solid #1a1a1a; margin-bottom: 4mm; }
  .pg-name { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
  .pg-location { font-size: 10px; color: #666; margin-top: 2px; }
  .receipt-title { font-size: 13px; font-weight: 700; text-align: center; margin: 3mm 0; letter-spacing: 2px; text-transform: uppercase; background: #1a1a1a; color: #fff; padding: 2mm; }
  .receipt-no { text-align: center; font-size: 9px; color: #888; margin-bottom: 3mm; font-family: monospace; }
  .divider { border: none; border-top: 1px dashed #ccc; margin: 3mm 0; }
  .row { display: flex; justify-content: space-between; font-size: 11px; padding: 1.2mm 0; }
  .row .label { color: #666; }
  .row .value { font-weight: 600; text-align: right; max-width: 55%; }
  .amount-section { background: #f5f5f5; border-radius: 3mm; padding: 3mm; margin: 3mm 0; text-align: center; }
  .amount-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .amount-value { font-size: 22px; font-weight: 900; margin-top: 1mm; }
  .amount-words { font-size: 9px; color: #888; margin-top: 1mm; font-style: italic; }
  .footer { text-align: center; margin-top: 4mm; padding-top: 3mm; border-top: 2px solid #1a1a1a; }
  .footer-thanks { font-size: 11px; font-weight: 600; }
  .footer-note { font-size: 8px; color: #999; margin-top: 2mm; }
  .stamp { text-align: center; margin: 3mm 0; font-size: 11px; font-weight: 700; color: #22c55e; border: 2px solid #22c55e; display: inline-block; padding: 1mm 4mm; border-radius: 2mm; transform: rotate(-3deg); margin-left: auto; margin-right: auto; }
  .stamp-wrap { text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="header">
    <div class="pg-name">${pgConfig.pg_name}</div>
    ${pgConfig.location ? `<div class="pg-location">${pgConfig.location}</div>` : ''}
    ${pgConfig.contact ? `<div class="pg-location">Contact: ${pgConfig.contact}</div>` : ''}
  </div>
  <div class="receipt-title">Payment Receipt</div>
  <div class="receipt-no">${receiptNo}</div>
  <hr class="divider">
  <div class="row"><span class="label">Tenant</span><span class="value">${payment.tenantName}</span></div>
  <div class="row"><span class="label">Room No.</span><span class="value">${payment.roomNumber}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
  ${payment.month ? `<div class="row"><span class="label">For Period</span><span class="value">${payment.month}</span></div>` : ''}
  <div class="row"><span class="label">Payment Mode</span><span class="value">${payment.mode.toUpperCase()}</span></div>
  ${payment.note ? `<div class="row"><span class="label">Note</span><span class="value">${payment.note}</span></div>` : ''}
  <hr class="divider">
  <div class="amount-section">
    <div class="amount-label">Amount Paid</div>
    <div class="amount-value">${pgConfig.currency}${payment.amount.toLocaleString('en-IN')}</div>
  </div>
  <div class="stamp-wrap"><div class="stamp">PAID</div></div>
  <div class="footer">
    <div class="footer-thanks">Thank you, ${payment.tenantName}!</div>
    <div class="footer-note">This is a computer-generated receipt.</div>
    <div class="footer-note">${pgConfig.pg_name} | Generated on ${new Date().toLocaleDateString('en-IN')}</div>
  </div>
</body></html>`

  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) return alert('Please allow popups for this site')
  w.document.write(html)
  w.document.close()
  w.onload = () => { w.print() }
}

const generateBillText = (payment, tenant, pgConfig) => {
  const line = '-------------------------------'
  const date = new Date(payment.date)
  const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return [
    `*PAYMENT RECEIPT*`,
    line,
    `*${pgConfig.pg_name}*`,
    pgConfig.location || '',
    line,
    `*Tenant:* ${payment.tenantName}`,
    `*Room:* ${payment.roomNumber}`,
    `*Date:* ${formattedDate}`,
    payment.month ? `*For:* ${payment.month}` : '',
    line,
    `*Amount Paid:* ${pgConfig.currency}${payment.amount.toLocaleString('en-IN')}`,
    `*Mode:* ${payment.mode.toUpperCase()}`,
    payment.note ? `*Note:* ${payment.note}` : '',
    line,
    `Payment received successfully!`,
    `Thank you, ${payment.tenantName}!`,
    '',
    `- ${pgConfig.pg_name}`,
  ].filter(Boolean).join('\n')
}

const sendBillOnWhatsApp = async (payment, tenant, pgConfig) => {
  const phone = tenant?.phone?.replace(/\D/g, '')
  if (!phone) return alert('Tenant phone number not found')
  const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`

  const billLink = await getBillLink({
    tenantName: payment.tenantName, roomNumber: payment.roomNumber,
    date: payment.date, month: payment.month, amount: payment.amount,
    mode: payment.mode, currency: pgConfig.currency, pgName: pgConfig.pg_name,
    location: pgConfig.location, upiId: pgConfig.upi_id, billType: 'payment'
  })

  const msg = generateBillText(payment, tenant, pgConfig) + '\n\nView receipt:\n' + billLink
  window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank')
}

const copyPaymentBillLink = (payment, pgConfig) => {
  copyBillLink({
    tenantName: payment.tenantName,
    roomNumber: payment.roomNumber,
    date: payment.date,
    month: payment.month,
    amount: payment.amount,
    mode: payment.mode,
    note: payment.note,
    currency: pgConfig.currency,
    pgName: pgConfig.pg_name,
    location: pgConfig.location,
    contact: pgConfig.contact,
    upiId: pgConfig.upi_id,
    billType: 'payment'
  })
}

export default function Payments() {
  const pgConfig = usePgConfig()
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [allTenants, setAllTenants] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [filter, setFilter] = useState('all')
  const [lastSavedPayment, setLastSavedPayment] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    tenantId: '', tenantName: '', roomNumber: '', amount: '',
    mode: 'cash', month: '', note: '', date: new Date().toISOString().slice(0, 10)
  })

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'payments'), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date)))
    })
    const unsub2 = onSnapshot(collection(db, 'tenants'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAllTenants(all)
      setTenants(all.filter(t => t.status === 'active'))
    })
    const unsub3 = onSnapshot(collection(db, 'rooms'), snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  const [calcInfo, setCalcInfo] = useState(null)

  const calculateAmount = (tenant) => {
    const room = rooms.find(r => r.id === tenant.roomId)
    if (!room) return { amount: '', info: null }

    if (tenant.rentMode === 'daily') {
      return { amount: '', info: { type: 'daily', message: 'Daily tenant — enter amount manually based on current rate' } }
    }

    const monthlyRate = Number(room.monthlyRate) || 0
    if (!monthlyRate) return { amount: '', info: null }

    const joinDate = new Date(tenant.joinDate)
    const now = new Date()
    const joinMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const hasPaidBefore = payments.some(p => p.tenantId === tenant.id)

    if (!hasPaidBefore && joinMonth === currentMonth && joinDate.getDate() > 1) {
      const dayOfJoin = joinDate.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const missedDays = dayOfJoin - 1
      const remainingDays = daysInMonth - missedDays
      const perDay = monthlyRate / daysInMonth
      const proRated = Math.round(perDay * remainingDays)
      const deduction = monthlyRate - proRated

      return {
        amount: proRated,
        info: {
          type: 'prorated',
          monthlyRate,
          perDay: Math.round(perDay * 100) / 100,
          missedDays,
          remainingDays,
          daysInMonth,
          deduction: Math.round(deduction),
          proRated,
          message: `Joined on ${dayOfJoin}${dayOfJoin === 2 ? 'nd' : dayOfJoin === 3 ? 'rd' : 'th'} — ${missedDays} day${missedDays > 1 ? 's' : ''} deducted`
        }
      }
    }

    return {
      amount: monthlyRate,
      info: { type: 'full', monthlyRate, message: 'Full monthly rent' }
    }
  }

  const handleTenantSelect = (e) => {
    const tenant = tenants.find(t => t.id === e.target.value)
    if (!tenant) return
    const { amount, info } = calculateAmount(tenant)
    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
    setCalcInfo(info)
    setForm({
      ...form,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      amount: amount || '',
      month: monthName
    })
  }

  const handleSave = async () => {
    if (!form.tenantId || !form.amount) return alert('Tenant and amount are required')
    const paymentData = {
      tenantId: form.tenantId,
      tenantName: form.tenantName,
      roomNumber: form.roomNumber,
      amount: Number(form.amount),
      mode: form.mode,
      month: form.month,
      note: form.note,
      date: form.date,
      createdAt: new Date().toISOString()
    }
    await addDoc(collection(db, 'payments'), paymentData)
    setShowModal(false)
    setCalcInfo(null)
    setLastSavedPayment(paymentData)
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

  const unpaidTenants = tenants.filter(t => {
    if (t.rentMode === 'daily') return false
    const paid = payments.some(p =>
      p.tenantId === t.id &&
      (p.date?.startsWith(thisMonth) || p.month?.toLowerCase().includes(new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase()))
    )
    return !paid
  }).map(t => {
    const room = rooms.find(r => r.id === t.roomId)
    return { ...t, monthlyRate: room?.monthlyRate || 0 }
  })

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const nextMonth3rd = (() => {
    const d = new Date()
    if (d.getDate() <= 3) {
      return `3rd ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
    }
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 3)
    return `3rd ${next.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
  })()

  const sendReminder = (tenant) => {
    const phone = tenant.phone?.replace(/\D/g, '')
    if (!phone) return alert('Phone number not found for ' + tenant.name)
    const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`
    const upiLink = pgConfig.upi_id ? `\n\nUPI ID: ${pgConfig.upi_id}\nupi://pay?pa=${pgConfig.upi_id}&pn=${encodeURIComponent(pgConfig.pg_name)}&am=${tenant.monthlyRate}&cu=INR` : ''
    const msg = [
      `Dear ${tenant.name},`,
      ``,
      `This is a reminder from *${pgConfig.pg_name}*.`,
      ``,
      `Your rent for *${currentMonthName}* is pending.`,
      ``,
      `*Amount Due:* ${pgConfig.currency}${Number(tenant.monthlyRate).toLocaleString('en-IN')}`,
      `*Room:* ${tenant.roomNumber}`,
      `*Due Date:* ${nextMonth3rd}`,
      ``,
      `Please make your payment before the due date to avoid late fees/fines.`,
      pgConfig.upi_id ? `\n*Pay via UPI:*\n${pgConfig.upi_id}` : '',
      ``,
      `Thank you,`,
      `${pgConfig.owner_name}`,
      `${pgConfig.pg_name}`,
      pgConfig.contact ? `Contact: ${pgConfig.contact}` : '',
    ].filter(Boolean).join('\n')
    const text = encodeURIComponent(msg)
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank')
  }

  const sendAllReminders = () => {
    if (unpaidTenants.length === 0) return
    unpaidTenants.forEach((t, i) => {
      setTimeout(() => sendReminder(t), i * 1500)
    })
  }

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
          <div className="flex gap-2">
            {unpaidTenants.length > 0 && (
              <button onClick={() => setShowReminders(true)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold px-4 py-2 rounded-xl transition-all">
                {unpaidTenants.length} Unpaid
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
              + Record Payment
            </button>
          </div>
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
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="font-black text-green-400">{pgConfig.currency}{payment.amount.toLocaleString()}</div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${modeColors[payment.mode]}`}>{payment.mode.toUpperCase()}</span>
                  <div className="flex gap-1 mt-1 flex-wrap justify-end">
                    <button onClick={(e) => { e.stopPropagation(); generateBillPDF(payment, allTenants.find(t => t.id === payment.tenantId), pgConfig) }}
                      className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-2 py-1 rounded-lg transition-all font-mono">
                      PDF
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); sendBillOnWhatsApp(payment, allTenants.find(t => t.id === payment.tenantId), pgConfig) }}
                      className="text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 px-2 py-1 rounded-lg transition-all font-mono">
                      WhatsApp
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); copyPaymentBillLink(payment, pgConfig) }}
                      className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-2 py-1 rounded-lg transition-all font-mono">
                      Link
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(payment) }}
                      className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded-lg transition-all font-mono">
                      Delete
                    </button>
                  </div>
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

              {calcInfo && (
                <div className={`rounded-xl p-3 text-xs font-mono border ${calcInfo.type === 'prorated' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : calcInfo.type === 'daily' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                  <p className="font-bold mb-1">{calcInfo.message}</p>
                  {calcInfo.type === 'prorated' && (
                    <div className="space-y-0.5 text-[11px] opacity-80">
                      <p>Monthly rate: {pgConfig.currency}{calcInfo.monthlyRate.toLocaleString('en-IN')}</p>
                      <p>Per day: {pgConfig.currency}{calcInfo.perDay} ({calcInfo.daysInMonth} days in month)</p>
                      <p>Deduction: {calcInfo.missedDays} day{calcInfo.missedDays > 1 ? 's' : ''} x {pgConfig.currency}{calcInfo.perDay} = {pgConfig.currency}{calcInfo.deduction.toLocaleString('en-IN')}</p>
                      <p className="font-bold text-xs mt-1">Amount: {pgConfig.currency}{calcInfo.monthlyRate.toLocaleString('en-IN')} - {pgConfig.currency}{calcInfo.deduction.toLocaleString('en-IN')} = {pgConfig.currency}{calcInfo.proRated.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {calcInfo.type === 'full' && (
                    <p className="text-[11px] opacity-80">Room rate: {pgConfig.currency}{calcInfo.monthlyRate.toLocaleString('en-IN')}/month</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Amount ({pgConfig.currency}) *</label>
                <input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0" type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

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
              <button onClick={() => { setShowModal(false); setCalcInfo(null) }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">Save Payment</button>
            </div>
          </div>
        </div>
      )}

      {lastSavedPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-4xl mb-3">✅</p>
            <h3 className="text-lg font-bold mb-1">Payment Recorded!</h3>
            <p className="text-gray-400 text-sm mb-1">{lastSavedPayment.tenantName} · Room {lastSavedPayment.roomNumber}</p>
            <p className="text-2xl font-black text-green-400 mb-4">{pgConfig.currency}{lastSavedPayment.amount.toLocaleString('en-IN')}</p>
            <p className="text-gray-500 text-xs mb-4">Download or share the bill receipt</p>
            <div className="flex gap-2">
              <button onClick={() => setLastSavedPayment(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Skip</button>
              <button onClick={() => {
                generateBillPDF(lastSavedPayment, allTenants.find(t => t.id === lastSavedPayment.tenantId), pgConfig)
              }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">
                PDF
              </button>
              <button onClick={() => {
                sendBillOnWhatsApp(lastSavedPayment, allTenants.find(t => t.id === lastSavedPayment.tenantId), pgConfig)
                setLastSavedPayment(null)
              }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-sm font-bold py-2.5 rounded-xl transition-all">
                WhatsApp
              </button>
              <button onClick={() => copyPaymentBillLink(lastSavedPayment, pgConfig)}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-sm font-bold py-2.5 rounded-xl transition-all">
                Link
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminders && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Unpaid Tenants — {currentMonthName}</h3>
                <p className="text-gray-500 text-xs font-mono mt-0.5">{unpaidTenants.length} tenant{unpaidTenants.length !== 1 ? 's' : ''} pending</p>
              </div>
              <button onClick={() => setShowReminders(false)} className="text-gray-600 hover:text-white text-xl">x</button>
            </div>

            {!pgConfig.upi_id && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-yellow-400 text-xs font-mono">
                Add your UPI ID in Settings to include payment link in reminders.
              </div>
            )}

            {unpaidTenants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">All tenants have paid!</p>
                <p className="text-gray-500 text-sm">No pending payments for {currentMonthName}.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {unpaidTenants.map(t => (
                    <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black flex-shrink-0">
                        {t.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{t.name}</div>
                        <div className="text-gray-500 text-xs font-mono">Room {t.roomNumber} · {pgConfig.currency}{Number(t.monthlyRate).toLocaleString('en-IN')}/mo</div>
                        <div className="text-gray-600 text-xs font-mono">{t.phone}</div>
                      </div>
                      <button onClick={() => sendReminder(t)}
                        className="bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold px-3 py-2 rounded-lg transition-all flex-shrink-0">
                        WhatsApp
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-800 pt-4 flex gap-3">
                  <button onClick={() => setShowReminders(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Close</button>
                  <button onClick={() => { sendAllReminders(); setShowReminders(false) }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-sm font-bold py-2.5 rounded-xl transition-all">
                    Send All ({unpaidTenants.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-400 font-black">!</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Delete Payment?</h3>
            <p className="text-gray-400 text-sm mb-1">{deleteTarget.tenantName} · Room {deleteTarget.roomNumber}</p>
            <p className="text-2xl font-black text-red-400 mb-1">{pgConfig.currency}{deleteTarget.amount?.toLocaleString('en-IN')}</p>
            <p className="text-gray-600 text-xs mb-1">{deleteTarget.date} {deleteTarget.month && `· ${deleteTarget.month}`}</p>
            <p className="text-gray-600 text-xs mb-1">{deleteTarget.mode?.toUpperCase()}</p>
            {deleteTarget.note && <p className="text-gray-600 text-xs mb-1">{deleteTarget.note}</p>}
            <p className="text-red-400/70 text-xs mt-3 mb-4">This will remove the payment from revenue and all reports.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">No, Keep</button>
              <button onClick={async () => {
                await deleteDoc(doc(db, 'payments', deleteTarget.id))
                setDeleteTarget(null)
              }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-sm font-bold py-2.5 rounded-xl transition-all">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}