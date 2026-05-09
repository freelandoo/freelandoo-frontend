export function RewardedAdStatus({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${
      error
        ? "border-red-400/30 bg-red-500/10 text-red-200"
        : "border-amber-300/25 bg-amber-300/10 text-amber-100"
    }`}>
      {error || message}
    </div>
  )
}
