"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import gsap from "gsap"
import { ArrowRight, Hexagon, Loader2, Sparkles, X } from "lucide-react"
import { useIntent } from "./useIntent"
import { IntentVideoOverlay } from "./IntentVideoOverlay"
import type { IntentPath } from "./types"

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }

// ----- Accent: usado no glow/cursor spotlight + botão --------------------

interface AccentSet {
  ring: string
  glow: string
  buttonBg: string
  buttonHover: string
  buttonText: string
  badgeBorder: string
  badgeText: string
  spotlightRgb: string         // "251 191 36" para usar em rgb(...)
  shimmerStop: string
}

const ACCENT: Record<string, AccentSet> = {
  amber: {
    ring: "ring-amber-500/20 group-hover:ring-amber-400/60",
    glow: "group-hover:shadow-[0_28px_80px_-20px_rgba(251,191,36,0.55)]",
    buttonBg: "bg-amber-400",
    buttonHover: "hover:bg-amber-300",
    buttonText: "text-zinc-950",
    badgeBorder: "border-amber-400/40 bg-amber-500/15",
    badgeText: "text-amber-100",
    spotlightRgb: "251 191 36",
    shimmerStop: "rgba(255,255,255,0.55)",
  },
  violet: {
    ring: "ring-violet-500/20 group-hover:ring-violet-400/60",
    glow: "group-hover:shadow-[0_28px_80px_-20px_rgba(167,139,250,0.55)]",
    buttonBg: "bg-violet-500",
    buttonHover: "hover:bg-violet-400",
    buttonText: "text-white",
    badgeBorder: "border-violet-400/40 bg-violet-500/15",
    badgeText: "text-violet-100",
    spotlightRgb: "167 139 250",
    shimmerStop: "rgba(255,255,255,0.55)",
  },
  emerald: {
    ring: "ring-emerald-500/20 group-hover:ring-emerald-400/60",
    glow: "group-hover:shadow-[0_28px_80px_-20px_rgba(52,211,153,0.55)]",
    buttonBg: "bg-emerald-500",
    buttonHover: "hover:bg-emerald-400",
    buttonText: "text-zinc-950",
    badgeBorder: "border-emerald-400/40 bg-emerald-500/15",
    badgeText: "text-emerald-100",
    spotlightRgb: "52 211 153",
    shimmerStop: "rgba(255,255,255,0.55)",
  },
  sky: {
    ring: "ring-sky-500/20 group-hover:ring-sky-400/60",
    glow: "group-hover:shadow-[0_28px_80px_-20px_rgba(56,189,248,0.55)]",
    buttonBg: "bg-sky-500",
    buttonHover: "hover:bg-sky-400",
    buttonText: "text-zinc-950",
    badgeBorder: "border-sky-400/40 bg-sky-500/15",
    badgeText: "text-sky-100",
    spotlightRgb: "56 189 248",
    shimmerStop: "rgba(255,255,255,0.55)",
  },
}

function accentFor(color: string): AccentSet {
  return ACCENT[color] ?? ACCENT.amber
}

// Cada path_key mapeia para o asset em /public/intent/<key>.png
function imageFor(pathKey: string): string {
  return `/intent/${pathKey}.png`
}

// ----- Componente principal ----------------------------------------------

export function IntentModal() {
  const { shouldShow, status, working, chosen, onDismiss, onChoose, closeVideo } = useIntent()
  const [activePathKey, setActivePathKey] = useState<string | null>(null)
  const reduced = useReducedMotion()

  const paths = useMemo(() => {
    return (status?.paths ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [status])

  useEffect(() => {
    if (!shouldShow) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !working) void onDismiss("closed")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shouldShow, working, onDismiss])

  const handleChoose = async (path: IntentPath) => {
    if (working) return
    setActivePathKey(path.path_key)
    await onChoose(path.path_key)
  }

  return (
    <>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            key="intent-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-zinc-950/80 p-3 backdrop-blur-md md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intent-title"
          >
            <motion.div
              initial={{ y: 36, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 36, opacity: 0, scale: 0.97 }}
              transition={SPRING}
              // max-h + flex-col garante footer sempre visível mesmo em mobile
              className="relative flex max-h-[94dvh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] md:rounded-[2.5rem]"
            >
              <MeshBackground />

              <button
                type="button"
                onClick={() => onDismiss("closed")}
                disabled={working}
                className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40 active:scale-[0.94] md:right-5 md:top-5 md:h-10 md:w-10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                <Header reduced={!!reduced} />

                <div className="min-h-0 flex-1 overflow-hidden px-3 pb-4 md:px-10 md:pb-10">
                  {paths.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <PathGrid
                      paths={paths}
                      activePathKey={activePathKey}
                      working={working}
                      onChoose={handleChoose}
                    />
                  )}
                </div>

                <Footer working={working} onLater={() => onDismiss("later")} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chosen && <IntentVideoOverlay chosen={chosen} onClose={closeVideo} />}
    </>
  )
}

// ----- Mesh gradient animado de fundo ------------------------------------

function MeshBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
        <motion.div
          aria-hidden
          className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-amber-500/15 blur-3xl"
          animate={{ x: [0, 40, -10, 0], y: [0, 30, 10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -right-32 -bottom-24 h-[460px] w-[460px] rounded-full bg-violet-500/12 blur-3xl"
          animate={{ x: [0, -30, 10, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute left-1/3 top-1/4 h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-3xl"
          animate={{ x: [0, 20, -20, 0], y: [0, 10, -10, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
    </>
  )
}

// ----- Header / Footer / Empty -------------------------------------------

function Header({ reduced }: { reduced: boolean }) {
  return (
    <div className="shrink-0 px-5 pb-3 pt-7 text-center md:px-12 md:pb-4 md:pt-14">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-3 py-1 backdrop-blur-sm md:mb-6 md:gap-2.5 md:px-4 md:py-1.5"
      >
        <motion.span
          animate={reduced ? undefined : { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Hexagon className="h-3 w-3 fill-amber-300 text-amber-300 md:h-3.5 md:w-3.5" />
        </motion.span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100 md:text-[11px] md:tracking-[0.24em]">
          Freelandoo · Pollens
        </span>
      </motion.div>

      <motion.h2
        id="intent-title"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.15 }}
        className="text-xl font-bold leading-[1.1] tracking-tight text-white md:text-[44px] md:leading-[1.05]"
      >
        Como você quer{" "}
        <span className="relative inline-block">
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            ganhar dinheiro
          </span>
          <motion.span
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-1 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-amber-300/0 via-amber-300/80 to-amber-300/0"
          />
        </span>{" "}
        no Freelandoo?
      </motion.h2>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.25 }}
        className="mx-auto mt-2 hidden max-w-[58ch] text-sm leading-relaxed text-zinc-400 md:mt-4 md:block md:text-[15px]"
      >
        Escolha um caminho para começar. Vamos te mostrar o passo a passo ideal para você.
      </motion.p>
    </div>
  )
}

function Footer({ working, onLater }: { working: boolean; onLater: () => void }) {
  return (
    <div className="relative shrink-0 border-t border-white/[0.06] bg-zinc-950/40 px-4 py-3 backdrop-blur md:px-10 md:py-5">
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="hidden items-center gap-2 text-zinc-500 md:inline-flex">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-500">i</span>
          Você poderá mudar essa escolha depois nas configurações.
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-amber-200/85 md:text-[12.5px]">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Ao escolher, você assiste a um vídeo rápido</span>
        </span>
        <motion.button
          type="button"
          onClick={onLater}
          disabled={working}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50 md:gap-2 md:px-4 md:py-2 md:text-[12.5px]"
        >
          <Hexagon className="h-3 w-3" />
          Agora não
        </motion.button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
      <Sparkles className="h-5 w-5 text-zinc-500" />
      <p className="max-w-[44ch] text-sm text-zinc-400">
        Nenhum caminho disponível agora. Volte em alguns instantes.
      </p>
    </div>
  )
}

// ----- Path grid ---------------------------------------------------------

function PathGrid({
  paths,
  activePathKey,
  working,
  onChoose,
}: {
  paths: IntentPath[]
  activePathKey: string | null
  working: boolean
  onChoose: (path: IntentPath) => void | Promise<void>
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}
      // Mobile: snap-start em vez de snap-center, e padding pra mostrar peek do próximo card.
      // pl-3 + gap-3 + card 62vw → resto da viewport mostra ~38vw do 2º card.
      className="-mx-3 flex h-full snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2 pl-3 pr-12 pt-2 md:mx-0 md:grid md:h-auto md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 [scrollbar-width:thin]"
    >
      {paths.map((path, idx) => (
        <PathCard
          key={path.path_key}
          path={path}
          number={idx + 1}
          loading={activePathKey === path.path_key && working}
          disabled={working && activePathKey !== path.path_key}
          onPick={onChoose}
        />
      ))}
    </motion.div>
  )
}

// ----- Card: imagem full-bleed + GSAP cursor spotlight + botão animado ---

function PathCard({
  path,
  number,
  loading,
  disabled,
  onPick,
}: {
  path: IntentPath
  number: number
  loading: boolean
  disabled: boolean
  onPick: (path: IntentPath) => void | Promise<void>
}) {
  const accent = accentFor(path.accent_color)
  const cardRef = useRef<HTMLButtonElement | null>(null)
  const spotlightRef = useRef<HTMLDivElement | null>(null)
  const shimmerRef = useRef<HTMLSpanElement | null>(null)

  // GSAP cursor spotlight — segue o mouse com quickTo (sem React state).
  // Quando entra: opacity → 1 + scale → 1; quando sai: opacity → 0.
  useEffect(() => {
    const card = cardRef.current
    const spot = spotlightRef.current
    if (!card || !spot) return

    gsap.set(spot, { opacity: 0, scale: 0.85 })

    const moveX = gsap.quickTo(spot, "x", { duration: 0.35, ease: "power3.out" })
    const moveY = gsap.quickTo(spot, "y", { duration: 0.35, ease: "power3.out" })

    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      moveX(e.clientX - rect.left - spot.offsetWidth / 2)
      moveY(e.clientY - rect.top - spot.offsetHeight / 2)
    }
    const onEnter = () => {
      gsap.to(spot, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" })
    }
    const onLeave = () => {
      gsap.to(spot, { opacity: 0, scale: 0.85, duration: 0.5, ease: "power2.out" })
    }

    card.addEventListener("mousemove", onMove)
    card.addEventListener("mouseenter", onEnter)
    card.addEventListener("mouseleave", onLeave)
    return () => {
      card.removeEventListener("mousemove", onMove)
      card.removeEventListener("mouseenter", onEnter)
      card.removeEventListener("mouseleave", onLeave)
      gsap.killTweensOf(spot)
    }
  }, [])

  // Shimmer animado no botão quando hover no card (varre da esquerda pra direita).
  useEffect(() => {
    const card = cardRef.current
    const sh = shimmerRef.current
    if (!card || !sh) return
    gsap.set(sh, { xPercent: -120 })
    let tween: gsap.core.Tween | null = null

    const onEnter = () => {
      tween?.kill()
      tween = gsap.fromTo(sh,
        { xPercent: -120 },
        { xPercent: 200, duration: 1.1, ease: "power2.inOut", repeat: -1, repeatDelay: 0.4 }
      )
    }
    const onLeave = () => {
      tween?.kill()
      gsap.to(sh, { xPercent: -120, duration: 0.25, ease: "power2.out" })
    }
    card.addEventListener("mouseenter", onEnter)
    card.addEventListener("mouseleave", onLeave)
    return () => {
      card.removeEventListener("mouseenter", onEnter)
      card.removeEventListener("mouseleave", onLeave)
      tween?.kill()
    }
  }, [])

  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={() => onPick(path)}
      disabled={disabled || loading}
      variants={{
        hidden: { y: 28, opacity: 0, scale: 0.96 },
        visible: { y: 0, opacity: 1, scale: 1 },
      }}
      transition={SPRING}
      whileHover={disabled || loading ? undefined : { y: -8, scale: 1.025 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      // Mobile: aspect mais curto (4/5) + width menor (62vw) → resto da viewport
      // mostra peek do 2º card; snap-start ancora à esquerda.
      className={`group relative flex aspect-[4/5] w-[62vw] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-[1.5rem] bg-zinc-900 text-left ring-1 transition-shadow duration-500 disabled:cursor-not-allowed disabled:opacity-60 md:aspect-[9/14] md:w-auto md:snap-center md:rounded-[1.75rem] ${accent.ring} ${accent.glow} shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]`}
    >
      {/* IMAGEM FULL-BLEED — ocupa o card inteiro */}
      <Image
        src={imageFor(path.path_key)}
        alt={path.title}
        fill
        priority={number <= 3}
        sizes="(max-width: 768px) 78vw, 220px"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />

      {/* GSAP spotlight que segue o cursor (radial gradient da cor accent) */}
      <div
        ref={spotlightRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-[280px] w-[280px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${accent.spotlightRgb}/0.45) 0%, rgba(${accent.spotlightRgb}/0.15) 35%, transparent 65%)`,
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />

      {/* Liquid glass inner border (taste) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/5"
      />

      {/* Gradient inferior pra legibilidade do botão */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-zinc-950/85 via-zinc-950/45 to-transparent" />

      {/* Numbered badge */}
      <span
        className={`absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-bold backdrop-blur-md ${accent.badgeBorder} ${accent.badgeText}`}
      >
        {number}
      </span>

      {/* Botão na parte inferior — shimmer animado via GSAP, arrow pula */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
        <span
          className={`relative flex items-center justify-between gap-2 overflow-hidden rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${accent.buttonBg} ${accent.buttonHover} ${accent.buttonText}`}
        >
          {/* Shimmer */}
          <span
            ref={shimmerRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accent.shimmerStop} 50%, transparent 100%)`,
              mixBlendMode: "overlay",
            }}
          />
          <span className="relative z-10 truncate">
            {loading ? "Abrindo..." : (path.cta_label || "Escolher")}
          </span>
          {loading ? (
            <Loader2 className="relative z-10 h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <ArrowRight className="relative z-10 h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
          )}
        </span>
      </div>
    </motion.button>
  )
}
