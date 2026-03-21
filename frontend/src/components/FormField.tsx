import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  hint?: string
  children: ReactNode
}

export default function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
