import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, onSnapshot } from 'firebase/firestore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'

export default function Reports() {
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [tenants, setTenants] = useState([])
  const [rooms, setRooms] = useState([])
  const [view, setView] = useState('monthly')

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'payments'), snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const unsub2 = onSnapshot(collection(db, 'expenses'), snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const unsub3 = onSnapshot(collection(db, 'tenants'), snap => setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const unsub4 = onSnapshot(collection(db, 'rooms'), snap => setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [])

  // MONTHLY DATA
  const getMonthlyData = () => {
    const months = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      months[key] = { month: label, revenue: 0, expenses: 0, profit: 0 }
    }
    payments.forEach(p => {
      const key = p.date?.slice(0, 7)
      if (months[key]) months[key].revenue += p.amount
    })
    expenses.forEach(e => {
      const key = e.date?.slice(0, 7)
      if (months[key]) months[key].expenses += e.amount
    })
    Object.values(months).forEach(m => m.profit = m.revenue - m.expenses)
    return Object.values(months)
  }

  // DAILY DATA (last 7 days)
  const getDailyData = () => {
    const days = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleString('default', { weekday: 'short' })
      days[key] = { day: label, revenue: 0, expenses: 0 }
    }
    payments.forEach(p => { if (days[p.date]) days[p.date].revenue += p.amount })
    expenses.forEach(e => { if (days[e.date]) days[e.date].expenses += e.amount })
    return Object.values(days)
  }

  const monthlyData = getMonthlyData()
  const dailyData = getDailyData()
  const chartData = view === 'monthly' ? monthlyData : dailyData
  const xKey = view === 'monthly' ? 'month' : 'day'

  // SUMMARY
  const thisMonth = new Date().toISOString().slice(0, 7)
  const totalRevenue = payments.filter(p => p.date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const occupancy = rooms.filter(r => r.status === 'occupied').length
  const activeTenants = tenants.filter(t => t.status === 'active').length

  // DOWNLOAD CSV
  const downloadCSV = () => {
    const rows = [
      ['Month', 'Revenue', 'Expenses', 'Profit'],
      ...monthlyData.map(m => [m.month, m.revenue, m.expenses, m.profit])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pgms-report-${thisMonth}.csv`
    a.click()
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Reports</h2>
            <p className="text-gray-500 font-mono text-xs mt-0.5">Business analytics</p>
          </div>
          <button onClick={downloadCSV} className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            ⬇ Download CSV
          </button>
        </div>

        {/* THIS MONTH SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Revenue</p>
            <p className="text-2xl font-black text-green-400">{pgConfig.currency}{totalRevenue.toLocaleString()}</p>
            <p className="text-gray-600 text-xs mt-1">this month</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Expenses</p>
            <p className="text-2xl font-black text-red-400">{pgConfig.currency}{totalExpenses.toLocaleString()}</p>
            <p className="text-gray-600 text-xs mt-1">this month</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Net Profit</p>
            <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{pgConfig.currency}{netProfit.toLocaleString()}</p>
            <p className="text-gray-600 text-xs mt-1">this month</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Occupancy</p>
            <p className="text-2xl font-black text-indigo-400">{occupancy}/{pgConfig.max_rooms}</p>
            <p className="text-gray-600 text-xs mt-1">{activeTenants} active tenants</p>
          </div>
        </div>

        {/* CHART */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Revenue vs Expenses</h3>
            <div className="flex gap-2">
              <button onClick={() => setView('daily')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'daily' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500'}`}>Daily</button>
              <button onClick={() => setView('monthly')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500'}`}>Monthly</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <XAxis dataKey={xKey} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                formatter={(val) => `${pgConfig.currency}${val.toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PROFIT/LOSS TABLE */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">Monthly P&L Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 font-mono text-xs uppercase">
                  <th className="text-left pb-3">Month</th>
                  <th className="text-right pb-3">Revenue</th>
                  <th className="text-right pb-3">Expenses</th>
                  <th className="text-right pb-3">Profit/Loss</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}