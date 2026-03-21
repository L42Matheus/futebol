import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input(props: InputProps) {
  return <input {...props} className={`input ${props.className ?? ''}`.trim()} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode
}

export function Select({ children, ...props }: SelectProps) {
  return (
    <select {...props} className={`input ${props.className ?? ''}`.trim()}>
      {children}
    </select>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea(props: TextareaProps) {
  return <textarea {...props} className={`input ${props.className ?? ''}`.trim()} />
}
