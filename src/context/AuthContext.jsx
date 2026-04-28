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
        try {
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email.toLowerCase().trim()))
          const snap = await getDocs(q)
          console.log('User email:', firebaseUser.email)
          console.log('Docs found:', snap.size)
          if (!snap.empty) {
            const userData = snap.docs[0].data()
            console.log('Role found:', userData.role)
            setUser(firebaseUser)
            setRole(userData.role)
          } else {
            console.log('No matching user doc found — denied')
            setUser(firebaseUser)
            setRole('denied')
          }
        } catch (err) {
          console.error('Error fetching role:', err)
          setUser(firebaseUser)
          setRole('denied')
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