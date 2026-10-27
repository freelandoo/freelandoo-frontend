"use client"

// O CALENDÁRIO-OBJETO da "Minha academia" (pedido do Alex, 2026-10-27): um
// calendário de papel colado no placar escuro — topo brasa com duas PRESILHAS
// retas (a argola do ícone de calendário 3D, sem arredondar), linha dos dias
// da semana começando no DOMINGO nos três idiomas, ✓ verde nos dias de
// catraca e ✕ vermelho CARIMBADO nos dias passados sem entrada desde o
// vínculo. Hoje: anel quadrado. Futuro: só o número. Antes do vínculo: hachura.
//
// Os dados vêm de `GET /fitness/academies/:id_member/month` (mig 310), que já
// devolve tudo no fuso de Brasília. A grade é calculável no cliente, então
// trocar de mês NUNCA mostra esqueleto: os números ficam e as marcas chegam.

import { useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { DUR, EASE, STAGGER, stepFor } from "./motion"
import { CountUp, StampMark, TiltCard, useInViewOnce } from "./motion-kit"
import { InkCheck, InkX } from "./stamp"
import { SP, TX } from "./sp-tokens"

export type MonthData = {
  ym: string
  prev_ym: string | null
  next_ym: string | null
  today: string
  linked_at: string
  days: string[]
  days_in_month: number
  present: number
  elapsed: number
  streak: number
}

type DayState = "present" | "missed" | "today" | "future" | "before" | "plain"

const fmtInt = (n: number) => String(Math.round(n))

function weekdayLetters(locale: string): string[] {
  // 2023-01-01 foi domingo: a semana começa no domingo em pt/en/es.
  const f = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" })
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2023, 0, 1 + i))).toUpperCase())
}

export function CalendarObject({
  data,
  loading,
  error,
  onNavigate,
  onRetry,
}: {
  data: MonthData | null
  /** Mês pedido enquanto a resposta não chega (grade já desenhada). */
  loading: boolean
  error: boolean
  onNavigate: (ym: string) => void
  onRetry: () => void
}) {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const reduce = useReducedMotion()
  const [dir, setDir] = useState<1 | -1>(1)
  const lastNav = useRef(0)
  const [fast, setFast] = useState(false)

  const ym = data?.ym ?? ""
  const title = useMemo(() => {
    if (!ym) return ""
    const [y, m] = ym.split("-").map(Number)
    const s = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, 1))
    )
    return s.toUpperCase()
  }, [ym, locale])
  const letters = useMemo(() => weekdayLetters(locale), [locale])

  function go(target: string | null, d: 1 | -1) {
    if (!target) return
    const now = performance.now()
    setFast(now - lastNav.current < 300)
    lastNav.current = now
    setDir(d)
    onNavigate(target)
  }

  const isCurrentMonth = !!data && data.ym === data.today.slice(0, 7)
  const todayHit = !!data && data.days.includes(data.today)
  const denom = data ? data.elapsed + (isCurrentMonth && todayHit ? 1 : 0) : 0

  return (
    <TiltCard shadow={SP.band} offset={8} className="w-full">
      <div
        className="relative border-2 border-[#1A0A05]"
        style={{ background: SP.paper, boxShadow: "0 0 28px rgba(249,115,22,.22)" }}
      >
        {/* ── topo brasa + presilhas (fica FORA da folha: a folha passa por baixo) ── */}
        <div className="relative z-20">
          {[0.25, 0.75].map((x) => (
            <span
              key={x}
              aria-hidden
              className="absolute -top-3 z-30 h-[22px] w-2 border border-[#0B0B0D]"
              style={{ left: `calc(${x * 100}% - 4px)`, background: "#0B0B0D", boxShadow: `inset 1px 0 0 ${SP.hot}` }}
            />
          ))}
          <div className="grid grid-cols-[44px_1fr_44px] items-stretch border-b-2 border-[#1A0A05]">
            <NavButton
              label={t("calPrev", "Mês anterior")}
              disabled={!data?.prev_ym}
              onClick={() => go(data?.prev_ym ?? null, -1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </NavButton>
            <div className="relative flex h-14 items-center justify-center overflow-hidden" style={{ background: SP.emberDeep }}>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: SP.band }} />
              <h3 id={`cal-${ym}`} className="fl-display relative text-2xl leading-none text-[#FFF1E6] md:text-[26px]">
                {title || "—"}
              </h3>
            </div>
            <NavButton
              label={t("calNext", "Próximo mês")}
              disabled={!data?.next_ym}
              onClick={() => go(data?.next_ym ?? null, 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </NavButton>
          </div>
          <div className="grid grid-cols-7 bg-[#1A0A05] py-1">
            {letters.map((l, i) => (
              <span key={i} className="text-center text-[11px] font-extrabold tracking-[0.1em]" style={{ color: i === 0 ? SP.glow : SP.paper }}>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── a folha do mês ── */}
        <div className="relative overflow-hidden" style={{ perspective: 900, background: TX.paperGrain }}>
          {data ? (
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={data.ym}
                custom={dir}
                variants={{
                  enter: (d: number) => (reduce ? { opacity: 0 } : d > 0 ? { opacity: 1, rotateX: 0 } : { opacity: 0, rotateX: 95 }),
                  center: { opacity: 1, rotateX: 0, transition: { duration: reduce ? DUR.quick : DUR.sheet, ease: EASE.sheet } },
                  exit: (d: number) =>
                    reduce
                      ? { opacity: 0, transition: { duration: DUR.quick } }
                      : d > 0
                        ? { rotateX: -95, opacity: [1, 1, 0], transition: { duration: DUR.sheet, ease: EASE.sheet, times: [0, 0.7, 1] } }
                        : { opacity: 0, transition: { duration: DUR.quick } },
                }}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ transformOrigin: "50% 0%", backfaceVisibility: "hidden", background: SP.paper }}
              >
                <MonthGrid data={data} fast={fast} loading={loading} labelledBy={`cal-${ym}`} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="grid aspect-[7/6] place-items-center text-xs font-bold uppercase tracking-[0.14em]" style={{ color: SP.paperMute }}>
              {t("calLoading", "Carregando o mês…")}
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between gap-2 border-t-2 border-[#1A0A05] px-3 py-2 text-xs font-bold" style={{ background: "#FFE1DA", color: SP.badPaper }}>
              <span>{t("calError", "Não deu pra carregar este mês.")}</span>
              <button type="button" onClick={onRetry} className="underline underline-offset-2">
                {t("retry", "Tentar de novo")}
              </button>
            </div>
          )}
        </div>

        {/* ── rodapé: total do mês + sequência + legenda ── */}
        <div className="border-t-2 border-[#1A0A05] px-3 py-3" style={{ color: SP.paperInk }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="flex items-baseline gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
              <CountUp value={data?.present ?? 0} format={fmtInt} className="fl-display text-[32px] leading-none" />
              <span>
                {t("calOfDays", "de {n} dias").replace("{n}", String(denom))}
              </span>
            </p>
            {isCurrentMonth && (data?.streak ?? 0) > 0 && (
              <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                <Flame className="h-4 w-4" style={{ color: SP.emberDeep }} />
                <CountUp value={data!.streak} format={fmtInt} className="fl-display text-2xl leading-none" />
                <span>{t("calStreak", "dias seguidos")}</span>
              </p>
            )}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: SP.paperMute }}>
            <span className="inline-flex items-center gap-1">
              <InkCheck className="h-3.5 w-3.5" /> {t("calLegendIn", "entrou")}
            </span>
            <span className="inline-flex items-center gap-1">
              <InkX className="h-3.5 w-3.5" /> {t("calLegendMiss", "faltou")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 border-2" style={{ borderColor: SP.ember }} /> {t("calLegendToday", "hoje")}
            </span>
          </p>
        </div>
      </div>
    </TiltCard>
  )
}

function NavButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { y: 2 }}
      className="grid place-items-center bg-[#0B0B0D] text-[#FFF1E6] transition-opacity"
      style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </motion.button>
  )
}

function MonthGrid({
  data,
  fast,
  loading,
  labelledBy,
}: {
  data: MonthData
  fast: boolean
  loading: boolean
  labelledBy: string
}) {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const [y, m] = data.ym.split("-").map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const present = useMemo(() => new Set(data.days), [data.days])
  const linked = data.linked_at
  const longDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }),
    [locale]
  )

  const cells = Array.from({ length: data.days_in_month }, (_, i) => {
    const d = i + 1
    const day = `${data.ym}-${String(d).padStart(2, "0")}`
    let state: DayState
    if (day < linked) state = "before"
    else if (day === data.today) state = "today"
    else if (day > data.today) state = "future"
    else state = present.has(day) ? "present" : "missed"
    return { d, day, state, hit: present.has(day), sunday: (lead + i) % 7 === 0 }
  })
  // A cascata segue a ordem do dia (o mês "sendo carimbado"), com teto.
  const marked = cells.filter((c) => c.state === "present" || c.state === "missed" || (c.state === "today" && c.hit))
  const step = stepFor(marked.length, STAGGER.stamps, fast ? 0.35 : 0.6)
  const order = new Map(marked.map((c, i) => [c.day, i]))
  // As marcas MONTAM quando a grade entra na tela (o `initial` do carimbo é
  // decidido na montagem). Folheando rápido ou com a resposta ainda vindo,
  // aparecem já carimbadas.
  const play = !fast && !loading

  return (
    <div ref={ref} role="grid" aria-labelledby={labelledBy} className="grid grid-cols-7 gap-px p-1.5">
      {Array.from({ length: lead }, (_, i) => (
        <span key={`l${i}`} aria-hidden className="aspect-square" />
      ))}
      {cells.map((c) => {
        const label =
          longDate.format(new Date(Date.UTC(y, m - 1, c.d))) +
          ", " +
          (c.state === "present"
            ? t("calAriaIn", "entrada registrada")
            : c.state === "missed"
              ? t("calAriaMiss", "sem entrada")
              : c.state === "today"
                ? c.hit
                  ? t("calAriaTodayIn", "hoje, entrada registrada")
                  : t("calAriaToday", "hoje")
                : c.state === "before"
                  ? t("calAriaBefore", "antes do vínculo")
                  : t("calAriaFuture", "ainda não chegou"))
        const marks = c.state === "present" || c.state === "missed" || (c.state === "today" && c.hit)
        const idx = order.get(c.day) ?? 0
        return (
          <div
            key={c.day}
            role="gridcell"
            aria-label={label}
            className="relative aspect-square"
            style={c.state === "before" ? { background: TX.hatch } : undefined}
          >
            {c.state === "today" && (
              <span
                aria-hidden
                className="absolute inset-[3px] border-[3px]"
                style={{ borderColor: SP.ember, boxShadow: "0 0 10px rgba(255,140,43,.45)" }}
              />
            )}
            <span
              className={`absolute font-extrabold leading-none ${marks ? "left-1 top-1 text-[10px]" : "inset-0 grid place-items-center fl-display text-[22px] md:text-[26px]"}`}
              style={{
                color:
                  c.state === "future" || c.state === "before"
                    ? SP.paperMute
                    : c.sunday && !marks
                      ? SP.emberDeep
                      : SP.paperInk,
                opacity: c.state === "before" ? 0.5 : 1,
              }}
            >
              {c.d}
            </span>
            {marks && inView && (
              <span className="absolute inset-[14%] grid place-items-center">
                <StampMark id={c.day} play={play} delay={idx * step} range={c.hit ? 6 : 16} className="h-full w-full">
                  {c.hit ? (
                    <InkCheck variant={c.d} className="h-full w-full" />
                  ) : (
                    <InkX variant={c.d} className="h-full w-full" />
                  )}
                </StampMark>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
