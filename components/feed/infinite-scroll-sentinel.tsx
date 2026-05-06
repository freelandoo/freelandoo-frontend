"use client"

import { useEffect, useRef } from "react"

interface InfiniteScrollSentinelProps {
  onIntersect: () => void
  disabled?: boolean
  rootMargin?: string
}

export function InfiniteScrollSentinel({
  onIntersect,
  disabled,
  rootMargin = "400px",
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const cb = useRef(onIntersect)
  cb.current = onIntersect

  useEffect(() => {
    if (disabled) return
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) cb.current()
      },
      { rootMargin }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [disabled, rootMargin])

  return <div ref={ref} aria-hidden className="h-10 w-full" />
}
