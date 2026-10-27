"use client"

// OS PRIMITIVOS DE MOVIMENTO DO ESPORTES — uma peça por gesto da linguagem
// impressa (ver `motion.ts`). Todos limpam o que abrem, respeitam
// `prefers-reduced-motion` e animam só transform/opacity (o anel desenha por
// pathLength num SVG pequeno, 1× — exceção registrada na spec).

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react"
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import { DIST, DUR, EASE, SPRING, STAGGER, stampAngle, stepFor } from "./motion"

/** Entrou na tela UMA vez (sem cache de posição). */
export function useInViewOnce(ref: RefObject<Element | null>) {
  return useInView(ref, { once: true, margin: "0px 0px -10% 0px" })
}

/* ─────────────────────────────── RECORTE ─────────────────────────────── */

/**
 * O bloco entra de baixo, levemente torto, como papel colado. Com vários
 * filhos, cada um é uma célula (o `Reveal` É o grid: passe o layout em
 * `className`) e eles entram em cascata com teto.
 */
export function Reveal({
  children,
  step = STAGGER.tiles,
  max = 8,
  className,
  y = DIST.cutY,
  tilt = true,
  cells,
}: {
  children: ReactNode
  step?: number
  max?: number
  className?: string
  y?: number
  tilt?: boolean
  /** Classe da CÉLULA de cada filho (o embrulho animado é o item do grid). */
  cells?: (string | undefined)[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const items = Children.toArray(children)
  const s = stepFor(Math.min(items.length, max), step)
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={inView ? "show" : "hidden"}>
      {items.map((child, i) => (
        <motion.div
          key={isValidElement(child) && child.key != null ? child.key : i}
          className={cells?.[i]}
          variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y, rotate: tilt ? DIST.cutRotate : 0 },
            show: {
              opacity: 1,
              y: 0,
              rotate: 0,
              transition: { duration: reduce ? DUR.base : DUR.enter, ease: EASE.paper, delay: Math.min(i, max - 1) * s },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ────────────────────────────── INCLINAÇÃO ───────────────────────────── */

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
// iOS exige DeviceOrientationEvent.requestPermission() num gesto: NÃO pedimos
// (prompt invasivo por enfeite) — lá o cartão fica plano.
const gyroFree = () =>
  typeof window !== "undefined" &&
  "DeviceOrientationEvent" in window &&
  typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission !== "function"

/**
 * Paralaxe de inclinação (mouse no computador, giroscópio no Android). A
 * SOMBRA DURA É UM OBJETO: um bloco atrás que desliza ao contrário. No máximo
 * 2 por tela; nunca em headcard, lista ou feed.
 */
export function TiltCard({
  children,
  shadow = "#0B0B0D",
  offset = DIST.shadow,
  max = DIST.tiltMax,
  className,
}: {
  children: ReactNode
  shadow?: string
  offset?: number
  max?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const nx = useMotionValue(0)
  const ny = useMotionValue(0)
  const sx = useSpring(nx, SPRING.tilt)
  const sy = useSpring(ny, SPRING.tilt)
  const rotateY = useTransform(sx, (v) => v * max)
  const rotateX = useTransform(sy, (v) => -v * max)
  const shX = useTransform(sx, (v) => offset - v * DIST.tiltShadow)
  const shY = useTransform(sy, (v) => offset - v * DIST.tiltShadow)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    let visible = false
    let rect: DOMRect | null = null
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      rect = null
      if (!visible) {
        nx.set(0)
        ny.set(0)
      }
    })
    io.observe(el)
    const onMove = (e: PointerEvent) => {
      if (!visible) return
      rect ??= el.getBoundingClientRect()
      nx.set(((e.clientX - rect.left) / rect.width) * 2 - 1)
      ny.set(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }
    const onLeave = () => {
      rect = null
      nx.set(0)
      ny.set(0)
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!visible || document.hidden || e.gamma == null || e.beta == null) return
      nx.set(Math.max(-1, Math.min(1, e.gamma / 25)))
      ny.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25)))
    }
    const onScroll = () => {
      rect = null
    }
    const hover = canHover()
    const gyro = !hover && gyroFree()
    if (hover) {
      el.addEventListener("pointermove", onMove)
      el.addEventListener("pointerleave", onLeave)
      window.addEventListener("scroll", onScroll, { passive: true })
    } else if (gyro) {
      window.addEventListener("deviceorientation", onOrient)
    }
    return () => {
      io.disconnect()
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("deviceorientation", onOrient)
    }
  }, [reduce, nx, ny])

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} style={{ perspective: 900 }}>
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={reduce ? { background: shadow, x: offset, y: offset } : { background: shadow, x: shX, y: shY }}
      />
      <motion.div className="relative" style={reduce ? undefined : { rotateX, rotateY }}>
        {children}
      </motion.div>
    </div>
  )
}

/* ──────────────────────────────── PLACAR ──────────────────────────────── */

/**
 * O número conta até o valor ao entrar na tela — escrevendo no DOM direto
 * (zero re-render por quadro). `tabular-nums` + largura mínima do valor final:
 * nada ao redor se mexe. O primeiro render já é o valor final (leitor de tela
 * e quem rola rápido veem o número certo).
 */
export function CountUp({
  value,
  format,
  duration = DUR.count,
  delay = 0,
  className,
}: {
  value: number
  /** Formata cada quadro — passe uma função estável (useCallback/módulo). */
  format: (n: number) => string
  duration?: number
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const shown = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!inView) {
      el.textContent = format(shown.current)
      return
    }
    if (reduce) {
      el.textContent = format(value)
      shown.current = value
      return
    }
    const ctrl = animate(shown.current, value, {
      duration,
      delay,
      ease: EASE.score,
      onUpdate: (n) => {
        el.textContent = format(n)
        shown.current = n
      },
      onComplete: () => {
        el.textContent = format(value)
        el.animate?.([{ transform: "translateY(-2px)" }, { transform: "none" }], { duration: 140, easing: "ease-out" })
      },
    })
    return () => ctrl.stop()
  }, [inView, value, reduce, duration, delay, format])

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums ${className ?? ""}`}
      style={{ minWidth: `${format(value).length}ch` }}
      aria-label={format(value)}
    >
      {format(value)}
    </span>
  )
}

/* ──────────────────────────────── CARIMBO ─────────────────────────────── */

/**
 * Cai grande e torto e assenta. `play=false` = já carimbado (folheando rápido,
 * revisita, reduced-motion). O ângulo sai da chave: o mesmo dia cai sempre igual.
 */
export function StampMark({
  id,
  play,
  delay = 0,
  from = DIST.stampFrom,
  range = 14,
  children,
  className,
  onDone,
}: {
  id: string
  play: boolean
  delay?: number
  from?: number
  range?: number
  children: ReactNode
  className?: string
  onDone?: () => void
}) {
  const reduce = useReducedMotion()
  const angle = stampAngle(id, range)
  const animated = play && !reduce
  return (
    <motion.span
      className={`inline-grid place-items-center ${className ?? ""}`}
      initial={animated ? { opacity: 0, scale: from, rotate: angle * 2 } : false}
      animate={{ opacity: 1, scale: 1, rotate: angle }}
      transition={animated ? { ...SPRING.stamp, delay, opacity: { duration: DUR.instant, delay } } : { duration: 0 }}
      onAnimationComplete={onDone}
    >
      {children}
    </motion.span>
  )
}

/* ───────────────────────────────── ANEL ───────────────────────────────── */

/**
 * Anel de meta com trilho SEGMENTADO (régua de placar, não donut liso) e
 * ponta reta. Acima de 100% desenha o excesso num segundo arco.
 */
export function RingMeter({
  pct,
  color,
  size = 96,
  stroke = 10,
  track = "#1D1810",
  over = "#FF5A44",
  segments = 10,
  label,
}: {
  pct: number
  color: string
  size?: number
  stroke?: number
  track?: string
  over?: string
  segments?: number
  label?: ReactNode
}) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct / 100))
  const excess = Math.max(0, Math.min(1, pct / 100 - 1))
  const draw = reduce ? { duration: 0 } : { duration: DUR.draw, ease: EASE.ink }
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg ref={ref} viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
          strokeDasharray={segments > 1 ? `${c / segments - 2} 2` : undefined}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          initial={{ pathLength: reduce ? p : 0 }}
          animate={{ pathLength: inView || reduce ? p : 0 }}
          transition={draw}
        />
        {excess > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r - stroke / 2 - 2}
            fill="none"
            stroke={over}
            strokeWidth={3}
            strokeLinecap="butt"
            initial={{ pathLength: reduce ? excess : 0 }}
            animate={{ pathLength: inView || reduce ? excess : 0 }}
            transition={reduce ? draw : { ...draw, delay: DUR.draw }}
          />
        )}
      </svg>
      {label != null && <div className="absolute inset-0 grid place-items-center text-center">{label}</div>}
    </div>
  )
}

/* ──────────────────────────────── PRENSA ──────────────────────────────── */

/**
 * Botão com sombra-bloco: ao apertar o corpo desce e a sombra recua — o botão
 * "afunda" no papel. Substitui o box-shadow nos botões de ação do ambiente.
 */
export function PressButton({
  shadow = "#0B0B0D",
  depth = 3,
  className,
  wrapClassName,
  children,
  disabled,
  ...rest
}: Omit<ComponentProps<typeof motion.button>, "children"> & {
  shadow?: string
  depth?: number
  wrapClassName?: string
  children?: ReactNode
}) {
  const [pressed, setPressed] = useState(false)
  const down = pressed && !disabled
  return (
    <span className={`relative inline-flex ${wrapClassName ?? ""}`}>
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: shadow }}
        initial={false}
        animate={{ x: down ? 0 : depth, y: down ? 0 : depth }}
        transition={SPRING.press}
      />
      <motion.button
        {...rest}
        disabled={disabled}
        className={`relative w-full ${className ?? ""}`}
        initial={false}
        animate={{ x: down ? depth : 0, y: down ? depth : 0 }}
        transition={SPRING.press}
        onTapStart={() => setPressed(true)}
        onTap={() => setPressed(false)}
        onTapCancel={() => setPressed(false)}
      >
        {children}
      </motion.button>
    </span>
  )
}
