"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type AnimatedHeadlineProps = {
  lines: string[]
  className?: string
  highlightIndex?: number
  highlightClassName?: string
  delay?: number
}

export function AnimatedHeadline({
  lines,
  className,
  highlightIndex,
  highlightClassName,
  delay = 0,
}: AnimatedHeadlineProps) {
  return (
    <h1 className={cn("flex flex-col gap-1 font-semibold tracking-tight", className)}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: delay + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "block",
            i === highlightIndex && (highlightClassName ?? "text-primary"),
          )}
        >
          {line}
        </motion.span>
      ))}
    </h1>
  )
}
