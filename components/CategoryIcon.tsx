import type { Category } from '@/types'

interface CategoryIconProps {
  category: Category | string
  size?: number
  color?: string
}

export function CategoryIcon({ category, size = 24, color = 'currentColor' }: CategoryIconProps) {
  const inner = getCategoryInner(category as Category, color)
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="42" height="42" stroke={color} strokeWidth="1.5" />
      {inner}
    </svg>
  )
}

function getCategoryInner(category: Category, color: string) {
  switch (category) {
    case 'fashion':
      // Tall filled left column — classic fashion silhouette
      return <rect x="1" y="1" width="20" height="42" fill={color} />

    case 'accessories':
      // Circle inside a rotated square — jewellery / watch face
      return (
        <>
          <circle cx="22" cy="22" r="10" stroke={color} strokeWidth="3" />
          <circle cx="22" cy="22" r="3" fill={color} />
          <line x1="22" y1="1"  x2="22" y2="12" stroke={color} strokeWidth="2" />
          <line x1="22" y1="32" x2="22" y2="43" stroke={color} strokeWidth="2" />
          <line x1="1"  y1="22" x2="12" y2="22" stroke={color} strokeWidth="2" />
          <line x1="32" y1="22" x2="43" y2="22" stroke={color} strokeWidth="2" />
        </>
      )

    case 'beauty':
      // Filled circle with crosshairs
      return (
        <>
          <circle cx="22" cy="22" r="14" fill={color} />
          <line x1="22" y1="1"  x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1"  y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )

    case 'baby':
      // Small centred square with crosshairs
      return (
        <>
          <rect x="14" y="14" width="16" height="16" fill={color} />
          <line x1="22" y1="1"  x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1"  y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )

    case 'entertainment':
      // Filled play-button triangle
      return <polygon points="8,4 8,40 40,22" fill={color} />

    case 'grocery':
      // 3×3 grid of squares
      return (
        <>
          {[7, 18, 29].map((x) =>
            [7, 18, 29].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill={color} />
            ))
          )}
        </>
      )

    case 'home':
      // Filled bottom bar (floor/foundation)
      return (
        <>
          <rect x="1" y="23" width="42" height="20" fill={color} />
          <line x1="22" y1="1"  x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1"  y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )

    case 'kids':
      // Two diagonal filled squares
      return (
        <>
          <rect x="23" y="1"  width="20" height="20" fill={color} />
          <rect x="1"  y="23" width="20" height="20" fill={color} />
          <line x1="22" y1="1"  x2="22" y2="43" stroke={color} strokeWidth="1" />
          <line x1="1"  y1="22" x2="43" y2="22" stroke={color} strokeWidth="1" />
        </>
      )

    case 'shoes':
      // Diagonal slash — sole profile
      return (
        <>
          <line x1="4"  y1="40" x2="40" y2="4"  stroke={color} strokeWidth="6" strokeLinecap="square" />
          <line x1="4"  y1="34" x2="34" y2="4"  stroke={color} strokeWidth="2" strokeLinecap="square" />
          <line x1="10" y1="40" x2="40" y2="10" stroke={color} strokeWidth="2" strokeLinecap="square" />
        </>
      )

    case 'restaurants':
      // Two vertical bars — chopsticks / fork & knife
      return (
        <>
          <rect x="8"  y="1" width="8" height="42" fill={color} />
          <rect x="28" y="1" width="8" height="42" fill={color} />
        </>
      )

    case 'tools':
      // X pattern — crossed wrenches / tools
      return (
        <>
          <line x1="1"  y1="1"  x2="43" y2="43" stroke={color} strokeWidth="4" strokeLinecap="square" />
          <line x1="43" y1="1"  x2="1"  y2="43" stroke={color} strokeWidth="4" strokeLinecap="square" />
        </>
      )

    case 'tech':
      // Crosshair with satellite dots
      return (
        <>
          <line x1="22" y1="1"  x2="22" y2="43" stroke={color} strokeWidth="1.5" />
          <line x1="1"  y1="22" x2="43" y2="22" stroke={color} strokeWidth="1.5" />
          <circle cx="22" cy="22" r="7"  fill={color} />
          <circle cx="22" cy="7"  r="3"  fill={color} />
          <circle cx="22" cy="37" r="3"  fill={color} />
          <circle cx="7"  cy="22" r="3"  fill={color} />
          <circle cx="37" cy="22" r="3"  fill={color} />
        </>
      )

    case 'travel':
      // Globe arc
      return (
        <>
          <path d="M 1 30 A 21 21 0 0 1 43 30" fill={color} />
          <line x1="1"  y1="30" x2="43" y2="30" stroke={color} strokeWidth="1.5" />
          <line x1="22" y1="1"  x2="22" y2="30" stroke={color} strokeWidth="1.5" />
        </>
      )

    default:
      return null
  }
}
