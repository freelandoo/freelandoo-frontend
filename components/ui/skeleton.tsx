import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-white/5",
        shimmer
          ? "animate-shimmer bg-gradient-to-r from-white/[0.04] via-white/[0.10] to-white/[0.04]"
          : "animate-pulse",
        className
      )}
      {...props}
    />
  )
}
