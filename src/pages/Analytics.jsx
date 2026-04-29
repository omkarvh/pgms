import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, onSnapshot } from 'firebase/firestore'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'

const COLORS = ['#6366f1', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#38bdf8', '#f472b6']

const typeCapacity = { single: 1, double: 2, triple: 3, dormitory: 6 }

export default function Analytics() {
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [tenants, setTenants] = useState([])
  const [rooms, setRooms] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'payments'), s => setPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'expenses'), s => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(collection(db, 'tenants'), s => setTenants(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u4 = onSnapshot(collection(db, 'rooms'), s => setRooms(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  // LAST 6 MONTHS
  const getLast6Months = () => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
      })
    }
    return months
  }

  const last6 = getLast6Months()
  const thisMonth = new Date().toISOString().slice(0, 7)

  // MONTHLY REVENUE VS EXPENSES
  const monthlyData = last6.map(m => ({
    month: m.label,
    revenue: payments.filter(p => p.date?.startsWith(m.key)).reduce((s, p) => s + p.amount, 0),
    expenses: expenses.filter(e => e.date?.startsWith(m.key)).reduce((s, e) => s + e.amount, 0),
    profit: payments.filter(p => p.date?.startsWith(m.key)).reduce((s, p) => s + p.amount, 0) -
            expenses.filter(e => e.date?.startsWith(m.key)).reduce((s, e) => s + e.amount, 0)
  }))

  // TENANT INFLOW PER MONTH
  const tenantInflow = last6.map(m => ({
    month: m.label,
    joined: tenants.filter(t => t.createdAt?.startsWith(m.key)).length,
    left: tenants.filter(t => t.leftDate?.startsWith(m.key)).length,
  }))

  // EXPENSE CATEGORY BREAKDOWN
  const expenseByCategory = ['Electricity', 'Water', 'Salary', 'Repairs', 'Groceries', 'Internet', 'Maintenance', 'Misc'].map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.value > 0)

  // ROOM TYPE REVENUE
  const roomTypeRevenue = ['single', 'double', 'triple', 'dormitory'].map(type => {
    const roomsOfType = rooms.filter(r => r.type === type)
    const roomNumbers = roomsOfType.map(r => r.number)
    const revenue = payments.filter(p => roomNumbers.includes(p.roomNumber)).reduce((s, p) => s + p.amount, 0)
    return { type: type.charAt(0).toUpperCase() + type.slice(1), revenue, rooms: roomsOfType.length }
  }).filter(r => r.rooms > 0)

  // PAYMENT MODE BREAKDOWN
  const paymentModes = ['cash', 'upi', 'bank'].map(mode => ({
    name: mode.toUpperCase(),
    value: payments.filter(p => p.mode === mode).reduce((s, p) => s + p.amount, 0)
  })).filter(p => p.value > 0)

  // KEY METRICS
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const thisMonthRevenue = payments.filter(p => p.date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0)
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0)
  const activeTenants = tenants.filter(t => t.status === 'active').length
  const totalBeds = rooms.reduce((s, r) => s + (r.capacity || typeCapacity[r.type] || 1), 0)
  const occupiedBeds = rooms.reduce((s, r) => s + (r.occupiedBeds || 0), 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const bestMonth = [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0]
  const avgMonthlyRevenue = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((s, m) => s + m.revenue, 0) / monthlyData.filter(m => m.revenue > 0).length) || 0
    : 0

  // MONTHLY RENT MODE SPLIT
  const monthlyRentTenants = tenants.filter(t => t.rentMode === 'monthly').length
  const dailyRentTenants = tenants.filter(t => t.rentMode === 'daily' && t.status === 'active').length

  // DOWNLOAD CSV
  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return alert('No data to download')
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const downloadAllReports = () => {
    downloadCSV(monthlyData.map(m => ({
      Month: m.month,
      Revenue: m.revenue,
      Expenses: m.expenses,
      Profit: m.profit
    })), `pgms-monthly-report-${thisMonth}.csv`)
  }

  const downloadPayments = () => {
    downloadCSV(payments.map(p => ({
      Date: p.date,
      Tenant: p.tenantName,
      Room: p.roomNumber,
      Amount: p.amount,
      Mode: p.mode,
      Month: p.month || ''
    })), `pgms-payments-${thisMonth}.csv`)
  }

  const downloadTenants = () => {
    downloadCSV(tenants.map(t => ({
      Name: t.name,
      Phone: t.phone,
      Room: t.roomNumber,
      RentMode: t.rentMode,
      JoinDate: t.joinDate,
      Status: t.status,
      LeftDate: t.leftDate?.slice(0, 10) || ''
    })), `pgms-tenants-${thisMonth}.csv`)
  }

  const downloadExpenses = () => {
    downloadCSV(expenses.map(e => ({
      Date: e.date,
      Category: e.category,
      Amount: e.amount,
      Note: e.note || '',
      AddedBy: e.addedBy || ''
    })), `pgms-expenses-${thisMonth}.csv`)
  }

  const tooltipStyle = { background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }
  const formatter = (val) => `${pgConfig.currency}${val.toLocaleString()}`

  const tabs = ['overview', 'revenue', 'occupancy', 'tenants', 'download']

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Business Analytics</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">Full business intelligence dashboard</p>
          </div>
          <button onClick={downloadAllReports} className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            ⬇ Export
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap capitalize ${activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
              {tab === 'download' ? '⬇ Download' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Total Revenue</p>
                <p className="text-2xl font-black text-green-400">{pgConfig.currency}{totalRevenue.toLocaleString()}</p>
                <p className="text-gray-600 text-xs mt-1">all time</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Net Profit</p>
                <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{pgConfig.currency}{netProfit.toLocaleString()}</p>
                <p className="text-gray-600 text-xs mt-1">all time</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Occupancy Rate</p>
                <p className="text-2xl font-black text-indigo-400">{occupancyRate}%</p>
                <p className="text-gray-600 text-xs mt-1">{occupiedBeds}/{totalBeds} beds</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Avg Monthly Revenue</p>
                <p className="text-2xl font-black text-purple-400">{pgConfig.currency}{avgMonthlyRevenue.toLocaleString()}</p>
                <p className="text-gray-600 text-xs mt-1">last 6 months</p>
              </div>
            </div>

            {/* THIS MONTH SUMMARY */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">This Month Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-green-400">{pgConfig.currency}{thisMonthRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-red-400">{pgConfig.currency}{thisMonthExpenses.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">Expenses</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-black ${thisMonthRevenue - thisMonthExpenses >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {pgConfig.currency}{(thisMonthRevenue - thisMonthExpenses).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">Net Profit</p>
                </div>
              </div>
              {/* PROFIT BAR */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                  <span>Profit Margin</span>
                  <span className="text-green-400">{thisMonthRevenue > 0 ? Math.round(((thisMonthRevenue - thisMonthExpenses) / thisMonthRevenue) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${thisMonthRevenue > 0 ? Math.min(Math.max(((thisMonthRevenue - thisMonthExpenses) / thisMonthRevenue) * 100, 0), 100) : 0}%` }}>
                  </div>
                </div>
              </div>
            </div>

            {/* BEST MONTH + INSIGHTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-3">🏆 Best Month</h3>
                {bestMonth && bestMonth.revenue > 0 ? (
                  <div>
                    <p className="text-3xl font-black text-yellow-400">{bestMonth.month}</p>
                    <p className="text-green-400 font-mono text-sm mt-1">{pgConfig.currency}{bestMonth.revenue.toLocaleString()} revenue</p>
                    <p className="text-gray-500 text-xs mt-1">Profit: {pgConfig.currency}{bestMonth.profit.toLocaleString()}</p>
                  </div>
                ) : <p className="text-gray-600 text-sm font-mono">No data yet</p>}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-3">📊 Quick Insights</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Active Tenants</span>
                    <span className="font-bold text-indigo-400">{activeTenants}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly Rent</span>
                    <span className="font-bold text-green-400">{monthlyRentTenants} tenants</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily Rent</span>
                    <span className="font-bold text-yellow-400">{dailyRentTenants} tenants</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Rooms</span>
                    <span className="font-bold">{rooms.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Beds</span>
                    <span className="font-bold">{totalBeds}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">

            {/* REVENUE VS EXPENSES */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Revenue vs Expenses (Last 6 Months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PROFIT TREND */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Profit Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
                  <Line type="monotone" dataKey="profit" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24' }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* EXPENSE CATEGORY PIE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-4">Expense Breakdown</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-gray-600 text-sm font-mono text-center py-8">No expense data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-4">Payment Mode Split</h3>
                {paymentModes.length === 0 ? (
                  <p className="text-gray-600 text-sm font-mono text-center py-8">No payment data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentModes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentModes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ROOM TYPE REVENUE */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Revenue by Room Type</h3>
              {roomTypeRevenue.length === 0 ? (
                <p className="text-gray-600 text-sm font-mono text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={roomTypeRevenue}>
                    <XAxis dataKey="type" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
                    <Bar dataKey="revenue" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* OCCUPANCY TAB */}
        {activeTab === 'occupancy' && (
          <div className="space-y-4">

            {/* BED STATS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Total Beds</p>
                <p className="text-3xl font-black text-white">{totalBeds}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Occupied</p>
                <p className="text-3xl font-black text-indigo-400">{occupiedBeds}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Available</p>
                <p className="text-3xl font-black text-green-400">{totalBeds - occupiedBeds}</p>
              </div>
            </div>

            {/* OCCUPANCY RATE */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">Occupancy Rate</h3>
                <span className="text-2xl font-black text-indigo-400">{occupancyRate}%</span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${occupancyRate}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600 font-mono mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* ROOM TYPE BREAKDOWN */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Beds by Room Type</h3>
              <div className="space-y-3">
                {['single', 'double', 'triple', 'dormitory'].map(type => {
                  const roomsOfType = rooms.filter(r => r.type === type)
                  if (roomsOfType.length === 0) return null
                  const totalOfType = roomsOfType.reduce((s, r) => s + (r.capacity || typeCapacity[type] || 1), 0)
                  const occupiedOfType = roomsOfType.reduce((s, r) => s + (r.occupiedBeds || 0), 0)
                  const pct = totalOfType > 0 ? Math.round((occupiedOfType / totalOfType) * 100) : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-semibold">{type}</span>
                        <span className="font-mono text-gray-400">{occupiedOfType}/{totalOfType} beds · {pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ROOM STATUS TABLE */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Room Status Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 font-mono text-xs uppercase border-b border-gray-800">
                      <th className="text-left pb-3">Room</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-center pb-3">Beds</th>
                      <th className="text-center pb-3">Occupied</th>
                      <th className="text-center pb-3">Free</th>
                      <th className="text-right pb-3">Rate/mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.sort((a, b) => a.number?.localeCompare(b.number)).map(room => {
                      const cap = room.capacity || typeCapacity[room.type] || 1
                      const occ = room.occupiedBeds || 0
                      const free = cap - occ
                      return (
                        <tr key={room.id} className="border-t border-gray-800">
                          <td className="py-2 font-bold">{room.number}</td>
                          <td className="py-2 capitalize text-gray-400">{room.type}</td>
                          <td className="py-2 text-center">{cap}</td>
                          <td className="py-2 text-center text-indigo-400 font-bold">{occ}</td>
                          <td className="py-2 text-center text-green-400 font-bold">{free}</td>
                          <td className="py-2 text-right font-mono">{pgConfig.currency}{room.monthlyRate?.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TENANTS TAB */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">

            {/* TENANT INFLOW CHART */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Tenant Inflow vs Outflow (Last 6 Months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tenantInflow}>
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  <Bar dataKey="joined" fill="#34d399" radius={[4, 4, 0, 0]} name="Joined" />
                  <Bar dataKey="left" fill="#f87171" radius={[4, 4, 0, 0]} name="Left" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* RENT MODE SPLIT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Monthly Rent</p>
                <p className="text-3xl font-black text-indigo-400">{tenants.filter(t => t.rentMode === 'monthly' && t.status === 'active').length}</p>
                <p className="text-gray-600 text-xs mt-1">active tenants</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Daily Rent</p>
                <p className="text-3xl font-black text-yellow-400">{tenants.filter(t => t.rentMode === 'daily' && t.status === 'active').length}</p>
                <p className="text-gray-600 text-xs mt-1">active tenants</p>
              </div>
            </div>

            {/* MONTHLY P&L TABLE */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">Monthly P&L Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 font-mono text-xs uppercase border-b border-gray-800">
                      <th className="text-left pb-3">Month</th>
                      <th className="text-right pb-3">Revenue</th>
                      <th className="text-right pb-3">Expenses</th>
                      <th className="text-right pb-3">Profit/Loss</th>
                      <th className="text-right pb-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="py-3 font-bold">{m.month}</td>
                        <td className="py-3 text-right text-green-400 font-mono">{pgConfig.currency}{m.revenue.toLocaleString()}</td>
                        <td className="py-3 text-right text-red-400 font-mono">{pgConfig.currency}{m.expenses.toLocaleString()}</td>
                        <td className={`py-3 text-right font-black font-mono ${m.profit >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                          {m.profit >= 0 ? '+' : ''}{pgConfig.currency}{m.profit.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-gray-400 font-mono text-xs">
                          {m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DOWNLOAD TAB */}
        {activeTab === 'download' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-2">Download Reports</h3>
              <p className="text-gray-500 text-xs font-mono mb-6">Export your data as CSV — open in Excel, Google Sheets</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-bold mb-1">Monthly P&L Report</h4>
                  <p className="text-gray-500 text-xs mb-3">Revenue, expenses and profit for last 6 months</p>
                  <button onClick={downloadAllReports} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 rounded-xl transition-all">
                    ⬇ Download CSV
                  </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-2xl mb-2">💰</div>
                  <h4 className="font-bold mb-1">All Payments</h4>
                  <p className="text-gray-500 text-xs mb-3">{payments.length} payment records — tenant, amount, mode, date</p>
                  <button onClick={downloadPayments} className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 rounded-xl transition-all">
                    ⬇ Download CSV
                  </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-bold mb-1">Tenant List</h4>
                  <p className="text-gray-500 text-xs mb-3">{tenants.length} tenants — active and past with details</p>
                  <button onClick={downloadTenants} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 rounded-xl transition-all">
                    ⬇ Download CSV
                  </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-2xl mb-2">🧾</div>
                  <h4 className="font-bold mb-1">Expense Records</h4>
                  <p className="text-gray-500 text-xs mb-3">{expenses.length} expense records — category, amount, date</p>
                  <button onClick={downloadExpenses} className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 rounded-xl transition-all">
                    ⬇ Download CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
              <p className="text-indigo-400 text-xs font-mono">💡 Tip: Open CSV files in Google Sheets or Microsoft Excel for charts and further analysis.</p>
            </div>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  )
}