"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight, Briefcase, Compass, GraduationCap, Hexagon, Loader2, Package, Sparkles, Users, X,
} from "lucide-react"
import { useIntent } from "./useIntent"
import { IntentVideoOverlay } from "./IntentVideoOverlay"
import type { IntentPath } from "./types"

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }

// ----- Accent: bg + glow + iconText (todos derivados da mesma matiz) -----

interface AccentSet {
  ring: string
  glow: string                 // tinted shadow no hover (taste: não é neon)
  buttonBg: string
  buttonHover: string
  buttonText: string
  badgeBorder: string
  badgeText: string
  illustrationFrom: string     // from-color para o gradient da ilustração
  illustrationVia: string
  iconText: string
  hueOverlay: string           // overlay de cor no fundo da ilustração
}

const ACCENT: Record<string, AccentSet> = {
  amber: {
    ring: "ring-amber-500/20 hover:ring-amber-400/50",
    glow: "hover:shadow-[0_24px_70px_-22px_rgba(251,191,36,0.55)]",
    buttonBg: "bg-amber-400",
    buttonHover: "hover:bg-amber-300",
    buttonText: "text-zinc-950",
    badgeBorder: "border-amber-400/40 bg-amber-500/10",
    badgeText: "text-amber-200",
    illustrationFrom: "from-amber-500/35",
    illustrationVia: "via-amber-700/15",
    iconText: "text-amber-100",
    hueOverlay: "rgba(251,191,36,0.18)",
  },
  violet: {
    ring: "ring-violet-500/20 hover:ring-violet-400/50",
    glow: "hover:shadow-[0_24px_70px_-22px_rgba(167,139,250,0.55)]",
    buttonBg: "bg-violet-500",
    buttonHover: "hover:bg-violet-400",
    buttonText: "text-white",
    badgeBorder: "border-violet-400/40 bg-violet-500/10",
    badgeText: "text-violet-200",
    illustrationFrom: "from-violet-500/35",
    illustrationVia: "via-violet-700/15",
    iconText: "text-violet-100",
    hueOverlay: "rgba(167,139,250,0.18)",
  },
  emerald: {
    ring: "ring-emerald-500/20 hover:ring-emerald-400/50",
    glow: "hover:shadow-[0_24px_70px_-22px_rgba(52,211,153,0.55)]",
    buttonBg: "bg-emerald-500",
    buttonHover: "hover:bg-emerald-400",
    buttonText: "text-zinc-950",
    badgeBorder: "border-emerald-400/40 bg-emerald-500/10",
    badgeText: "text-emerald-200",
    illustrationFrom: "from-emerald-500/35",
    illustrationVia: "via-emerald-700/15",
    iconText: "text-emerald-100",
    hueOverlay: "rgba(52,211,153,0.18)",
  },
  sky: {
    ring: "ring-sky-500/20 hover:ring-sky-400/50",
    glow: "hover:shadow-[0_24px_70px_-22px_rgba(56,189,248,0.55)]",
    buttonBg: "bg-sky-500",
    buttonHover: "hover:bg-sky-400",
    buttonText: "text-zinc-950",
    badgeBorder: "border-sky-400/40 bg-sky-500/10",
    badgeText: "text-sky-200",
    illustrationFrom: "from-sky-500/35",
    illustrationVia: "via-sky-700/15",
    iconText: "text-sky-100",
    hueOverlay: "rgba(56,189,248,0.18)",
  },
}

function accentFor(color: string): AccentSet {
  return ACCENT[color] ?? ACCENT.amber
}

const PATH_ICON: Record<string, typeof Users> = {
  affiliate: Users,
  courses: GraduationCap,
  products: Package,
  services: Briefcase,
  explore: Compass,
}

function PathIcon({ pathKey, className }: { pathKey: string; className?: string }) {
  const Icon = PATH_ICON[pathKey] ?? Sparkles
  return <Icon className={className} />
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
              className="relative w-full max-w-[1180px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-950 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <MeshBackground />

              <button
                type="button"
                onClick={() => onDismiss("closed")}
                disabled={working}
                className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40 active:scale-[0.94]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10">
                <Header reduced={!!reduced} />

                <div className="px-5 pb-6 md:px-10 md:pb-10">
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

// ----- Mesh gradient animado de fundo (taste: layout/atmosphere) ---------

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
      {/* Grain leve pra quebrar bandas dos blurs */}
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

// ----- Header / Footer / Empty ------------------------------------------

function Header({ reduced }: { reduced: boolean }) {
  return (
    <div className="px-5 pb-4 pt-12 text-center md:px-12 md:pt-14">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-4 py-1.5 backdrop-blur-sm"
      >
        <motion.span
          animate={reduced ? undefined : { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Hexagon className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
        </motion.span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
          Freelandoo · Pollens
        </span>
      </motion.div>

      <motion.h2
        id="intent-title"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.15 }}
        className="text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[44px]"
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
        className="mx-auto mt-4 max-w-[58ch] text-sm leading-relaxed text-zinc-400 md:text-[15px]"
      >
        Escolha um caminho para começar. Vamos te mostrar o passo a passo ideal para você.
      </motion.p>
    </div>
  )
}

function Footer({ working, onLater }: { working: boolean; onLater: () => void }) {
  return (
    <div className="relative border-t border-white/[0.06] bg-zinc-950/40 px-5 py-4 backdrop-blur md:px-10 md:py-5">
      <div className="flex flex-col items-start justify-between gap-3 text-[12.5px] md:flex-row md:items-center">
        <span className="inline-flex items-center gap-2 text-zinc-500">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-500">i</span>
          Você poderá mudar essa escolha depois nas configurações.
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-amber-200/85">
            <Sparkles className="h-3.5 w-3.5" />
            Ao escolher, você assiste a um vídeo rápido
          </span>
          <motion.button
            type="button"
            onClick={onLater}
            disabled={working}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-medium text-white/85 backdrop-blur transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
          >
            <Hexagon className="h-3 w-3" />
            Agora não
          </motion.button>
        </div>
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
      className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 pt-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 [scrollbar-width:thin]"
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

// ----- Card: full-bleed estilo Polens com glow tintado ------------------

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
  const reduced = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={() => onPick(path)}
      disabled={disabled || loading}
      variants={{
        hidden: { y: 28, opacity: 0, scale: 0.96 },
        visible: { y: 0, opacity: 1, scale: 1 },
      }}
      transition={SPRING}
      whileHover={disabled || loading ? undefined : { y: -8, scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      // aspect ~9:14 para 5 cards em ~1100px
      className={`group relative flex aspect-[9/14] w-[78vw] shrink-0 snap-center cursor-pointer flex-col overflow-hidden rounded-[1.75rem] bg-zinc-900 text-left ring-1 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto ${accent.ring} ${accent.glow} shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]`}
    >
      {/* Ilustração FULL BLEED — gradient rico com ícone integrado + camadas */}
      {path.banner_image_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.04]"
          style={{ backgroundImage: `url(${path.banner_image_url})` }}
        />
      ) : (
        <Placeholder accent={accent} pathKey={path.path_key} reduced={!!reduced} />
      )}

      {/* Gradiente bottom pra legibilidade do texto (Polens style) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />

      {/* Liquid glass inner border (taste) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/5"
      />

      {/* Numbered badge top-left (com pulse perpétuo) */}
      <motion.span
        animate={reduced ? undefined : { boxShadow: [
          `0 0 0px ${accent.hueOverlay}`,
          `0 0 18px ${accent.hueOverlay}`,
          `0 0 0px ${accent.hueOverlay}`,
        ] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-bold backdrop-blur-md ${accent.badgeBorder} ${accent.badgeText}`}
      >
        {number}
      </motion.span>

      {/* Conteúdo bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 p-4">
        <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          {path.title}
        </h3>
        <p className="line-clamp-3 text-[12px] leading-relaxed text-white/70">
          {path.description}
        </p>
        <span
          className={`mt-1.5 inline-flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold transition ${accent.buttonBg} ${accent.buttonHover} ${accent.buttonText}`}
        >
          <span className="truncate">{loading ? "Abrindo..." : (path.cta_label || "Escolher")}</span>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          )}
        </span>
      </div>
    </motion.button>
  )
}

// Placeholder visual rico — substitui o gradient simples por:
//   1. base gradient da cor accent
//   2. radial highlight no canto superior esquerdo
//   3. ícone GIGANTE com opacidade baixa empurrado pro fundo (não dominante)
//   4. "scanlines" sutis pra textura
function Placeholder({
  accent,
  pathKey,
  reduced,
}: {
  accent: AccentSet
  pathKey: string
  reduced: boolean
}) {
  return (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.illustrationFrom} ${accent.illustrationVia} to-zinc-950`} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 18%, ${accent.hueOverlay}, transparent 55%), radial-gradient(circle at 80% 90%, ${accent.hueOverlay.replace("0.18", "0.10")}, transparent 60%)`,
        }}
      />
      {/* Ícone gigante no fundo — flutua sutilmente */}
      <motion.div
        aria-hidden
        animate={reduced ? undefined : { y: [0, -6, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-start justify-center pt-10"
      >
        <PathIcon
          pathKey={pathKey}
          className={`h-32 w-32 ${accent.iconText} opacity-90 drop-shadow-[0_8px_30px_rgba(0,0,0,0.4)]`}
          strokeWidth={1.2}
        />
      </motion.div>
      {/* Scanlines verticais finas pra textura */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)",
        }}
      />
    </>
  )
}
