import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DeleteRequests() {
  const [requests, setRequests] = useState([])
  const { role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'deleteRequests'), snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds))
    })
    return unsub
  }, [])

  if (role !== 'admin') return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 md:ml-56 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm font-mono">Only admin can view delete requests.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  )

  const handleApprove = async (request) => {
    try {
      await deleteDoc(doc(db, request.collectionName, request.docId))
      await updateDoc(doc(db, 'deleteRequests', request.id), { status: 'approved' })
      await deleteDoc(doc(db, 'deleteRequests', request.id))
    } catch (err) {
      alert('Error approving delete: ' + err.message)
    }
  }

  const handleReject = async (request) => {
    await updateDoc(doc(db, 'deleteRequests', request.id), { status: 'rejected' })
    await deleteDoc(doc(db, 'deleteRequests', request.id))
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <div className="hidden md:block"><Sidebar /></div>

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Delete Requests</h2>
          <p className="text-gray-500 font-mono text-xs mt-0.5">{pending.length} pending approval</p>
        </div>

        {pending.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-400 font-mono text-sm">No pending delete requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(request => (
              <div key={request.id} className="bg-gray-900 border border-yellow-500/30 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-lg uppercase">{request.collectionName}</span>
                      <span className="text-xs font-mono text-gray-500">delete request</span>
                    </div>
                    <div className="font-bold text-sm mb-1">{request.label}</div>
                    <div className="text-gray-500 text-xs font-mono">
                      Requested by warden · {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleReject(request)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-bold px-3 py-2 rounded-lg transition-all">
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(request)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold px-3 py-2 rounded-lg transition-all">
                      Approve Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}