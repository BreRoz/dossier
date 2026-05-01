'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const checkNow = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (r.top < vh && r.bottom > 0) {
        el.classList.add('in')
        return true
      }
      return false
    }
    if (checkNow()) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)

    const fallback = setTimeout(() => el.classList.add('in'), 1200)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [threshold])

  return ref
}

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  style?: CSSProperties
}

export function Reveal({ children, delay = 0, className = '', style = {} }: RevealProps) {
  const ref = useReveal() as React.RefObject<HTMLDivElement>
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

interface MaskLinesProps {
  lines: ReactNode[]
  delay?: number
  stagger?: number
  className?: string
  style?: CSSProperties
}

export function MaskLines({
  lines,
  delay = 0,
  stagger = 80,
  className = '',
  style = {},
}: MaskLinesProps) {
  const ref = useReveal() as React.RefObject<HTMLSpanElement>
  return (
    <span ref={ref} className={`reveal-mask ${className}`} style={style}>
      {lines.map((line, i) => (
        <span key={i} style={{ transitionDelay: `${delay + i * stagger}ms` }}>
          {line}
        </span>
      ))}
    </span>
  )
}
