import type { IconeProps } from '../types'

export default function IconeVolei({ className, size = 24 }: IconeProps) {
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
      <path d="M12 12c0-4 1.5-7 4-8.2M12 12c-3.5 2-6.8 2.2-9 1M12 12c3.4 2 5 4.8 5.2 7.6" />
      <path d="M12 3c-2.2 2-3.2 5-3 8.5M20.6 9.5c-2.8-.6-6 .2-8.6 2.5M7 19.4c1.4-2.3 3.2-4.5 5-7.4" />
    </svg>
  )
}
