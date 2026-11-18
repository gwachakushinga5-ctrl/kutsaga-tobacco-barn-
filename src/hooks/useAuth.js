import { useCallback, useEffect, useState } from 'react'
import {
  API_KEY,
  fetchCurrentUser,
  getStoredUser,
  hasCredentials,
  login as apiLogin,
  logout as apiLogout,
} from '../services/api'

export const useAuth = () => {
  const [user, setUser] = useState(() => getStoredUser())
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      if (!hasCredentials()) {
        if (active) setReady(true)
        return
      }
      try {
        const me = await fetchCurrentUser()
        if (active) setUser(me)
      } catch {
        if (active) {
          setUser(API_KEY ? { username: 'api-key', role: 'api' } : null)
        }
      } finally {
        if (active) setReady(true)
      }
    }

    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (username, password) => {
    setPending(true)
    setError(null)
    try {
      const nextUser = await apiLogin(username, password)
      setUser(nextUser)
      return true
    } catch (err) {
      setError(err.message || 'Sign-in failed')
      return false
    } finally {
      setPending(false)
    }
  }, [])

  const signOut = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  return { user, ready, pending, error, signIn, signOut }
}
