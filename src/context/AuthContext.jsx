import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check role in Firestore
        const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const userData = snap.docs[0].data()
          setRole(userData.role)
          setUser(firebaseUser)
        } else {
          // Email not in users collection — deny access
          setRole('denied')
          setUser(firebaseUser)
        }
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}