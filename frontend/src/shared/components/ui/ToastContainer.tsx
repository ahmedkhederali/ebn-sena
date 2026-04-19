import { useEffect } from 'react'
import { useToast, registerToastSetter, type Toast } from '../../hooks/useToast'

const variantStyles: Record<Toast['variant'], string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-primary-600 text-white',
  warning: 'bg-amber-500 text-white',
}

const variantIcons: Record<Toast['variant'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

export function ToastContainer() {
  const { toasts, add, remove } = useToast()

  // Register the setter so `toast()` utility works imperatively
  useEffect(() => {
    registerToastSetter((updater) => {
      if (typeof updater === 'function') {
        const next = updater([])
        next.forEach((t) => add(t.message, t.variant))
      }
    })
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 end-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            'flex min-w-[280px] max-w-sm items-center gap-3 rounded-xl px-4 py-3 shadow-lg',
            variantStyles[t.variant],
          ].join(' ')}
        >
          <span className="text-lg leading-none" aria-hidden="true">
            {variantIcons[t.variant]}
          </span>
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            type="button"
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-0.5 opacity-80 hover:opacity-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
