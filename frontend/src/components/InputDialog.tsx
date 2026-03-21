import { useState } from 'react'
import { MessageSquare } from 'lucide-react'

interface InputDialogProps {
  open: boolean
  title: string
  description?: string
  label: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  required?: boolean
  onConfirm: (value: string) => void
  onCancel: () => void
}

/**
 * Replaces window.prompt() with a proper styled dialog.
 */
export default function InputDialog({
  open,
  title,
  description,
  label,
  placeholder = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  required = false,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState('')

  if (!open) return null

  function handleConfirm() {
    if (required && !value.trim()) return
    onConfirm(value)
    setValue('')
  }

  function handleCancel() {
    setValue('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">{title}</h3>
            {description && <p className="text-gray-400 text-sm">{description}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none text-sm"
            autoFocus
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={required && !value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
