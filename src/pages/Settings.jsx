import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import pgConfig from '../config/pgConfig'

export default function Settings() {
  const [user] = useAuthState(auth)
  const navigate = useNavigate()
  const [config, setConfig] = useState({ ...pgConfig })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In a real deployment this would update Firestore
    // For now it updates the local state and shows confirmation
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Settings</h2>
          <p className="text-gray-500 font-mono text-xs mt-0.5">Configure your PG details</p>
        </div>

        {/* OWNER INFO */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase font-mono tracking-widest">Logged In As</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-lg">
              {pgConfig.owner_name[0]}
            </div>
            <div>
              <div className="font-bold">{pgConfig.owner_name}</div>
              <div className="text-gray-500 text-sm font-mono">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* PG CONFIG */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase font-mono tracking-widest">PG Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">PG Name</label>
              <input value={config.pg_name} onChange={e => setConfig({...config, pg_name: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Owner Name</label>
              <input value={config.owner_name} onChange={e => setConfig({...config, owner_name: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Max Rooms</label>
              <input value={config.max_rooms} onChange={e => setConfig({...config, max_rooms: Number(e.target.value)})}
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Location</label>
              <input value={config.location} onChange={e => setConfig({...config, location: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Contact Number</label>
              <input value={config.contact} onChange={e => setConfig({...config, contact: e.target.value})}
                placeholder="Your contact number"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">UPI ID</label>
              <input value={config.upi_id} onChange={e => setConfig({...config, upi_id: e.target.value})}
                placeholder="yourname@upi"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <button onClick={handleSave}
            className={`w-full mt-4 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* APP INFO */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <h3 className="font-bold mb-4 text-sm text-gray-400 uppercase font-mono tracking-widest">App Info</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Version</span>
              <span className="font-mono text-indigo-400">v{pgConfig.app_version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Currency</span>
              <span className="font-mono">{pgConfig.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rent Modes</span>
              <span className="font-mono">{pgConfig.rent_modes.join(', ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">CCTV</span>
              <span className="font-mono">{pgConfig.cctv_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="bg-gray-900 border border-red-900/50 rounded-xl p-5">
          <h3 className="font-bold mb-4 text-sm text-red-400 uppercase font-mono tracking-widest">Account</h3>
          <button onClick={handleLogout}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-sm py-2.5 rounded-xl transition-all">
            Logout
          </button>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}