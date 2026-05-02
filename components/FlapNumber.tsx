'use client'

import { useEffect, useRef, useState } from 'react'

interface FlapNumberProps {
  value: string
  duration?: number
}

export function FlapNumber({ value, duration = 1200 }: FlapNumberProps) {
  const [display, setDisplay] = useState(value)
  const startRef = useRef(value)

  useEffect(() => {
    if (value === startRef.current && display === value) return
    const start = performance.now()
    const target = String(value)
    const len = target.length
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const built = target
        .split('')
        .map((ch, i) => {
          const settle = i / len
          if (t > settle + 0.1) return ch
          if (ch === ' ' || ch === ',') return ch
          return String(Math.floor(Math.random() * 10))
        })
        .join('')
      setDisplay(built)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setDisplay(target)
    }

    raf = requestAnimationFrame(tick)
    startRef.current = value
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <span className="flap-char">{display}</span>
}
