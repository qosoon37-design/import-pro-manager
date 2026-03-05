import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

interface SplashScreenProps {
  onEnter: () => void
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [fading, setFading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('ادخل اسم المستخدم وكلمة المرور')
      return
    }
    const success = login(username.trim(), password.trim())
    if (success) {
      setError('')
      setFading(true)
      setTimeout(onEnter, 500)
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900 transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full max-w-sm mx-4 text-center text-white">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-500 shadow-2xl">
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold">نظام المخزون الذكي</h1>
        <p className="mb-6 text-blue-200 text-sm">تسجيل الدخول</p>

        <div className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="اسم المستخدم"
            dir="ltr"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center text-white placeholder:text-white/50 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="كلمة المرور"
            dir="ltr"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center text-white placeholder:text-white/50 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
          />

          {error && (
            <p className="text-red-400 text-sm font-bold">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-blue-500 px-8 py-3 font-bold transition hover:bg-blue-600 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            دخول النظام
          </button>

          <p className="text-[10px] text-blue-300/50 mt-4">
            الدخول الافتراضي: admin / admin
          </p>
        </div>
      </div>
    </div>
  )
}
