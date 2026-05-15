import { Skeleton } from "@/components/ui/skeleton"

export function FeedSkeleton({
  count = 3,
  paged,
}: {
  count?: number
  /** Um painel de altura total (feed estilo TikTok) */
  paged?: boolean
}) {
  if (paged) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/60">
        <div className="flex shrink-0 items-center gap-3 px-4 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-20" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="min-h-0 flex-1 w-full rounded-none" />
        <div className="flex shrink-0 items-center gap-2 px-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="ml-auto h-7 w-24 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/60"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-20" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          </div>
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="flex items-center gap-2 px-3 pt-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="ml-auto h-7 w-24 rounded-full" />
          </div>
          <div className="space-y-2 px-4 py-4">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
