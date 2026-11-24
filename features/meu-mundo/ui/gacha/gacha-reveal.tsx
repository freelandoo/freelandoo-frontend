"use client"

// features/meu-mundo/ui/gacha/gacha-reveal.tsx — gacha-v1 (24/11/2026): a ABERTURA das Convocações.
//
// Só desenha o que o SERVIDOR já gravou (o recibo chega antes de abrir): a animação não sorteia, não muda a
// garantia e terminar/pular não entrega nada de novo. Cinco tempos:
//   1. portal — o anel de éter carrega (dourado, a faixa ainda escondida);
//   2. sinal  — o anel ganha a COR da melhor faixa do lote (a classe do jogo, não estrelas);
//   3. cartas — cada giro vira uma carta de FRAGMENTO, na ordem; a melhor brilha mais;
//   4. resumo — a lista inteira: fragmento, classe, quantidade, saldo e quanto falta para usar.
// Pular vai direto ao resumo. Movimento reduzido = resumo com um fade. Aba escondida = resumo.
// Vídeo opcional (gacha-media.ts): se o clipe existir e tocar, as cartas abrem no `revealAt`; qualquer falha
// cai na animação. Nada é do tamanho da janela (o véu é parado; só o anel e as cartas mexem).

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { FastForward, Hammer, Snowflake, X } from "lucide-react"
import type { GachaPullResult, GachaResult, GachaTier } from "../../data"
import { uiSound } from "../../engine/audio/ui-sound"
import { AE, RANK, type Rank } from "../kit/aether-tokens"
import { ItemImage } from "../kit/item-image"
import { RankSeal } from "../kit/rank-seal"
import { archivo, teko } from "../status/evo-skin"
import { clipFor, GACHA_MEDIA_TIMEOUT_MS, sourceOf } from "./gacha-media"

type Tr = (key: string, fallback: string) => string
type Stage = "portal" | "signal" | "cards" | "summary"

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
  const [stage, setStage] = useState<Stage>(reduce ? "summary" : "portal")
  const [shown, setShown] = useState(reduce ? pull.results.length : 0)
  const [video, setVideo] = useState<"off" | "loading" | "playing">(() => (reduce ? "off" : clipFor(pull.banner, pull.best) ? "loading" : "off"))
  const timers = useRef<number[]>([])
  const vref = useRef<HTMLVideoElement | null>(null)
  const best = pull.results.reduce((b, r) => (TIER_ORDER.indexOf(r.tier) > TIER_ORDER.indexOf(b.tier) ? r : b), pull.results[0])
  const bestColor = tierColor(best)

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const toSummary = useCallback(() => {
    clear()
    vref.current?.pause()
    setVideo("off")
    setShown(pull.results.length)
    setStage("summary")
  }, [pull.results.length])

  /** As cartas, uma por uma (o lote de 10 leva ~1,5 s). */
  const dealCards = useCallback(() => {
    setStage("cards")
    uiSound("reward")
    const step = pull.results.length > 1 ? 150 : 0
    pull.results.forEach((_, i) => later(i * step, () => setShown(i + 1)))
    later(pull.results.length * step + 900, () => setStage("summary"))
    if (best.tier === "top") later(200, () => uiSound("levelUp"))
  }, [pull.results, best.tier])

  // animação do jogo (sem vídeo, ou o vídeo falhou)
  useEffect(() => {
    if (reduce || video !== "off" || stage !== "portal") return
    uiSound("gate")
    later(1100, () => setStage("signal"))
    later(1800, dealCards)
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez por tentativa (video/stage mudam o caminho)
  }, [video])

  // vídeo opcional: espera começar; demorou ou falhou → animação
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

      {/* vídeo opcional (o Alex manda depois): só a abertura; o resultado é sempre o overlay */}
      {clip && src && video !== "off" && stage !== "summary" && (
        <video
          ref={vref}
          className="absolute inset-0 m-auto max-h-full max-w-full"
          playsInline
          muted={false}
          autoPlay
          poster={clip.poster}
          onPlaying={() => setVideo("playing")}
          onError={() => setVideo("off")}
          onTimeUpdate={(e) => {
            if (stage === "portal" && e.currentTarget.currentTime >= clip.revealAt) dealCards()
          }}
          onEnded={toSummary}
        >
          {src.webm && <source src={src.webm} type="video/webm" />}
          {src.mp4 && <source src={src.mp4} type="video/mp4" />}
        </video>
      )}

      {/* 1–2: o anel de éter (sem vídeo) */}
      <AnimatePresence>
        {video === "off" && (stage === "portal" || stage === "signal") && (
          <motion.div key="ring" className="relative flex h-[300px] w-[300px] items-center justify-center" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.25 }} transition={{ duration: 0.45 }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{ inset: i * 28, border: `2px solid ${stage === "signal" ? bestColor : AE.gold}`, boxShadow: `0 0 ${18 + i * 8}px ${stage === "signal" ? bestColor : AE.gold}66` }}
                animate={{ rotate: i % 2 ? -360 : 360, opacity: [0.5, 1, 0.5] }}
                transition={{ rotate: { duration: 3 - i * 0.6, repeat: Infinity, ease: "linear" }, opacity: { duration: 1.1, repeat: Infinity } }}
              />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <motion.span
                key={`s${i}`}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ background: stage === "signal" ? bestColor : AE.goldSoft }}
                initial={{ x: Math.cos((i / 12) * Math.PI * 2) * 150, y: Math.sin((i / 12) * Math.PI * 2) * 150, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
                transition={{ duration: 0.9, delay: (i % 6) * 0.12, repeat: Infinity }}
              />
            ))}
            <span className={`${teko.className} relative text-[26px] uppercase tracking-[0.2em]`} style={{ color: stage === "signal" ? bestColor : AE.goldSoft }}>
              {stage === "signal" ? t(`gaTier_${best.tier}`, TIER_LABEL[best.tier]) : t("gaCalling", "Convocando…")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3: as cartas */}
      {stage === "cards" && (
        <div className={`relative grid gap-2 ${pull.results.length > 1 ? "grid-cols-5" : "grid-cols-1"}`}>
          {pull.results.slice(0, shown).map((r, i) => (
            <FragmentCard key={i} t={t} r={r} info={info(r.item)} big={pull.results.length === 1} best={r === best && r.tier !== "common"} />
          ))}
        </div>
      )}

      {/* 4: o resumo — a lista inteira, nada escondido atrás da melhor carta */}
      {stage === "summary" && <Summary t={t} pull={pull} info={info} onClose={onClose} onUse={onUse} />}
    </div>
  )
}

const TIER_LABEL: Record<GachaTier, string> = { common: "Comum", rare: "Raro", epic: "Épico", top: "Topo" }

function FragmentCard({ t, r, info, big, best }: { t: Tr; r: GachaResult; info: RevealItemInfo; big: boolean; best: boolean }) {
  const color = tierColor(r)
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, rotateY: 90 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative flex flex-col items-center p-1.5 ${big ? "w-[220px]" : "w-[min(17vw,120px)]"}`}
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
