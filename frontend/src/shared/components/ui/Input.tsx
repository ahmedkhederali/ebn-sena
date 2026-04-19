import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, startAdornment, endAdornment, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {rest.required && (
            <span aria-hidden="true" className="ms-1 text-red-500">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {startAdornment && (
          <div className="pointer-events-none absolute start-3 text-gray-400">
            {startAdornment}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
            'transition-colors focus:outline-none focus:ring-1',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
            startAdornment ? 'ps-9' : '',
            endAdornment ? 'pe-9' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {endAdornment && (
          <div className="absolute end-3 text-gray-400">{endAdornment}</div>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
})
