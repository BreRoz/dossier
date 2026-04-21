interface DossierLogoProps {
  size?: number
  color?: string
  showWordmark?: boolean
  wordmarkSize?: number
  dark?: boolean
}

export function DossierMark({ size = 28, color }: { size?: number; color?: string }) {
  const c = color || 'currentColor'
  const paperC = color === '#F7F6F3' || color === 'white' ? '#F7F6F3' : c
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="42" height="42" stroke={c} strokeWidth="1.5" />
      <rect x="1" y="1" width="20" height="20" fill={c} />
      <rect x="23" y="23" width="20" height="20" fill={c} />
      <line x1="22" y1="1" x2="22" y2="43" stroke={c} strokeWidth="1.5" />
      <line x1="1" y1="22" x2="43" y2="22" stroke={c} strokeWidth="1.5" />
    </svg>
  )
}

export function DossierLogo({
  size = 28,
  dark = false,
  wordmarkSize = 20,
}: DossierLogoProps) {
  const color = dark ? '#F7F6F3' : '#0D0D0F'

  return (
    <div className="flex items-center gap-2.5">
      <DossierMark size={size} color={color} />
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: wordmarkSize,
          fontWeight: 300,
          letterSpacing: '0.08em',
          color,
          lineHeight: 1,
        }}
      >
        DOSSIER
      </span>
    </div>
  )
}
