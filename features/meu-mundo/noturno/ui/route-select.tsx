"use client"

// features/meu-mundo/noturno/ui/route-select.tsx — ROLÊ NOTURNO 2.0: ESCOLHA SUA ROTA.
//
// O menu do Rolê (padrão do SELECIONAR FASE do Jetpack, refinado): a rota
// escolhida aparece grande (miniatura capturada do jogo, ambiente, o momento
// de destaque, etiquetas e o recorde do aparelho NESSA rota), embaixo os
// cartões das seis rotas (as cinco novas e a Clássica de antes), o veículo e
// JOGAR. Celular: cartões num carrossel com encaixe; PC: grade de seis.
// Teclado: ← → trocam a rota, Enter joga. Movimento reduzido: sem animação.
// Miniaturas estáticas (nada de 3D aqui: nenhum cenário carrega no menu).

import { useEffect, useMemo, useRef, useState } from "react"
import { Bike, Play, Trophy, WifiOff } from "lucide-react"
import { BackToCity } from "../../ui/kit/back-to-city"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { RIDES, type RideKind } from "../sim/run"
import type { RunPhase } from "../sim/track"
import { menuRoutes, routeArt, type RouteArt } from "../engine/route-art"

export interface RouteRecord {
  score: number
  dist: number
  coins: number
}

const RIDE_ORDER: RideKind[] = ["bike", "skate", "skates"]
const BG = "radial-gradient(130% 90% at 50% 0%, #2a1a4a 0%, #0f0b1e 58%, #06050b 100%)"
const CYAN = "#5FE1FF"
const GOLD = "#FFC94A"
/** Chanfro dos cantos (sem canto arredondado). */
const cut = (k: number) => `polygon(${k}px 0, 100% 0, 100% calc(100% - ${k}px), calc(100% - ${k}px) 100%, 0 100%, 0 ${k}px)`

function Thumb({ art, className }: { art: RouteArt; className?: string }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`overflow-hidden ${className ?? "relative"}`} style={{ background: `linear-gradient(140deg, ${art.bg[0]}, ${art.bg[1]})` }}>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.thumb} alt="" loading="lazy" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  )
}

function SkateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 11.5c1 1.5 2 2 3.5 2h13c1.5 0 2.5-.5 3.5-2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  )
}
function SkatesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h5v7l6 2.5c1.5.6 2 1.5 2 3V17H5V4.5" />
      <circle cx="7.5" cy="20" r="1.6" />
      <circle cx="12" cy="20" r="1.6" />
      <circle cx="16.5" cy="20" r="1.6" />
    </svg>
  )
}
export function RideGlyph({ ride, className }: { ride: RideKind; className?: string }) {
  if (ride === "bike") return <Bike className={className} aria-hidden />
  if (ride === "skate") return <SkateIcon className={className} />
  return <SkatesIcon className={className} />
}

export function RouteSelect({
  phase,
  ride,
  records,
  multi,
  error,
  onExit,
  onPlay,
}: {
  phase: RunPhase
  ride: RideKind
  records: (phase: RunPhase, ride: RideKind) => RouteRecord | null
  multi: boolean
  error: string | null
  onExit: () => void
  onPlay: (ride: RideKind, phase: RunPhase) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuRoutes(), [])
  const [sel, setSel] = useState<RunPhase>(phase)
  const [veh, setVeh] = useState<RideKind>(ride)
  const art = routeArt(sel)
  const rec = records(sel, veh)
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const names: Record<RideKind, string> = {
    bike: t("noturnoRideBike", "Bicicleta"),
    skate: t("noturnoRideSkate", "Skate"),
    skates: t("noturnoRideSkates", "Patins"),
  }
  const blurb: Record<RideKind, string> = {
    bike: t("noturnoBikeSub", "A mais rápida. Pulo mais baixo."),
    skate: t("noturnoSkateSub", "O pulo mais alto. Manobra nas rampas."),
    skates: t("noturnoSkatesSub", "A mais ágil para trocar de faixa."),
  }
  // teclado: ← → trocam a rota, Enter joga
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onPlay(veh, sel)
        return
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const i = list.findIndex((r) => r.id === sel)
      const n = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length]
      setSel(n.id)
      e.preventDefault()
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [list, sel, veh, onPlay])
  // o cartão escolhido fica à vista no carrossel do celular
  useEffect(() => {
    const el = cardsRef.current?.querySelector<HTMLElement>(`[data-route="${sel}"]`)
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
  }, [sel])

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG, color: MM.text }}>
      {/* ── cabeçalho ── */}
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-[max(14px,env(safe-area-inset-top))] max-[759px]:px-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[30px] font-black italic leading-none tracking-tight max-[759px]:text-[22px]" style={{ textShadow: "0 2px 0 #000" }}>
            ROLÊ <span style={{ color: "#FF4FB3" }}>NOTURNO</span>
          </h1>
          <div className="mt-0.5 text-[15px] font-black uppercase italic tracking-[0.08em] max-[759px]:text-[12px]" style={{ color: CYAN }}>
            {t("rnChooseRoute", "Escolha sua rota")}
          </div>
        </div>
        <BackToCity onExit={onExit} className="pointer-events-auto" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 max-[759px]:px-3">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
          {/* ── a rota escolhida, grande ── */}
          <section className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] overflow-hidden max-[859px]:grid-cols-1" style={{ background: "linear-gradient(180deg,#161127 0%,#0e0a1a 100%)", border: `1px solid ${art.accent}66`, clipPath: cut(14) }}>
            <div className="relative aspect-[16/9] w-full max-[859px]:max-h-[30vh]">
              <Thumb art={art} className="absolute inset-0" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(6,4,12,0.88) 100%)" }} />
              <div className="absolute bottom-2 left-3 flex items-end gap-2">
                <span className="text-[38px] font-black italic leading-none max-[759px]:text-[26px]" style={{ color: art.accent, textShadow: "0 2px 0 #000" }}>
                  {art.num}
                </span>
                <span className="pb-1 text-[22px] font-black uppercase italic leading-none tracking-tight max-[759px]:text-[16px]" style={{ textShadow: "0 2px 0 #000" }}>
                  {t(art.nameKey, art.name)}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 p-4 max-[759px]:p-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: art.accent }}>
                {t(art.envKey, art.env)}
              </span>
              <p className="text-[14px] leading-snug max-[759px]:text-[12.5px]">★ {t(art.heroKey, art.hero)}</p>
              <div className="flex flex-wrap gap-1.5">
                {art.tags.map((g) => (
                  <span key={g.key} className="px-2 py-0.5 text-[10.5px] font-black uppercase tracking-[0.1em]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${art.accent}77`, color: art.accent }}>
                    {t(g.key, g.label)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: rec ? GOLD : MM.muted }}>
                <Trophy className="h-4 w-4 shrink-0" />
                {rec
                  ? t("rnRouteBest", "Recorde de {ride}: {s} pontos · {d} m").replace("{ride}", names[veh].toLowerCase()).replace("{s}", rec.score.toLocaleString()).replace("{d}", rec.dist.toLocaleString())
                  : t("rnRouteNoRecord", "Sem recorde nesta rota ainda")}
              </div>
              {/* veículo */}
              <div className="mt-auto pt-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
                {t("noturnoChoose", "Escolha o seu veículo")}
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("noturnoChoose", "Escolha o seu veículo")}>
                {RIDE_ORDER.map((r) => {
                  const on = r === veh
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={blurb[r]}
                      onClick={() => setVeh(r)}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 text-[13px] font-bold transition-transform active:scale-[0.97] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2"
                      style={{ background: on ? "rgba(255,79,179,0.18)" : MM.card, border: `1.5px solid ${on ? "#FF4FB3" : MM.border}`, outlineColor: CYAN, clipPath: cut(6) }}
                    >
                      <RideGlyph ride={r} className="h-5 w-5 shrink-0" />
                      <span className="max-[380px]:hidden">{names[r]}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11.5px] leading-snug" style={{ color: MM.muted }}>
                {blurb[veh]} · {t("noturnoStatSpeed", "Velocidade")} {Math.round(RIDES[veh].at[RIDES[veh].at.length - 1] * 3.6)} km/h
              </p>
            </div>
          </section>

          {/* ── os cartões das rotas ── */}
          <div
            ref={cardsRef}
            className="grid grid-cols-6 gap-2 max-[1000px]:flex max-[1000px]:snap-x max-[1000px]:snap-mandatory max-[1000px]:overflow-x-auto max-[1000px]:pb-1"
            role="radiogroup"
            aria-label={t("rnChooseRoute", "Escolha sua rota")}
          >
            {list.map((a) => {
              const on = a.id === sel
              const r = records(a.id, veh)
              return (
                <button
                  key={a.id}
                  data-route={a.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSel(a.id)}
                  onDoubleClick={() => onPlay(veh, a.id)}
                  className="relative flex shrink-0 flex-col overflow-hidden text-left transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none max-[1000px]:w-[44vw] max-[1000px]:max-w-[220px] max-[1000px]:snap-center focus-visible:outline focus-visible:outline-2"
                  style={{
                    background: MM.card,
                    border: `2px solid ${on ? a.accent : MM.border}`,
                    boxShadow: on ? `0 0 0 1px ${a.accent}55, 0 8px 26px -8px ${a.accent}` : "none",
                    transform: on ? "translateY(-3px)" : undefined,
                    clipPath: cut(10),
                    outlineColor: CYAN,
                  }}
                >
                  <div className="relative aspect-[16/9] w-full">
                    <Thumb art={a} className="absolute inset-0" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(6,4,12,0.9) 100%)" }} />
                    <span className="absolute left-1.5 top-1 text-[15px] font-black italic" style={{ color: a.accent, textShadow: "0 1px 0 #000" }}>
                      {a.num}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1">
                    <span className="truncate text-[12.5px] font-black uppercase italic leading-tight">{t(a.nameKey, a.name)}</span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: r ? GOLD : MM.muted }}>
                      <Trophy className="h-3 w-3 shrink-0" />
                      {r ? r.score.toLocaleString() : "—"}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {error && (
            <p className="flex items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "rgba(110,16,34,0.5)", color: "#ffd5dc" }} role="alert">
              <WifiOff className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <p className="text-[12px] leading-snug max-[759px]:hidden" style={{ color: MM.muted }}>
            {t("noturnoKeys", "← → ou A D trocam de faixa · ↑, W ou Espaço pulam · ↓ ou S descem rápido · no ar da rampa: ← → giram 360° e ↑ dá um mortal")}
          </p>
          <p className="hidden text-[12px] leading-snug max-[759px]:block" style={{ color: MM.muted }}>
            {t("noturnoSwipe", "Deslize para os lados para trocar de faixa, para cima (ou toque) para pular e para baixo para descer rápido. No ar da rampa: para o lado gira 360° e para cima dá um mortal.")}
          </p>
        </div>
      </div>

      {/* ── jogar ── */}
      <footer className="shrink-0 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 max-[759px]:px-3" style={{ background: "linear-gradient(180deg, rgba(6,5,11,0) 0%, rgba(6,5,11,0.92) 40%)" }}>
        <div className="mx-auto flex max-w-[1240px] items-center gap-3">
          <button
            type="button"
            onClick={() => onPlay(veh, sel)}
            className="flex flex-1 flex-col items-center justify-center px-3 py-3 font-black italic tracking-wide text-white transition-transform active:scale-[0.98] motion-reduce:transition-none"
            style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, clipPath: cut(10) }}
          >
            <span className="flex items-center gap-2 text-[18px] max-[420px]:text-[15px]">
              <Play className="h-5 w-5 shrink-0" fill="currentColor" />
              {t("rnPlay", "JOGAR")} · {t(art.nameKey, art.name)}
            </span>
            {multi && (
              <span className="text-[11px] font-semibold not-italic leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>
                {t("noturnoModeBotsSub4", "Espera até 20 segundos · até 4")}
              </span>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
