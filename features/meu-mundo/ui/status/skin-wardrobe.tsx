"use client"

// features/meu-mundo/ui/status/skin-wardrobe.tsx — o VESTUÁRIO (mm3d-16):
// abre pelo botão SKIN embaixo da foto do STATUS.
//
// Tela cheia com o palco de cada personagem ao fundo (o padrão no palco do
// Meu Mundo; o Sergio no Coliseu da Casa Views) e o personagem em 3D no
// pedestal (engine/skin-stage.ts). Setas trocam de personagem; arrastar gira.
// Skin que a pessoa não tem aparece como HOLOGRAMA rosa com ADQUIRIR embaixo
// (de graça para administrador); adquiriu, ela se materializa e o botão
// vira USAR. O personagem padrão é de todos e não tem holograma: o corpo
// dele é a CONDIÇÃO física de agora (magro, normal, gordo, forte) — isso não
// é skin e não se escolhe aqui.

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Coins, Shirt, Sparkles, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getSkins, getWallets, postSkinBuy, postSkinEquip } from "../../data"
import { SKINS, type SkinArt } from "../../skins"
import type { BodyId, WardrobeResult } from "../../types"
import { SkinStage } from "../../engine/skin-stage"
import { EvoButton, EvoToast } from "../hud/hud-kit"
import { PolenIcon } from "@/components/polens/polen-icon"
import { Chamfer, EVO, archivo, teko } from "./evo-skin"
import { MM } from "../hud/tokens"

type Tr = (key: string, fallback: string) => string

export interface SkinWardrobeProps {
  t: Tr
  onClose: () => void
  /** Vestiu outra coisa (ou comprou): o STATUS atualiza retrato e moedas. */
  onChanged: (r: WardrobeResult) => void
}

function conditionName(b: BodyId, t: Tr) {
  return { normal: t("bodyNormal", "Normal"), slim: t("bodySlim", "Magro"), fat: t("bodyFat", "Gordo"), strong: t("bodyStrong", "Forte"), sergio: "Sergio", female: t("bodyFemale", "Feminina"), ekaterina: "Ekaterina" }[b]
}

export default function SkinWardrobe({ t, onClose, onChanged }: SkinWardrobeProps) {
  const [data, setData] = useState<WardrobeResult | null>(null)
  // Poléns (mm3d-30): saldo da carteira oficial para a skin exclusiva; null = indisponível.
  const [polens, setPolens] = useState<number | null>(null)
  // Exclusiva de Poléns pede dois toques (dinheiro de verdade): este guarda o id confirmando.
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getWallets(token).then((r) => alive && r.ok && setPolens(r.data.wallet.polens))
    return () => {
      alive = false
    }
  }, [])
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
    if (entry.currency === "polens" && confirming !== entry.id) {
      setConfirming(entry.id)
      return
    }
    setConfirming(null)
    setBusy(true)
    const r = await postSkinBuy(token, entry.id)
    if (!r.ok) {
      say(
        r.code === "coins"
          ? t("skinNoCoins", "Moedas insuficientes")
          : r.code === "polens"
            ? t("skinNoPolens", "Poléns insuficientes")
            : r.error || t("stActionFail", "Não deu certo agora"),
      )
      setBusy(false)
      return
    }
    if (r.data.wallet.polens != null) setPolens(r.data.wallet.polens)
    // A linha sobe pelo holograma e ele vira o personagem; só então a tela
    // passa a dizer que é seu (senão o palco recarregaria o corpo no meio).
    materializing.current = true
    await stageRef.current?.materialize()
    shown.current = `${art.id}|${body}|1`
    materializing.current = false
    setData(r.data)
    onChanged(r.data)
    say(t("skinAcquired", "Adquirido! Agora é só usar."))
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
      say(id === "standard" ? t("skinBackStandard", "De volta ao personagem padrão") : t("skinInUseNow", "Skin em uso"))
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
        <EvoButton variant="ghost" size="lg" disabled icon={<Shirt className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" />}>
          {t("skinInUse", "Em uso")}
        </EvoButton>
      )
    else if (owned)
      action = (
        <EvoButton variant="primary" size="lg" disabled={busy} onClick={() => void equip(entry.id)} icon={<Shirt className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" />}>
          {t("skinUse", "Usar")}
        </EvoButton>
      )
    else if (entry.currency === "polens") {
      // Exclusiva de Poléns: nunca com moedas; confirmação mostra o saldo depois.
      const short = polens === null ? null : Math.max(0, entry.cost - polens)
      action = (
        <EvoButton
          variant={confirming === entry.id ? "primary" : "gold"}
          size="lg"
          disabled={busy || polens === null || (short ?? 0) > 0}
          onClick={() => void buy()}
          icon={<PolenIcon className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" />}
        >
          {polens === null
            ? t("skinPolensOff", "Saldo de Poléns indisponível")
            : (short ?? 0) > 0
              ? t("skinPolensShort", "Faltam {n} Poléns").replace("{n}", String(short))
              : confirming === entry.id
                ? t("skinPolensConfirm", "Confirmar · {n} Poléns (fica {left})").replace("{n}", String(entry.cost)).replace("{left}", String(polens - entry.cost))
                : t("skinAcquirePrice", "Adquirir · {price}").replace("{price}", t("stPolens", "{n} Poléns").replace("{n}", String(entry.cost)))}
        </EvoButton>
      )
    } else
      action = (
        <EvoButton variant="gold" size="lg" disabled={busy || coins < entry.cost} onClick={() => void buy()} icon={<Sparkles className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" />}>
          {entry.cost > 0
            ? t("skinAcquirePrice", "Adquirir · {price}").replace("{price}", coinsText(entry.cost))
            : data.wardrobe.admin
              ? t("skinAcquireAdmin", "Adquirir · grátis (admin)")
              : t("skinAcquire", "Adquirir")}
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
        <div className={`${teko.className} text-[34px] font-bold uppercase leading-none tracking-[0.18em] sm:text-[44px] max-[759px]:text-[22px]`} style={{ color: EVO.branco, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
          {t("skinTitle", "Vestuário")}
        </div>
        <Chamfer cut={10} fill={MM.surface} border={MM.goldBorder} className="pointer-events-auto">
          <div className={`${teko.className} flex items-center gap-2 px-3 pb-1 pt-2 text-[22px] font-semibold uppercase leading-none max-[759px]:gap-1.5 max-[759px]:px-2 max-[759px]:pb-0.5 max-[759px]:pt-1.5 max-[759px]:text-[16px]`} style={{ color: EVO.douradoClaro }}>
            <Coins className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" /> {coinsText(coins)}
          </div>
        </Chamfer>
      </div>

      {/* setas */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={t("skinPrev", "Personagem anterior")}
        className="absolute left-2 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center sm:left-6 max-[759px]:h-11 max-[759px]:w-11"
        style={{ color: EVO.branco, borderRadius: 999, background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
      >
        <ChevronLeft className="h-7 w-7 max-[759px]:h-6 max-[759px]:w-6" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={t("skinNext", "Próximo personagem")}
        className="absolute right-2 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center sm:right-6 max-[759px]:h-11 max-[759px]:w-11"
        style={{ color: EVO.branco, borderRadius: 999, background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
      >
        <ChevronRight className="h-7 w-7 max-[759px]:h-6 max-[759px]:w-6" strokeWidth={2} />
      </button>

      {/* ficha do personagem */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Chamfer cut={18} fill={MM.surface} className="w-full max-w-[640px]" style={{ boxShadow: MM.shadow }}>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between max-[759px]:gap-2 max-[759px]:p-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`${archivo.className} px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.12em] max-[759px]:px-2 max-[759px]:text-[10px]`}
                  style={{ borderRadius: 999, background: art.body === null ? "rgba(229,190,112,0.16)" : MM.rubyFill, color: art.body === null ? EVO.douradoClaro : EVO.branco, border: `1px solid ${art.body === null ? MM.goldBorder : MM.rubyBorder}` }}
                >
                  {art.body === null ? t("skinKindStandard", "Padrão") : t("skinKindSkin", "Skin")}
                </span>
                {art.body === null && (
                  <span className={`${teko.className} text-[17px] uppercase tracking-[0.14em] max-[759px]:text-[13px]`} style={{ color: EVO.douradoClaro }}>
                    {t("skinCondition", "Condição: {c}").replace("{c}", conditionName(condition, t))}
                  </span>
                )}
                {!owned && (
                  <span className={`${teko.className} text-[17px] uppercase tracking-[0.14em] max-[759px]:text-[13px]`} style={{ color: EVO.rosaClaro }}>
                    {t("skinHologram", "Holograma · ainda não é seu")}
                  </span>
                )}
                {entry?.currency === "polens" && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold text-amber-200 max-[759px]:text-[11px]" style={{ background: "rgba(229,190,112,0.14)", border: `1px solid ${MM.goldBorder}` }}>
                    <PolenIcon className="h-3.5 w-3.5" /> {t("skinPolensOnly", "Exclusivo Poléns")}
                  </span>
                )}
              </div>
              <div className={`${teko.className} mt-1 truncate text-[40px] font-bold uppercase leading-none max-[759px]:mt-0.5 max-[759px]:text-[24px]`} style={{ color: EVO.branco }}>
                {name}
              </div>
              <p className="mt-1 text-[14px] leading-snug max-[759px]:mt-0.5 max-[759px]:text-[12px]" style={{ color: EVO.mudo }}>
                {t(art.taglineKey, art.taglineFallback)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 max-[759px]:mt-1.5">
                {SKINS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={t(s.labelKey, s.fallback)}
                    onClick={() => !materializing.current && setIdx(i)}
                    className="block"
                    style={
                      i === idx
                        ? { width: 26, height: 8, borderRadius: 999, background: MM.ruby }
                        : { width: 8, height: 8, borderRadius: 999, background: `${EVO.branco}55` }
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {failed ? (
                <span className={`${teko.className} text-[20px] uppercase max-[759px]:text-[15px]`} style={{ color: EVO.perigo }}>
                  {t("skinListFail", "Não carregou o vestuário")}
                </span>
              ) : (
                action
              )}
              <EvoButton variant="gold" size="lg" onClick={onClose} icon={<X className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4" />} kbd="ESC">
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
