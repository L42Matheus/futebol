import type { IconeProps } from '../types'

export default function IconeFutebol({ className, size = 24 }: IconeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5 15.5 10 14.2 14h-4.4L8.5 10Z" fill="currentColor" stroke="none" opacity="0.45" />
      <path d="M12 3v4.5M15.5 10l4.6-1.6M14.2 14l2.8 3.9M9.8 14 7 17.9M8.5 10 3.9 8.4" />
    </svg>
  )
}
