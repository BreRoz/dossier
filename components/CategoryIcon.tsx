import type { Category } from '@/types'

interface CategoryIconProps {
  category: Category
  size?: number
  color?: string
}

export function CategoryIcon({ category, size = 24, color = 'currentColor' }: CategoryIconProps) {
  const inner = getCategoryInner(category, color)
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="42" height="42" stroke={color} strokeWidth="1.5" />
      {inner}
    </svg>
  )
}

function getCategoryInner(category: Category, color: string) {
  switch (category) {
    case 'premium-fashion':
      return <rect x="1" y="1" width="20" height="42" fill={color} />
    case 'everyday-fashion':
      return (
        <>
          <rect x="1" y="1" width="20" height="20" fill={color} />
          <rect x="23" y="23" width="20" height="20" fill={color} />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'athletic':
      return (
        <>
          <line x1="1" y1="43" x2="43" y2="1" stroke={color} strokeWidth="5" strokeLinecap="square" />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'beauty':
      return (
        <>
          <circle cx="22" cy="22" r="14" fill={color} />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'baby':
      return (
        <>
          <rect x="14" y="14" width="16" height="16" fill={color} />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'kids':
      return (
        <>
          <rect x="23" y="1" width="20" height="20" fill={color} />
          <rect x="1" y="23" width="20" height="20" fill={color} />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'home':
      return (
        <>
          <rect x="1" y="23" width="42" height="20" fill={color} />
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )
    case 'tools-yard':
      return (
        <>
          <line x1="1" y1="1" x2="43" y2="43" stroke={color} strokeWidth="4" strokeLinecap="square" />
          <line x1="43" y1="1" x2="1" y2="43" stroke={color} strokeWidth="4" strokeLinecap="square" />
        </>
      )
    case 'fast-food':
      return (
        <>
          <rect x="1" y="8" width="42" height="8" fill={color} />
          <rect x="1" y="20" width="42" height="8" fill={color} />
          <rect x="1" y="32" width="42" height="8" fill={color} />
        </>
      )
    case 'restaurants':
      return (
        <>
          <rect x="8" y="1" width="8" height="42" fill={color} />
          <rect x="28" y="1" width="8" height="42" fill={color} />
        </>
      )
    case 'grocery':
      return (
        <>
          {[7, 18, 29].map((x) =>
            [7, 18, 29].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill={color} />
            ))
          )}
        </>
      )
    case 'tech':
      return (
        <>
          <line x1="22" y1="1" x2="22" y2="43" stroke={color} strokeWidth="1.5" />
          <line x1="1" y1="22" x2="43" y2="22" stroke={color} strokeWidth="1.5" />
          <circle cx="22" cy="22" r="7" fill={color} />
          <circle cx="22" cy="7" r="3" fill={color} />
          <circle cx="22" cy="37" r="3" fill={color} />
          <circle cx="7" cy="22" r="3" fill={color} />
          <circle cx="37" cy="22" r="3" fill={color} />
        </>
      )
    case 'travel':
      return (
        <>
          <path d="M 1 30 A 21 21 0 0 1 43 30" fill={color} />
          <line x1="1" y1="30" x2="43" y2="30" stroke={color} strokeWidth="1.5" />
          <line x1="22" y1="1" x2="22" y2="30" stroke={color} strokeWidth="1.5" />
        </>
      )
    default:
      return null
  }
}
