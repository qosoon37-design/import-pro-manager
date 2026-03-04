import { useState, useEffect } from 'react'

export function useClock() {
  const [time, setTime] = useState(() => formatTime())

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(interval)
  }, [])

  return time
}

function formatTime(): string {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
}
