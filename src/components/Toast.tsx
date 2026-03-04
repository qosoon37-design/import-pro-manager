import { useToastStore } from '../store/useToastStore'

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  const typeStyles = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-500',
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} pointer-events-auto animate-slide-up rounded-xl px-6 py-3 text-white shadow-lg cursor-pointer`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
