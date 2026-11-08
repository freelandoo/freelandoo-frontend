"use client"

// features/meu-mundo/jetpack/ui/phase-select.tsx — JETPACK (mm3d-75): SELECIONAR FASE.
//
// Pedido do Alex (arte "Jetpack Evolution" + "escolha de fases como o
// Antigravidade"): logo ao entrar, os cartões das fases — miniatura, número,
// nome, dificuldade em estrelas, etiquetas e o recorde do aparelho; a fase
// escolhida aparece grande (ambiente, a característica, as metas das 3
// estrelas e as estrelas já ganhas); embaixo MODO DE JOGO (Treino ou
// Multiplayer) e CORRER. Anéis do Vácuo aparece trancada ("Em breve").
// Visual futurista da arte: azul-escuro e grafite, filetes ciano, destaque
// amarelo. Miniaturas estáticas (nada de 3D aqui).

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Lock, Play, Star, Trophy, User, Users, WifiOff, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { menuPhases, phaseArt, starsFor, type PhaseArt } from "../engine/phase-art"
import type { PhaseId } from "../sim/phases"

export interface PhaseRecord {
  dist: number
  score: number
  /** Estrelas de desempenho já ganhas (0–3). */
  stars: number
  /** Voos nessa fase (neste aparelho). */
  runs: number
}

export const JT = {
  bg: "radial-gradient(130% 90% at 50% 0%, #17325a 0%, #0b1424 58%, #060a12 100%)",
  panel: "linear-gradient(180deg, #121c2c 0%, #0c1320 100%)",
  card: "#0f1828",
  line: "#22344f",
  cyan: "#3FD8FF",
  yellow: "#FFC21A",
  text: "#EAF4FF",
  muted: "#8FA3BC",
  /** Chanfro dos cantos (tecnológico, sem canto arredondado). */
  cut: (k: number) => `polygon(${k}px 0, 100% 0, 100% calc(100% - ${k}px), calc(100% - ${k}px) 100%, 0 100%, 0 ${k}px)`,
} as const

function Stars({ n, of = 5, size = 13, color = JT.yellow }: { n: number; of?: number; size?: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${n}/${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <Star key={i} style={{ width: size, height: size, color: i < n ? color : "rgba(255,255,255,0.22)" }} fill={i < n ? color : "transparent"} strokeWidth={1.6} />
      ))}
    </span>
  )
}

function Thumb({ art, className }: { art: PhaseArt; className?: string }) {
  const [ok, setOk] = useState(true)
  return (
    // `relative` só sem className: com "absolute inset-0" o relative vencia e o quadro ficava com altura 0
    <div className={`overflow-hidden ${className ?? "relative"}`} style={{ background: `linear-gradient(140deg, ${art.bg[0]}, ${art.bg[1]})` }}>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.thumb} alt="" loading="lazy" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  )
}

export function PhaseSelect({
  current,
  records,
  multi,
  error,
  onExit,
  onPlay,
}: {
  current: PhaseId
  records: (id: PhaseId) => PhaseRecord | null
  /** Multiplayer disponível (no centro, perto da porta). */
  multi: boolean
  error: string | null
  onExit: () => void
  onPlay: (solo: boolean, phase: PhaseId) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuPhases(), [])
  const [sel, setSel] = useState<PhaseId>(() => (list.some((p) => p.enabled && p.art.id === current) ? current : "industrial"))
  const [solo, setSolo] = useState(true)
  const art = phaseArt(sel)
  const rec = records(sel)
  const go = () => onPlay(multi ? solo : true, sel)
  // Enter corre (PC)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  })
  const diffLabel = (d: number) => [t("jetDiff1", "Muito fácil"), t("jetDiff2", "Fácil"), t("jetDiff3", "Média"), t("jetDiff4", "Difícil"), t("jetDiff5", "Extrema")][d - 1]
  const gotStars = rec?.stars ?? 0
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: JT.bg, color: JT.text }}>
      {/* ── cabeçalho ── */}
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-[max(14px,env(safe-area-inset-top))] max-[759px]:px-3">
        <div className="min-w-0 flex-1">
          <div className="text-[30px] font-black italic leading-none tracking-tight max-[759px]:text-[22px]" style={{ textShadow: "0 2px 0 #000" }}>
            JETPACK
          </div>
          <div className="mt-0.5 text-[15px] font-black uppercase italic tracking-[0.08em] max-[759px]:text-[12px]" style={{ color: JT.yellow }}>
            {t("jetSelectTitle", "Selecionar fase")}
          </div>
        </div>
        <button type="button" aria-label={t("jetLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: JT.card, border: `1px solid ${JT.line}` }}>
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 max-[759px]:px-3">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
          {/* ── a fase escolhida, grande ── */}
          <section className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-0 overflow-hidden max-[859px]:grid-cols-1" style={{ background: JT.panel, border: `1px solid ${art.accent}66`, clipPath: JT.cut(14) }}>
            <div className="relative h-[min(34vh,300px)] max-[859px]:h-[min(24vh,200px)]">
              <Thumb art={art} className="absolute inset-0" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(4,8,14,0.85) 100%)" }} />
              <div className="absolute bottom-2 left-3 flex items-end gap-2">
                <span className="text-[38px] font-black italic leading-none max-[759px]:text-[28px]" style={{ color: art.accent, textShadow: "0 2px 0 #000" }}>
                  {art.num}
                </span>
                <span className="pb-1 text-[22px] font-black uppercase italic leading-none tracking-tight max-[759px]:text-[17px]" style={{ textShadow: "0 2px 0 #000" }}>
                  {t(art.nameKey, art.name)}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 p-4 max-[759px]:p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: JT.muted }}>
                <span className="font-bold uppercase tracking-[0.12em]" style={{ color: JT.cyan }}>
                  {t(art.envKey, art.env)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Stars n={art.difficulty} /> {diffLabel(art.difficulty)}
                </span>
              </div>
              <p className="text-[13.5px] leading-snug max-[759px]:text-[12.5px]" style={{ color: JT.text }}>
                {t(art.subKey, art.sub)}
              </p>
              <p className="text-[13px] font-bold leading-snug" style={{ color: JT.yellow }}>
                ★ {t(art.featureKey, art.feature)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {art.tags.map((g) => (
                  <span key={g.key} className="px-2 py-0.5 text-[10.5px] font-black uppercase tracking-[0.1em]" style={{ background: "rgba(63,216,255,0.08)", border: `1px solid ${art.accent}77`, color: art.accent }}>
                    {t(g.key, g.label)}
                  </span>
                ))}
              </div>
              {/* metas das 3 estrelas e o recorde */}
              <div className="mt-auto grid grid-cols-3 gap-1.5 pt-1">
                {art.stars.map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 px-1 py-1.5" style={{ background: JT.card, border: `1px solid ${i < gotStars ? JT.yellow : JT.line}` }}>
                    <Stars n={i + 1} of={i + 1} size={11} color={i < gotStars ? JT.yellow : JT.muted} />
                    <span className="text-[11.5px] font-black tabular-nums">{m.toLocaleString()} m</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: rec ? JT.yellow : JT.muted }}>
                <Trophy className="h-4 w-4" />
                {rec
                  ? t("jetPhaseBest", "Recorde: {d} m · {s} pontos").replace("{d}", rec.dist.toLocaleString()).replace("{s}", rec.score.toLocaleString())
                  : t("jetPhaseNoRecord", "Sem recorde nesta fase ainda")}
              </div>
            </div>
          </section>

          {/* ── os cartões ── */}
          <div className="grid grid-cols-7 gap-2 max-[1100px]:grid-cols-4 max-[640px]:grid-cols-3 max-[420px]:grid-cols-2">
            {list.map(({ art: a, enabled }) => {
              const on = a.id === sel
              const r = enabled ? records(a.id) : null
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={on}
                  onClick={() => enabled && setSel(a.id)}
                  onDoubleClick={() => enabled && onPlay(multi ? solo : true, a.id)}
                  className="relative flex flex-col overflow-hidden text-left transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed"
                  style={{
                    background: JT.card,
                    border: `2px solid ${on ? JT.cyan : JT.line}`,
                    boxShadow: on ? `0 0 0 1px ${JT.cyan}55, 0 8px 26px -8px ${JT.cyan}` : "none",
                    transform: on ? "translateY(-3px)" : undefined,
                    clipPath: JT.cut(10),
                  }}
                >
                  <div className="relative aspect-[3/4] w-full max-[640px]:aspect-[4/5]">
                    <Thumb art={a} className="absolute inset-0" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(4,8,14,0.92) 100%)" }} />
                    <span className="absolute left-1.5 top-1 text-[15px] font-black italic" style={{ color: a.accent, textShadow: "0 1px 0 #000" }}>
                      {a.num}
                    </span>
                    {r && r.stars > 0 && (
                      <span className="absolute right-1.5 top-1.5">
                        <Stars n={r.stars} of={3} size={11} />
                      </span>
                    )}
                    <div className="absolute inset-x-1.5 bottom-1.5 text-center">
                      <div className="text-[13px] font-black uppercase italic leading-[1.05] tracking-tight max-[759px]:text-[11.5px]" style={{ textShadow: "0 1px 0 #000" }}>
                        {t(a.nameKey, a.name)}
                      </div>
                    </div>
                    {!enabled && (
                      <div className="absolute inset-0 grid place-items-center bg-black/55">
                        <span className="flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-[0.1em]">
                          <Lock className="h-6 w-6" />
                          {t("jetSoon", "Em breve")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 px-1.5 py-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: JT.muted }}>
                      {t("jetDifficulty", "Dificuldade")}
                    </span>
                    <Stars n={a.difficulty} size={11} />
                    <div className="flex flex-wrap justify-center gap-1 max-[420px]:hidden">
                      {a.tags.map((g) => (
                        <span key={g.key} className="px-1.5 py-[1px] text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${JT.line}`, color: JT.text }}>
                          {t(g.key, g.label)}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10.5px] font-bold tabular-nums" style={{ color: r ? JT.yellow : JT.muted }}>
                      {r ? `${r.dist.toLocaleString()} m` : "—"}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── modo de jogo e CORRER ── */}
      <footer className="shrink-0 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 max-[759px]:px-3" style={{ background: "rgba(5,9,16,0.94)", borderTop: `1px solid ${JT.line}` }}>
        {error && (
          <p role="alert" className="mx-auto mb-2 flex max-w-[1240px] items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "rgba(110,16,34,0.55)", color: "#FFD9DF" }}>
            <WifiOff className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 max-[759px]:flex-col max-[759px]:items-stretch max-[759px]:gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-black uppercase italic tracking-[0.12em] max-[759px]:hidden" style={{ color: JT.yellow }}>
              {t("jetModeTitle", "Modo de jogo")}
            </div>
            <div className={`grid gap-2 ${multi ? "grid-cols-2" : "grid-cols-1"} max-w-[440px] max-[759px]:max-w-none`}>
              <ModeButton on={!multi || solo} icon={<User className="h-5 w-5" />} title={t("jetModeTrain", "Treino")} sub={t("jetModeTrainSub", "Solo")} onClick={() => setSolo(true)} />
              {multi && <ModeButton on={!solo} icon={<Users className="h-5 w-5" />} title={t("jetModeMulti", "Multiplayer")} sub={t("jetModeMultiSub2", "Grupo · até 6")} onClick={() => setSolo(false)} />}
            </div>
          </div>
          <button
            type="button"
            onClick={go}
            className="flex min-h-[58px] min-w-[220px] items-center justify-center gap-2.5 px-6 text-[22px] font-black uppercase italic tracking-[0.04em] transition-transform active:scale-[0.98] max-[759px]:min-h-[52px] max-[759px]:text-[19px]"
            style={{ background: "linear-gradient(180deg, #FFE27A 0%, #FFC21A 45%, #E29A00 100%)", color: "#1a1204", clipPath: JT.cut(12), boxShadow: "0 0 24px rgba(255,194,26,0.35)" }}
          >
            <Play className="h-6 w-6" fill="#1a1204" />
            {t("jetRun", "Correr")}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-[1240px] text-[11.5px] leading-snug max-[759px]:hidden" style={{ color: JT.muted }}>
          {t("jetKeys", "← → ou A D para os lados · Espaço, ↑, W ou o botão do mouse seguram o propulsor")} · {t("jetEnterRuns", "Enter corre")}
        </p>
      </footer>
    </div>
  )
}

function ModeButton({ on, icon, title, sub, onClick }: { on: boolean; icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="flex min-h-[50px] items-center justify-center gap-2.5 px-3 transition-transform active:scale-[0.98]"
      style={{ background: on ? "linear-gradient(180deg, #16314d 0%, #0f2033 100%)" : JT.card, border: `1.5px solid ${on ? JT.cyan : JT.line}`, color: JT.text, clipPath: JT.cut(8) }}
    >
      <span style={{ color: on ? JT.cyan : JT.muted }}>{icon}</span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[15px] font-black uppercase italic">{title}</span>
        <span className="text-[10.5px]" style={{ color: JT.muted }}>
          ({sub})
        </span>
      </span>
    </button>
  )
}

/** Estrelas de uma distância (para a tela de fim). */
export { starsFor }
