import { db } from './config'
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore'

export async function sendNotification(type, title, message) {
  await addDoc(collection(db, 'notifications'), {
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  })
}

// Rent due check — call this on dashboard load
export async function checkRentDues(tenants, payments) {
  const thisMonth = new Date().toISOString().slice(0, 7)
  const today = new Date().getDate()

  // Only send reminder after 5th of month
  if (today < 5) return

  const unpaid = tenants.filter(tenant => {
    if (tenant.rentMode === 'daily') return false
    const paid = payments.some(p =>
      p.tenantId === tenant.id &&
      (p.date?.startsWith(thisMonth) || p.month?.toLowerCase().includes(new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase()))
    )
    return !paid
  })

  if (unpaid.length === 0) return

  // Check if we already sent a due reminder this month
  const snap = await getDocs(query(collection(db, 'notifications'), where('type', '==', 'due')))
  const alreadySent = snap.docs.some(d => d.data().createdAt?.startsWith(thisMonth))
  if (alreadySent) return

  await sendNotification(
    'due',
    `${unpaid.length} Tenant${unpaid.length > 1 ? 's' : ''} Have Not Paid`,
    `${unpaid.map(t => t.name).join(', ')} — rent pending for ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
  )
}