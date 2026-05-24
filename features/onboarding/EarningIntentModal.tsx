"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Loader2, Sparkle, X } from "lucide-react"
import { useMonetizationOnboarding } from "./useMonetizationOnboarding"
import type { MonetizationPath } from "./types"

// Spring physics taste: stiffness 100, damping 20.
const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }

// Gradient único por caminho — usado quando o admin ainda não subiu banner R2.
// Tons dessaturados, sem lila/neon (regra anti-slop).
const FALLBACK_GRADIENT: Record<string, string> = {
  affiliate: "from-emerald-200 via-emerald-50 to-stone-100",
  courses:   "from-amber-200  via-amber-50  to-stone-100",
  products:  "from-rose-200   via-rose-50   to-stone-100",
  services:  "from-sky-200    via-sky-50    to-stone-100",
  explore:   "from-stone-200  via-stone-50  to-stone-100",
}
const DEFAULT_GRADIENT = "from-zinc-200 via-zinc-50 to-stone-100"

export function EarningIntentModal() {
  const { status, shouldShowModal, dismissing, selecting, onDismiss, onSelect } = useMonetizationOnboarding()
  const [activePathKey, setActivePathKey] = useState<string | null>(null)
  const router = useRouter()

  const paths = useMemo(() => {
    return (status?.paths ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [status])

  if (!shouldShowModal) return null

  const isWorking = selecting || dismissing

  const handleSelect = async (path: MonetizationPath) => {
    if (isWorking) return
    setActivePathKey(path.path_key)
    await onSelect(path.path_key)
    // Roteia o usuário para o primeiro step do caminho. O TourRunner (Slice E)
    // se encarrega de detectar active_tour_path_key e iniciar os balões.
    router.push(firstRouteForPath(path.path_key))
  }

  return (
    <AnimatePresence>
      <motion.div
        key="earning-intent-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex min-h-[100dvh] items-stretch justify-center bg-zinc-950/65 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="earning-intent-title"
      >
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 28, opacity: 0 }}
          transition={SPRING}
          className="relative mx-auto flex w-full max-w-[1180px] flex-col bg-stone-50 text-zinc-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] md:my-8 md:rounded-[2.5rem] md:border md:border-stone-200/80"
        >
          <button
            type="button"
            onClick={() => onDismiss("closed")}
            disabled={isWorking}
            className="absolute right-5 top-5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 disabled:opacity-40 active:scale-[0.96]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <Header />

          <div className="px-6 pb-10 md:px-12">
            {paths.length === 0 ? (
              <EmptyState />
            ) : (
              <PathRail
                paths={paths}
                activePathKey={activePathKey}
                isWorking={isWorking}
                onPick={handleSelect}
              />
            )}
          </div>

          <Footer
            isWorking={isWorking}
            onLater={() => onDismiss("later")}
            onNoThanks={() => onDismiss("no_thanks")}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Header() {
  return (
    <div className="px-6 pb-6 pt-12 md:px-12 md:pb-10 md:pt-16">
      <div className="flex max-w-2xl flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
          <Sparkle className="h-3 w-3" />
          Bem-vindo à Freelandoo
        </span>
        <h2
          id="earning-intent-title"
          className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl md:leading-[1.05]"
        >
          Como você quer{" "}
          <span className="text-amber-600">ganhar dinheiro</span>{" "}
          na Freelandoo?
        </h2>
        <p className="max-w-[58ch] text-sm leading-relaxed text-zinc-600 md:text-base">
          Cinco caminhos, sem compromisso. Escolha o que mais combina e a gente
          te guia pelo passo a passo — você pode trocar quando quiser.
        </p>
      </div>
    </div>
  )
}

function PathRail({
  paths,
  activePathKey,
  isWorking,
  onPick,
}: {
  paths: MonetizationPath[]
  activePathKey: string | null
  isWorking: boolean
  onPick: (path: MonetizationPath) => void | Promise<void>
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
      // Horizontal scroll com snap — evita o "3-card row" banido pelo taste,
      // funciona em mobile e desktop sem layout reflow.
      className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2 md:gap-6 [scrollbar-width:thin]"
    >
      {paths.map((path) => (
        <PathCard
          key={path.path_key}
          path={path}
          loading={activePathKey === path.path_key && isWorking}
          disabled={isWorking && activePathKey !== path.path_key}
          onPick={onPick}
        />
      ))}
    </motion.div>
  )
}

function PathCard({
  path,
  loading,
  disabled,
  onPick,
}: {
  path: MonetizationPath
  loading: boolean
  disabled: boolean
  onPick: (path: MonetizationPath) => void | Promise<void>
}) {
  const gradient = FALLBACK_GRADIENT[path.path_key] ?? DEFAULT_GRADIENT
  return (
    <motion.button
      type="button"
      onClick={() => onPick(path)}
      disabled={disabled || loading}
      variants={{
        hidden: { y: 24, opacity: 0 },
        visible: { y: 0, opacity: 1 },
      }}
      transition={SPRING}
      whileHover={disabled ? undefined : { y: -6 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className="group relative flex h-full w-[78vw] max-w-[320px] shrink-0 snap-center flex-col overflow-hidden rounded-[2rem] border border-zinc-900/5 bg-white text-left shadow-[0_20px_40px_-22px_rgba(0,0,0,0.18)] transition disabled:cursor-not-allowed disabled:opacity-60 md:w-[260px] md:max-w-none"
    >
      {/* Banner 9:16 — usa imagem do R2 quando disponível, gradient único por path como fallback */}
      <div className="relative w-full overflow-hidden bg-stone-100" style={{ aspectRatio: "9 / 14" }}>
        {path.banner_image_url ? (
          <Image
            src={path.banner_image_url}
            alt={path.title}
            fill
            sizes="(max-width: 768px) 78vw, 260px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
            <div className="absolute inset-0 [background-image:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_55%)]" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/35 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
          {String(path.sort_order ?? 0).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
          {path.title}
        </h3>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {path.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-[13px] font-medium text-zinc-900">
            {path.cta_label}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white transition group-hover:bg-amber-600">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

function Footer({
  isWorking,
  onLater,
  onNoThanks,
}: {
  isWorking: boolean
  onLater: () => void
  onNoThanks: () => void
}) {
  return (
    <div className="border-t border-zinc-900/5 px-6 py-5 md:px-12 md:py-6">
      <div className="flex flex-col items-start justify-between gap-3 text-[13px] text-zinc-600 md:flex-row md:items-center">
        <span>
          Você pode trocar de caminho depois em{" "}
          <span className="font-medium text-zinc-900">Conta &rsaquo; Configurações</span>.
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onLater}
            disabled={isWorking}
            className="text-[13px] font-medium text-zinc-600 underline-offset-4 transition hover:text-zinc-900 hover:underline disabled:opacity-50"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onNoThanks}
            disabled={isWorking}
            className="text-[13px] font-medium text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50"
          >
            Não quero ver isso de novo
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[2rem] border border-dashed border-zinc-300 bg-white/60 px-8 py-16 text-center">
      <Sparkle className="h-5 w-5 text-zinc-400" />
      <p className="max-w-[44ch] text-sm text-zinc-600">
        Nenhum caminho disponível agora. Volte em alguns instantes — o time da
        Freelandoo está ajustando as opções.
      </p>
    </div>
  )
}

// Map de path_key → rota inicial. Mantido aqui (não no banco) porque o
// admin pode editar a route do step 1, mas a primeira navegação precisa
// rodar antes do TourRunner conseguir consultar /tour-paths/:key.
function firstRouteForPath(pathKey: string): string {
  switch (pathKey) {
    case "affiliate": return "/account"
    case "courses":   return "/cursos"
    case "products":  return "/loja"
    case "services":  return "/search"
    case "explore":   return "/"
    default:          return "/"
  }
}
