import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { requestDelete } from "../firebase/deleteRequests";
import { collection, addDoc, onSnapshot, updateDoc, doc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import pgConfig from "../config/pgConfig";
import { sendNotification } from "../firebase/notifications";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../firebase/uploadFile";

const typeCapacity = { single: 1, double: 2, triple: 3, dormitory: 6 }

export default function Tenants() {
  const { role } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [tab, setTab] = useState("active");
  const [uploading, setUploading] = useState(false);

  // ALL TENANTS FILTERS
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [searchName, setSearchName] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", email: "", roomId: "", roomNumber: "",
    rentMode: "monthly", joinDate: "", idType: "", idNumber: "",
    advance: "", emergencyContact: "", address: "",
    idPhoto: null, tenantPhoto: null
  });

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

  const openAdd = () => {
    setEditTenant(null);
    setForm({ name: "", phone: "", email: "", roomId: "", roomNumber: "", rentMode: "monthly", joinDate: "", idType: "", idNumber: "", advance: "", emergencyContact: "", address: "", idPhoto: null, tenantPhoto: null });
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
      idPhoto: null, tenantPhoto: null
    });
    setShowModal(true);
  };

  const handleRoomSelect = (e) => {
    const room = rooms.find((r) => r.id === e.target.value);
    if (room) setForm({ ...form, roomId: room.id, roomNumber: room.number });
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
        address: form.address,
        idPhotoData, tenantPhotoData,
        status: "active", createdAt: new Date().toISOString(),
      };

      if (editTenant) {
        await updateDoc(doc(db, "tenants", editTenant.id), data);
      } else {
        await addDoc(collection(db, "tenants"), data);
        const room = rooms.find(r => r.id === form.roomId)
        if (room) {
          const capacity = room.capacity || typeCapacity[room.type] || 1
          const newOccupied = (room.occupiedBeds || 0) + 1
          await updateDoc(doc(db, "rooms", form.roomId), {
            occupiedBeds: newOccupied,
            status: newOccupied >= capacity ? 'occupied' : 'occupied'
          })
        }
        await sendNotification("booking", "🏠 New Tenant Added", `${form.name} has been added to Room ${form.roomNumber} (${form.rentMode})`);
      }
      setShowModal(false);
    } catch (err) {
      alert('Error saving tenant: ' + err.message)
    }
    setUploading(false)
  };

  const handleCheckout = async (tenant) => {
    if (!window.confirm(`Checkout ${tenant.name}?`)) return;
    await updateDoc(doc(db, "tenants", tenant.id), { status: "left", leftDate: new Date().toISOString() });
    const room = rooms.find(r => r.id === tenant.roomId)
    if (room) {
      const newOccupied = Math.max((room.occupiedBeds || 1) - 1, 0)
      await updateDoc(doc(db, "rooms", tenant.roomId), { occupiedBeds: newOccupied, status: newOccupied === 0 ? 'vacant' : 'occupied' })
    }
    await sendNotification("info", "🚪 Tenant Checked Out", `${tenant.name} has checked out from Room ${tenant.roomNumber}`);
  };

  const getDaysStayed = (tenant) => {
    const start = new Date(tenant.joinDate)
    const end = tenant.leftDate ? new Date(tenant.leftDate) : new Date()
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return isNaN(diff) ? '-' : diff
  }

  const downloadCSV = () => {
    const rows = filteredAll.map(t => ({
      Name: t.name,
      Phone: t.phone,
      Email: t.email || '',
      Address: t.address || '',
      Room: t.roomNumber,
      RentMode: t.rentMode,
      IDType: t.idType || '',
      IDNumber: t.idNumber || '',
      JoinDate: t.joinDate,
      LeftDate: t.leftDate?.slice(0, 10) || '',
      DaysStayed: getDaysStayed(t),
      Status: t.status,
      EmergencyContact: t.emergencyContact || ''
    }))
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-record-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const activeTenants = tenants.filter((t) => t.status === "active");
  const leftTenants = tenants.filter((t) => t.status === "left");
  const displayed = tab === "active" ? activeTenants : tab === "left" ? leftTenants : [];

  // ALL TENANTS FILTER
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
            🔑 Warden — you can add tenants and checkout. To edit tenant details, send a request to admin.
          </div>
        )}

        {/* TABS */}
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

        {/* ALL TENANTS TAB */}
        {tab === "all" && (
          <div>
            {/* FILTERS */}
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
                  <label className="text-xs text-gray-500 font-mono mb-1 block">Join Date From</label>
                  <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-mono mb-1 block">Join Date To</label>
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

            {/* DOWNLOAD */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500 text-xs font-mono">{filteredAll.length} records found</p>
              <button onClick={downloadCSV} className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                ⬇ Download CSV
              </button>
            </div>

            {/* ALL TENANTS TABLE */}
            {filteredAll.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-400 font-mono text-sm">No records match your filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAll.map(tenant => {
                  const room = rooms.find(r => r.id === tenant.roomId)
                  const days = getDaysStayed(tenant)
                  return (
                    <div key={tenant.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        {/* PHOTO */}
                        <div className="flex-shrink-0">
                          {tenant.tenantPhotoData?.url ? (
                            <img src={tenant.tenantPhotoData.url} alt={tenant.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-lg">
                              {tenant.name[0]}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold">{tenant.name}</span>
                            <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                              {tenant.status === 'active' ? '● Active' : '○ Left'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                            <p className="text-xs text-gray-500">📞 {tenant.phone}</p>
                            <p className="text-xs text-gray-500">🏠 Room {tenant.roomNumber} · {room?.type || ''}</p>
                            <p className="text-xs text-gray-500">📅 Joined: {tenant.joinDate}</p>
                            <p className="text-xs text-gray-500">⏱ {days} days stayed</p>
                            {tenant.address && <p className="text-xs text-gray-500 col-span-2">📍 {tenant.address}</p>}
                            {tenant.idType && <p className="text-xs text-gray-500">🪪 {tenant.idType?.toUpperCase()}: {tenant.idNumber}</p>}
                            {tenant.leftDate && <p className="text-xs text-gray-500">🚪 Left: {tenant.leftDate?.slice(0, 10)}</p>}
                            {tenant.emergencyContact && <p className="text-xs text-gray-500">🆘 {tenant.emergencyContact}</p>}
                          </div>

                          {/* PHOTOS */}
                          <div className="flex gap-2 mt-2">
                            {tenant.idPhotoData?.url && (
                              <a href={tenant.idPhotoData.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:underline font-mono">
                                🪪 View ID
                              </a>
                            )}
                            {tenant.tenantPhotoData?.url && (
                              <a href={tenant.tenantPhotoData.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:underline font-mono">
                                📷 View Photo
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE / PAST TABS */}
        {(tab === "active" || tab === "left") && (
          <>
            {displayed.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-400 font-mono text-sm">No {tab} tenants yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayed.map((tenant) => (
                  <div key={tenant.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      {tenant.tenantPhotoData?.url ? (
                        <img src={tenant.tenantPhotoData.url} alt={tenant.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/30 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                          {tenant.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold">{tenant.name}</div>
                        <div className="text-gray-500 text-xs font-mono">Room {tenant.roomNumber} · {tenant.rentMode}</div>
                      </div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="text-xs text-gray-500">📞 {tenant.phone}</p>
                      {tenant.email && <p className="text-xs text-gray-500">✉️ {tenant.email}</p>}
                      <p className="text-xs text-gray-500">📅 Joined: {tenant.joinDate}</p>
                      {tenant.address && <p className="text-xs text-gray-500">📍 {tenant.address}</p>}
                      {tenant.advance > 0 && <p className="text-xs text-gray-500">💰 Advance: {pgConfig.currency}{tenant.advance}</p>}
                      <div className="flex gap-2 mt-1">
                        {tenant.idPhotoData?.url && (
                          <a href={tenant.idPhotoData.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline font-mono">🪪 ID</a>
                        )}
                        {tenant.tenantPhotoData?.url && (
                          <a href={tenant.tenantPhotoData.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline font-mono">📷 Photo</a>
                        )}
                      </div>
                    </div>
                    {tab === "active" && (
                      <div className="flex gap-2">
                        {role === "admin" ? (
                          <button onClick={() => openEdit(tenant)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded-lg transition-all">Edit</button>
                        ) : (
                          <button
                            onClick={() => {
                              const message = window.prompt(`What needs to be changed for ${tenant.name} (Room ${tenant.roomNumber})?\n\nDescribe the change clearly:`);
                              if (message && message.trim()) {
                                requestDelete("tenants_edit", tenant.id, `Edit request — ${tenant.name} (Room ${tenant.roomNumber}): ${message.trim()}`)
                                  .then(() => alert("Edit request sent to admin successfully!"));
                              }
                            }}
                            className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs py-1.5 rounded-lg transition-all"
                          >
                            Request Edit
                          </button>
                        )}
                        <button onClick={() => handleCheckout(tenant)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded-lg transition-all">
                          Checkout
                        </button>
                      </div>
                    )}
                    {tab === "left" && (
                      <p className="text-xs text-gray-600 font-mono">Left: {tenant.leftDate?.slice(0, 10)} · {getDaysStayed(tenant)} days stayed</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL */}
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
                  const occupied = r.occupiedBeds || 0
                  const free = capacity - occupied
                  return (
                    <option key={r.id} value={r.id}>
                      Room {r.number} · {r.type} · {free} bed{free !== 1 ? 's' : ''} free · {pgConfig.currency}{r.monthlyRate}/mo
                    </option>
                  )
                })}
              </select>

              <select value={form.rentMode} onChange={(e) => setForm({ ...form, rentMode: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
              <input value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
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
              <input value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })}
                placeholder="Advance Amount (₹)" type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="Emergency Contact Number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />

              {/* PHOTO UPLOADS */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">Photos (Optional)</p>
                <div>
                  <label className="text-xs text-gray-500 font-mono mb-1 block">🪪 ID Photo (Aadhar/PAN front)</label>
                  <input type="file" accept="image/*,.pdf"
                    onChange={e => setForm({ ...form, idPhoto: e.target.files[0] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                  {form.idPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.idPhoto.name}</p>}
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-500 font-mono mb-1 block">📷 Tenant Photo (selfie/passport size)</label>
                  <input type="file" accept="image/*"
                    onChange={e => setForm({ ...form, tenantPhoto: e.target.files[0] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
                  {form.tenantPhoto && <p className="text-xs text-green-400 font-mono mt-1">✓ {form.tenantPhoto.name}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2.5 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave} disabled={uploading}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {uploading ? 'Uploading...' : editTenant ? "Update" : "Add Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}