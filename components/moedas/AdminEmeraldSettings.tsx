"use client"

// A7 — painel do admin (interno, sem i18n): tetos e pontos da Verde Esmeralda,
// preço do cupom Gold e preço em Esmeralda dos destaques (vazio = Gold × 1.000,
// 0 = não vende em Esmeralda).

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"

type EmeraldSettings = Record<string, number | boolean | string | null>

const NUMBERS: { key: string; label: string; help: string }[] = [
  { key: "engagement_daily_cap", label: "Teto diário de engajamento", help: "Esmeraldas por pessoa por dia (curtir/salvar/comentar/compartilhar + alcance dos posts)." },
  { key: "work_daily_cap", label: "Teto diário do trabalho no Meu Mundo", help: "Separado do engajamento." },
  { key: "points_like", label: "Curtir", help: "Esmeraldas por curtida." },
  { key: "points_save", label: "Salvar", help: "Esmeraldas por post salvo." },
  { key: "points_comment", label: "Comentar", help: "Esmeraldas por comentário." },
  { key: "points_share", label: "Compartilhar", help: "Esmeraldas por compartilhamento." },
  { key: "comment_min_chars", label: "Mínimo de caracteres do comentário", help: "Abaixo disso o comentário não rende." },
  { key: "reach_points_per_emerald", label: "Pontos de alcance por Esmeralda (dono)", help: "O dono do post ganha 1 a cada N pontos." },
  { key: "coupon_gold_per_10_brl", label: "Gold a cada R$ 10 de cupom", help: "Preço do cupom de desconto." },
]
const FLAGS: { key: string; label: string }[] = [
  { key: "is_active", label: "Esmeralda ativa" },
  { key: "conversion_enabled", label: "Conversão Gold → Esmeralda ligada" },
  { key: "engagement_enabled", label: "Esmeralda por engajamento ligada" },
]
const HIGHLIGHTS: { key: string; label: string }[] = [
  { key: "emerald_price_premium_highlight", label: "Destaque premium em Esmeralda" },
  { key: "emerald_price_clan_highlight", label: "Destaque de enxame em Esmeralda" },
]

function auth() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
}

export function AdminEmeraldSettings() {
  const [s, setS] = useState<EmeraldSettings | null>(null)
  const [hl, setHl] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/admin/polens/emerald-settings", { headers: auth(), cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/polens/settings", { headers: auth(), cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([e, p]) => {
        if (cancelled) return
        setS(e?.settings || null)
        const ps = p?.settings || {}
        setHl(Object.fromEntries(HIGHLIGHTS.map((h) => [h.key, ps[h.key] == null ? "" : String(ps[h.key])])))
      })
      .catch(() => {
        if (!cancelled) setMsg("Erro ao carregar")
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    if (!s) return
    setBusy(true)
    setMsg("")
    try {
      const body: Record<string, unknown> = {}
      for (const f of NUMBERS) body[f.key] = Number(s[f.key])
      for (const f of FLAGS) body[f.key] = !!s[f.key]
      const r1 = await fetch("/api/admin/polens/emerald-settings", { method: "PUT", headers: auth(), body: JSON.stringify(body) })
      const d1 = await r1.json()
      if (!r1.ok) throw new Error(d1.error || "Erro ao salvar")
      const r2 = await fetch("/api/admin/polens/settings", {
        method: "PUT",
        headers: auth(),
        body: JSON.stringify(Object.fromEntries(HIGHLIGHTS.map((h) => [h.key, hl[h.key] === "" ? null : Number(hl[h.key])]))),
      })
      const d2 = await r2.json()
      if (!r2.ok) throw new Error(d2.error || "Erro ao salvar")
      setS(d1.settings)
      setMsg("Salvo")
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setBusy(false)
    }
  }

  if (!s) return <p className="text-sm text-white/60">{msg || "Carregando Esmeralda…"}</p>

  return (
    <section className="fl-sharp border-2 border-[#1FBF75]/40 bg-[#0F1A14] p-5 text-white">
      <h2 className="text-lg font-bold">Verde Esmeralda (A7)</h2>
      <p className="mt-1 text-xs text-white/60">1 Gold = 1.000 Esmeraldas. Esmeralda nunca vira Gold. Preço em Esmeralda vazio = Gold × 1.000; 0 = não vende.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {NUMBERS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs">
            <span className="font-bold">{f.label}</span>
            <input
              inputMode="numeric"
              value={String(s[f.key] ?? "")}
              onChange={(e) => setS({ ...s, [f.key]: e.target.value.replace(/\D/g, "") })}
              className="h-9 border-2 border-white/15 bg-black/30 px-2 text-sm outline-none focus:border-[#1FBF75]"
            />
            <span className="text-white/50">{f.help}</span>
          </label>
        ))}
        {HIGHLIGHTS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs">
            <span className="font-bold">{f.label}</span>
            <input
              inputMode="numeric"
              value={hl[f.key] ?? ""}
              placeholder="Gold × 1.000"
              onChange={(e) => setHl({ ...hl, [f.key]: e.target.value.replace(/\D/g, "") })}
              className="h-9 border-2 border-white/15 bg-black/30 px-2 text-sm outline-none focus:border-[#1FBF75]"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {FLAGS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!s[f.key]} onChange={(e) => setS({ ...s, [f.key]: e.target.checked })} />
            {f.label}
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 bg-[#1FBF75] px-4 py-2 text-sm font-bold text-[#06140C] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
        {msg ? <span className="text-xs text-white/70">{msg}</span> : null}
      </div>
    </section>
  )
}
