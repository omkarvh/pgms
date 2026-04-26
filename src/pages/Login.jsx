import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { useEffect } from 'react'
import pgConfig from '../config/pgConfig'

export default function Login() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md text-center shadow-2xl">

        <div className="text-4xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-white mb-1">{pgConfig.pg_name}</h1>
        <p className="text-gray-500 text-sm font-mono mb-8">Owner Dashboard · v{pgConfig.app_version}</p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 px-6 rounded-xl hover:bg-gray-100 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          Sign in with Google
        </button>

        <p className="text-gray-600 text-xs mt-6 font-mono">Only authorized owners can access this dashboard</p>
      </div>
    </div>
  )
}