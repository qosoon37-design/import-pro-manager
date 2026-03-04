import { useState } from 'react'

interface SplashScreenProps {
  onEnter: () => void
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [fading, setFading] = useState(false)

  const handleEnter = () => {
    setFading(true)
    setTimeout(onEnter, 500)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900 transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center text-white animate-fade-in-up">
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
        <p className="mb-8 text-blue-200">المشرف: محمد البوب</p>
        <button
          onClick={handleEnter}
          className="rounded-full bg-blue-500 px-8 py-3 font-bold transition hover:bg-blue-600 hover:scale-105 active:scale-95 cursor-pointer"
        >
          دخول النظام
        </button>
      </div>
    </div>
  )
}
