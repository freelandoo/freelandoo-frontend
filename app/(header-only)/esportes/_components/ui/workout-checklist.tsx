"use client"

// O CHECKLIST DO TREINO (pedido do Alex, 2026-10-27): "quero o check botão
// grande, e em cima em números grandes 1/6, 2/6, o progresso até concluir, e
// quando clicar em check quero animação, quero que a pessoa sinta prazer em
// apertar". Estrutura de to-do moderno; cantos retos (o círculo vira
// QUADRADO), placar de estádio no topo, barra segmentada, linha inteira é o
// botão. Uma peça para o card E para o modal tela cheia — dois desenhos do
// mesmo check divergiriam na primeira mudança.
//
// ⚠️ A ANIMAÇÃO DISPARA PELO GESTO, não pelo dado: o `CheckButton` anima na
// transição local false→true; uma recarga do servidor que confirma o mesmo
// valor não reanima. O grand finale (N/N) também é local e otimista — esperar
// a rede tiraria o "agora" —, 1× por ficha por dia, e só depois de 250 ms com
// o estado estável (um toque de passagem não solta confete).

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { DUR, EASE, SPRING, buzz, stampAngle } from "./motion"
import { TextStamp } from "./stamp"
import { SP } from "./sp-tokens"

export type ChecklistItem = {
  id: string
  name: string
  sets: number
  reps: string
  load_kg: number | null
  rest_seconds: number | null
  muscle?: string | null
  checked: boolean
}

const ROOM = SP.room.workout
const PARTS = 8

/* ─────────────────────────────── o quadrado ─────────────────────────────── */

/**
 * O quadrado do check — só desenho; quem recebe o toque é a LINHA. Pressão:
 * amassa e desce sobre a sombra-bloco (PRENSA). Soltura que MARCOU: estica com
 * estalo, o verde enche do centro, o ✓ se desenha, um anel quadrado e 8
 * estilhaços retos saem das bordas.
 */
export function CheckButton({
  id,
  checked,
  pressed,
  now = false,
  size = 56,
}: {
  id: string
  checked: boolean
  pressed: boolean
  now?: boolean
  size?: number
}) {
  const reduce = useReducedMotion()
  const prev = useRef(checked)
  const [bursts, setBursts] = useState<number[]>([])
  const [pop, setPop] = useState(0)

  useEffect(() => {
    const was = prev.current
    prev.current = checked
    if (!checked || was || reduce) return
    setPop((n) => n + 1)
    setBursts((b) => [...b.slice(-1), Date.now()]) // no máximo 2 vivos
  }, [checked, reduce])

  const half = size / 2
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      {/* a sombra dura é um objeto: recua quando o quadrado afunda */}
      <motion.span
        className="absolute inset-0"
        style={{ background: checked ? SP.okDeep : "#0B0B0D" }}
        initial={false}
        animate={{ x: pressed ? 1 : 3, y: pressed ? 1 : 3 }}
        transition={SPRING.press}
      />
      <motion.span
        key={pop}
        className="relative grid h-full w-full place-items-center overflow-hidden"
        style={{
          border: `3px solid ${checked ? "#0B0B0D" : now ? ROOM : "rgba(244,165,116,.6)"}`,
          background: SP.panel,
          boxShadow: now && !checked ? `0 0 14px ${ROOM}66` : undefined,
        }}
        initial={pop && !reduce ? { scaleX: 1.18, scaleY: 1.18 } : false}
        animate={
          reduce
            ? undefined
            : pressed
              ? { scaleX: 0.9, scaleY: 0.82, x: 2, y: 2 }
              : { scaleX: 1, scaleY: 1, x: 0, y: 0 }
        }
        transition={pressed ? SPRING.press : SPRING.pop}
      >
        {/* "agora": o quadradinho verde (o ponto da referência, reto) */}
        {now && !checked && <span className="absolute h-3 w-3" style={{ background: SP.ok }} />}
        {/* camada verde: escala do centro, não troca de cor */}
        <motion.span
          className="absolute inset-0"
          style={{ background: SP.ok }}
          initial={false}
          animate={reduce ? { opacity: checked ? 1 : 0 } : { scale: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0.12 } : checked ? SPRING.pop : { duration: DUR.quick, ease: EASE.exit }}
        />
        <svg viewBox="0 0 24 24" className="relative" style={{ width: size * 0.62, height: size * 0.62 }}>
          <motion.path
            d="M4 12.5l5 5L20 6.5"
            fill="none"
            stroke="#0B0B0D"
            strokeWidth={3.6}
            strokeLinecap="square"
            strokeLinejoin="miter"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : checked
                  ? { pathLength: { duration: 0.22, ease: EASE.ink, delay: 0.04 }, opacity: { duration: 0.04, delay: 0.04 } }
                  : { duration: 0.16, ease: EASE.exit }
            }
          />
        </svg>
      </motion.span>

      {/* anel + estilhaços: FORA do overflow do quadrado */}
      <AnimatePresence>
        {bursts.map((k) => (
          <motion.svg
            key={k}
            className="pointer-events-none absolute"
            width={size * 2.4}
            height={size * 2.4}
            viewBox={`${-size * 1.2} ${-size * 1.2} ${size * 2.4} ${size * 2.4}`}
            style={{ left: half - size * 1.2, top: half - size * 1.2, overflow: "visible" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.rect
              x={-half}
              y={-half}
              width={size}
              height={size}
              fill="none"
              stroke={SP.ok}
              strokeWidth={2}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.36, ease: EASE.paper, delay: 0.06 }}
            />
            {Array.from({ length: PARTS }, (_, i) => {
              const a = (i / PARTS) * Math.PI * 2 + stampAngle(`${id}:${i}`, 0.6)
              const d = half + 22 + (i % 3) * 4
              return (
                <motion.rect
                  key={i}
                  x={-1.5}
                  y={-4.5}
                  width={3}
                  height={9}
                  fill={i % 2 ? SP.ok : "#F5F1E8"}
                  initial={{ x: 0, y: 0, rotate: (a * 180) / Math.PI + 90, opacity: 1, scaleY: 1 }}
                  animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scaleY: 0.3 }}
                  transition={{ duration: 0.42, ease: EASE.paper, delay: 0.06 }}
                  onAnimationComplete={
                    i === PARTS - 1 ? () => setBursts((b) => b.filter((x) => x !== k)) : undefined
                  }
                />
              )
            })}
          </motion.svg>
        ))}
      </AnimatePresence>
    </span>
  )
}

/* ──────────────────────────────── o placar ──────────────────────────────── */

function Digit({ d, dir }: { d: string; dir: 1 | -1 }) {
  const reduce = useReducedMotion()
  return (
    <span className="relative inline-block overflow-hidden align-bottom" style={{ height: "1em", width: "0.6em" }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={d}
          custom={dir}
          className="absolute inset-0 grid place-items-center leading-none"
          variants={{
            enter: (s: number) => (reduce ? { opacity: 0 } : { y: `${100 * s}%` }),
            center: { y: "0%", opacity: 1, transition: reduce ? { duration: 0.12 } : SPRING.flip },
            exit: (s: number) =>
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { y: `${-100 * s}%`, transition: { duration: 0.22, ease: EASE.exit } },
          }}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {d}
        </motion.span>
      </AnimatePresence>
      {/* a "dobra" da placa, só durante a virada */}
      {!reduce && (
        <motion.span
          key={`fold-${d}`}
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-[2px] bg-[#0B0B0D]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </span>
  )
}

/** Placar de estádio "feitos / total": só `value` vira (rolo vertical). */
export function FlipCounter({
  value,
  total,
  dir,
  done,
  punch,
}: {
  value: number
  total: number
  dir: 1 | -1
  done: boolean
  punch: number
}) {
  const reduce = useReducedMotion()
  const width = String(total).length
  const digits = String(value).padStart(width, " ").split("")
  return (
    <motion.p
      key={punch}
      className="fl-display flex items-baseline justify-center leading-none tabular-nums"
      style={{ fontSize: "clamp(72px, 22vw, 96px)" }}
      initial={punch && !reduce ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={SPRING.stamp}
    >
      <span
        aria-hidden
        className="inline-flex"
        style={
          done
            ? { color: SP.ok, filter: "drop-shadow(0 0 18px rgba(34,197,94,.5))" }
            : {
                backgroundImage: `linear-gradient(180deg, ${SP.hot} 0%, ${SP.glow} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 0 18px rgba(249,115,22,.45))",
              }
        }
      >
        {digits.map((d, i) => (
          <Digit key={i} d={d} dir={dir} />
        ))}
      </span>
      <span aria-hidden className="ml-2 text-[0.42em]" style={{ color: done ? SP.ok : SP.mute }}>
        / {total}
      </span>
    </motion.p>
  )
}

/* ──────────────────────────────── a barra ──────────────────────────────── */

/**
 * Barra segmentada (um segmento por exercício: dá para contar quantos
 * faltam). Enchimento por scaleX com mola, clamp em 1 para o overshoot não
 * vazar. Em 100% os segmentos se fundem numa barra verde e ela pulsa 1×.
 */
export function ChecklistProgress({
  done,
  total,
  thin = false,
  label,
}: {
  done: number
  total: number
  thin?: boolean
  label?: string
}) {
  const reduce = useReducedMotion()
  const p = total > 0 ? done / total : 0
  const spring = useSpring(p, reduce ? { duration: 0 } : { stiffness: 260, damping: 26 })
  const scaleX = useTransform(spring, (v) => Math.max(0, Math.min(1, v)))
  useEffect(() => {
    spring.set(p)
  }, [p, spring])
  const complete = total > 0 && done === total
  return (
    <div className="flex items-center gap-3">
      <motion.div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={label}
        className={`relative flex-1 overflow-hidden border-2 border-[#0B0B0D] ${thin ? "h-1.5" : "h-3"}`}
        style={{ background: SP.inner }}
        animate={complete && !reduce ? { scaleY: [1, 1.6, 1] } : { scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.38 }}
      >
        <motion.div
          className="absolute inset-0 origin-left"
          style={{
            scaleX,
            background: complete ? SP.ok : `linear-gradient(90deg, ${ROOM}, ${SP.ember})`,
          }}
        />
        {!complete &&
          Array.from({ length: Math.max(0, total - 1) }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-y-0 w-[2px]"
              style={{ left: `calc(${((i + 1) / total) * 100}% - 1px)`, background: SP.inner }}
            />
          ))}
        {complete && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-[30%]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)" }}
            initial={{ x: "-100%" }}
            animate={{ x: "350%" }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE.paper }}
          />
        )}
      </motion.div>
      {!thin && (
        <span className="w-10 text-right font-mono text-xs font-semibold" style={{ color: SP.mute }}>
          {Math.round(p * 100)}%
        </span>
      )}
    </div>
  )
}

/* ──────────────────────────────── a linha ──────────────────────────────── */

function ChecklistRow({
  item,
  index,
  isNow,
  disabled,
  onToggle,
  size,
}: {
  item: ChecklistItem
  index: number
  isNow: boolean
  disabled: boolean
  onToggle: () => void
  size: number
}) {
  const t = useTranslations("Fitness")
  const tw = useTranslations("Workouts")
  const reduce = useReducedMotion()
  const [pressed, setPressed] = useState(false)
  const [settle, setSettle] = useState(0)
  const prev = useRef(item.checked)
  useEffect(() => {
    const was = prev.current
    prev.current = item.checked
    if (item.checked && !was) setSettle((n) => n + 1)
  }, [item.checked])

  const load = item.load_kg ? ` · ${item.load_kg} kg` : ""
  const meta = `${item.sets}×${item.reps}${load}`
  const aria = item.checked
    ? t("chkRowDone", "{name} — feito, toque para desmarcar").replace("{name}", item.name)
    : t("chkRowTodo", "{name}, {sets} séries de {reps}{load} — marcar como feito")
        .replace("{name}", item.name)
        .replace("{sets}", String(item.sets))
        .replace("{reps}", item.reps)
        .replace("{load}", load) + (isNow ? ` (${t("chkRowNext", "próximo exercício")})` : "")

  const release = () => setPressed(false)
  return (
    <motion.li
      key={settle}
      initial={settle && !reduce ? { y: 0 } : false}
      animate={settle && !reduce ? { y: [0, 2, 0] } : undefined}
      transition={{ duration: 0.2, delay: 0.2 }}
    >
      <button
        type="button"
        aria-pressed={item.checked}
        aria-label={aria}
        aria-disabled={disabled}
        onPointerDown={() => {
          if (disabled) return
          setPressed(true)
          if (!item.checked) buzz(8)
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={disabled ? undefined : onToggle}
        className="group relative flex min-h-[76px] w-full items-center gap-3 border-2 px-3 py-2.5 text-left outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FFD2A6] md:min-h-[68px]"
        style={{
          borderColor: "#0B0B0D",
          borderLeft: isNow && !item.checked ? `5px solid ${ROOM}` : undefined,
          background: item.checked ? "rgba(36,29,18,.6)" : SP.inner,
          cursor: disabled ? "default" : "pointer",
        }}
      >
        <motion.span
          className="flex w-full items-center gap-3"
          animate={reduce ? undefined : { x: pressed ? 2 : 0 }}
          transition={SPRING.press}
        >
          <CheckButton id={item.id} checked={item.checked} pressed={pressed} now={isNow} size={size} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="fl-display text-lg leading-none" style={{ color: item.checked ? SP.ok : SP.dim }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative min-w-0">
                <motion.span
                  className="block text-base font-extrabold uppercase leading-tight tracking-[0.02em] text-[#FFF1E6]"
                  initial={false}
                  animate={{ opacity: item.checked ? 0.6 : 1 }}
                  transition={{ duration: 0.26, delay: item.checked ? 0.08 : 0 }}
                >
                  {item.name}
                </motion.span>
                <motion.span
                  aria-hidden
                  className="absolute inset-x-0 top-1/2 h-[2px]"
                  style={{ background: SP.mute, originX: item.checked ? 0 : 1 }}
                  initial={false}
                  animate={{ scaleX: item.checked ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: item.checked ? 0.26 : 0.18, ease: EASE.ink, delay: item.checked ? 0.08 : 0 }
                  }
                />
              </span>
              {isNow && !item.checked && (
                <motion.span
                  layoutId="esp-chk-now"
                  className="ml-auto shrink-0 border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white"
                  style={{ background: ROOM }}
                  transition={SPRING.pill}
                >
                  ◂ {t("chkNow", "Agora")}
                </motion.span>
              )}
            </span>
            <motion.span
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px]"
              style={{ color: SP.mute }}
              initial={false}
              animate={{ opacity: item.checked ? 0.6 : 1 }}
            >
              <span className="font-semibold">{meta}</span>
              {item.muscle && (
                <span className="border border-[#0B0B0D] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.08em]" style={{ background: SP.panel, color: SP.glow }}>
                  {item.muscle}
                </span>
              )}
              {item.rest_seconds ? (
                <span className="text-[11px] opacity-70">{tw("restLabel", "descanso {s}s").replace("{s}", String(item.rest_seconds))}</span>
              ) : null}
            </motion.span>
          </span>
        </motion.span>
      </button>
    </motion.li>
  )
}

/* ─────────────────────────────── o checklist ─────────────────────────────── */

/** Confete CONTIDO no card (nunca camada de janela), 24 peças, 1×. */
function Confetti({ seed }: { seed: string }) {
  const colors = [SP.ok, ROOM, SP.ember, "#F5F1E8"]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Array.from({ length: 24 }, (_, i) => {
        const r = (k: string, range: number) => stampAngle(`${seed}:${i}:${k}`, range)
        const x = (i % 2 ? 1 : -1) * (40 + Math.abs(r("x", 240)))
        const up = 60 + Math.abs(r("u", 160))
        const down = 120 + Math.abs(r("d", 280))
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[30%] h-2.5 w-1"
            style={{ background: colors[i % 4] }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x, y: [0, -up, down], rotate: r("r", 1440), opacity: [1, 1, 0] }}
            transition={{ duration: 1.1 + (i % 5) * 0.1, ease: EASE.paper, times: [0, 0.35, 1] }}
          />
        )
      })}
    </div>
  )
}

export function WorkoutChecklist({
  items,
  planKey,
  dayKey,
  onToggle,
  disabledReason,
  checkSize = 56,
  completedAt,
}: {
  items: ChecklistItem[]
  /** id da ficha — chave do "1× por ficha por dia". */
  planKey: string
  dayKey: string
  onToggle: (item: ChecklistItem) => void
  disabledReason?: string | null
  checkSize?: number
  completedAt?: string | null
}) {
  const t = useTranslations("Fitness")
  const reduce = useReducedMotion()
  const done = items.filter((i) => i.checked).length
  const total = items.length
  const complete = total > 0 && done === total
  const nowIdx = items.findIndex((i) => !i.checked)
  const [dir, setDir] = useState<1 | -1>(1)
  const prevDone = useRef(done)
  const [finale, setFinale] = useState(0)
  const [punch, setPunch] = useState(0)
  const live = complete
    ? t("chkDoneStamp", "Treino concluído")
    : t("chkLive", "{done} de {total} exercícios concluídos").replace("{done}", String(done)).replace("{total}", String(total))

  useEffect(() => {
    if (done !== prevDone.current) setDir(done > prevDone.current ? 1 : -1)
    prevDone.current = done
  }, [done])

  // GRAND FINALE: estado estável por 250 ms, 1× por ficha por dia.
  const wasComplete = useRef(complete)
  useEffect(() => {
    const before = wasComplete.current
    wasComplete.current = complete
    if (!complete || before) return
    const key = `esp:done:${planKey}:${dayKey}`
    const timer = setTimeout(() => {
      setPunch((n) => n + 1)
      let seen = false
      try {
        seen = window.localStorage.getItem(key) === "1"
        window.localStorage.setItem(key, "1")
      } catch {
        /* sem storage: comemora */
      }
      if (!seen) {
        setFinale((n) => n + 1)
        buzz([12, 40, 18])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [complete, planKey, dayKey])

  const doneTime = useMemo(() => {
    if (!completedAt) return null
    try {
      return new Date(completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    } catch {
      return null
    }
  }, [completedAt])

  const footer = t("chkFooter", "{done} de {total} concluídos").replace("{done}", String(done)).replace("{total}", String(total))

  return (
    <div className="relative">
      {finale > 0 && !reduce && <Confetti key={finale} seed={`${planKey}:${finale}`} />}

      {/* ── placar ── */}
      <div className="relative px-4 pb-4 pt-5 text-center">
        <FlipCounter value={done} total={total} dir={dir} done={complete} punch={punch} />
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: SP.mute }}>
          {t("chkExercises", "exercícios")}
          {!complete && total > 0 && (
            <span style={{ color: ROOM }}> · {t("chkLeft", "Faltam {n}").replace("{n}", String(total - done))}</span>
          )}
        </p>
        <span className="sr-only" role="status" aria-live="polite">
          {live}
        </span>
        <div className="mt-4">
          <ChecklistProgress done={done} total={total} label={live} />
        </div>

        <AnimatePresence>
          {complete && (
            <motion.div
              key="stamp"
              className="pointer-events-none absolute inset-x-0 top-6 z-20 grid place-items-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.2, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={reduce ? { duration: 0.2 } : { ...SPRING.stamp, delay: 0.52 }}
            >
              <TextStamp color={SP.ok} size="lg" className="bg-[#0c0503]/70">
                {t("chkDoneStamp", "Treino concluído")}
              </TextStamp>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {complete && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.enter, ease: EASE.paper, delay: 0.6 }}
          className="mx-4 mb-3 border-2 border-[#0B0B0D] px-3 py-1.5 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]"
          style={{ background: SP.ok }}
        >
          {doneTime ? t("chkDoneAt", "Treino concluído · {time}").replace("{time}", doneTime) : t("chkDoneStamp", "Treino concluído")}
        </motion.p>
      )}

      {/* ── linhas ── */}
      {total === 0 ? (
        <div className="mx-4 mb-4 border-2 border-dashed px-4 py-6 text-center text-sm font-bold" style={{ borderColor: SP.mute, color: SP.mute }}>
          {t("chkEmptyPlan", "Esta ficha está sem exercícios")}
        </div>
      ) : (
        <ul className="space-y-2 px-3 pb-3">
          {items.map((it, i) => (
            <ChecklistRow
              key={it.id}
              item={it}
              index={i}
              isNow={i === nowIdx}
              disabled={!!disabledReason}
              onToggle={() => onToggle(it)}
              size={checkSize}
            />
          ))}
        </ul>
      )}

      {/* ── rodapé grudado na base do card ── */}
      {total > 0 && (
        <div className="sticky bottom-0 z-10 border-t-2 border-[#0B0B0D] px-4 py-2.5" style={{ background: SP.panel }}>
          <div className="flex items-center gap-3">
            <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: complete ? SP.ok : SP.mute }}>
              {footer}
              {complete ? " ✓" : ""}
            </span>
            <div className="flex-1">
              <ChecklistProgress done={done} total={total} thin />
            </div>
          </div>
          {disabledReason && (
            <p className="mt-1 font-mono text-[11px]" style={{ color: SP.mute }}>
              {disabledReason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
