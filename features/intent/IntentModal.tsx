"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Briefcase, Compass, GraduationCap, Hexagon, Loader2, Package, Sparkles, Users, X,
} from "lucide-react"
import { useIntent } from "./useIntent"
import { IntentVideoOverlay } from "./IntentVideoOverlay"
import type { IntentPath } from "./types"

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }

// ----- Accent color → classes utilitárias --------------------------------

interface AccentSet {
  ring: string
  ringHover: string
  buttonBg: string
  buttonBgHover: string
  buttonText: string
  badgeBg: string
  badgeText: string
  iconBg: string
  iconText: string
}

const ACCENT: Record<string, AccentSet> = {
  amber: {
    ring: "ring-amber-500/30",
    ringHover: "hover:ring-amber-500/60",
    buttonBg: "bg-amber-500",
    buttonBgHover: "hover:bg-amber-400",
    buttonText: "text-zinc-950",
    badgeBg: "bg-amber-500/15 border-amber-500/40",
    badgeText: "text-amber-300",
    iconBg: "from-amber-500/30 via-amber-500/10 to-transparent",
    iconText: "text-amber-300",
  },
  violet: {
    ring: "ring-violet-500/30",
    ringHover: "hover:ring-violet-500/60",
    buttonBg: "bg-violet-500",
    buttonBgHover: "hover:bg-violet-400",
    buttonText: "text-white",
    badgeBg: "bg-violet-500/15 border-violet-500/40",
    badgeText: "text-violet-300",
    iconBg: "from-violet-500/30 via-violet-500/10 to-transparent",
    iconText: "text-violet-300",
  },
  emerald: {
    ring: "ring-emerald-500/30",
    ringHover: "hover:ring-emerald-500/60",
    buttonBg: "bg-emerald-500",
    buttonBgHover: "hover:bg-emerald-400",
    buttonText: "text-zinc-950",
    badgeBg: "bg-emerald-500/15 border-emerald-500/40",
    badgeText: "text-emerald-300",
    iconBg: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    iconText: "text-emerald-300",
  },
  sky: {
    ring: "ring-sky-500/30",
    ringHover: "hover:ring-sky-500/60",
    buttonBg: "bg-sky-500",
    buttonBgHover: "hover:bg-sky-400",
    buttonText: "text-zinc-950",
    badgeBg: "bg-sky-500/15 border-sky-500/40",
    badgeText: "text-sky-300",
    iconBg: "from-sky-500/30 via-sky-500/10 to-transparent",
    iconText: "text-sky-300",
  },
}

function accentFor(color: string): AccentSet {
  return ACCENT[color] ?? ACCENT.amber
}

// Ícone por path_key (placeholder até Alex enviar as ilustrações).
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

  const paths = useMemo(() => {
    return (status?.paths ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [status])

  // ESC fecha (dismiss "closed").
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
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-black/70 backdrop-blur-md p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intent-title"
          >
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 28, opacity: 0, scale: 0.98 }}
              transition={SPRING}
              className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            >
              {/* Fundo decorativo hexagonal sutil */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 0%, rgba(251,191,36,0.4), transparent 40%), radial-gradient(circle at 80% 100%, rgba(167,139,250,0.3), transparent 40%)",
                }}
              />

              <button
                type="button"
                onClick={() => onDismiss("closed")}
                disabled={working}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40 active:scale-[0.96]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              <Header />

              <div className="px-6 pb-6 md:px-8 md:pb-8">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chosen && <IntentVideoOverlay chosen={chosen} onClose={closeVideo} />}
    </>
  )
}

// ----- Header / Footer / Empty ------------------------------------------

function Header() {
  return (
    <div className="px-6 pb-2 pt-10 text-center md:px-12 md:pt-12">
      <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-4 py-1.5">
        <Hexagon className="h-4 w-4 fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
          Freelandoo · Pollens
        </span>
      </div>
      <h2 id="intent-title" className="text-2xl font-bold tracking-tight text-white md:text-3xl">
        Como você quer{" "}
        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          ganhar dinheiro
        </span>{" "}
        no Freelandoo?
      </h2>
      <p className="mx-auto mt-3 max-w-[60ch] text-sm text-zinc-400">
        Escolha um caminho para começar. Vamos te mostrar o passo a passo ideal para você.
      </p>
    </div>
  )
}

function Footer({ working, onLater }: { working: boolean; onLater: () => void }) {
  return (
    <div className="border-t border-white/[0.06] bg-zinc-950/60 px-6 py-4 md:px-8 md:py-5">
      <div className="flex flex-col items-start justify-between gap-3 text-xs text-zinc-500 md:flex-row md:items-center">
        <span className="inline-flex items-center gap-2">
          <span className="text-zinc-400">i</span>
          Você poderá mudar essa escolha depois nas configurações.
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-amber-200/80">
            <Sparkles className="h-3.5 w-3.5" />
            Ao escolher, você assiste a um vídeo rápido
          </span>
          <button
            type="button"
            onClick={onLater}
            disabled={working}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-50"
          >
            <Hexagon className="h-3 w-3" />
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-14 text-center">
      <Sparkles className="h-5 w-5 text-zinc-500" />
      <p className="max-w-[44ch] text-sm text-zinc-400">
        Nenhum caminho disponível agora. Volte em alguns instantes.
      </p>
    </div>
  )
}

// ----- Path grid + card --------------------------------------------------

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
      variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
      // Mobile: scroll horizontal com snap. Desktop: grid 5 colunas.
      className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 pt-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 [scrollbar-width:thin]"
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
  return (
    <motion.div
      variants={{
        hidden: { y: 18, opacity: 0 },
        visible: { y: 0, opacity: 1 },
      }}
      transition={SPRING}
      className={`group relative flex w-[80vw] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-zinc-950/70 ring-1 ${accent.ring} ${accent.ringHover} transition md:w-auto`}
    >
      <span
        className={`absolute left-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold ${accent.badgeBg} ${accent.badgeText}`}
      >
        {number}
      </span>

      {/* Ilustração placeholder — Alex envia os 5 arquivos depois.
          Usa imagem do R2 se já tiver banner_image_url. */}
      <div
        className="relative w-full overflow-hidden bg-zinc-900"
        style={{ aspectRatio: "5 / 4" }}
      >
        {path.banner_image_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${path.banner_image_url})` }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${accent.iconBg}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <PathIcon pathKey={path.path_key} className={`h-16 w-16 ${accent.iconText} opacity-80`} />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold text-white">{path.title}</h3>
        <p className="text-[12.5px] leading-relaxed text-zinc-400">
          {path.description}
        </p>
        <button
          type="button"
          onClick={() => onPick(path)}
          disabled={disabled || loading}
          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${accent.buttonBg} ${accent.buttonBgHover} ${accent.buttonText}`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            path.cta_label || "Escolher"
          )}
        </button>
      </div>
    </motion.div>
  )
}
