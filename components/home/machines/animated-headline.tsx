"use client"

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
        <span
          key={i}
          className={cn(
            "block",
            i === highlightIndex && (highlightClassName ?? "text-primary"),
          )}
        >
          {line}
        </span>
      ))}
    </h1>
  )
}
