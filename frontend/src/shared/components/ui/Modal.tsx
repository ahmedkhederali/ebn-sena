import { useEffect, useState, type ReactNode } from 'react'
import { useRTL } from '../../hooks/useRTL'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Show "discard changes?" confirm when clicking outside or pressing Escape */
  confirmClose?: boolean
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ isOpen, onClose, title, children, size = 'md', confirmClose = false }: ModalProps) {
  const [confirming, setConfirming] = useState(false)
  const { isRTL } = useRTL()

  function tryClose() {
    if (confirmClose) setConfirming(true)
    else onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      setConfirming(false)
      return
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmClose) setConfirming(true)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, confirmClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className="absolute inset-0 bg-black/50" onClick={tryClose} aria-hidden="true" />

      <div className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white shadow-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          {title && (
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          )}
          <button
            onClick={tryClose}
            className="ms-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>

        {/* Confirm-close overlay */}
        {confirming && (
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm"
          >
            <div className="w-72 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
              <p className="mb-1 text-base font-semibold text-gray-900">
                {isRTL ? 'هل تريد الإغلاق؟' : 'Close without saving?'}
              </p>
              <p className="mb-5 text-sm text-gray-500">
                {isRTL ? 'ستُفقد التغييرات غير المحفوظة.' : 'Unsaved changes will be lost.'}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setConfirming(false); onClose() }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {isRTL ? 'نعم، أغلق' : 'Yes, close'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isRTL ? 'أكمل التعديل' : 'Keep editing'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
