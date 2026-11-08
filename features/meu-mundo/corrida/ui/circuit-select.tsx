// features/meu-mundo/corrida/ui/circuit-select.tsx — CORRIDA (mm3d-74): SELECIONAR CIRCUITO.
//
// Pedido do Alex: antes da corrida, os 6 circuitos em cartões — miniatura,
// nome, subtítulo, ambiente, dificuldade, loops, destaque, etiquetas e o
// melhor tempo do aparelho. Tocar seleciona; CORRER larga no modo escolhido
// (sozinho, multiplayer ou contra o relógio); VOLTAR volta ao cardápio.
// O desenho da pista no canto sai da própria regra (sim/circuits.ts).

import { useMemo, useState } from "react"
import { ArrowLeft, Flag, Lock, Trophy } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { menuCircuits, tagLabel, type CircuitArt } from "../engine/circuit-art"
import { trackOf } from "../sim/circuits"
import type { RaceMode } from "../engine/race-game"

export interface CircuitRecord {
  race: number | null
  time: number | null
  lap: number | null
}

/** Contorno da pista (SVG, 0–100) pelas amostras da regra. */
function outline(id: string): string {
  const t = trackOf(id)
  const b = t.bounds
  const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) || 1
  const ox = (span - (b.x1 - b.x0)) / 2
  const oz = (span - (b.z1 - b.z0)) / 2
  let d = ""
  for (let i = 0; i < t.n; i += 6) {
    const x = 6 + ((t.x[i] - b.x0 + ox) / span) * 88
    const y = 94 - ((t.z[i] - b.z0 + oz) / span) * 88
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + "Z"
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`
}

export function CircuitSelect({
  mode,
  current,
  records,
  onBack,
  onRun,
}: {
  mode: RaceMode
  current: string
  records: (id: string) => CircuitRecord
  onBack: () => void
  onRun: (id: string) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuCircuits(), [])
  const paths = useMemo(() => Object.fromEntries(list.map((c) => [c.id, outline(c.id)])), [list])
  const [sel, setSel] = useState(() => (list.some((c) => c.id === current) ? current : list[0].id))
  const chosen = list.find((c) => c.id === sel) ?? list[0]
  const modeLabel = mode === "multi" ? t("corridaModeMulti", "Multiplayer") : mode === "time" ? t("corridaModeTime", "Contra o relógio") : t("corridaModeSolo", "Sozinho")
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "radial-gradient(120% 90% at 50% 0%, #22405c 0%, #0f151d 62%, #0a0d12 100%)", color: MM.text }}>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-4 max-[759px]:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("corridaSelectBack", "Voltar")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: MM.card, border: `1px solid ${MM.border}` }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#5FE1FF" }}>
            {modeLabel}
          </div>
          <h1 className="text-[26px] font-black italic leading-none tracking-tight max-[759px]:text-[21px]">{t("corridaSelectTitle", "SELECIONAR CIRCUITO")}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 max-[759px]:px-3">
        <div className="mx-auto grid max-w-[1180px] grid-cols-3 gap-3 max-[1020px]:grid-cols-2 max-[600px]:grid-cols-1">
          {list.map((c) => (
            <Card key={c.id} c={c} path={paths[c.id]} selected={c.id === sel} rec={records(c.id)} onPick={() => setSel(c.id)} onRun={() => onRun(c.id)} />
          ))}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-3 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 max-[759px]:px-3" style={{ background: "rgba(8,11,16,0.86)", borderTop: `1px solid ${MM.border}` }}>
        <button
          type="button"
          onClick={onBack}
          className="h-12 shrink-0 rounded-none px-5 text-[14px] font-black uppercase tracking-[0.12em]"
          style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}
        >
          {t("corridaSelectBack", "Voltar")}
        </button>
        <div className="min-w-0 flex-1 truncate text-[13px] max-[480px]:hidden" style={{ color: MM.muted }}>
          <span className="font-bold" style={{ color: chosen.accent }}>
            {t(chosen.nameKey, chosen.name)}
          </span>{" "}
          · {t(chosen.envKey, chosen.env)}
        </div>
        <button
          type="button"
          onClick={() => onRun(chosen.id)}
          className="ml-auto flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-none px-6 text-[16px] font-black uppercase italic tracking-[0.08em] transition-transform active:scale-[0.98] max-[480px]:flex-1"
          style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" }}
        >
          <Flag className="h-5 w-5" /> {t("corridaSelectRun", "Correr")}
        </button>
      </footer>
    </div>
  )
}

function Card({ c, path, selected, rec, onPick, onRun }: { c: CircuitArt; path: string; selected: boolean; rec: CircuitRecord; onPick: () => void; onRun: () => void }) {
  const t = useTranslations("MeuMundo")
  const [imgOk, setImgOk] = useState(true)
  const diff = [t("corridaDiff1", "Fácil"), t("corridaDiff2", "Média"), t("corridaDiff3", "Difícil")][c.difficulty - 1]
  const best = rec.lap
  return (
    <button
      type="button"
      onClick={onPick}
      onDoubleClick={onRun}
      aria-pressed={selected}
      className="group relative flex flex-col overflow-hidden rounded-none text-left transition-transform duration-150 active:scale-[0.99]"
      style={{
        background: MM.surface,
        border: `2px solid ${selected ? c.accent : MM.border}`,
        boxShadow: selected ? `0 0 0 1px ${c.accent}55, 0 10px 30px -10px ${c.accent}99` : MM.shadow,
        transform: selected ? "translateY(-2px)" : undefined,
      }}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden max-[600px]:aspect-[21/9]" style={{ background: `linear-gradient(135deg, ${c.bg[0]}, ${c.bg[1]})` }}>
        {imgOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb} alt="" loading="lazy" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(5,8,12,0.85) 100%)" }} />
        <svg viewBox="0 0 100 100" className="absolute right-2 top-2 h-[34%] w-auto" aria-hidden>
          <path d={path} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={6} strokeLinejoin="round" />
          <path d={path} fill="none" stroke={c.accent} strokeWidth={3} strokeLinejoin="round" />
        </svg>
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-[20px] font-black italic leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t(c.nameKey, c.name)}</div>
          <div className="mt-1 text-[12px] leading-tight text-white/80">{t(c.subKey, c.sub)}</div>
        </div>
        {!c.active && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <Lock className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: MM.muted }}>
          <span>{t(c.envKey, c.env)}</span>
          <span className="flex items-center gap-1" title={diff}>
            {[1, 2, 3].map((k) => (
              <span key={k} className="h-2.5 w-1.5" style={{ background: k <= c.difficulty ? c.accent : "rgba(255,255,255,0.15)" }} />
            ))}
            <span className="ml-1">{diff}</span>
          </span>
          <span>{c.loops ? t("corridaLoopsN", "{n} loop(s)").replace("{n}", String(c.loops)) : t("corridaLoops0", "Sem loops")}</span>
        </div>
        <div className="text-[13px] font-semibold leading-snug" style={{ color: MM.text }}>
          ★ {t(c.highlightKey, c.highlight)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-[10px] font-black tracking-[0.12em]" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${c.accent}66`, color: c.accent }}>
              {tagLabel(tag, t)}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[12px]" style={{ color: best !== null ? MM.gold : MM.muted }}>
          <Trophy className="h-3.5 w-3.5" />
          {best !== null ? t("corridaBestLapRec", "Melhor volta {t}").replace("{t}", fmt(best)) : t("corridaNoRecord", "Sem recorde ainda")}
        </div>
      </div>
    </button>
  )
}
