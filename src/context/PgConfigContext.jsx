import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

const STORAGE_KEY = 'pgms_config'

const defaults = {
  pg_name: "Annapurneshwari PG",
  owner_name: "Omkar",
  max_rooms: 15,
  currency: "₹",
  rent_modes: ["monthly", "daily"],
  location: "Bengaluru, Karnataka",
  contact: "",
  upi_id: "",
  cctv_enabled: false,
  theme_color: "#6366f1",
  app_version: "1.0.0",
  cloudinary_cloud_name: "dpgnpe7bg",
  cloudinary_upload_preset: "pgms_uploads"
}

const loadLocal = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
  } catch { return defaults }
}

const saveLocal = (config) => {
  const { app_version, cloudinary_cloud_name, cloudinary_upload_preset, ...saveable } = config
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveable))
}

const PgConfigContext = createContext(defaults)

export function PgConfigProvider({ children }) {
  const [config, setConfig] = useState(loadLocal)

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'app', 'config'), snap => {
        if (snap.exists()) {
          const merged = { ...defaults, ...snap.data() }
          setConfig(merged)
          saveLocal(merged)
        }
      }, () => {})
      return unsub
    } catch { return () => {} }
  }, [])

  return (
    <PgConfigContext.Provider value={config}>
      {children}
    </PgConfigContext.Provider>
  )
}

export function usePgConfig() {
  return useContext(PgConfigContext)
}

export async function savePgConfig(newConfig) {
  const { app_version, cloudinary_cloud_name, cloudinary_upload_preset, ...saveable } = newConfig
  saveLocal({ ...defaults, ...saveable })
  try {
    await setDoc(doc(db, 'app', 'config'), saveable, { merge: true })
  } catch {
    // Firestore rules don't allow this yet — saved locally
  }
}
