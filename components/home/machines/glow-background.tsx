"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type GlowBackgroundProps = {
  glow?: string
  from?: string
  to?: string
  className?: string
  intensity?: "soft" | "medium" | "high"
  showGrid?: boolean
}

const intensityMap = {
  soft: 0.35,
  medium: 0.55,
  high: 0.8,
}

export function GlowBackground({
  glow = "rgba(230,184,0,0.35)",
  from,
  to,
  className,
  intensity = "medium",
  showGrid = true,
}: GlowBackgroundProps) {
  const alpha = intensityMap[intensity]

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      )}

      <motion.div
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: glow, opacity: alpha }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [alpha * 0.85, alpha, alpha * 0.85],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {from && to && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-[55vmin] w-[55vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${from}cc 0%, ${to}55 50%, transparent 75%)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 80%)",
        }}
      />
    </div>
  )
}
