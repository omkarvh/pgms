import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { requestDelete } from "../firebase/deleteRequests";
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { usePgConfig } from "../context/PgConfigContext";
import { sendNotification } from "../firebase/notifications";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../firebase/uploadFile";
import { getBillLink, copyBillLink } from "./PublicBill";

const DRAFT_KEY = 'pgms_tenant_draft'
const emptyForm = {
  name: "", phone: "", email: "", roomId: "", roomNumber: "",
  rentMode: "monthly", joinDate: "", idType: "", idNumber: "",
  advance: "", emergencyContact: "", address: "", notes: "",
  firstMonthRent: "", firstMonthMode: "cash",
  idPhoto: null, tenantPhoto: null
}

const saveDraft = (formData) => {
  const { idPhoto, tenantPhoto, ...saveable } = formData
  localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable))
}

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    const hasData = Object.entries(parsed).some(([k, v]) => k !== 'rentMode' && v)
    return hasData ? { ...emptyForm, ...parsed } : null
  } catch { return null }
}

const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

const typeCapacity = { single: 1, double: 2, triple: 3, dormitory: 6 }

const generateAdmissionPDF = (bill, pgConfig) => {
  const joinDate = new Date(bill.joinDate)
  const formattedJoin = joinDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const nextMonth = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1)
  const nextMonthName = nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const receiptNo = `ADM-${joinDate.getFullYear()}${String(joinDate.getMonth() + 1).padStart(2, '0')}${String(joinDate.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Admission Receipt - ${bill.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; width: 80mm; margin: 0 auto; padding: 6mm; }
  .header { text-align: center; padding-bottom: 4mm; border-bottom: 2px solid #1a1a1a; margin-bottom: 4mm; }
  .pg-name { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
  .pg-loc { font-size: 10px; color: #666; margin-top: 2px; }
  .title { font-size: 13px; font-weight: 700; text-align: center; margin: 3mm 0; letter-spacing: 2px; text-transform: uppercase; background: #1a1a1a; color: #fff; padding: 2mm; }
  .rno { text-align: center; font-size: 9px; color: #888; margin-bottom: 3mm; font-family: monospace; }
  .divider { border: none; border-top: 1px dashed #ccc; margin: 3mm 0; }
  .row { display: flex; justify-content: space-between; font-size: 11px; padding: 1.2mm 0; }
  .row .label { color: #666; }
  .row .value { font-weight: 600; text-align: right; max-width: 55%; }
  .amt { background: #f5f5f5; border-radius: 3mm; padding: 3mm; margin: 3mm 0; text-align: center; }
  .amt-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .amt-value { font-size: 22px; font-weight: 900; margin-top: 1mm; }
  .next-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 3mm; padding: 3mm; margin: 3mm 0; text-align: center; }
  .next-label { font-size: 9px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; }
  .next-value { font-size: 16px; font-weight: 800; color: #b45309; margin-top: 1mm; }
  .next-due { font-size: 9px; color: #92400e; margin-top: 1mm; }
  .prorate { font-size: 9px; color: #888; text-align: center; margin: 2mm 0; font-style: italic; }
  .stamp-wrap { text-align: center; }
  .stamp { display: inline-block; font-size: 11px; font-weight: 700; color: #22c55e; border: 2px solid #22c55e; padding: 1mm 4mm; border-radius: 2mm; transform: rotate(-3deg); }
  .footer { text-align: center; margin-top: 4mm; padding-top: 3mm; border-top: 2px solid #1a1a1a; }
  .footer p { font-size: 8px; color: #999; margin-top: 1mm; }
  .footer .thanks { font-size: 11px; font-weight: 600; color: #1a1a1a; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="header">
    <div class="pg-name">${pgConfig.pg_name}</div>
    ${pgConfig.location ? `<div class="pg-loc">${pgConfig.location}</div>` : ''}
    ${pgConfig.contact ? `<div class="pg-loc">Contact: ${pgConfig.contact}</div>` : ''}
  </div>
  <div class="title">Admission Receipt</div>
  <div class="rno">${receiptNo}</div>
  <hr class="divider">
  <div class="row"><span class="label">Tenant</span><span class="value">${bill.name}</span></div>
  <div class="row"><span class="label">Room No.</span><span class="value">${bill.roomNumber}</span></div>
  <div class="row"><span class="label">Join Date</span><span class="value">${formattedJoin}</span></div>
  <div class="row"><span class="label">Rent Mode</span><span class="value">${bill.rentMode}</span></div>
  <div class="row"><span class="label">Payment Mode</span><span class="value">${(bill.paymentMode || 'cash').toUpperCase()}</span></div>
  ${bill.advance > 0 ? `<div class="row"><span class="label">Advance Deposit</span><span class="value">${pgConfig.currency}${Number(bill.advance).toLocaleString('en-IN')}</span></div>` : ''}
  <hr class="divider">
  ${bill.proRateNote ? `<div class="prorate">${bill.proRateNote}</div>` : ''}
  <div class="amt">
    <div class="amt-label">First Month Rent Paid</div>
    <div class="amt-value">${pgConfig.currency}${Number(bill.firstMonthRent).toLocaleString('en-IN')}</div>
  </div>
  <div class="stamp-wrap"><div class="stamp">PAID</div></div>
  ${bill.rentMode === 'monthly' ? `
  <div class="next-box">
    <div class="next-label">Next Month Fee</div>
    <div class="next-value">${pgConfig.currency}${Number(bill.monthlyRate).toLocaleString('en-IN')}</div>
    <div class="next-due">Due by 3rd ${nextMonthName}</div>
  </div>
  ` : ''}
  ${pgConfig.upi_id ? `<div style="text-align:center;margin:2mm 0;font-size:9px;color:#666;">UPI: ${pgConfig.upi_id}</div>` : ''}
  <div class="footer">
    <p class="thanks">Welcome, ${bill.name}!</p>
    <p>This is a computer-generated receipt.</p>
    <p>${pgConfig.pg_name} | ${new Date().toLocaleDateString('en-IN')}</p>
  </div>
</body></html>`

  const w = window.open('', '_blank', 'width=400,height=700')
  if (!w) return alert('Please allow popups for this site')
  w.document.write(html)
  w.document.close()
  w.onload = () => { w.print() }
}

const sendAdmissionWhatsApp = (bill, pgConfig) => {
  const phone = bill.phone?.replace(/\D/g, '')
  if (!phone) return alert('Phone number not found')
  const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`
  const joinDate = new Date(bill.joinDate)
  const nextMonth = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1)
  const nextMonthName = nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const line = '-------------------------------'
  const msg = [
    `*ADMISSION RECEIPT*`,
    line,
    `*${pgConfig.pg_name}*`,
    pgConfig.location || '',
    line,
    `*Tenant:* ${bill.name}`,
    `*Room:* ${bill.roomNumber}`,
    `*Join Date:* ${joinDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    bill.advance > 0 ? `*Advance:* ${pgConfig.currency}${Number(bill.advance).toLocaleString('en-IN')}` : '',
    line,
    `*First Month Rent:* ${pgConfig.currency}${Number(bill.firstMonthRent).toLocaleString('en-IN')} (Paid)`,
    `*Mode:* ${(bill.paymentMode || 'cash').toUpperCase()}`,
    bill.rentMode === 'monthly' ? `\n*Next Month:* ${pgConfig.currency}${Number(bill.monthlyRate).toLocaleString('en-IN')}` : '',
    bill.rentMode === 'monthly' ? `*Due by:* 3rd ${nextMonthName}` : '',
    pgConfig.upi_id ? `\n*UPI:* ${pgConfig.upi_id}` : '',
    line,
    `Welcome, ${bill.name}!`,
    `- ${pgConfig.pg_name}`,
  ].filter(Boolean).join('\n')

  const nextMonthDue = bill.rentMode === 'monthly' ? `3rd ${nextMonthName}` : ''
  const billLink = getBillLink({
    tenantName: bill.name, roomNumber: bill.roomNumber, date: bill.joinDate,
    amount: bill.firstMonthRent, mode: bill.paymentMode || 'cash', advance: bill.advance,
    nextMonthAmount: bill.rentMode === 'monthly' ? bill.monthlyRate : 0, nextMonthDue,
    currency: pgConfig.currency, pgName: pgConfig.pg_name,
    location: pgConfig.location, upiId: pgConfig.upi_id, billType: 'admission'
  })

  const fullMsg = msg + '\n\nView receipt:\n' + billLink
  window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(fullMsg)}`, '_blank')
}

const copyAdmissionBillLink = (bill, pgConfig) => {
  const joinDate = new Date(bill.joinDate)
  const nextMonth = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1)
  const nextMonthDue = bill.rentMode === 'monthly' ? `3rd ${nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` : ''
  copyBillLink({
    tenantName: bill.name,
    roomNumber: bill.roomNumber,
    date: bill.joinDate,
    amount: bill.firstMonthRent,
    mode: bill.paymentMode || 'cash',
    advance: bill.advance,
    nextMonthAmount: bill.rentMode === 'monthly' ? bill.monthlyRate : 0,
    nextMonthDue,
    currency: pgConfig.currency,
    pgName: pgConfig.pg_name,
    location: pgConfig.location,
    contact: pgConfig.contact,
    upiId: pgConfig.upi_id,
    billType: 'admission'
  })
}

const avatarColors = [
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-green-500 to-teal-500',
  'from-yellow-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-red-500 to-pink-500',
]

const getAvatarColor = (name) => {
  const index = name?.charCodeAt(0) % avatarColors.length
  return avatarColors[index] || avatarColors[0]
}

export default function Tenants() {
  const pgConfig = usePgConfig();
  const { role } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [tab, setTab] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [rentCalc, setRentCalc] = useState(null);
  const [admissionBill, setAdmissionBill] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [purgeInfo, setPurgeInfo] = useState(null);
  const [purging, setPurging] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [searchName, setSearchName] = useState("");

  const [form, setFormRaw] = useState(emptyForm);

  const setForm = (newForm) => {
    setFormRaw(newForm)
    if (!editTenant) saveDraft(newForm)
  }

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "tenants"), (snap) => {
      setTenants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const availableRooms = rooms.filter(r => {
    if (r.status === 'maintenance') return false
    const capacity = r.capacity || typeCapacity[r.type] || 1
    const occupied = r.occupiedBeds || 0
    return occupied < capacity
  })

  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setFormRaw(draft)
      setShowModal(true)
    }
  }, [])

  const openAdd = () => {
    setEditTenant(null);
    const draft = loadDraft()
    setFormRaw(draft || { ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (tenant) => {
    setEditTenant(tenant);
    setForm({
      name: tenant.name, phone: tenant.phone, email: tenant.email,
      roomId: tenant.roomId, roomNumber: tenant.roomNumber,
      rentMode: tenant.rentMode, joinDate: tenant.joinDate,
      idType: tenant.idType, idNumber: tenant.idNumber,
      advance: tenant.advance, emergencyContact: tenant.emergencyContact,
      address: tenant.address || "",
      notes: tenant.notes || "",
      idPhoto: null, tenantPhoto: null
    });
    setShowModal(true);
  };

  const calcFirstMonthRent = (roomId, joinDate, rentMode) => {
    if (!roomId || !joinDate || rentMode === 'daily') { setRentCalc(null); return null }
    const room = rooms.find(r => r.id === roomId)
    if (!room) { setRentCalc(null); return null }
    const monthlyRate = Number(room.monthlyRate) || 0
    if (!monthlyRate) { setRentCalc(null); return null }

    const jd = new Date(joinDate)
    const dayOfJoin = jd.getDate()
    const daysInMonth = new Date(jd.getFullYear(), jd.getMonth() + 1, 0).getDate()

    if (dayOfJoin <= 1) {
      const info = { type: 'full', monthlyRate, amount: monthlyRate, message: 'Joining on 1st — full month rent' }
      setRentCalc(info)
      return monthlyRate
    }

    const missedDays = dayOfJoin - 1
    const remainingDays = daysInMonth - missedDays
    const perDay = monthlyRate / daysInMonth
    const proRated = Math.round(perDay * remainingDays)
    const deduction = monthlyRate - proRated

    const info = {
      type: 'prorated', monthlyRate, perDay: Math.round(perDay * 100) / 100,
      missedDays, remainingDays, daysInMonth, deduction: Math.round(deduction),
      amount: proRated,
      message: `Joining on ${dayOfJoin}${dayOfJoin === 2 ? 'nd' : dayOfJoin === 3 ? 'rd' : 'th'} — ${missedDays} day${missedDays > 1 ? 's' : ''} deducted`
    }
    setRentCalc(info)
    return proRated
  }

  const handleRoomSelect = (e) => {
    const room = rooms.find((r) => r.id === e.target.value);
    if (room) {
      const amt = calcFirstMonthRent(room.id, form.joinDate, form.rentMode)
      setForm({ ...form, roomId: room.id, roomNumber: room.number, firstMonthRent: amt || '' })
    }
  };

  const handleJoinDateChange = (e) => {
    const joinDate = e.target.value
    const amt = calcFirstMonthRent(form.roomId, joinDate, form.rentMode)
    setForm({ ...form, joinDate, firstMonthRent: amt || '' })
  };

  const handleRentModeChange = (e) => {
    const rentMode = e.target.value
    const amt = calcFirstMonthRent(form.roomId, form.joinDate, rentMode)
    setForm({ ...form, rentMode, firstMonthRent: rentMode === 'daily' ? '' : (amt || '') })
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.roomId)
      return alert("Name, Phone and Room are required");
    setUploading(true)
    try {
      let idPhotoData = editTenant?.idPhotoData || null
      let tenantPhotoData = editTenant?.tenantPhotoData || null
      if (form.idPhoto) idPhotoData = await uploadFile(form.idPhoto)
      if (form.tenantPhoto) tenantPhotoData = await uploadFile(form.tenantPhoto)

      const data = {
        name: form.name, phone: form.phone, email: form.email,
        roomId: form.roomId, roomNumber: form.roomNumber,
        rentMode: form.rentMode, joinDate: form.joinDate,
        idType: form.idType, idNumber: form.idNumber,
        advance: Number(form.advance), emergencyContact: form.emergencyContact,
        address: form.address, notes: form.notes, idPhotoData, tenantPhotoData,
        status: "active", createdAt: new Date().toISOString(),
      };

      if (editTenant) {
        await updateDoc(doc(db, "tenants", editTenant.id), data);
      } else {
        const tenantRef = await addDoc(collection(db, "tenants"), data);

        // Fetch FRESH room data directly from Firestore
        const roomSnap = await getDoc(doc(db, "rooms", form.roomId))
        if (roomSnap.exists()) {
          const roomData = roomSnap.data()
          const capacity = roomData.capacity || typeCapacity[roomData.type] || 1
          const newOccupied = (roomData.occupiedBeds || 0) + 1
          await updateDoc(doc(db, "rooms", form.roomId), {
            occupiedBeds: newOccupied,
            status: 'occupied'
          })
        }

        // Auto-record first month payment for monthly tenants
        const firstRent = Number(form.firstMonthRent)
        if (form.rentMode === 'monthly' && firstRent > 0) {
          const joinD = new Date(form.joinDate)
          const monthName = joinD.toLocaleString('en-US', { month: 'long', year: 'numeric' })
          await addDoc(collection(db, "payments"), {
            tenantId: tenantRef.id,
            tenantName: form.name,
            roomNumber: form.roomNumber,
            amount: firstRent,
            mode: form.firstMonthMode || 'cash',
            month: monthName,
            note: rentCalc?.type === 'prorated' ? `First month (pro-rated: ${rentCalc.remainingDays} days)` : 'First month rent',
            date: form.joinDate,
            createdAt: new Date().toISOString()
          })
        }

        await sendNotification("booking", "New Tenant Added", `${form.name} has been added to Room ${form.roomNumber} (${form.rentMode})`);

        // Prepare admission bill data for post-save actions
        const room = rooms.find(r => r.id === form.roomId)
        const monthlyRate = Number(room?.monthlyRate) || 0
        setAdmissionBill({
          name: form.name, phone: form.phone, roomNumber: form.roomNumber,
          joinDate: form.joinDate, rentMode: form.rentMode,
          firstMonthRent: firstRent || monthlyRate,
          monthlyRate, advance: Number(form.advance),
          paymentMode: form.firstMonthMode || 'cash',
          proRateNote: rentCalc?.type === 'prorated' ? `Pro-rated: ${rentCalc.remainingDays} of ${rentCalc.daysInMonth} days` : ''
        })
      }
      clearDraft();
      setRentCalc(null);
      setShowModal(false);
    } catch (err) {
      alert('Error saving tenant: ' + err.message)
    }
    setUploading(false)
  };

  const handleCheckout = async (tenant) => {
    if (!window.confirm(`Checkout ${tenant.name}?`)) return;

    await updateDoc(doc(db, "tenants", tenant.id), {
      status: "left", leftDate: new Date().toISOString()
    });

    // Fetch FRESH room data directly from Firestore
    const roomSnap = await getDoc(doc(db, "rooms", tenant.roomId))
    if (roomSnap.exists()) {
      const roomData = roomSnap.data()
      const newOccupied = Math.max((roomData.occupiedBeds || 1) - 1, 0)
      await updateDoc(doc(db, "rooms", tenant.roomId), {
        occupiedBeds: newOccupied,
        status: newOccupied === 0 ? 'vacant' : 'occupied'
      })
    }

    await sendNotification("info", "Tenant Checked Out", `${tenant.name} has checked out from Room ${tenant.roomNumber}`);
  };

  const openPurge = async (tenant) => {
    const paymentsSnap = await getDocs(query(collection(db, "payments"), where("tenantId", "==", tenant.id)))
    const tenantPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const totalRevenue = tenantPayments.reduce((s, p) => s + (p.amount || 0), 0)
    setPurgeInfo({ payments: tenantPayments, totalRevenue })
    setPurgeTarget(tenant)
  }

  const confirmPurge = async () => {
    if (!purgeTarget || !purgeInfo) return
    setPurging(true)
    try {
      // Delete all payments linked to this tenant
      for (const p of purgeInfo.payments) {
        await deleteDoc(doc(db, "payments", p.id))
      }

      // If tenant was active, fix room occupancy
      if (purgeTarget.status === 'active') {
        const roomSnap = await getDoc(doc(db, "rooms", purgeTarget.roomId))
        if (roomSnap.exists()) {
          const roomData = roomSnap.data()
          const newOccupied = Math.max((roomData.occupiedBeds || 1) - 1, 0)
          await updateDoc(doc(db, "rooms", purgeTarget.roomId), {
            occupiedBeds: newOccupied,
            status: newOccupied === 0 ? 'vacant' : 'occupied'
          })
        }
      }

      // Delete the tenant document
      await deleteDoc(doc(db, "tenants", purgeTarget.id))

      setPurgeTarget(null)
      setPurgeInfo(null)
      setExpandedId(null)
    } catch (err) {
      alert('Error deleting: ' + err.message)
    }
    setPurging(false)
  }

  const getDaysStayed = (tenant) => {
    const start = new Date(tenant.joinDate)
    const end = tenant.leftDate ? new Date(tenant.leftDate) : new Date()
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return isNaN(diff) ? '-' : diff
  }

  const downloadCSV = () => {
    const rows = filteredAll.map(t => ({
      Name: t.name, Phone: t.phone, Email: t.email || '',
      Address: t.address || '', Room: t.roomNumber, RentMode: t.rentMode,
      IDType: t.idType || '', IDNumber: t.idNumber || '',
      JoinDate: t.joinDate, LeftDate: t.leftDate?.slice(0, 10) || '',
      DaysStayed: getDaysStayed(t), Status: t.status,
      EmergencyContact: t.emergencyContact || ''
    }))
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const activeTenants = tenants.filter((t) => t.status === "active");
  const leftTenants = tenants.filter((t) => t.status === "left");
  const displayed = tab === "active" ? activeTenants : leftTenants;

  const filteredAll = tenants.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterRoomType !== 'all') {
      const room = rooms.find(r => r.id === t.roomId)
      if (!room || room.type !== filterRoomType) return false
    }
    if (filterFromDate && t.joinDate < filterFromDate) return false
    if (filterToDate && t.joinDate > filterToDate) return false
    if (searchName && !t.name?.toLowerCase().includes(searchName.toLowerCase())) return false
    return true
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const TenantListItem = ({ tenant, showActions = true }) => {
    const isExpanded = expandedId === tenant.id
    const room = rooms.find(r => r.id === tenant.roomId)
    const days = getDaysStayed(tenant)

    return (
      <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-500/50' : 'border-gray-800 hover:border-gray-700'}`}>

        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tenant.id)}>
          <div className="flex-shrink-0">
            {tenant.tenantPhotoData?.url ? (
              <img src={tenant.tenantPhotoData.url} alt={tenant.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40" />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(tenant.name)} flex items-center justify-center text-white font-black text-xl border-2 border-white/10`}>
                {tenant.name[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{tenant.name}</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                {tenant.status === 'active' ? '● Active' : '○ Left'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">🏠 Room {tenant.roomNumber}</span>
              <span className="text-xs text-gray-500 font-mono">📞 {tenant.phone}</span>
              <span className="text-xs text-gray-500 font-mono capitalize">💳 {tenant.rentMode}</span>
              <span className="text-xs text-gray-600 font-mono">⏱ {days}d</span>
            </div>
          </div>

          <div className={`text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Personal Details</p>
                {tenant.email && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">✉️</span><span className="text-sm text-gray-300">{tenant.email}</span></div>}
                <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">📞</span><span className="text-sm text-gray-300">{tenant.phone}</span></div>
                {tenant.address && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs w-4 mt-0.5">📍</span><span className="text-sm text-gray-300">{tenant.address}</span></div>}
                {tenant.emergencyContact && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">🆘</span><span className="text-sm text-gray-300">{tenant.emergencyContact}</span></div>}
                {tenant.idType && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">🪪</span><span className="text-sm text-gray-300">{tenant.idType?.toUpperCase()}: {tenant.idNumber}</span></div>}
                {tenant.advance > 0 && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs w-4">💰</span><span className="text-sm text-gray-300">Advance: {pgConfig.currency}{tenant.advance}</span></div>}
                {tenant.notes && <div className="flex items-start gap-2"><span className="text-gray-600 text-xs w-4 mt-0.5">📝</span><span className="text-sm text-gray-300 whitespace-pre-wrap">{tenant.notes}</span></div>}
              </div>

              <div>
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Stay Info</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">🏠</span><span className="text-sm text-gray-300">Room {tenant.roomNumber} · {room?.type || ''} · {tenant.rentMode}</span></div>
                  <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">📅</span><span className="text-sm text-gray-300">Joined: {tenant.joinDate}</span></div>
                  {tenant.leftDate && <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">🚪</span><span className="text-sm text-gray-300">Left: {tenant.leftDate?.slice(0, 10)}</span></div>}
                  <div className="flex items-center gap-2"><span className="text-gray-600 text-xs">⏱</span><span className="text-sm text-gray-300">{days} days {tenant.status === 'active' ? '(ongoing)' : 'total'}</span></div>
                </div>
                <div className="flex gap-2">
                  {tenant.idPhotoData?.url && (
                    <a href={tenant.idPhotoData.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs px-3 py-1.5 rounded-lg transition-all">
                      🪪 View ID
                    </a>
                  )}
                  {tenant.tenantPhotoData?.url && (
                    <a href={tenant.tenantPhotoData.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs px-3 py-1.5 rounded-lg transition-all">
                      📷 View Photo
                    </a>
                  )}
                </div>
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                {tab === "active" && (
                  <>
                    {role === "admin" ? (
                      <button onClick={() => { openEdit(tenant); setExpandedId(null) }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-2 rounded-lg transition-all font-semibold">
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const message = window.prompt(`What needs to be changed for ${tenant.name}?\n\nDescribe the change clearly:`);
                          if (message?.trim()) {
                            requestDelete("tenants_edit", tenant.id, `Edit request — ${tenant.name} (Room ${tenant.roomNumber}): ${message.trim()}`)
                              .then(() => alert("Edit request sent to admin!"));
                          }
                        }}
                        className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs py-2 rounded-lg transition-all font-semibold"
                      >
                        Request Edit
                      </button>
                    )}
                    <button onClick={() => handleCheckout(tenant)}
                      className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs py-2 rounded-lg transition-all font-semibold">
                      Checkout
                    </button>
                  </>
                )}
                {role === "admin" && (
                  <button onClick={() => openPurge(tenant)}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-2 rounded-lg transition-all font-semibold">
                    Delete All Data
                  </button>
                )}
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
            <h2 className="text-xl md:text-2xl font-bold">Tenants</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">
              {activeTenants.length} active · {leftTenants.length} past · {tenants.length} total
            </p>
          </div>
          <button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            + Add Tenant
          </button>
        </div>

        {role === "warden" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-yellow-400 text-xs font-mono">
            🔑 Warden — you can add tenants and checkout. To edit details, send a request to admin.
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === "active" ? "bg-indigo-500 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
            Active ({activeTenants.length})
          </button>
          <button onClick={() => setTab("left")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === "left" ? "bg-indigo-500 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
            Past ({leftTenants.length})
          </button>
          <button onClick={() => setTab("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${tab === "all" ? "bg-indigo-500 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
            📋 All Records ({tenants.length})
          </button>
        </div>

        {(tab === "active" || tab === "left") && (
          <>
            {displayed.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-400 font-mono text-sm">No {tab} tenants yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayed.map(tenant => (
                  <TenantListItem key={tenant.id} tenant={tenant} showActions={true} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "all" && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Filters</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <input value={searchName} onChange={e => setSearchName(e.target.value)}
                  placeholder="Search by name..."
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="left">Left</option>
                </select>
                <select value={filterRoomType} onChange={e => setFilterRoomType(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="all">All Room Types</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="dormitory">Dormitory</option>
                </select>
                <div>
                  <label className="text-xs text-gray-500 font-mono mb-1 block">From Date</label>
                  <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-mono mb-1 block">To Date</label>
                  <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setFilterStatus('all'); setFilterRoomType('all'); setFilterFromDate(''); setFilterToDate(''); setSearchName('') }}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-xs py-2 rounded-xl transition-all font-mono">
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500 text-xs font-mono">{filteredAll.length} records found</p>
              <button onClick={downloadCSV} className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                ⬇ Download CSV
              </button>
            </div>

            {filteredAll.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-400 font-mono text-sm">No records match your filters.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAll.map(tenant => (
                  <TenantListItem key={tenant.id} tenant={tenant} showActions={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editTenant ? "Edit Tenant" : "Add Tenant"}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full Name *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone Number *" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Home Address (optional)" rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
              <select value={form.roomId} onChange={handleRoomSelect}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">Select Room *</option>
                {availableRooms.map((r) => {
                  const capacity = r.capacity || typeCapacity[r.type] || 1
                  const free = capacity - (r.occupiedBeds || 0)
                  return (
                    <option key={r.id} value={r.id}>
                      Room {r.number} · {r.type} · {free} bed{free !== 1 ? 's' : ''} free · {pgConfig.currency}{r.monthlyRate}/mo
                    </option>
                  )
                })}
              </select>
              <select value={form.rentMode} onChange={handleRentModeChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Join Date *</label>
                <input value={form.joinDate} onChange={handleJoinDateChange}
                  type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <select value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">ID Type</option>
                <option value="aadhar">Aadhar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="dl">Driving License</option>
              </select>
              <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                placeholder="ID Number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1 block">Advance Amount ({pgConfig.currency})</label>
                <input value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })}
                  placeholder="0" type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="Emergency Contact Number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)" rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none" />

              {!editTenant && form.rentMode === 'monthly' && rentCalc && (
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">First Month Rent</p>
                  <div className={`rounded-xl p-3 text-xs font-mono border mb-3 ${rentCalc.type === 'prorated' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                    <p className="font-bold mb-1">{rentCalc.message}</p>
                    {rentCalc.type === 'prorated' && (
                      <div className="space-y-0.5 text-[11px] opacity-80">
                        <p>Monthly rate: {pgConfig.currency}{rentCalc.monthlyRate.toLocaleString('en-IN')}</p>
                        <p>Per day: {pgConfig.currency}{rentCalc.perDay} ({rentCalc.daysInMonth} days in month)</p>
                        <p>Deduction: {rentCalc.missedDays} day{rentCalc.missedDays > 1 ? 's' : ''} x {pgConfig.currency}{rentCalc.perDay} = {pgConfig.currency}{rentCalc.deduction.toLocaleString('en-IN')}</p>
                        <p className="font-bold text-xs mt-1">To collect: {pgConfig.currency}{rentCalc.monthlyRate.toLocaleString('en-IN')} - {pgConfig.currency}{rentCalc.deduction.toLocaleString('en-IN')} = {pgConfig.currency}{rentCalc.amount.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {rentCalc.type === 'full' && (
                      <p className="text-[11px] opacity-80">Room rate: {pgConfig.currency}{rentCalc.monthlyRate.toLocaleString('en-IN')}/month</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">First Month Amount ({pgConfig.currency})</label>
                    <input value={form.firstMonthRent} onChange={(e) => setForm({ ...form, firstMonthRent: e.target.value })}
                      type="number" placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <select value={form.firstMonthMode} onChange={(e) => setForm({ ...form, firstMonthMode: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 mt-2">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              )}

              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">Photos (Optional)</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">🪪 ID Photo (Aadhar/PAN front)</label>
                    <input type="file" accept="image/*,.pdf"
                      onChange={e => setForm({ ...form, idPhoto: e.target.files[0] })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                    {form.idPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.idPhoto.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono mb-1 block">📷 Tenant Photo (selfie/passport size)</label>
                    <input type="file" accept="image/*"
                      onChange={e => setForm({ ...form, tenantPhoto: e.target.files[0] })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                    {form.tenantPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.tenantPhoto.name}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { clearDraft(); setRentCalc(null); setShowModal(false) }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave} disabled={uploading}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {uploading ? 'Uploading...' : editTenant ? "Update" : "Add Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {admissionBill && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-4xl mb-3">Done</p>
            <h3 className="text-lg font-bold mb-1">Tenant Added!</h3>
            <p className="text-gray-400 text-sm mb-1">{admissionBill.name} · Room {admissionBill.roomNumber}</p>
            {admissionBill.firstMonthRent > 0 && (
              <p className="text-2xl font-black text-green-400 mb-1">{pgConfig.currency}{Number(admissionBill.firstMonthRent).toLocaleString('en-IN')} paid</p>
            )}
            {admissionBill.rentMode === 'monthly' && admissionBill.monthlyRate > 0 && (
              <p className="text-yellow-400 text-xs mb-3">Next month: {pgConfig.currency}{Number(admissionBill.monthlyRate).toLocaleString('en-IN')}</p>
            )}
            <p className="text-gray-500 text-xs mb-4">Share admission receipt with tenant</p>
            <div className="flex gap-2">
              <button onClick={() => setAdmissionBill(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Skip</button>
              <button onClick={() => { generateAdmissionPDF(admissionBill, pgConfig) }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all">PDF</button>
              <button onClick={() => { sendAdmissionWhatsApp(admissionBill, pgConfig); setAdmissionBill(null) }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-sm font-bold py-2.5 rounded-xl transition-all">WhatsApp</button>
              <button onClick={() => copyAdmissionBillLink(admissionBill, pgConfig)}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-sm font-bold py-2.5 rounded-xl transition-all">Link</button>
            </div>
          </div>
        </div>
      )}

      {purgeTarget && purgeInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-400 font-black">!</span>
            </div>
            <h3 className="text-lg font-bold text-center mb-1">Permanently Delete Tenant?</h3>
            <p className="text-gray-400 text-sm text-center mb-4">{purgeTarget.name} · Room {purgeTarget.roomNumber}</p>

            <div className="bg-gray-800 rounded-xl p-3 mb-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Tenant record</span>
                <span className="text-red-400">Will be deleted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment records</span>
                <span className="text-red-400">{purgeInfo.payments.length} record{purgeInfo.payments.length !== 1 ? 's' : ''} deleted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Revenue removed</span>
                <span className="text-red-400">{pgConfig.currency}{purgeInfo.totalRevenue.toLocaleString('en-IN')}</span>
              </div>
              {purgeTarget.status === 'active' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Room {purgeTarget.roomNumber}</span>
                  <span className="text-yellow-400">Bed freed up</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">ID/Photos</span>
                <span className="text-red-400">Removed</span>
              </div>
            </div>

            <p className="text-red-400/70 text-xs text-center mb-4">This action cannot be undone. All data for this tenant will be permanently removed from the system.</p>

            <div className="flex gap-3">
              <button onClick={() => { setPurgeTarget(null); setPurgeInfo(null) }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={confirmPurge} disabled={purging}
                className="flex-1 bg-red-500 hover:bg-red-600 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {purging ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}