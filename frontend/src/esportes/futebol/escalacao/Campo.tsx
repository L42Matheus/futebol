// Campo visto de cima, com o ataque para cima.
export default function CampoFutebol() {
  const linha = 'rgba(255,255,255,0.6)'
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="campo-sombra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(8,37,18)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="rgb(3,16,8)" stopOpacity="0.34" />
        </linearGradient>
      </defs>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="0" y={i * 16.25} width="100" height="16.25" fill={i % 2 ? 'rgb(33,127,66)' : 'rgb(40,149,78)'} />
      ))}
      <rect width="100" height="130" fill="url(#campo-sombra)" />
      <g fill="none" stroke={linha} strokeWidth="0.5">
        <rect x="2" y="2" width="96" height="126" rx="3" stroke="rgba(255,255,255,0.72)" strokeWidth="0.6" />
        <line x1="2" y1="65" x2="98" y2="65" />
        <circle cx="50" cy="65" r="12" />
        <rect x="22" y="7" width="56" height="20" />
        <rect x="34" y="7" width="32" height="9" />
        <rect x="22" y="103" width="56" height="20" />
        <rect x="34" y="114" width="32" height="9" />
        <path d="M40,7 A10,10 0 0,0 60,7" strokeWidth="0.45" />
        <path d="M40,123 A10,10 0 0,1 60,123" strokeWidth="0.45" />
      </g>
      <g fill="rgba(255,255,255,0.75)">
        <circle cx="50" cy="65" r="0.8" />
        <circle cx="50" cy="18" r="0.8" />
        <circle cx="50" cy="112" r="0.8" />
      </g>
    </svg>
  )
}
