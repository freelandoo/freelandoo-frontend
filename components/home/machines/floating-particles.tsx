"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type FloatingParticlesProps = {
  count?: number
  color?: string
  className?: string
  speed?: number
}

export function FloatingParticles({
  count = 24,
  color = "rgba(255,255,255,0.55)",
  className,
  speed = 1,
}: FloatingParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = i * 9301 + 49297
        const rand = (n: number) => ((Math.sin(seed * (n + 1)) + 1) / 2)
        return {
          id: i,
          x: rand(1) * 100,
          y: rand(2) * 100,
          size: 1 + rand(3) * 2.5,
          duration: (6 + rand(4) * 10) / speed,
          delay: rand(5) * 6,
          drift: -20 + rand(6) * 40,
        }
      }),
    [count, speed],
  )

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
          }}
          animate={{
            y: [0, p.drift, 0],
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
