import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'link' }) {
  return <button className={cn('btn', `btn-${variant}`, className)} {...props}/>
}

export function Field({ label, required, error, hint, children, htmlFor }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return <div className="field">
    <label htmlFor={htmlFor}>{label}{required && <b aria-hidden="true"> *</b>}{required && <span className="sr-only"> (required)</span>}</label>
    {children}
    {error ? <small className="error" role="alert">{error}</small> : hint && <small>{hint}</small>}
  </div>
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'preview'; children: ReactNode }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border p-3 text-sm',
    tone === 'error' && 'border-red-200 bg-red-50 text-red-700',
    tone === 'info' && 'border-teal-200 bg-teal-50 text-teal-900',
    tone === 'preview' && 'border-amber-200 bg-amber-50 text-amber-900')}>{children}</div>
}
