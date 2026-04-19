import { useState, useCallback } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

let externalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null

// Call this from ToastProvider
export function registerToastSetter(setter: React.Dispatch<React.SetStateAction<Toast[]>>) {
  externalSetToasts = setter
}

// Use from anywhere — does not require hook context
export function toast(message: string, variant: ToastVariant = 'info') {
  if (!externalSetToasts) return
  const id = Math.random().toString(36).slice(2)
  externalSetToasts((prev) => [...prev, { id, message, variant }])
  setTimeout(() => {
    externalSetToasts?.((prev) => prev.filter((t) => t.id !== id))
  }, 4000)
}

// React hook for components that manage toast state themselves
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Convenience wrapper used throughout the app: addToast({ type, message })
  const addToast = useCallback((input: { type: ToastVariant; message: string }) => {
    toast(input.message, input.type)
  }, [])

  return { toasts, add, remove, addToast }
}

export type { Toast }
