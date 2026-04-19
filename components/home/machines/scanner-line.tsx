"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type ScannerLineProps = {
  color?: string
  className?: string
  active?: boolean
}

export function ScannerLine({
  color = "rgba(139,92,246,0.9)",
  className,
  active = true,
}: ScannerLineProps) {
  if (!active) return null
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 24px 2px ${color}`,
        }}
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}
