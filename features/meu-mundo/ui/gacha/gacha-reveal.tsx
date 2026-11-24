"use client"

// features/meu-mundo/ui/gacha/gacha-reveal.tsx — gacha-v1 (24/11/2026): a ABERTURA das Convocações.
//
// Só desenha o que o SERVIDOR já gravou (o recibo chega antes de abrir): a animação não sorteia, não muda a
// garantia e terminar/pular não entrega nada de novo. gacha-v1b (pedido do Alex): três tempos —
//   1. fonte  — a Fonte do Éter jorra água de partículas (gacha-sky.ts); ao convocar ela dispara;
//   2. céu    — cada giro vira um feixe que SOBE ao céu e acende uma ESTRELA da cor da faixa; cada estrela
//               abre a carta do FRAGMENTO ganho em cima dela (a melhor estrela é maior; no Topo, halo dourado);
//   3. resumo — a lista inteira: fragmento, classe, quantidade, saldo e quanto falta para usar.
// Pular vai direto ao resumo. Movimento reduzido = resumo com um fade. Aba escondida = resumo.
// Vídeo opcional (gacha-media.ts): se o clipe existir e tocar, as cartas abrem no `revealAt` nos mesmos lugares;
// qualquer falha cai na fonte. O canvas fica numa caixa de até 960×720 (DPR ≤ 1,5).

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { FastForward, Hammer, Snowflake, X } from "lucide-react"
import type { GachaPullResult, GachaResult, GachaTier } from "../../data"
import { uiSound } from "../../engine/audio/ui-sound"
import { AE, RANK, type Rank } from "../kit/aether-tokens"
import { ItemImage } from "../kit/item-image"
import { RankSeal } from "../kit/rank-seal"
import { archivo, teko } from "../status/evo-skin"
import { clipFor, GACHA_MEDIA_TIMEOUT_MS, sourceOf } from "./gacha-media"
import { GachaSky, skySlots } from "./gacha-sky"

type Tr = (key: string, fallback: string) => string
type Stage = "sky" | "summary"

/** Cor de cada faixa (a dos Personagens não tem classe: usa a classe equivalente). */
export const TIER_RANK: Record<GachaTier, Rank> = { common: "C", rare: "A", epic: "SS", top: "legendary" }
export const TIER_ORDER: GachaTier[] = ["common", "rare", "epic", "top"]
export const tierColor = (r: GachaResult) => RANK[(r.rank as Rank) || TIER_RANK[r.tier]].color

export interface RevealItemInfo {
  name: string
  thumb: string | null
  /** Quanto tem agora e quanto pede para usar (Forja / Cápsula). */
  have: number
  need: number | null
}

export default function GachaReveal({
  t,
  pull,
  info,
  onClose,
  onUse,
}: {
  t: Tr
  pull: GachaPullResult
  info: (id: string) => RevealItemInfo
  onClose: () => void
  /** Levar à Forja (armas/proteções) ou ao Laboratório (personagens). */
  onUse?: () => void
}) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState<Stage>(reduce ? "summary" : "sky")
  /** Cartas abertas (índice do giro): cada uma abre quando a estrela dela acende. */
  const [open, setOpen] = useState<Set<number>>(() => new Set())
  const [allOpen, setAllOpen] = useState(false)
  const [video, setVideo] = useState<"off" | "loading" | "playing">(() => (reduce ? "off" : clipFor(pull.banner, pull.best) ? "loading" : "off"))
  const timers = useRef<number[]>([])
  const vref = useRef<HTMLVideoElement | null>(null)
  const cref = useRef<HTMLCanvasElement | null>(null)
  const best = pull.results.reduce((b, r) => (TIER_ORDER.indexOf(r.tier) > TIER_ORDER.indexOf(b.tier) ? r : b), pull.results[0])
  /** Celular em pé: 4 estrelas por fileira (5 não cabem). Lido uma vez: a abertura dura segundos. */
  const [tallBox] = useState(() => typeof window !== "undefined" && window.innerHeight > window.innerWidth)
  const slots = skySlots(pull.results.length, tallBox)

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const toSummary = useCallback(() => {
    clear()
    vref.current?.pause()
    setVideo("off")
    setStage("summary")
  }, [])

  /** Todas abertas: um tempo para ver o céu e segue ao resumo (ou "Ver resumo"). */
  const finish = useCallback(() => {
    setAllOpen(true)
    later(2600, () => setStage("summary"))
  }, [])

  /** Vídeo: as cartas abrem no revealAt, nos lugares das estrelas. */
  const dealCards = useCallback(() => {
    uiSound("reward")
    pull.results.forEach((_, i) => later(i * 120, () => setOpen((o) => new Set(o).add(i))))
    later(pull.results.length * 120, finish)
    if (best.tier === "top") later(200, () => uiSound("levelUp"))
  }, [pull.results, best.tier, finish])

  const skyOn = stage === "sky" && video === "off" && !reduce
  // a fonte e o céu (sem vídeo, ou o vídeo falhou)
  useEffect(() => {
    const canvas = cref.current
    if (!skyOn || !canvas) return
    let rewarded = false
    const sky = new GachaSky(
      canvas,
      pull.results.map((r, i) => ({ ...slots[i], color: tierColor(r), big: r === best && r.tier !== "common", top: r.tier === "top" })),
      {
        launch: () => uiSound("gate"),
        star: (i) => {
          if (!rewarded) {
            rewarded = true
            uiSound("reward")
          }
          if (pull.results[i].tier === "top") uiSound("levelUp")
          later(220, () => setOpen((o) => new Set(o).add(i)))
        },
        all: () => later(400, finish),
      },
    )
    const onResize = () => sky.resize()
    window.addEventListener("resize", onResize)
    sky.start()
    return () => {
      sky.stop()
      window.removeEventListener("resize", onResize)
      clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez por tentativa (o recibo não muda)
  }, [skyOn])

  // vídeo opcional: espera começar; demorou ou falhou → fonte
  useEffect(() => {
    if (video !== "loading") return
    const id = window.setTimeout(() => setVideo("off"), GACHA_MEDIA_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [video])

  // aba escondida: não anima no fundo; vai ao resumo
  useEffect(() => {
    const onVis = () => document.hidden && toSummary()
    document.addEventListener("visibilitychange", onVis)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      clear()
    }
  }, [toSummary])

  const clip = clipFor(pull.banner, pull.best)
  const tall = typeof window !== "undefined" && window.innerHeight > window.innerWidth
  const src = clip ? sourceOf(clip, tall) : null

  return (
    <div className={`${archivo.className} fixed inset-0 z-[97] flex items-center justify-center p-3`} style={{ background: "rgba(6,7,10,.92)" }} role="dialog" aria-modal="true" aria-label={t("gaRevealAria", "Abertura da Convocação")}>
      {stage !== "summary" && (
        <button
          type="button"
          onClick={toSummary}
          className={`${teko.className} absolute right-3 top-3 z-10 flex items-center gap-1 px-3 py-1.5 text-[18px] uppercase tracking-[0.1em]`}
          style={{ background: AE.steel, color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}, 3px 3px 0 #000` }}
        >
          <FastForward className="h-4 w-4" /> {t("gaSkip", "Pular")}
        </button>
      )}

      {stage === "sky" && (
        <div className="relative h-[min(100dvh,720px)] w-full max-w-[960px] overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 110%, #0d2a44 0%, #070b16 55%, #04050a 100%)" }}>
          {/* vídeo opcional (o Alex manda depois): só a abertura; o resultado é sempre o overlay */}
          {clip && src && video !== "off" ? (
            <video
              ref={vref}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted={false}
              autoPlay
              poster={clip.poster}
              onPlaying={() => setVideo("playing")}
              onError={() => setVideo("off")}
              onTimeUpdate={(e) => {
                if (open.size === 0 && e.currentTarget.currentTime >= clip.revealAt) dealCards()
              }}
              onEnded={toSummary}
            >
              {src.webm && <source src={src.webm} type="video/webm" />}
              {src.mp4 && <source src={src.mp4} type="video/mp4" />}
            </video>
          ) : (
            <canvas ref={cref} className="absolute inset-0 h-full w-full" aria-hidden />
          )}
          {open.size === 0 && (
            <span className={`${teko.className} absolute inset-x-0 top-[40%] text-center text-[24px] uppercase tracking-[0.2em]`} style={{ color: "#BFE8FF", textShadow: "0 0 12px #3fa9ff" }}>
              {t("gaCalling", "Convocando…")}
            </span>
          )}
          {/* as cartas, cada uma em cima da sua estrela */}
          {pull.results.map((r, i) =>
            open.has(i) ? (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slots[i].x * 100}%`, top: `${slots[i].y * 100}%` }}>
                <FragmentCard t={t} r={r} info={info(r.item)} big={pull.results.length === 1} tall={tallBox} best={r === best && r.tier !== "common"} />
              </div>
            ) : null,
          )}
          {allOpen && (
            <button
              type="button"
              onClick={toSummary}
              className={`${teko.className} absolute bottom-[4%] left-1/2 -translate-x-1/2 px-4 py-1.5 text-[18px] uppercase`}
              style={{ background: AE.goldPlate, color: "#1a1200", boxShadow: "3px 3px 0 #000" }}
            >
              {t("gaSeeSummary", "Ver resumo")}
            </button>
          )}
        </div>
      )}

      {/* 4: o resumo — a lista inteira, nada escondido atrás da melhor carta */}
      {stage === "summary" && <Summary t={t} pull={pull} info={info} onClose={onClose} onUse={onUse} />}
    </div>
  )
}

const TIER_LABEL: Record<GachaTier, string> = { common: "Comum", rare: "Raro", epic: "Épico", top: "Topo" }

function FragmentCard({ t, r, info, big, best, tall = false }: { t: Tr; r: GachaResult; info: RevealItemInfo; big: boolean; best: boolean; tall?: boolean }) {
  const color = tierColor(r)
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.2, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1.2] }}
      className={`relative flex flex-col items-center p-1.5 ${big ? "w-[200px]" : tall ? "w-[min(20vw,96px)]" : "w-[min(15vw,104px)]"}`}
      style={{ background: AE.steel, boxShadow: `inset 0 0 0 ${best ? 2 : 1}px ${color}, 0 0 ${best ? 22 : 8}px ${color}55, 3px 3px 0 #000` }}
    >
      <div className="relative aspect-square w-full" style={{ background: AE.well }}>
        <ItemImage src={info.thumb} category="material" rarity={(r.rank as Rank) || TIER_RANK[r.tier]} alt="" fill fit="cover" />
        <span className={`${teko.className} absolute bottom-0 right-0 px-1 text-[18px] leading-tight`} style={{ background: "#000a", color }}>×{r.qty}</span>
      </div>
      <span className="mt-1 line-clamp-2 text-center text-[11px] leading-tight" style={{ color: AE.goldSoft }}>{info.name}</span>
      <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color }}>{t("gaFragment", "Fragmento")}</span>
    </motion.div>
  )
}

function Summary({ t, pull, info, onClose, onUse }: { t: Tr; pull: GachaPullResult; info: (id: string) => RevealItemInfo; onClose: () => void; onUse?: () => void }) {
  // junta os iguais (o lote pode repetir fragmento)
  const rows: { r: GachaResult; qty: number; n: number }[] = []
  for (const r of pull.results) {
    const row = rows.find((x) => x.r.item === r.item)
    if (row) {
      row.qty += r.qty
      row.n++
      if (TIER_ORDER.indexOf(r.tier) > TIER_ORDER.indexOf(row.r.tier)) row.r = r
    } else rows.push({ r, qty: r.qty, n: 1 })
  }
  rows.sort((a, b) => TIER_ORDER.indexOf(b.r.tier) - TIER_ORDER.indexOf(a.r.tier))
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative max-h-[92dvh] w-full max-w-[560px] overflow-y-auto p-4" style={{ background: AE.iron, boxShadow: `inset 0 0 0 1px ${AE.brassLine}, 5px 5px 0 #000` }}>
      <div className="flex items-center justify-between">
        <h2 className={`${teko.className} text-[28px] uppercase tracking-[0.08em]`} style={{ color: AE.gold }}>
          {t("gaSummaryTitle", "Fragmentos recebidos")}
        </h2>
        <button type="button" onClick={onClose} aria-label={t("chClose", "Fechar")} className="p-2" style={{ color: AE.goldSoft }}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-[12px]" style={{ color: "#9AA3AE" }}>
        {t("gaSummarySub", "{n} giro(s) · {c} Faísca(s) de Éter · todo prêmio é fragmento").replace("{n}", String(pull.times)).replace("{c}", String(pull.cost))}
      </p>
      <ul className="mt-3 space-y-1.5">
        {rows.map(({ r, qty, n }) => {
          const i = info(r.item)
          const color = tierColor(r)
          return (
            <li key={r.item} className="flex items-center gap-2 p-1.5" style={{ background: AE.steel, boxShadow: `inset 3px 0 0 ${color}` }}>
              <div className="relative h-11 w-11 shrink-0" style={{ background: AE.well }}>
                <ItemImage src={i.thumb} category="material" rarity={(r.rank as Rank) || TIER_RANK[r.tier]} alt="" fill fit="cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px]" style={{ color: AE.goldSoft }}>{i.name}</div>
                <div className="text-[11px]" style={{ color: "#9AA3AE" }}>
                  {t(`gaTier_${r.tier}`, TIER_LABEL[r.tier])}
                  {n > 1 ? ` · ${t("gaTimes", "{n}×").replace("{n}", String(n))}` : ""}
                  {r.featured ? ` · ${t("gaFeatured", "alvo")}` : ""}
                  {i.need ? ` · ${t("gaProgress", "{have}/{need} para usar").replace("{have}", String(i.have)).replace("{need}", String(i.need))}` : ""}
                </div>
              </div>
              {r.rank && <RankSeal rank={r.rank as Rank} t={t} size="sm" />}
              <span className={`${teko.className} w-12 text-right text-[22px]`} style={{ color }}>+{qty}</span>
            </li>
          )
        })}
      </ul>
      {pull.banner === "characters" && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px]" style={{ color: "#9AA3AE" }}>
          <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("gaCharHowTo", "Com 100 fragmentos, fabrique a Cápsula na Forja e use no Laboratório de Criogenia, no centro.")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onUse && (
          <button type="button" onClick={onUse} className={`${teko.className} flex items-center gap-1 px-3 py-1.5 text-[18px] uppercase`} style={{ background: AE.brassPlate, color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}, 3px 3px 0 #000` }}>
            <Hammer className="h-4 w-4" />
            {t("gaUseForge", "Ir à Forja")}
          </button>
        )}
        <button type="button" onClick={onClose} className={`${teko.className} px-4 py-1.5 text-[18px] uppercase`} style={{ background: AE.goldPlate, color: "#1a1200", boxShadow: "3px 3px 0 #000" }}>
          {t("gaOk", "Continuar")}
        </button>
      </div>
    </motion.div>
  )
}
