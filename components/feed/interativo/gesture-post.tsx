"use client"

// GESTO NO POST (Feed Interativo, 2026-11-15) — segurar, soltar, lançar, salvar.
//
//   segurar ~420 ms parado ........ o post SOLTA do feed (escala + inclinação + sombra dura)
//   continuar parado ~480 ms ...... abre a VITRINE de quem pode receber (avatares no topo)
//   arrastar ↑ e soltar ........... LANÇA para todos (ou para o avatar sob o dedo)
//   arrastar ↓ e soltar ........... SALVA (o post encolhe e entra na gaveta)
//   soltar no meio ................ volta para o lugar
//
// Não briga com a rolagem: se o dedo andar mais de 10 px antes dos 420 ms, é
// rolagem e nada acontece. Depois que soltou, um `touchmove` NÃO passivo segura
// a tela parada enquanto o post anda com o dedo. Botões, links e campos do card
// ficam fora do gesto (`button, a, input, …, [data-no-gesture]`).
//
// Só transform e opacity (regra 7). As peças fixas (vitrine, gaveta, dica) só
// existem enquanto o post está solto.

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { Archive, ArrowUp, Send } from "lucide-react"
import { fx, prefersReducedMotion } from "@/lib/feed-fx"
import { useTranslations } from "@/components/i18n/I18nProvider"

export interface ThrowTarget {
  id_user: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export type ThrowResult = { sent: number } | { error: string }

interface GesturePostProps {
  postId: string
  children: ReactNode
  /** Sem login não há gesto. */
  enabled: boolean
  targets: ThrowTarget[]
  onThrow?: (postId: string, to: "all" | string) => Promise<ThrowResult>
  onSave?: (postId: string) => Promise<"saved" | "already" | "error">
  /** Sem ninguém para receber: o que fazer ao tentar lançar (abrir o convite). */
  onNoTargets?: () => void
}

const PRESS_MS = 420
const TRAY_MS = 480
const SLOP_PX = 10
const ZONE_PX = 72
const FLICK_VY = -0.85 // px/ms para cima

type Phase = "idle" | "press" | "lift" | "flying"
type Zone = "none" | "up" | "down"

const INTERACTIVE = "button, a, input, textarea, select, label, video[controls], [role=button], [data-no-gesture]"

function GesturePostImpl({ postId, children, enabled, targets, onThrow, onSave, onNoTargets }: GesturePostProps) {
  const t = useTranslations("FeedFx")
  const ref = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)
  const scale = useMotionValue(1)
  const opacity = useMotionValue(1)
  const lift = useMotionValue(0) // 0..1 — sombra e contorno
  const shadowOpacity = useTransform(lift, [0, 1], [0, 1])
  const trail = useMotionValue(0)

  const [phase, setPhase] = useState<Phase>("idle")
  const [zone, setZone] = useState<Zone>("none")
  const [trayOpen, setTrayOpen] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const [stamp, setStamp] = useState<string | null>(null)

  const st = useRef({
    phase: "idle" as Phase,
    pid: -1,
    x0: 0,
    y0: 0,
    lastY: 0,
    lastT: 0,
    vy: 0,
    zone: "none" as Zone,
    hover: null as string | null,
    tray: false,
    pressTimer: 0 as ReturnType<typeof setTimeout> | 0,
    trayTimer: 0 as ReturnType<typeof setTimeout> | 0,
    suppressClick: false,
    rects: [] as { id: string; r: DOMRect }[],
  })
  const trayRef = useRef<HTMLDivElement | null>(null)
  const binRef = useRef<HTMLDivElement | null>(null)
  const propsRef = useRef({ targets, onThrow, onSave, onNoTargets })
  useEffect(() => {
    propsRef.current = { targets, onThrow, onSave, onNoTargets }
  })

  const setPhaseBoth = (p: Phase) => {
    st.current.phase = p
    setPhase(p)
    // A fila de chegadas espera o gesto terminar (use-feed-interativo).
    if (p === "idle") delete document.body.dataset.fxGesture
    else document.body.dataset.fxGesture = "1"
  }

  const clearTimers = () => {
    const s = st.current
    if (s.pressTimer) clearTimeout(s.pressTimer)
    if (s.trayTimer) clearTimeout(s.trayTimer)
    s.pressTimer = 0
    s.trayTimer = 0
  }

  const settle = useCallback(() => {
    const spring = { type: "spring" as const, stiffness: 520, damping: 34 }
    animate(x, 0, spring)
    animate(y, 0, spring)
    animate(rotate, 0, spring)
    animate(scale, 1, spring)
    animate(lift, 0, { duration: 0.18 })
  }, [x, y, rotate, scale, lift])

  const resetGesture = useCallback(() => {
    clearTimers()
    const s = st.current
    s.zone = "none"
    s.hover = null
    s.tray = false
    setZone("none")
    setHover(null)
    setTrayOpen(false)
  }, [])

  const showStamp = useCallback((text: string) => {
    setStamp(text)
    window.setTimeout(() => setStamp(null), 1400)
  }, [])

  /** O post volta da viagem: reaparece no lugar, sem pulo. */
  const comeBack = useCallback(async () => {
    x.set(0)
    y.set(0)
    rotate.set(0)
    scale.set(0.96)
    opacity.set(0)
    await Promise.all([
      animate(opacity, 1, { duration: 0.22 }),
      animate(scale, 1, { type: "spring", stiffness: 420, damping: 26 }),
    ])
  }, [x, y, rotate, scale, opacity])

  const doThrow = useCallback(
    async (to: "all" | string) => {
      const { targets: tg, onThrow: thr, onNoTargets: none } = propsRef.current
      if (!thr || tg.length === 0) {
        fx("erro", "erro")
        animate(x, [0, -12, 10, -6, 0], { duration: 0.32 })
        settle()
        setPhaseBoth("idle")
        none?.()
        return
      }
      setPhaseBoth("flying")
      fx(to === "all" ? "lancar" : "lancar-um", "lancar")
      const el = ref.current
      const rect = el?.getBoundingClientRect()
      const reduced = prefersReducedMotion()
      animate(lift, 0, { duration: 0.2 })
      if (reduced) {
        await animate(opacity, 0, { duration: 0.15 })
      } else {
        // Para onde vai: para cima (todos) ou na direção do avatar escolhido.
        let tx = x.get() * 1.4
        let ty = -((rect?.bottom ?? 600) + 120)
        if (to !== "all") {
          const hit = st.current.rects.find((r) => r.id === to)
          if (hit && rect) {
            tx = hit.r.left + hit.r.width / 2 - (rect.left + rect.width / 2)
            ty = hit.r.top + hit.r.height / 2 - (rect.top + rect.height / 2)
          }
        }
        trail.set(0)
        animate(trail, [0, 1, 0], { duration: 0.42, times: [0, 0.35, 1] })
        await Promise.all([
          animate(y, ty, { duration: 0.34, ease: [0.4, 0, 1, 1] }),
          animate(x, tx, { duration: 0.34, ease: [0.4, 0, 1, 1] }),
          animate(rotate, to === "all" ? -7 : 4, { duration: 0.34 }),
          animate(scale, to === "all" ? 0.82 : 0.18, { duration: 0.34, ease: [0.4, 0, 1, 1] }),
          animate(opacity, 0, { duration: 0.34, ease: [0.7, 0, 1, 1] }),
        ])
      }
      resetGesture()
      const res = await thr(postId, to).catch(() => ({ error: "network" }) as ThrowResult)
      await comeBack()
      setPhaseBoth("idle")
      if ("error" in res) {
        fx("erro", "erro")
        showStamp(t("throwFailed", "NÃO FOI"))
      } else {
        fx("carimbo")
        showStamp(t("thrownStamp", "LANÇADO · {n}").replace("{n}", String(res.sent)))
      }
    },
    [postId, x, y, rotate, scale, opacity, lift, trail, settle, resetGesture, comeBack, showStamp, t]
  )

  const doSave = useCallback(async () => {
    const save = propsRef.current.onSave
    if (!save) {
      settle()
      setPhaseBoth("idle")
      return
    }
    setPhaseBoth("flying")
    const el = ref.current
    const rect = el?.getBoundingClientRect()
    const bin = binRef.current?.getBoundingClientRect()
    animate(lift, 0, { duration: 0.15 })
    if (rect && bin && !prefersReducedMotion()) {
      const tx = bin.left + bin.width / 2 - (rect.left + rect.width / 2)
      const ty = bin.top + bin.height / 2 - (rect.top + rect.height / 2)
      await Promise.all([
        animate(x, tx, { duration: 0.32, ease: [0.55, 0, 0.1, 1] }),
        animate(y, ty, { duration: 0.32, ease: [0.55, 0, 0.1, 1] }),
        animate(scale, 0.08, { duration: 0.32, ease: [0.55, 0, 0.1, 1] }),
        animate(rotate, 0, { duration: 0.2 }),
        animate(opacity, 0, { duration: 0.32, ease: [0.8, 0, 1, 1] }),
      ])
    } else {
      await animate(opacity, 0, { duration: 0.15 })
    }
    fx("salvar", "salvar")
    // A gaveta "engole": pulso na gaveta antes de sumir.
    if (binRef.current) {
      await animate(binRef.current, { scale: [1, 1.18, 0.94, 1] }, { duration: 0.32 })
    }
    const res = await save(postId).catch(() => "error" as const)
    resetGesture()
    await comeBack()
    setPhaseBoth("idle")
    if (res === "error") {
      fx("erro", "erro")
      showStamp(t("saveFailed", "NÃO SALVOU"))
    } else {
      showStamp(res === "already" ? t("alreadySaved", "JÁ ESTAVA SALVO") : t("savedStamp", "SALVO"))
    }
  }, [postId, x, y, scale, rotate, opacity, lift, settle, resetGesture, comeBack, showStamp, t])

  // ── Ponteiro ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    // Segura a tela parada só enquanto o post está solto.
    const onTouchMove = (e: TouchEvent) => {
      if (st.current.phase === "lift") e.preventDefault()
    }

    const onDown = (e: PointerEvent) => {
      const s = st.current
      if (s.phase !== "idle") return
      if (e.pointerType === "mouse" && e.button !== 0) return
      const target = e.target as Element | null
      if (target?.closest(INTERACTIVE)) return
      s.pid = e.pointerId
      s.x0 = e.clientX
      s.y0 = e.clientY
      s.lastY = e.clientY
      s.lastT = performance.now()
      s.vy = 0
      s.phase = "press"
      s.pressTimer = setTimeout(() => {
        if (st.current.phase !== "press") return
        // SOLTOU do feed. Só agora a tela é segurada: touchmove NÃO passivo
        // em todo card faria o navegador esperar o handler antes de rolar.
        el.addEventListener("touchmove", onTouchMove, { passive: false })
        setPhaseBoth("lift")
        fx("pegar", "pegar")
        animate(scale, 1.035, { type: "spring", stiffness: 600, damping: 22 })
        animate(rotate, -1.6, { type: "spring", stiffness: 400, damping: 20 })
        animate(lift, 1, { duration: 0.16 })
        try {
          el.setPointerCapture(s.pid)
        } catch {
          /* ponteiro já saiu */
        }
        st.current.trayTimer = setTimeout(() => {
          const ss = st.current
          if (ss.phase !== "lift" || ss.zone !== "none") return
          if (propsRef.current.targets.length === 0 || !propsRef.current.onThrow) return
          ss.tray = true
          setTrayOpen(true)
          fx("vitrine", "vitrine")
        }, TRAY_MS)
      }, PRESS_MS)
    }

    const onMove = (e: PointerEvent) => {
      const s = st.current
      if (e.pointerId !== s.pid) return
      const dx = e.clientX - s.x0
      const dy = e.clientY - s.y0
      if (s.phase === "press") {
        if (Math.hypot(dx, dy) > SLOP_PX) {
          clearTimers()
          s.phase = "idle"
        }
        return
      }
      if (s.phase !== "lift") return
      const now = performance.now()
      const dt = Math.max(1, now - s.lastT)
      s.vy = s.vy * 0.6 + ((e.clientY - s.lastY) / dt) * 0.4
      s.lastY = e.clientY
      s.lastT = now
      // Arrastou antes da vitrine: é lançamento rápido, a vitrine não abre.
      if (!s.tray && Math.hypot(dx, dy) > 28 && s.trayTimer) {
        clearTimeout(s.trayTimer)
        s.trayTimer = 0
      }
      x.set(dx * 0.45)
      y.set(dy)
      rotate.set(Math.max(-8, Math.min(8, dx * 0.05)) - 1.6)
      const z: Zone = dy < -ZONE_PX ? "up" : dy > ZONE_PX && propsRef.current.onSave ? "down" : "none"
      if (z !== s.zone) {
        s.zone = z
        setZone(z)
        if (z === "down") fx("salvar-zona", "cancelar")
      }
      if (s.tray) {
        let h: string | null = null
        for (const r of s.rects) {
          if (
            e.clientX >= r.r.left - 14 &&
            e.clientX <= r.r.right + 14 &&
            e.clientY >= r.r.top - 14 &&
            e.clientY <= r.r.bottom + 24
          ) {
            h = r.id
            break
          }
        }
        if (h !== s.hover) {
          s.hover = h
          setHover(h)
          if (h) fx("mirar", "mirar")
        }
      }
    }

    const onUp = (e: PointerEvent) => {
      const s = st.current
      if (e.pointerId !== s.pid) return
      clearTimers()
      el.removeEventListener("touchmove", onTouchMove)
      if (s.phase === "press") {
        s.phase = "idle"
        return
      }
      if (s.phase !== "lift") return
      s.suppressClick = true
      window.setTimeout(() => {
        st.current.suppressClick = false
      }, 80)
      const dy = e.clientY - s.y0
      if (s.tray && s.hover) {
        void doThrow(s.hover)
      } else if (s.zone === "up" || (s.vy < FLICK_VY && dy < -30)) {
        void doThrow("all")
      } else if (s.zone === "down") {
        void doSave()
      } else {
        fx("cancelar", "cancelar")
        resetGesture()
        settle()
        setPhaseBoth("idle")
      }
    }

    const onCancel = (e: PointerEvent) => {
      const s = st.current
      if (e.pointerId !== s.pid) return
      clearTimers()
      el.removeEventListener("touchmove", onTouchMove)
      if (s.phase === "lift") {
        resetGesture()
        settle()
        setPhaseBoth("idle")
      } else if (s.phase === "press") {
        s.phase = "idle"
      }
    }

    const onContext = (e: Event) => {
      if (st.current.phase !== "idle") e.preventDefault()
    }
    const onClickCapture = (e: Event) => {
      if (st.current.suppressClick) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onCancel)
    el.addEventListener("contextmenu", onContext)
    el.addEventListener("click", onClickCapture, true)
    return () => {
      clearTimers()
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onCancel)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("contextmenu", onContext)
      el.removeEventListener("click", onClickCapture, true)
    }
  }, [enabled, doThrow, doSave, resetGesture, settle, x, y, rotate, scale, lift])

  // Mede os avatares quando a vitrine abre (o acerto do dedo usa estes retângulos).
  useEffect(() => {
    if (!trayOpen) {
      st.current.rects = []
      return
    }
    const id = requestAnimationFrame(() => {
      const nodes = trayRef.current?.querySelectorAll<HTMLElement>("[data-throw-target]") ?? []
      st.current.rects = [...nodes].map((n) => ({ id: n.dataset.throwTarget as string, r: n.getBoundingClientRect() }))
    })
    return () => cancelAnimationFrame(id)
  }, [trayOpen])

  const lifted = phase === "lift"
  const canThrow = !!onThrow
  const nTargets = targets.length

  return (
    <div className="relative" style={{ WebkitTouchCallout: "none" }}>
      {/* rastro amarelo do lançamento (atrás do card) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-0 top-1/3 z-0 origin-bottom bg-gradient-to-t from-[#F2B705]/0 via-[#F2B705]/50 to-[#F2B705]/0"
        style={{ opacity: trail, scaleY: trail }}
      />
      <motion.div
        ref={ref}
        className="relative z-[1] select-none"
        style={{ x, y, rotate, scale, opacity, zIndex: phase === "idle" ? 1 : 40 }}
      >
        {/* sombra dura + contorno amarelo enquanto solto */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] border-2 border-[#F2B705] shadow-[8px_8px_0_#000]"
          style={{ opacity: shadowOpacity }}
        />
        {children}
        {stamp && (
          <motion.div
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 2.2, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -7, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 18 }}
          >
            <span className="block border-[3px] border-[#F2B705] bg-black/70 px-4 py-2 font-black uppercase tracking-widest text-[#F2B705] shadow-[5px_5px_0_#000]">
              {stamp}
            </span>
          </motion.div>
        )}
      </motion.div>

      {lifted &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[80]">
            {/* dica / vitrine no topo */}
            {canThrow && (
              <motion.div
                ref={trayRef}
                className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))]"
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <div
                  className={
                    "flex items-center gap-2 border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0_#000] transition-colors " +
                    (zone === "up" ? "border-black bg-[#F2B705] text-black" : "border-[#F2B705] bg-black/80 text-[#F2B705]")
                  }
                >
                  <ArrowUp className="h-4 w-4" />
                  {nTargets > 0
                    ? t("throwAllHint", "Solte para lançar a {n}").replace("{n}", String(nTargets))
                    : t("throwNobody", "Ninguém para lançar ainda")}
                </div>
                {trayOpen && (
                  <div className="flex max-w-full flex-wrap justify-center gap-3 pt-1">
                    {targets.slice(0, 12).map((tg, i) => (
                      <motion.div
                        key={tg.id_user}
                        data-throw-target={tg.id_user}
                        className="flex w-16 flex-col items-center gap-1"
                        initial={{ y: -30, opacity: 0, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, scale: hover === tg.id_user ? 1.22 : 1 }}
                        transition={{ type: "spring", stiffness: 600, damping: 22, delay: i * 0.03 }}
                      >
                        <span
                          className={
                            "block h-14 w-14 overflow-hidden rounded-full border-[3px] bg-zinc-800 shadow-[3px_3px_0_#000] " +
                            (hover === tg.id_user ? "border-[#F2B705]" : "border-white/80")
                          }
                        >
                          {tg.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={tg.avatar_url} alt="" className="h-full w-full object-cover" draggable={false} />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-lg font-black text-white/70">
                              {(tg.display_name || tg.username || "?").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="w-full truncate text-center text-[10px] font-bold text-white drop-shadow">
                          @{tg.username || "—"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
                {trayOpen && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-white/80 drop-shadow">
                    <Send className="h-3 w-3" />
                    {t("trayHint", "Solte em cima de alguém para mandar só para essa pessoa")}
                  </span>
                )}
              </motion.div>
            )}

            {/* gaveta de salvar embaixo */}
            {onSave && (
              <motion.div
                ref={binRef}
                className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-1/2 -ml-[78px] w-[156px]"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: zone === "down" ? -6 : 0, opacity: 1, scale: zone === "down" ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
              >
                <div
                  className={
                    "flex items-center justify-center gap-2 border-[3px] px-3 py-3 text-sm font-black uppercase tracking-wider shadow-[5px_5px_0_#000] " +
                    (zone === "down" ? "border-black bg-[#F2B705] text-black" : "border-[#F2B705] bg-black/85 text-[#F2B705]")
                  }
                >
                  <Archive className="h-5 w-5" />
                  {t("saveZone", "Salvar")}
                </div>
              </motion.div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

export const GesturePost = memo(GesturePostImpl)
