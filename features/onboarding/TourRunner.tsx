"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Loader2, X } from "lucide-react"
import {
  completeTourPath,
  fetchMonetizationStatus,
  fetchTourPath,
  reportTourProgress,
  skipTourPath,
  startTourPath,
} from "./onboardingApi"
import type { TourPathDetail, TourPathStep } from "./types"

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }
const WAIT_TIMEOUT_MS = 6000
const SESSION_KEY = "freelandoo:active_tour_path"

interface ActiveTourSession {
  pathKey: string
  step: number
}

function loadSession(): ActiveTourSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveTourSession
    if (!parsed?.pathKey) return null
    return parsed
  } catch {
    return null
  }
}

function saveSession(session: ActiveTourSession | null) {
  if (typeof window === "undefined") return
  if (!session) window.sessionStorage.removeItem(SESSION_KEY)
  else window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function waitForSelector(selector: string, timeoutMs = WAIT_TIMEOUT_MS): Promise<Element | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !selector) return resolve(null)
    const existing = document.querySelector(selector)
    if (existing) return resolve(existing)

    let resolved = false
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el && !resolved) {
        resolved = true
        observer.disconnect()
        resolve(el)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.setTimeout(() => {
      if (!resolved) {
        resolved = true
        observer.disconnect()
        resolve(null)
      }
    }, timeoutMs)
  })
}

function rectFor(el: Element | null): DOMRect | null {
  if (!el) return null
  return el.getBoundingClientRect()
}

function balloonPosition(rect: DOMRect | null, placement: TourPathStep["placement"]) {
  if (!rect) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
  }
  const margin = 14
  switch (placement) {
    case "top":
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - margin}px`,
        transform: "translate(-50%, -100%)",
      }
    case "right":
      return {
        left: `${rect.right + margin}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: "translateY(-50%)",
      }
    case "left":
      return {
        left: `${rect.left - margin}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: "translate(-100%, -50%)",
      }
    case "center":
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
    case "bottom":
    default:
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + margin}px`,
        transform: "translateX(-50%)",
      }
  }
}

export function TourRunner() {
  const router = useRouter()
  const pathname = usePathname()
  const [detail, setDetail] = useState<TourPathDetail | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetEl, setTargetEl] = useState<Element | null>(null)
  const [tick, setTick] = useState(0)
  const [waitingForTarget, setWaitingForTarget] = useState(false)
  const [done, setDone] = useState(false)
  const navigatingRef = useRef(false)

  const currentStep = detail?.steps[stepIndex] ?? null
  const totalSteps = detail?.steps.length ?? 0

  // ---------- Bootstrap: descobre se há tour ativo ----------
  const bootstrap = useCallback(async (preferredPathKey?: string) => {
    const session = loadSession()
    let pathKey = preferredPathKey || session?.pathKey || null

    if (!pathKey) {
      const status = await fetchMonetizationStatus()
      pathKey = status?.state.active_tour_path_key ?? null
    }
    if (!pathKey) {
      setDetail(null)
      return
    }

    const data = await fetchTourPath(pathKey)
    if (!data || !data.steps?.length) {
      saveSession(null)
      setDetail(null)
      return
    }

    setDetail(data)
    const startStep = session?.pathKey === pathKey ? Math.min(session.step ?? 0, data.steps.length - 1) : 0
    setStepIndex(startStep)
    setDone(false)
    saveSession({ pathKey, step: startStep })

    if (!session) {
      // primeira vez nesta sessão — marca in_progress no backend
      void startTourPath(pathKey)
    }
  }, [])

  useEffect(() => {
    void bootstrap()
    // Listener disparado pelo EarningIntentModal ao escolher um caminho.
    const onSelected = (e: Event) => {
      const ce = e as CustomEvent<{ pathKey: string }>
      if (ce.detail?.pathKey) void bootstrap(ce.detail.pathKey)
    }
    const onAuth = () => {
      saveSession(null)
      setDetail(null)
      void bootstrap()
    }
    window.addEventListener("onboarding:tour-selected", onSelected as EventListener)
    window.addEventListener("auth:changed", onAuth)
    return () => {
      window.removeEventListener("onboarding:tour-selected", onSelected as EventListener)
      window.removeEventListener("auth:changed", onAuth)
    }
  }, [bootstrap])

  // ---------- Navegação automática ao mudar de step ----------
  useEffect(() => {
    if (!detail || !currentStep) return
    if (pathname === currentStep.route) {
      navigatingRef.current = false
      return
    }
    if (navigatingRef.current) return
    navigatingRef.current = true
    router.push(currentStep.route)
  }, [detail, currentStep, pathname, router])

  // ---------- Localiza o elemento alvo após chegar na rota ----------
  useEffect(() => {
    if (!currentStep) return
    if (pathname !== currentStep.route) return
    const selector = currentStep.wait_for_selector || currentStep.target_selector
    if (!selector) {
      setTargetEl(null)
      setWaitingForTarget(false)
      return
    }
    setTargetEl(null)
    setWaitingForTarget(true)
    let cancelled = false
    void waitForSelector(selector).then((el) => {
      if (cancelled) return
      setTargetEl(el || null)
      setWaitingForTarget(false)
    })
    return () => {
      cancelled = true
    }
  }, [currentStep, pathname])

  // ---------- Re-render do balão em scroll/resize ----------
  useEffect(() => {
    if (!targetEl) return
    const bump = () => setTick((t) => t + 1)
    window.addEventListener("scroll", bump, { passive: true, capture: true })
    window.addEventListener("resize", bump)
    return () => {
      window.removeEventListener("scroll", bump, true)
      window.removeEventListener("resize", bump)
    }
  }, [targetEl])

  // ---------- Highlight outline no alvo ----------
  // Re-consulta o DOM em vez de mutar o elemento direto do useState
  // (regra react-hooks/immutability). Mantém o ciclo de restauração no
  // cleanup do effect.
  useEffect(() => {
    if (!currentStep || !targetEl) return
    const selector = currentStep.wait_for_selector || currentStep.target_selector
    if (!selector) return
    const htmlEl = document.querySelector(selector) as HTMLElement | null
    if (!htmlEl) return
    const prev = {
      outline: htmlEl.style.outline,
      outlineOffset: htmlEl.style.outlineOffset,
      transition: htmlEl.style.transition,
    }
    htmlEl.style.outline = "2px solid rgb(217 119 6 / 0.85)"
    htmlEl.style.outlineOffset = "4px"
    htmlEl.style.transition = "outline 200ms ease"
    htmlEl.scrollIntoView({ behavior: "smooth", block: "center" })
    return () => {
      htmlEl.style.outline = prev.outline
      htmlEl.style.outlineOffset = prev.outlineOffset
      htmlEl.style.transition = prev.transition
    }
  }, [currentStep, targetEl])

  // tick força recálculo em scroll/resize.
  const rect = useMemo(() => {
    void tick
    return rectFor(targetEl)
  }, [targetEl, tick])
  const balloonStyle = useMemo(() => balloonPosition(rect, currentStep?.placement ?? "bottom"), [rect, currentStep])

  // ---------- Ações ----------
  const goNext = useCallback(() => {
    if (!detail) return
    const next = stepIndex + 1
    if (next >= detail.steps.length) {
      void completeTourPath(detail.path.path_key)
      saveSession(null)
      setDone(true)
      setDetail(null)
      return
    }
    setStepIndex(next)
    saveSession({ pathKey: detail.path.path_key, step: next })
    void reportTourProgress(detail.path.path_key, next)
  }, [detail, stepIndex])

  const goSkip = useCallback(() => {
    if (!detail) return
    void skipTourPath(detail.path.path_key)
    saveSession(null)
    setDetail(null)
  }, [detail])

  if (!detail || !currentStep) {
    // toast leve de conclusão (some sozinho)
    return (
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={SPRING}
            className="fixed bottom-6 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
            onAnimationComplete={() => window.setTimeout(() => setDone(false), 1800)}
          >
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              Tour concluído. Bons negócios.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  const isLast = stepIndex === totalSteps - 1
  const showSpotlight = !!rect

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {/* Overlay leve — não escurece tudo, só aplica veladura sutil */}
      <div className="absolute inset-0 bg-zinc-950/15 backdrop-blur-[1px]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${detail.path.path_key}-${stepIndex}-${tick}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={SPRING}
          className="pointer-events-auto absolute z-10 w-[min(360px,90vw)] rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
          style={balloonStyle}
        >
          <div className="mb-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <span>{detail.path.title}</span>
            <span>
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>

          <h4 className="mb-2 text-base font-semibold tracking-tight text-zinc-950">
            {currentStep.title}
          </h4>
          <p className="text-[13px] leading-relaxed text-zinc-600">
            {currentStep.content}
          </p>

          {waitingForTarget && !showSpotlight && (
            <p className="mt-3 inline-flex items-center gap-2 text-[12px] text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Procurando o elemento na página...
            </p>
          )}
          {!waitingForTarget && !showSpotlight && (currentStep.target_selector || currentStep.wait_for_selector) && (
            <p className="mt-3 text-[12px] text-zinc-500">
              Não encontrei o elemento. Você pode avançar ou pular.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goSkip}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              Pular tour
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-amber-600 active:scale-[0.97]"
            >
              {isLast ? "Concluir" : "Avançar"}
              {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
