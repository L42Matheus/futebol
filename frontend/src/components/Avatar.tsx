import React from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
}

const getInitials = (name: string) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (src) {
    const resolvedSrc = src.startsWith('/uploads')
      ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${src}`
      : src

    return (
      <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex-shrink-0 ${className}`}>
        <img src={resolvedSrc} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  )
}
