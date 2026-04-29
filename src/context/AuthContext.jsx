import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email.toLowerCase().trim()))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const userData = snap.docs[0].data()
            setUser(firebaseUser)
            setRole(userData.role)
            setPermissions(userData.permissions || {})
          } else {
            setUser(firebaseUser)
            setRole('denied')
            setPermissions({})
          }
        } catch (err) {
          setUser(firebaseUser)
          setRole('denied')
          setPermissions({})
        }
      } else {
        setUser(null)
        setRole(null)
        setPermissions({})
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Helper to check permission
  const hasPermission = (key) => {
    if (role === 'admin') return true
    if (permissions[key] === undefined) return true
    return permissions[key] === true
  }

  return (
    <AuthContext.Provider value={{ user, role, permissions, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}