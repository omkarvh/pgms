import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import pgConfig from '../config/pgConfig'

export default function Login() {
  const navigate = useNavigate()
  const { user, role, loading } = useAuth()
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user && role && role !== 'denied') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, role, loading])

  const handleLogin = async () => {
    try {
      setSigningIn(true)
      setError('')
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error(err)
      setError('Login failed. Please try again.')
      setSigningIn(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-mono">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md text-center shadow-2xl">
        <div className="text-4xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-white mb-1">{pgConfig.pg_name}</h1>
        <p className="text-gray-500 text-sm font-mono mb-8">Owner Dashboard · v{pgConfig.app_version}</p>
        <button
          onClick={handleLogin}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 px-6 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          {signingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {error && <p className="text-red-400 text-xs mt-4 font-mono">{error}</p>}
        {role === 'denied' && (
          <p className="text-red-400 text-xs mt-4 font-mono">
            🚫 Your account is not authorized. Contact admin.
          </p>
        )}
        <p className="text-gray-600 text-xs mt-6 font-mono">Only authorized owners can access this dashboard</p>
      </div>
    </div>
  )
}