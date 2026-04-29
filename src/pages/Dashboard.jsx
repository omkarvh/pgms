import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import pgConfig from "../config/pgConfig";
import { useAuth } from "../context/AuthContext";
import { checkRentDues } from '../firebase/notifications'

const typeCapacity = { single: 1, double: 2, triple: 3, dormitory: 6 }

const getRoomColor = (room) => {
  if (room.status === 'maintenance') return 'bg-red-500/10 border-red-500/30 text-red-400'
  if (room.status === 'reserved') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  const capacity = room.capacity || typeCapacity[room.type] || 1
  const occupied = room.occupiedBeds || 0
  if (occupied === 0) return 'bg-green-500/10 border-green-500/30 text-green-400'
  if (occupied >= capacity) return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
  return 'bg-orange-500/10 border-orange-500/30 text-orange-400'
}

function DuesTracking({ tenants, payments }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const unpaidTenants = tenants.filter((tenant) => {
    const paid = payments.some(
      (p) => p.tenantId === tenant.id && p.date?.startsWith(thisMonth)
    );
    return !paid;
  });

  if (unpaidTenants.length === 0)
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
        <p className="text-green-400 font-bold text-sm">
          ✅ All tenants have paid for this month!
        </p>
      </div>
    );

  return (
    <div className="bg-gray-900 border border-red-500/30 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-red-400">⚠️ Unpaid This Month ({unpaidTenants.length})</h3>
      </div>
      <div className="space-y-2">
        {unpaidTenants.map((tenant) => (
          <div key={tenant.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-black text-sm flex-shrink-0">
              {tenant.name[0]}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">{tenant.name}</div>
              <div className="text-xs text-gray-500 font-mono">Room {tenant.roomNumber} · {tenant.rentMode}</div>
            </div>
            <div className="text-xs font-mono text-red-400 font-bold">NOT PAID</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "rooms"), (snap) =>
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub2 = onSnapshot(collection(db, "tenants"), (snap) =>
      setTenants(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(collection(db, "payments"), (snap) =>
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub4 = onSnapshot(collection(db, "expenses"), (snap) =>
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const activeTenants = tenants.filter((t) => t.status === "active");
  const totalRevenue = payments.filter((p) => p.date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.filter((e) => e.date?.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // BED STATS
  const totalBeds = rooms.reduce((s, r) => s + (r.capacity || typeCapacity[r.type] || 1), 0)
  const occupiedBeds = rooms.reduce((s, r) => s + (r.occupiedBeds || 0), 0)
  const availableBeds = totalBeds - occupiedBeds

  const recentPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  useEffect(() => {
    const active = tenants.filter(t => t.status === 'active')
    if (active.length > 0) checkRentDues(active, payments)
  }, [tenants, payments])

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const quickActions = [
    { icon: "📋", label: "New Booking", desc: "Add tenant", path: "/tenants" },
    { icon: "💰", label: "Record Payment", desc: "Cash/UPI/Bank", path: "/payments" },
    ...(role === "admin"
      ? [
          { icon: "🧾", label: "Add Expense", desc: "Log a bill", path: "/expenses" },
          { icon: "📈", label: "Analytics", desc: "Business insights", path: "/analytics" },
        ]
      : [
          { icon: "🧾", label: "Add Expense", desc: "Log a bill", path: "/expenses" },
        ]),
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* MOBILE TOPBAR */}
        <div className="flex items-center justify-between mb-6 md:hidden">
          <div>
            <div className="text-lg font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">PGMS</div>
            <div className="text-gray-600 text-xs font-mono">{pgConfig.pg_name}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            {role === "admin" ? pgConfig.owner_name[0] : "W"}
          </div>
        </div>

        {/* GREETING */}
        <h2 className="text-xl md:text-2xl font-bold mb-1">
          {greeting()}, {role === "admin" ? pgConfig.owner_name : "Warden"} 👋
        </h2>
        <p className="text-gray-500 font-mono text-xs md:text-sm mb-6">
          {new Date().toDateString()} · {pgConfig.location}
        </p>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div onClick={() => navigate("/rooms")} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Beds Occupied</p>
            <p className="text-2xl md:text-3xl font-black text-indigo-400">{occupiedBeds}/{totalBeds}</p>
            <p className="text-gray-600 text-xs mt-1">{availableBeds} available</p>
          </div>
          <div onClick={() => navigate("/payments")} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-green-500/50 transition-all">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Revenue</p>
            {role === "admin" ? (
              <p className="text-2xl md:text-3xl font-black text-green-400">{pgConfig.currency}{totalRevenue.toLocaleString()}</p>
            ) : (
              <p className="text-2xl md:text-3xl font-black text-green-400">****</p>
            )}
            <p className="text-gray-600 text-xs mt-1">this month</p>
          </div>
          {role === "admin" && (
            <div onClick={() => navigate("/expenses")} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-red-500/50 transition-all">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Expenses</p>
              <p className="text-2xl md:text-3xl font-black text-red-400">{pgConfig.currency}{totalExpenses.toLocaleString()}</p>
              <p className="text-gray-600 text-xs mt-1">this month</p>
            </div>
          )}
          {role === "admin" && (
            <div onClick={() => navigate("/analytics")} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-yellow-500/50 transition-all">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Net Profit</p>
              <p className={`text-2xl md:text-3xl font-black ${netProfit >= 0 ? "text-yellow-400" : "text-red-400"}`}>{pgConfig.currency}{netProfit.toLocaleString()}</p>
              <p className="text-gray-600 text-xs mt-1">this month</p>
            </div>
          )}
          {role === "warden" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Active Tenants</p>
              <p className="text-2xl md:text-3xl font-black text-green-400">{activeTenants.length}</p>
              <p className="text-gray-600 text-xs mt-1">currently staying</p>
            </div>
          )}
          {role === "warden" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Available Beds</p>
              <p className="text-2xl md:text-3xl font-black text-yellow-400">{availableBeds}</p>
              <p className="text-gray-600 text-xs mt-1">out of {totalBeds} total</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* ROOM MAP */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Room Map</h3>
              <button onClick={() => navigate("/rooms")} className="text-indigo-400 text-xs font-mono">Manage →</button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono text-center py-6">No rooms added yet</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {rooms.sort((a, b) => a.number?.localeCompare(b.number)).map((room) => {
                  const capacity = room.capacity || typeCapacity[room.type] || 1
                  const occupied = room.occupiedBeds || 0
                  return (
                    <div
                      key={room.id}
                      onClick={() => navigate('/rooms')}
                      className={`border rounded-lg p-1.5 text-center cursor-pointer hover:scale-105 transition-all ${getRoomColor(room)}`}
                    >
                      <div className="font-black text-sm">{room.number}</div>
                      <div className="text-xs font-mono opacity-90">{occupied}/{capacity}</div>
                      {/* Mini bed dots */}
                      <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
                        {Array.from({ length: capacity }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${i < occupied ? 'bg-current opacity-100' : 'bg-current opacity-20'}`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* LEGEND */}
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-xs text-gray-600 font-mono">Vacant</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-xs text-gray-600 font-mono">Partial</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <span className="text-xs text-gray-600 font-mono">Full</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs text-gray-600 font-mono">Maintenance</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-xs text-gray-600 font-mono">Reserved</span>
              </div>
            </div>

            {/* BED SUMMARY */}
            <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-black text-white">{totalBeds}</p>
                <p className="text-xs text-gray-600 font-mono">Total</p>
              </div>
              <div>
                <p className="text-lg font-black text-indigo-400">{occupiedBeds}</p>
                <p className="text-xs text-gray-600 font-mono">Occupied</p>
              </div>
              <div>
                <p className="text-lg font-black text-green-400">{availableBeds}</p>
                <p className="text-xs text-gray-600 font-mono">Free</p>
              </div>
            </div>
          </div>

          {/* RECENT PAYMENTS */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Recent Payments</h3>
              <button onClick={() => navigate("/payments")} className="text-indigo-400 text-xs font-mono">All →</button>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-black text-sm flex-shrink-0">
                      {p.tenantName?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{p.tenantName}</div>
                      <div className="text-xs text-gray-500 font-mono">Room {p.roomNumber} · {p.date}</div>
                    </div>
                    <div className="font-black text-green-400 text-sm">{pgConfig.currency}{p.amount?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DUES TRACKING */}
        <DuesTracking tenants={activeTenants} payments={payments} />

        {/* QUICK ACTIONS */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button key={action.path} onClick={() => navigate(action.path)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500/50 rounded-xl p-4 text-left transition-all">
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="font-bold text-sm">{action.label}</div>
                <div className="text-gray-500 text-xs font-mono">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}