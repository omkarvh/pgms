import { db } from './config'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export async function requestDelete(collectionName, docId, label) {
  await addDoc(collection(db, 'deleteRequests'), {
    collectionName,
    docId,
    label,
    status: 'pending',
    createdAt: serverTimestamp()
  })
  alert(`Delete request sent to admin for "${label}"`)
}