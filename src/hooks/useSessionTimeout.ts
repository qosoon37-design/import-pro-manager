import { useEffect, useRef } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function useSessionTimeout(onExpired: () => void) {
  const lastActivity = useInventoryStore((s) => s.lastActivity)
  const touchActivity = useInventoryStore((s) => s.touchActivity)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivity
      if (elapsed >= SESSION_TIMEOUT) {
        onExpired()
      } else {
        timerRef.current = setTimeout(checkTimeout, SESSION_TIMEOUT - elapsed)
      }
    }

    timerRef.current = setTimeout(checkTimeout, SESSION_TIMEOUT - (Date.now() - lastActivity))
    return () => clearTimeout(timerRef.current)
  }, [lastActivity, onExpired])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => touchActivity()
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, handler))
  }, [touchActivity])
}
