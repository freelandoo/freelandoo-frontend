// features/meu-mundo/corrida/ui/circuit-select.tsx — CORRIDA (mm3d-74): SELECIONAR CIRCUITO.
//
// Pedido do Alex: logo depois de escolher a nave, os 6 circuitos em cartões —
// miniatura, nome, subtítulo, ambiente, dificuldade, loops, destaque,
// etiquetas e o melhor tempo do aparelho. Tocar seleciona; os botões de modo
// embaixo (Sozinho = CORRER, Multiplayer, Contra o relógio) largam nele;
// VOLTAR volta para a garagem. (mm3d-74b: antes o modo vinha antes da pista,
// num cardápio no meio, e o Alex não achou a escolha da pista.)
// O desenho da pista no canto sai da própria regra (sim/circuits.ts).

import { useMemo, useState } from "react"
import { ArrowLeft, Flag, Lock, Timer, Trophy, Users, X } from "lucide-react"
import { BackToCity } from "../../ui/kit/back-to-city"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { menuCircuits, tagLabel, type CircuitArt } from "../engine/circuit-art"
import { shipArt } from "../engine/ship-art"
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
  current,
  records,
  multi,
  error,
  ship,
  onGarage,
  onExit,
  onPlay,
}: {
  current: string
  records: (id: string) => CircuitRecord
  /** Multiplayer disponível (no centro, perto da porta). */
  multi: boolean
  error: string | null
  ship: string
  /** Voltar para a garagem (trocar a nave). */
  onGarage: () => void
  onExit: () => void
  onPlay: (mode: RaceMode, track: string) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuCircuits(), [])
  const paths = useMemo(() => Object.fromEntries(list.map((c) => [c.id, outline(c.id)])), [list])
  const [sel, setSel] = useState(() => (list.some((c) => c.id === current) ? current : list[0].id))
  const chosen = list.find((c) => c.id === sel) ?? list[0]
  const art = shipArt(ship)
  const modes: { mode: RaceMode; icon: React.ReactNode; title: string; sub: string }[] = [
    { mode: "race", icon: <Flag className="h-5 w-5" />, title: t("corridaSelectRun", "Correr"), sub: t("corridaModeRaceSub", "Você contra 5 computadores · 3 voltas") },
    ...(multi
      ? [{ mode: "multi" as const, icon: <Users className="h-5 w-5" />, title: t("corridaModeMulti", "Multiplayer"), sub: t("corridaModeMultiSub", "Espera até 1 minuto · o resto é computador") }]
      : []),
    { mode: "time", icon: <Timer className="h-5 w-5" />, title: t("corridaModeTime", "Contra o relógio"), sub: t("corridaModeTimeSub", "Sozinho na pista · 3 voltas") },
  ]
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "radial-gradient(120% 90% at 50% 0%, #22405c 0%, #0f151d 62%, #0a0d12 100%)", color: MM.text }}>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-4 max-[759px]:px-3">
        <button
          type="button"
          onClick={onGarage}
          aria-label={t("corridaSelectBack", "Voltar")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: MM.card, border: `1px solid ${MM.border}` }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#5FE1FF" }}>
            ANTI<span style={{ color: "#FF7A2F" }}>GRAVIDADE</span>
          </div>
          <h1 className="text-[26px] font-black italic leading-none tracking-tight max-[759px]:text-[20px]">{t("corridaSelectTitle", "SELECIONAR CIRCUITO")}</h1>
        </div>
        <button
          type="button"
          onClick={onGarage}
          className="flex shrink-0 items-center gap-2 rounded-none px-3 py-1.5 text-left max-[520px]:hidden"
          style={{ background: MM.card, border: `1px solid ${MM.border}` }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: art.holo.color, boxShadow: `0 0 8px ${art.holo.color}` }} />
          <span className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
              {t("corridaMenuShip", "Sua nave")}
            </span>
            <span className="block text-[13px] font-bold">{t(art.labelKey, art.fallback)}</span>
          </span>
          <span className="ml-1 text-[12px] font-bold" style={{ color: "#5FE1FF" }}>
            {t("corridaSelectSwap", "Trocar")}
          </span>
        </button>
        <BackToCity onExit={onExit} className="pointer-events-auto" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 max-[759px]:px-3">
        <div className="mx-auto grid max-w-[1180px] grid-cols-3 gap-3 max-[1020px]:grid-cols-2 max-[600px]:grid-cols-1">
          {list.map((c) => (
            <Card key={c.id} c={c} path={paths[c.id]} selected={c.id === sel} rec={records(c.id)} onPick={() => setSel(c.id)} onRun={() => onPlay("race", c.id)} />
          ))}
        </div>
      </div>

      <footer className="shrink-0 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 max-[759px]:px-3" style={{ background: "rgba(8,11,16,0.9)", borderTop: `1px solid ${MM.border}` }}>
        {error && (
          <p role="alert" className="mb-2 rounded-none px-3 py-2 text-[13px]" style={{ background: "rgba(110, 16, 34, 0.55)", color: "#FFD9DF" }}>
            {error}
          </p>
        )}
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 max-[759px]:flex-col max-[759px]:items-stretch max-[759px]:gap-2">
          <div className="min-w-0 flex-1 max-[759px]:text-center">
            <div className="truncate text-[15px] font-black italic" style={{ color: chosen.accent }}>
              {t(chosen.nameKey, chosen.name)}
            </div>
            <div className="truncate text-[12px] max-[759px]:hidden" style={{ color: MM.muted }}>
              {t(chosen.envKey, chosen.env)} · {t("corridaKeys", "Setas ou WASD dirigem · Espaço ou Shift = turbo")}
            </div>
          </div>
          <div className={`grid shrink-0 gap-2 ${modes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {modes.map((m, i) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => onPlay(m.mode, chosen.id)}
                title={m.sub}
                className="flex min-h-[52px] min-w-[150px] items-center justify-center gap-2 rounded-none px-4 text-[14px] font-black uppercase italic tracking-[0.06em] transition-transform active:scale-[0.98] max-[759px]:min-w-0 max-[759px]:flex-col max-[759px]:gap-0.5 max-[759px]:px-2 max-[759px]:text-[11.5px]"
                style={{ background: i === 0 ? MM.rubyFill : MM.card, border: `1px solid ${i === 0 ? MM.rubyBorder : MM.border}`, color: i === 0 ? "#fff" : MM.text }}
              >
                <span style={{ color: i === 0 ? "#fff" : MM.gold }}>{m.icon}</span>
                {m.title}
              </button>
            ))}
          </div>
        </div>
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
