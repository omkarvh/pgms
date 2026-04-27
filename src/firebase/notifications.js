import { db } from './config'
import { addDoc, collection } from 'firebase/firestore'

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
    const paid = payments.some(p => p.tenantId === tenant.id && p.date?.startsWith(thisMonth))
    return !paid
  })

  if (unpaid.length === 0) return

  // Check if we already sent a reminder today
  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadySent = payments.some(p => p.type === 'due_reminder' && p.date === todayStr)
  if (alreadySent) return

  await sendNotification(
    'due',
    `⚠️ ${unpaid.length} Tenant${unpaid.length > 1 ? 's' : ''} Have Not Paid`,
    `${unpaid.map(t => t.name).join(', ')} have not paid rent for ${thisMonth}`
  )
}