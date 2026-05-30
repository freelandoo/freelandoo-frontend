import { cn } from "@/lib/utils"

interface PageCounterBadgeProps {
  current: number
  total: number
  className?: string
}

/** Selo circular "1/20" desenhado à mão, como no canto do post de referência. */
export function PageCounterBadge({ current, total, className }: PageCounterBadgeProps) {
  return (
    <span className={cn("relative inline-flex h-14 w-14 items-center justify-center", className)} aria-hidden="true">
      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full text-[var(--cyan)]">
        <path
          d="M40 6C20 4 8 20 8 40c0 22 16 34 34 34 18 0 30-14 30-34C72 20 58 8 40 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="casa-body text-sm font-bold tabular-nums text-[var(--ink)]">
        {current}/{total}
      </span>
    </span>
  )
}
