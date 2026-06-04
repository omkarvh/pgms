import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PgConfigProvider } from './context/PgConfigContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PgConfigProvider>
        <App />
      </PgConfigProvider>
    </AuthProvider>
  </StrictMode>,
)