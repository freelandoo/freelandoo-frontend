"use client"

// Vitrine da Loja de Funções — a MECÂNICA é a da home do TENKA (gsap +
// @gsap/react + plugin Observer: card central com previous/next em 3D, headline
// gigante de fundo, autoplay 7s com barra de progresso, wheel/swipe/teclado);
// a PELE é tabloide.
//
// O que ficou do TENKA: a coreografia (papéis center/previous/next, blur e
// rotação, o card de trás cruzando o palco por baixo) e os gestos do Observer.
// O que saiu: fundo colorido por produto (o canvas é o tabloide fixo, só o
// glow dourado pulsa), a janela de browser (virou recorte de jornal em papel
// off-white com borda de tinta e sombra dura) e o reflexo de vidro.
// Conteúdo vem do catálogo (admin edita em /administracao/loja-funcoes).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Observer } from "gsap/Observer"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import {
  FUNCTION_ICONS,
  acceptsPolens,
  formatPolens,
  formatPriceBRL,
  getCardRole,
  getRoleVars,
  padIndex,
  toTweenVars,
  type CardRole,
  type FunctionProduct,
} from "./function-product"

gsap.registerPlugin(useGSAP, Observer)

const AUTOPLAY_DELAY = 7000
const TRANSITION_DURATION = 0.9
const TRANSITION_EASE = "power3.inOut"

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`

type Direction = "next" | "previous"
type NavigationSource = "user" | "wheel" | "autoplay"

function useViewport(breakpoint: number): boolean {
  const [isBelow, setIsBelow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsBelow(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [breakpoint])
  return isBelow
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

/* -------------------------------------------------------------------- */
/* Card do produto (mockup de janela, imagem ou ícone no placeholder)    */
/* -------------------------------------------------------------------- */

function ProductCard({
  product,
  role,
  owned,
  disabled,
  ownedLabel,
  viewLabel,
  registerRef,
  onActivate,
}: {
  product: FunctionProduct
  role: CardRole
  owned: boolean
  disabled: boolean
  ownedLabel: string
  viewLabel: string
  registerRef: (el: HTMLDivElement | null) => void
  onActivate?: () => void
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [product.image_url])

  const Icon = FUNCTION_ICONS[product.feature_key]
  const showImage = Boolean(product.image_url) && !failed

  return (
    <div
      ref={registerRef}
      data-hero-card
      data-hero-role={role}
      className="pointer-events-auto absolute aspect-[4/5] w-[86vw] opacity-0 md:aspect-[16/9] md:w-[clamp(560px,52vw,940px)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Recorte de jornal: papel off-white, borda de tinta e sombra dura.
          No lugar da janela de browser do layout original. */}
      <div className="relative flex h-full w-full flex-col overflow-hidden border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[14px_14px_0_0_#0B0B0D]">
        {/* Cabeçalho de página de jornal */}
        <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b-2 border-[#0B0B0D] bg-[#0B0B0D] px-4 text-[#F1EDE2]">
          <span className="fl-display truncate text-lg leading-none">{product.nav_label}</span>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.24em] text-[#F1EDE2]/55">
            {product.eyebrow}
          </span>
        </div>

        {/* Arte — placeholder com ícone da função até o admin subir a imagem */}
        <div
          className="relative flex-1 bg-[#1D1810]"
          style={product.image_url && !failed ? undefined : { backgroundColor: product.placeholder_color }}
          role={showImage ? undefined : "img"}
          aria-label={showImage ? undefined : product.nav_label}
        >
          {showImage ? (
            // Mídia do R2 — política de imagem: não passa pelo otimizador da Vercel.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url ?? undefined}
              alt={product.nav_label}
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
              onError={() => setFailed(true)}
            />
          ) : (
            Icon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon
                  aria-hidden="true"
                  className="h-28 w-28 md:h-36 md:w-36"
                  strokeWidth={1.1}
                  style={{ color: product.accent_color }}
                />
              </div>
            )
          )}

          {/* Selo de posse */}
          {owned && (
            <span className="absolute right-3 top-3 flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0B0B0D]">
              <BadgeCheck aria-hidden="true" className="h-3 w-3" />
              {ownedLabel}
            </span>
          )}
        </div>
      </div>

      {/* Cards de fundo trazem a função pra frente; o central abre a página dela */}
      {onActivate ? (
        <button
          type="button"
          onClick={onActivate}
          disabled={disabled}
          aria-label={`${viewLabel}: ${product.nav_label}`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer"
        />
      ) : (
        <Link
          href={`/funcoes/${product.feature_key}`}
          aria-label={`${viewLabel}: ${product.nav_label}`}
          className="absolute inset-0 z-10 block h-full w-full cursor-pointer"
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Hero (carrossel)                                                      */
/* -------------------------------------------------------------------- */

export default function FunctionStoreHero({
  products,
  owned,
}: {
  products: FunctionProduct[]
  owned: Record<string, boolean>
}) {
  const t = useTranslations("FunctionStore")
  const locale = useLocale()

  const slides = useMemo(
    () => [...products].sort((a, b) => a.sort_order - b.sort_order),
    [products],
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const isMobile = useViewport(768)
  const prefersReducedMotion = useReducedMotion()

  const containerRef = useRef<HTMLElement | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const progressTweenRef = useRef<gsap.core.Tween | null>(null)
  const isAnimatingRef = useRef(false)
  const activeIndexRef = useRef(0)
  const isMobileRef = useRef(isMobile)
  const reducedMotionRef = useRef(prefersReducedMotion)
  const hoverPausedRef = useRef(false)
  const hasEnteredRef = useRef(false)
  const lastNavStartRef = useRef(0)

  isMobileRef.current = isMobile
  reducedMotionRef.current = prefersReducedMotion

  const total = slides.length
  const activeSlide = slides[activeIndex] ?? slides[0]
  const q = gsap.utils.selector(containerRef)

  useEffect(() => {
    if (total > 0 && activeIndex >= total) {
      setActiveIndex(0)
      activeIndexRef.current = 0
    }
  }, [total, activeIndex])

  // Pré-carrega as artes reais dos cards.
  useEffect(() => {
    slides.forEach((slide) => {
      if (slide.image_url) {
        const image = new Image()
        image.src = slide.image_url
      }
    })
  }, [slides])

  const registerCard = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  const { contextSafe } = useGSAP(
    () => {
      if (total === 0 || !containerRef.current) return

      slides.forEach((slide, index) => {
        const el = cardRefs.current.get(slide.id)
        if (!el) return
        const role = getCardRole(index, activeIndexRef.current, total)
        gsap.set(el, toTweenVars(getRoleVars(role, isMobile)))
        gsap.set(el, { zIndex: getRoleVars(role, isMobile).zIndex })
      })

      // O canvas NÃO troca de cor por produto (era o que fazia a página parecer
      // outro site). Fundo tabloide fixo; só o glow dourado respira.
      gsap.set(q("[data-hero-headline]"), { opacity: isMobile ? 0.75 : 0.92 })

      if (!hasEnteredRef.current) {
        hasEnteredRef.current = true
        // playEntrance é contextSafe (vem do próprio useGSAP) — só existe
        // depois desta chamada retornar; a execução é assíncrona e segura.
        // eslint-disable-next-line react-hooks/immutability
        playEntrance()
      }
    },
    { scope: containerRef, dependencies: [total, isMobile] },
  )

  /* ------------------------------ autoplay ----------------------------- */

  const startAutoplay = contextSafe(() => {
    progressTweenRef.current?.kill()
    const bar = q("[data-hero-progressbar]")[0]
    if (!bar) return
    if (reducedMotionRef.current || total < 2) {
      gsap.set(bar, { scaleX: 0 })
      return
    }
    progressTweenRef.current = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: AUTOPLAY_DELAY / 1000,
        ease: "none",
        onComplete: () => navigate("next", "autoplay"),
      },
    )
    if (hoverPausedRef.current || document.hidden) {
      progressTweenRef.current.pause()
    }
  })

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) progressTweenRef.current?.pause()
      else if (!hoverPausedRef.current) progressTweenRef.current?.resume()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  /* ------------------------------ entrada ------------------------------ */

  const playEntrance = contextSafe(() => {
    if (reducedMotionRef.current) {
      const tl = gsap.timeline({ onComplete: startAutoplay })
      timelineRef.current = tl
      tl.fromTo(containerRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "none" })
      return
    }

    const current = activeIndexRef.current
    const centerEl = cardRefs.current.get(slides[current]?.id ?? "")
    const prevEl = cardRefs.current.get(slides[(current - 1 + total) % total]?.id ?? "")
    const nextEl = cardRefs.current.get(slides[(current + 1) % total]?.id ?? "")

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: startAutoplay })
    timelineRef.current = tl

    tl.from(q("[data-hero-logo]"), { y: -28, autoAlpha: 0, duration: 0.7 }, 0.05)
      .from(q("[data-hero-headline]"), { yPercent: 24, autoAlpha: 0, duration: 0.9 }, 0.1)

    if (centerEl) tl.from(centerEl, { scale: 0.86, autoAlpha: 0, duration: 1 }, 0.15)
    if (prevEl && prevEl !== centerEl) tl.from(prevEl, { x: -320, autoAlpha: 0, duration: 0.9 }, 0.3)
    if (nextEl && nextEl !== centerEl && nextEl !== prevEl) {
      tl.from(nextEl, { x: 320, autoAlpha: 0, duration: 0.9 }, 0.3)
    }

    tl.from(q("[data-hero-eyebrow], [data-hero-description]"), { y: 26, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.5)
      .from(q("[data-hero-cta]"), { x: 36, autoAlpha: 0, duration: 0.6 }, 0.6)
      .from(q("[data-hero-arrows], [data-hero-counter]"), { y: 16, autoAlpha: 0, duration: 0.5 }, 0.62)
      .from(q("[data-hero-indicator]"), { x: 18, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.68)
  })

  /* --------------------- navegação + coreografia ----------------------- */

  const runTransition = (from: number, to: number, direction: Direction) => {
    const toSlide = slides[to]
    if (!toSlide) return

    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
      gsap.set(q("[data-hero-logo], [data-hero-indicator], [data-hero-arrows]"), {
        clearProps: "opacity,visibility,transform",
      })
    }
    progressTweenRef.current?.kill()
    const bar = q("[data-hero-progressbar]")[0]
    if (bar) gsap.set(bar, { scaleX: 0 })

    isAnimatingRef.current = true
    setIsAnimating(true)
    // Só roda em resposta a gesto/autoplay, nunca durante render.
    // eslint-disable-next-line react-hooks/purity
    lastNavStartRef.current = performance.now()

    const mobile = isMobileRef.current
    const centerVars = getRoleVars("center", mobile)
    const prevVars = getRoleVars("previous", mobile)
    const nextVars = getRoleVars("next", mobile)
    const headlineOpacity = mobile ? 0.75 : 0.92

    const prevIndex = (from - 1 + total) % total
    const nextIndex = (from + 1) % total
    const centerEl = cardRefs.current.get(slides[from]?.id ?? "")
    const prevEl = cardRefs.current.get(slides[prevIndex]?.id ?? "")
    const nextEl = cardRefs.current.get(slides[nextIndex]?.id ?? "")

    const headlineEl = q("[data-hero-headline]")
    const copyEls = q("[data-hero-eyebrow], [data-hero-description]")
    const ctaEls = q("[data-hero-cta]")
    const counterEl = q("[data-hero-counter-current]")
    const glowEl = q("[data-hero-glow]")

    const commitIndex = () => {
      activeIndexRef.current = to
      setActiveIndex(to)
    }

    const animatedCards = [centerEl, prevEl, nextEl].filter(
      (el, index, list): el is HTMLDivElement => Boolean(el) && list.indexOf(el) === index,
    )

    const release = () => {
      gsap.set(animatedCards, { willChange: "auto" })
      isAnimatingRef.current = false
      setIsAnimating(false)
      startAutoplay()
    }

    if (reducedMotionRef.current) {
      const fadeEls = q("[data-hero-fade]")
      const tl = gsap.timeline({ onComplete: release })
      timelineRef.current = tl
      tl.to(fadeEls, { autoAlpha: 0, duration: 0.18, ease: "none", overwrite: "auto" })
        .add(commitIndex)
        .add(() => {
          slides.forEach((slide, index) => {
            const el = cardRefs.current.get(slide.id)
            if (!el) return
            const role = getCardRole(index, to, total)
            const vars = getRoleVars(role, mobile)
            gsap.set(el, { ...toTweenVars(vars), rotationY: 0, rotationZ: 0, filter: "blur(0px)" })
            gsap.set(el, { zIndex: vars.zIndex })
          })
        })
        .to(fadeEls, { autoAlpha: 1, duration: 0.22, ease: "none" })
      return
    }

    gsap.set(animatedCards, { willChange: "transform, opacity, filter" })

    const tl = gsap.timeline({
      defaults: { duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
      onComplete: release,
    })
    timelineRef.current = tl

    if (direction === "next") {
      if (centerEl) {
        tl.to(centerEl, { scale: 1.04, duration: 0.16, ease: "power2.out", overwrite: "auto" }, 0)
          .set(centerEl, { zIndex: 18 }, 0.2)
          .to(centerEl, { ...toTweenVars(prevVars), duration: TRANSITION_DURATION - 0.16 }, 0.16)
          .set(centerEl, { zIndex: prevVars.zIndex }, TRANSITION_DURATION)
      }
      if (nextEl) {
        tl.set(nextEl, { zIndex: centerVars.zIndex }, 0).to(nextEl, { ...toTweenVars(centerVars), overwrite: "auto" }, 0)
      }
      if (prevEl && total > 2 && prevEl !== centerEl && prevEl !== nextEl) {
        tl.set(prevEl, { zIndex: 6 }, 0)
          .to(
            prevEl,
            {
              left: nextVars.left, top: nextVars.top,
              rotationY: nextVars.rotationY, rotationZ: nextVars.rotationZ,
              filter: nextVars.filter, x: 0, y: 0,
              duration: TRANSITION_DURATION, overwrite: "auto",
            },
            0,
          )
          .to(prevEl, { scale: 0.44, opacity: 0.32, duration: TRANSITION_DURATION / 2, ease: "power2.in" }, 0)
          .to(prevEl, { scale: nextVars.scale, opacity: nextVars.opacity, duration: TRANSITION_DURATION / 2, ease: "power2.out" }, TRANSITION_DURATION / 2)
          .set(prevEl, { zIndex: nextVars.zIndex }, TRANSITION_DURATION)
      }
    } else {
      if (centerEl) {
        tl.to(centerEl, { scale: 1.04, duration: 0.16, ease: "power2.out", overwrite: "auto" }, 0)
          .set(centerEl, { zIndex: 18 }, 0.2)
          .to(centerEl, { ...toTweenVars(nextVars), duration: TRANSITION_DURATION - 0.16 }, 0.16)
          .set(centerEl, { zIndex: nextVars.zIndex }, TRANSITION_DURATION)
      }
      if (prevEl) {
        tl.set(prevEl, { zIndex: centerVars.zIndex }, 0).to(prevEl, { ...toTweenVars(centerVars), overwrite: "auto" }, 0)
      }
      if (nextEl && total > 2 && nextEl !== centerEl && nextEl !== prevEl) {
        tl.set(nextEl, { zIndex: 6 }, 0)
          .to(
            nextEl,
            {
              left: prevVars.left, top: prevVars.top,
              rotationY: prevVars.rotationY, rotationZ: prevVars.rotationZ,
              filter: prevVars.filter, x: 0, y: 0,
              duration: TRANSITION_DURATION, overwrite: "auto",
            },
            0,
          )
          .to(nextEl, { scale: 0.44, opacity: 0.32, duration: TRANSITION_DURATION / 2, ease: "power2.in" }, 0)
          .to(nextEl, { scale: prevVars.scale, opacity: prevVars.opacity, duration: TRANSITION_DURATION / 2, ease: "power2.out" }, TRANSITION_DURATION / 2)
          .set(nextEl, { zIndex: prevVars.zIndex }, TRANSITION_DURATION)
      }
    }

    // Pulso do glow dourado no lugar da troca de cor do fundo: mantém o
    // "respiro" da transição sem repintar a página a cada função.
    tl.fromTo(glowEl, { opacity: 0.18 }, { opacity: 0.4, duration: TRANSITION_DURATION, ease: "power2.out", overwrite: "auto" }, 0)
      .to(headlineEl, { yPercent: -22, opacity: 0, letterSpacing: "0.02em", filter: "blur(6px)", duration: 0.34, ease: "power2.in", overwrite: "auto" }, 0)
      .to(copyEls, { y: -18, autoAlpha: 0, duration: 0.3, ease: "power2.in", stagger: 0.04, overwrite: "auto" }, 0)
      .to(ctaEls, { x: 26, autoAlpha: 0, duration: 0.3, ease: "power2.in", overwrite: "auto" }, 0)
      .to(counterEl, { y: -10, autoAlpha: 0, duration: 0.25, ease: "power2.in", overwrite: "auto" }, 0)
      .call(commitIndex, [], 0.36)
      .fromTo(
        headlineEl,
        { yPercent: 26, opacity: 0, filter: "blur(10px)", letterSpacing: "0.08em" },
        { yPercent: 0, opacity: headlineOpacity, filter: "blur(0px)", letterSpacing: "-0.035em", duration: 0.58, ease: "power3.out" },
        0.4,
      )
      .fromTo(copyEls, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.52, ease: "power3.out", stagger: 0.06 }, 0.46)
      .fromTo(ctaEls, { x: 34, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" }, 0.52)
      .fromTo(counterEl, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, 0.5)
  }

  const navigate = contextSafe((direction: Direction, source: NavigationSource = "user") => {
    if (total < 2 || isAnimatingRef.current) return
    // O momentum da roda continua emitindo eventos após a transição — exige
    // janela de assentamento. Handler de evento, nunca roda durante render.
    // eslint-disable-next-line react-hooks/purity
    if (source === "wheel" && performance.now() - lastNavStartRef.current < TRANSITION_DURATION * 1000 + 300) {
      return
    }
    const from = activeIndexRef.current
    const to = direction === "next" ? (from + 1) % total : (from - 1 + total) % total
    runTransition(from, to, direction)
  })

  const goToIndex = contextSafe((index: number) => {
    const from = activeIndexRef.current
    if (index === from || index < 0 || index >= total) return
    if (isAnimatingRef.current) return
    const forwardSteps = (index - from + total) % total
    const backwardSteps = (from - index + total) % total
    navigate(forwardSteps <= backwardSteps ? "next" : "previous")
  })

  const navigateRef = useRef(navigate)
  const goToIndexRef = useRef(goToIndex)
  navigateRef.current = navigate
  goToIndexRef.current = goToIndex

  /* --------------------- gestos: wheel, swipe, drag --------------------- */

  useGSAP(
    () => {
      if (!containerRef.current || total < 2) return

      const wheelObserver = Observer.create({
        target: containerRef.current,
        type: "wheel",
        preventDefault: true,
        onChangeY: (self) => {
          if (Math.abs(self.deltaY) < 8) return
          navigateRef.current(self.deltaY > 0 ? "next" : "previous", "wheel")
        },
      })

      const gestureObserver = Observer.create({
        target: containerRef.current,
        type: "touch,pointer",
        tolerance: 24,
        lockAxis: true,
        onLeft: () => navigateRef.current("next"),
        onRight: () => navigateRef.current("previous"),
      })

      return () => {
        wheelObserver.kill()
        gestureObserver.kill()
      }
    },
    { scope: containerRef, dependencies: [total] },
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === "ArrowRight") {
        event.preventDefault()
        navigateRef.current("next")
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        navigateRef.current("previous")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  /* ------------------------------ render -------------------------------- */

  if (!activeSlide) return null

  const arrowButtonClasses =
    "flex h-12 w-12 items-center justify-center border-2 border-[#F1EDE2] text-[#F1EDE2] " +
    "transition-[background-color,border-color,color,transform,opacity] duration-200 hover:scale-[1.06] hover:border-[#F2B705] hover:text-[#F2B705] " +
    "active:scale-[0.96] disabled:cursor-default disabled:opacity-40 md:h-16 md:w-16"

  const activeOwned = owned[activeSlide.feature_key] === true

  return (
    <section
      ref={containerRef}
      aria-label={t("storeName", "Loja de Funções")}
      className="fl-root fl-paper-texture relative min-h-[100svh] w-full select-none overflow-hidden font-sans text-[#F1EDE2]"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return
        hoverPausedRef.current = true
        progressTweenRef.current?.pause()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return
        hoverPausedRef.current = false
        if (!document.hidden) progressTweenRef.current?.resume()
      }}
    >
      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.06]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: "160px 160px" }}
      />

      {/* Glow radial atrás do card ativo */}
      <div
        data-hero-glow
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[56%] z-[6] h-[55vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2B705] opacity-25 blur-[140px]"
      />

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-[80]">
        <div className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6 lg:px-14">
          <Link
            href="/account"
            data-hero-logo
            aria-label={t("backToAccount", "Voltar pra minha conta")}
            className="flex min-h-[44px] items-center gap-3 text-[#F1EDE2]"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
            <span className="fl-display text-2xl leading-none">
              {t("storeName", "Loja de Funções")}
              <span aria-hidden="true" className="text-[#F2B705]">
                _
              </span>
            </span>
          </Link>

          {/* Navegação central por função (desktop) */}
          <nav aria-label={t("navAria", "Funções")} className="hidden items-center gap-9 md:flex">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToIndexRef.current(index)}
                disabled={isAnimating}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`min-h-[44px] text-[11px] font-black uppercase tracking-[0.28em] transition-colors duration-300 ${
                  index === activeIndex
                    ? "text-[#F2B705]"
                    : "text-[#F1EDE2]/55 hover:text-[#F1EDE2]"
                }`}
              >
                {slide.nav_label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block" aria-hidden="true" />
        </div>
      </header>

      {/* Headline gigante de fundo */}
      <div
        data-hero-fade
        className="pointer-events-none absolute left-1/2 top-[10%] z-[10] w-full -translate-x-1/2 select-none"
      >
        <h1
          data-hero-headline
          className="fl-display text-center uppercase"
          style={{
            fontSize: "clamp(40px, 5.5vw, 80px)",
            lineHeight: 0.82,
            letterSpacing: "-0.035em",
            whiteSpace: "pre-line",
            opacity: isMobile ? 0.75 : 0.92,
            color: "#F1EDE2",
          }}
        >
          {activeSlide.headline}
        </h1>
      </div>

      {/* Palco dos cards */}
      <div
        data-hero-stage
        data-hero-fade
        className="pointer-events-none absolute inset-0 z-[20]"
        style={{ perspective: "1800px" }}
      >
        {slides.map((slide, index) => {
          const role = getCardRole(index, activeIndex, total)
          return (
            <ProductCard
              key={slide.id}
              product={slide}
              role={role}
              owned={owned[slide.feature_key] === true}
              disabled={isAnimating}
              ownedLabel={t("ownedBadge", "Sua")}
              viewLabel={t("viewFunction", "Ver função")}
              registerRef={(el) => registerCard(slide.id, el)}
              onActivate={role === "center" ? undefined : () => goToIndexRef.current(index)}
            />
          )
        })}
      </div>

      {/* Copy inferior esquerda */}
      <div
        data-hero-fade
        className="absolute bottom-8 left-5 right-5 z-[60] sm:bottom-10 sm:left-14 sm:right-auto lg:bottom-16 lg:left-20 md:max-w-[420px]"
      >
        <p data-hero-eyebrow className="fl-marker text-2xl font-bold leading-none text-[#F2B705]">
          {activeSlide.eyebrow}
        </p>

        <p
          data-hero-description
          className="mt-2 line-clamp-3 max-w-[420px] text-[13px] leading-[1.35] text-[#F1EDE2]/85 md:mt-3 md:line-clamp-4 md:text-[15px] md:leading-[1.45] [@media(max-height:560px)]:hidden"
        >
          {activeSlide.short_description}
        </p>

        <p data-hero-description className="mt-3 flex items-baseline gap-2">
          {activeOwned ? (
            <span className="text-[13px] font-black uppercase tracking-[0.14em] text-[#F2B705]">
              {t("ownedLine", "Você já tem esta função")}
            </span>
          ) : (
            <>
              <span className="fl-display text-3xl leading-none text-[#F2B705]">
                {formatPriceBRL(activeSlide.price_cents, locale)}
              </span>
              {acceptsPolens(activeSlide) ? (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F1EDE2]/60">
                  {t("orPolensShort", "ou {n} Poléns").replace(
                    "{n}",
                    formatPolens(Number(activeSlide.price_polens), locale),
                  )}
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F1EDE2]/60">
                  {t("lifetimeShort", "pagamento único")}
                </span>
              )}
            </>
          )}
        </p>

        {/* CTA compacto (mobile) */}
        <Link
          data-hero-cta
          href={`/funcoes/${activeSlide.feature_key}`}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition md:hidden"
        >
          {t("viewFunction", "Ver função")}
          <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
        </Link>

        <div data-hero-arrows className="mt-4 flex items-center gap-4 md:mt-5 md:gap-5">
          <button
            type="button"
            onClick={() => navigateRef.current("previous")}
            disabled={isAnimating}
            aria-label={t("prevAria", "Função anterior")}
            className={arrowButtonClasses}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => navigateRef.current("next")}
            disabled={isAnimating}
            aria-label={t("nextAria", "Próxima função")}
            className={arrowButtonClasses}
          >
            <ArrowRight aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
          </button>

          <p
            data-hero-counter
            className="fl-display ml-2 text-2xl leading-none text-[#F1EDE2] tabular-nums"
            aria-label={t("counterAria", "Função {n} de {total}")
              .replace("{n}", String(activeIndex + 1))
              .replace("{total}", String(total))}
          >
            <span data-hero-counter-current className="inline-block">
              {padIndex(activeIndex + 1)}
            </span>
            <span className="text-[#F1EDE2]/40">{` / ${padIndex(total)}`}</span>
          </p>
        </div>
      </div>

      {/* CTA grande inferior direita (desktop) */}
      <div data-hero-fade className="absolute bottom-10 right-8 z-[60] hidden md:block lg:bottom-16 lg:right-14">
        <Link data-hero-cta href={`/funcoes/${activeSlide.feature_key}`} className="group block text-[#F1EDE2]">
          <span className="flex items-center gap-4">
            <span className="fl-display uppercase leading-none" style={{ fontSize: "clamp(24px, 3.5vw, 54px)" }}>
              {activeOwned ? t("ctaOwned", "Ver função") : t("ctaBuy", "Comprar")}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-8 w-8 shrink-0 transition-transform duration-300 group-hover:translate-x-2"
              strokeWidth={2.5}
            />
          </span>
          <span
            aria-hidden="true"
            className="mt-2 block h-[3px] w-full origin-left scale-x-[0.22] bg-[#F2B705] transition-transform duration-500 group-hover:scale-x-100"
          />
        </Link>
      </div>

      {/* Trilho de indicadores (desktop) */}
      <nav aria-label={t("indicatorsAria", "Indicadores de função")}>
        <div className="absolute right-8 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-end gap-4 md:flex">
          {slides.map((slide, index) => {
            const active = index === activeIndex
            return (
              <button
                key={slide.id}
                type="button"
                data-hero-indicator
                onClick={() => goToIndexRef.current(index)}
                disabled={isAnimating}
                aria-current={active ? "true" : undefined}
                aria-label={t("goToAria", "Ir para {name}").replace("{name}", slide.nav_label)}
                className={`group flex min-h-[44px] items-center gap-3 transition-colors duration-300 ${
                  active ? "text-[#F2B705]" : "text-[#F1EDE2]/45 hover:text-[#F1EDE2]/80"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 transition-opacity duration-300"
                  style={{ backgroundColor: "#F2B705", opacity: active ? 1 : 0 }}
                />
                <span
                  className={`font-bold uppercase tabular-nums transition-all duration-300 ${
                    active ? "text-xs tracking-[0.3em]" : "text-[10px] tracking-[0.25em]"
                  }`}
                >
                  {padIndex(index + 1)}
                </span>
                <span
                  className={`hidden font-semibold uppercase lg:block ${
                    active ? "text-xs tracking-[0.28em]" : "text-[10px] tracking-[0.22em]"
                  }`}
                >
                  {slide.nav_label}
                </span>
                <span
                  aria-hidden="true"
                  className="h-[2px] bg-current transition-all duration-500"
                  style={{ width: active ? 56 : 24 }}
                />
              </button>
            )
          })}
        </div>

        {/* Mobile: barrinhas inferiores */}
        <div className="absolute bottom-1 left-1/2 z-[60] flex -translate-x-1/2 md:hidden">
          {slides.map((slide, index) => {
            const active = index === activeIndex
            return (
              <button
                key={slide.id}
                type="button"
                data-hero-indicator
                onClick={() => goToIndexRef.current(index)}
                disabled={isAnimating}
                aria-current={active ? "true" : undefined}
                aria-label={t("goToAria", "Ir para {name}").replace("{name}", slide.nav_label)}
                className="flex h-8 w-11 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className="block h-[3px] transition-all duration-300"
                  style={{ width: active ? 24 : 12, backgroundColor: active ? "#F2B705" : "rgba(241,237,226,0.4)" }}
                />
              </button>
            )
          })}
        </div>
      </nav>

      {/* Barra de progresso do autoplay */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[65] h-[3px] bg-[#F1EDE2]/15">
        <div data-hero-progressbar className="h-full w-full origin-left scale-x-0 bg-[#F2B705]" />
      </div>

      {/* Anúncio pra leitor de tela */}
      <p aria-live="polite" className="sr-only">
        {t("activeAria", "Função ativa: {name}").replace("{name}", activeSlide.nav_label)}
      </p>
    </section>
  )
}
