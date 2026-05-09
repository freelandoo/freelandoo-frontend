export function AdminPolensMetrics({ metrics }: { metrics: Record<string, number> | null }) {
  const items = [
    ["Poléns emitidos hoje", metrics?.polens_issued_today || 0],
    ["Poléns gastos hoje", metrics?.polens_spent_today || 0],
    ["Usuários que ganharam", metrics?.users_earned_today || 0],
    ["Anúncios assistidos", metrics?.ads_completed_today || 0],
    ["Taxa de conclusão", `${Math.round((metrics?.completion_rate || 0) * 100)}%`],
    ["Produtos comprados", metrics?.products_purchased_today || 0],
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}
