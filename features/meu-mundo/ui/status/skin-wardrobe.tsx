"use client"

// features/meu-mundo/ui/status/skin-wardrobe.tsx — o VESTUÁRIO (mm3d-16):
// abre pelo botão SKIN embaixo da foto do STATUS.
//
// Tela cheia com o palco de cada personagem ao fundo (o padrão no palco do
// Meu Mundo; o Sergio no Coliseu da Casa Views) e o personagem em 3D no
// pedestal (engine/skin-stage.ts). Setas trocam de personagem; arrastar gira.
// Skin que a pessoa não tem aparece como HOLOGRAMA; comprou, ela se
// materializa. O personagem padrão é de todos e não tem holograma: o corpo
// dele é a CONDIÇÃO física de agora (magro, normal, gordo, forte) — isso não
// é skin e não se escolhe aqui.

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Coins, Shirt, Sparkles, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getSkins, postSkinBuy, postSkinEquip } from "../../data"
import { SKINS, type SkinArt } from "../../skins"
import type { BodyId, WardrobeResult } from "../../types"
import { SkinStage } from "../../engine/skin-stage"
import { EvoButton, EvoToast } from "../hud/hud-kit"
import { Chamfer, EVO, archivo, chamfer, teko } from "./evo-skin"

type Tr = (key: string, fallback: string) => string

export interface SkinWardrobeProps {
  t: Tr
  onClose: () => void
  /** Vestiu outra coisa (ou comprou): o STATUS atualiza retrato e moedas. */
  onChanged: (r: WardrobeResult) => void
}

function conditionName(b: BodyId, t: Tr) {
  return { normal: t("bodyNormal", "Normal"), slim: t("bodySlim", "Magro"), fat: t("bodyFat", "Gordo"), strong: t("bodyStrong", "Forte"), sergio: "Sergio" }[b]
}

export default function SkinWardrobe({ t, onClose, onChanged }: SkinWardrobeProps) {
  const [data, setData] = useState<WardrobeResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<SkinStage | null>(null)
  const picked = useRef(false)

  const say = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2600)
  }, [])

  // ── dados ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getSkins(token).then((r) => {
      if (!alive) return
      if (!r.ok) return setFailed(true)
      setData(r.data)
      if (!picked.current) {
        picked.current = true
        const on = r.data.wardrobe.skins.find((s) => s.equipped)?.id
        const i = SKINS.findIndex((s) => s.id === on)
        if (i >= 0) setIdx(i)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // ── palco 3D ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const stage = new SkinStage(canvas, reduced)
    stageRef.current = stage
    return () => {
      stageRef.current = null
      stage.dispose()
    }
  }, [])

  const art: SkinArt = SKINS[idx]
  const entry = data?.wardrobe.skins.find((s) => s.id === art.id) ?? null
  const condition = data?.wardrobe.condition ?? "normal"
  const owned = art.body === null || !!entry?.owned
  const body: BodyId = art.body ?? condition
  // Mostra de novo só quando muda o corpo ou a posse (não a cada moeda).
  const showKey = data ? `${art.id}|${body}|${owned ? 1 : 0}` : ""
  const materializing = useRef(false)
  const shown = useRef("")
  useEffect(() => {
    if (!showKey || materializing.current || shown.current === showKey) return
    shown.current = showKey
    void stageRef.current?.show({ body, holo: !owned, color: art.holo.color, accent: art.holo.accent }).catch(() => say(t("skinLoadFail", "O personagem não carregou")))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showKey resume corpo e posse
  }, [showKey])

  const go = useCallback((d: number) => {
    if (materializing.current) return
    setIdx((i) => (i + d + SKINS.length) % SKINS.length)
  }, [])

  // ── teclado (por cima do STATUS: ESC fecha só o vestuário) ──────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      let handled = true
      if (k === "Escape") onClose()
      else if (k === "ArrowLeft" || k === "a" || k === "A") go(-1)
      else if (k === "ArrowRight" || k === "d" || k === "D") go(1)
      else handled = false
      if (handled) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [go, onClose])

  // ── ações ────────────────────────────────────────────────────────────────
  const buy = async () => {
    const token = getToken()
    if (!token || busy || !entry) return
    setBusy(true)
    const r = await postSkinBuy(token, entry.id)
    if (!r.ok) {
      say(r.code === "coins" ? t("skinNoCoins", "Moedas insuficientes") : r.error || t("stActionFail", "Não deu certo agora"))
      setBusy(false)
      return
    }
    // A linha sobe pelo holograma e ele vira o personagem; só então a tela
    // passa a dizer que é seu (senão o palco recarregaria o corpo no meio).
    materializing.current = true
    await stageRef.current?.materialize()
    shown.current = `${art.id}|${body}|1`
    materializing.current = false
    setData(r.data)
    onChanged(r.data)
    say(t("skinBought", "É seu! Agora é só vestir."))
    setBusy(false)
  }

  const equip = async (id: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await postSkinEquip(token, id)
    if (!r.ok) say(r.error || t("stActionFail", "Não deu certo agora"))
    else {
      setData(r.data)
      onChanged(r.data)
      say(id === "standard" ? t("skinBackStandard", "De volta ao personagem padrão") : t("skinEquipped", "Skin vestida"))
    }
    setBusy(false)
  }

  const coins = data?.wallet.coins ?? 0
  const name = t(art.labelKey, art.fallback)
  const coinsText = (n: number) => t("stCoins", "{n} moedas").replace("{n}", n.toLocaleString())

  let action: React.ReactNode = null
  if (data && entry) {
    if (entry.equipped)
      action = (
        <EvoButton variant="ghost" size="lg" disabled icon={<Shirt className="h-5 w-5" />}>
          {t("skinWearing", "Vestindo")}
        </EvoButton>
      )
    else if (owned)
      action = (
        <EvoButton variant="primary" size="lg" disabled={busy} onClick={() => void equip(entry.id)} icon={<Shirt className="h-5 w-5" />}>
          {art.body === null ? t("skinWearStandard", "Usar o padrão") : t("skinWear", "Vestir")}
        </EvoButton>
      )
    else
      action = (
        <EvoButton variant="gold" size="lg" disabled={busy || coins < entry.price} onClick={() => void buy()} icon={<Sparkles className="h-5 w-5" />}>
          {t("skinBuy", "Comprar · {price}").replace("{price}", coinsText(entry.price))}
        </EvoButton>
      )
  }

  return (
    <div className={`${archivo.className} fixed inset-0 z-[95] select-none overflow-hidden bg-black`}>
      {/* palco: imagem estática + canvas transparente com o personagem */}
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local do jogo (admin), troca por personagem */}
      <img
        key={art.stage.src}
        src={art.stage.src}
        srcSet={`${art.stage.small} 1024w, ${art.stage.src} 1672w`}
        sizes="100vw"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "grab" }} aria-label={name} />

      {/* topo: título e moedas */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4"
        style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}
      >
        <div className={`${teko.className} text-[34px] font-bold uppercase leading-none tracking-[0.18em] sm:text-[44px]`} style={{ color: EVO.branco, textShadow: `0 0 18px ${EVO.magenta}` }}>
          {t("skinTitle", "Vestuário")}
        </div>
        <Chamfer cut={10} border={`${EVO.dourado}aa`} className="pointer-events-auto">
          <div className={`${teko.className} flex items-center gap-2 px-3 pb-1 pt-2 text-[22px] font-semibold uppercase leading-none`} style={{ color: EVO.douradoClaro }}>
            <Coins className="h-5 w-5" /> {coinsText(coins)}
          </div>
        </Chamfer>
      </div>

      {/* setas */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={t("skinPrev", "Personagem anterior")}
        className="absolute left-1 top-1/2 flex h-24 w-14 -translate-y-1/2 items-center justify-center sm:left-6 sm:w-20"
        style={{ color: EVO.branco, filter: `drop-shadow(0 0 10px ${EVO.magenta})` }}
      >
        <ChevronLeft className="h-14 w-14 sm:h-20 sm:w-20" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={t("skinNext", "Próximo personagem")}
        className="absolute right-1 top-1/2 flex h-24 w-14 -translate-y-1/2 items-center justify-center sm:right-6 sm:w-20"
        style={{ color: EVO.branco, filter: `drop-shadow(0 0 10px ${EVO.magenta})` }}
      >
        <ChevronRight className="h-14 w-14 sm:h-20 sm:w-20" strokeWidth={2.4} />
      </button>

      {/* ficha do personagem */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Chamfer cut={18} border={`linear-gradient(135deg, ${EVO.magenta}, ${EVO.ritual} 55%, ${EVO.magenta})`} width={2} className="w-full max-w-[640px]">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`${teko.className} px-2 pb-0.5 pt-1 text-[15px] font-semibold uppercase leading-none tracking-[0.18em]`}
                  style={{ clipPath: chamfer(6), background: art.body === null ? EVO.douradoClaro : EVO.magenta, color: art.body === null ? EVO.preto : EVO.branco }}
                >
                  {art.body === null ? t("skinKindStandard", "Padrão") : t("skinKindSkin", "Skin")}
                </span>
                {art.body === null && (
                  <span className={`${teko.className} text-[17px] uppercase tracking-[0.14em]`} style={{ color: EVO.douradoClaro }}>
                    {t("skinCondition", "Condição: {c}").replace("{c}", conditionName(condition, t))}
                  </span>
                )}
                {!owned && (
                  <span className={`${teko.className} text-[17px] uppercase tracking-[0.14em]`} style={{ color: EVO.rosaClaro }}>
                    {t("skinHologram", "Holograma · ainda não é seu")}
                  </span>
                )}
              </div>
              <div className={`${teko.className} mt-1 truncate text-[40px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {name}
              </div>
              <p className="mt-1 text-[14px] leading-snug" style={{ color: EVO.mudo }}>
                {t(art.taglineKey, art.taglineFallback)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                {SKINS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={t(s.labelKey, s.fallback)}
                    onClick={() => !materializing.current && setIdx(i)}
                    className="block"
                    style={
                      i === idx
                        ? { width: 26, height: 12, border: `2px solid ${EVO.magenta}`, boxShadow: `0 0 8px ${EVO.magenta}` }
                        : { width: 8, height: 8, background: `${EVO.branco}55` }
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {failed ? (
                <span className={`${teko.className} text-[20px] uppercase`} style={{ color: EVO.perigo }}>
                  {t("skinListFail", "Não carregou o vestuário")}
                </span>
              ) : (
                action
              )}
              <EvoButton variant="ghost" size="lg" onClick={onClose} icon={<X className="h-5 w-5" />} kbd="ESC">
                {t("stBack", "Voltar")}
              </EvoButton>
            </div>
          </div>
        </Chamfer>
      </div>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[96] flex justify-center px-4">
          <EvoToast>{notice}</EvoToast>
        </div>
      )}
    </div>
  )
}
