import { useEffect, useState } from 'react'

const STORAGE_KEY = 'omni-loop-settings'

const DEFAULTS = {
  mode: 'single',
  models: [],
  apiKey: '',
  maxIterations: 3,
}

export function usePersistedSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // localStorage unavailable (private browsing, etc.) -- settings just won't persist
    }
  }, [settings])

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }))

  return [settings, update]
}
