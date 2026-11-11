"use client"

// Admin (lore v2 N3): a META DAS ESTÁTUAS do Meu Mundo. Todo domingo, Raposas
// enchem Aurion e Vampiros enchem Morkhan com o néctar da semana. A meta de
// cada povo = max(base, jogadores ativos × litros por ativo) (decisão D4);
// congela na primeira entrega do domingo, e gravar aqui recalcula as estátuas
// que ainda não encheram. Pele tabloide utilitária (admin interno: sem i18n).

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { getStatueConfig, saveStatueConfig, type StatueConfig, type StatueClan } from "@/features/meu-mundo/data"

const isAdmin = (user: ReturnType<typeof useAuth>["user"]): boolean => {
  const u = user as unknown as { is_admin?: boolean; roles?: { desc_role: string }[] }
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}
const STAGES = ["dormindo", "rachando", "pedaços soltos", "olhos acesos", "CHEIA"]
const L = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`

export default function AdminMeuMundoEstatuaPage() {
  const router = useRouter()
  const { user, status } = useAuth()
  const [cfg, setCfg] = useState<StatueConfig | null>(null)
  const [base, setBase] = useState("")
  const [per, setPer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getStatueConfig(token)
    if (!r.ok) return setError(r.error)
    setCfg(r.data)
    setBase(String(r.data.baseL))
    setPer(String(r.data.perActiveL))
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !isAdmin(user)) {
      router.replace("/")
      return
    }
    void load()
  }, [status, user, router, load])

  const save = async () => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    setError(null)
    setSaved(false)
    const r = await saveStatueConfig(token, Number(base.replace(",", ".")), Number(per.replace(",", ".")))
    setBusy(false)
    if (!r.ok) return setError(r.error)
    setCfg(r.data)
    setSaved(true)
  }

  if (!cfg) return <div className="fl-root fl-paper-texture min-h-[100dvh]">{error && <p className="p-8 text-sm text-red-200">{error}</p>}</div>

  const side = (clan: StatueClan, name: string) => {
    const s = cfg.race[clan]
    return (
      <div key={clan} className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
        <div className="font-[family-name:var(--font-anton)] text-lg uppercase leading-none">{name}</div>
        <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#6B6457]">
          {L(s.deliveredMl)} de {L(s.goalMl)} · {s.active} ativos · {s.donors} entregaram · {STAGES[s.stage] ?? s.stage}
          {s.fullAt ? ` · encheu ${new Date(s.fullAt).toLocaleString("pt-BR")}` : ""}
        </div>
      </div>
    )
  }

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <PageBackLink href="/admin" className="mb-5" />
        <header className="mb-6 border-b-2 border-[#F1EDE2]/12 pb-4">
          <h1 className="fl-display text-4xl leading-none text-[#F2B705]">Meu Mundo · estátuas</h1>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#a89f8d]">Meta do domingo = maior entre a base e (ativos × litros por ativo)</p>
        </header>

        {error && <div className="mb-4 border-2 border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</div>}

        <section className="mb-8 space-y-3">
          <h2 className="fl-display text-2xl uppercase text-[#F1EDE2]">Meta</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#a89f8d]">
              Base (litros)
              <input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} className="w-32 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1.5 text-base text-[#0B0B0D]" />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#a89f8d]">
              Litros por jogador ativo
              <input inputMode="decimal" value={per} onChange={(e) => setPer(e.target.value)} className="w-32 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1.5 text-base text-[#0B0B0D]" />
            </label>
            <button type="button" disabled={busy} onClick={() => void save()} className="fl-btn-gold px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] disabled:opacity-60">
              {busy ? "Gravando…" : "Gravar"}
            </button>
          </div>
          <p className="text-[12px] text-[#a89f8d]">
            Ativo = quem ganhou néctar na semana que acabou de fechar. A meta congela na primeira entrega do domingo; gravar aqui recalcula as estátuas que ainda não encheram.
            {saved ? " Gravado." : ""}
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="fl-display text-2xl uppercase text-[#F1EDE2]">Domingo {cfg.week.split("-").reverse().join("/")}</h2>
          {side("raposa", "Raposas · Aurion")}
          {side("vampiro", "Vampiros · Morkhan")}
        </section>
      </div>
    </div>
  )
}
