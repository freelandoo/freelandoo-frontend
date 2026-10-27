"use client"

// /fitness/historico — O HISTÓRICO: peso e altura (com o registro e a lista de
// medições) e os DIAS já gravados — o que a pessoa bebeu e comeu em cada dia.
// A sala do pill TURQUESA (pedido do Alex, 2026-09-10: "peso, altura,
// histórico (...) você vai salvar e vai ter um histórico").
//
// ⚠️ DESDE 2026-10-09 O "MEU DIA" MORA AQUI, NO TOPO (calorias, água,
// refeições e metas — `FitnessView`), porque a raiz do /fitness virou o feed
// da plataforma (mig 276). Peso, medições e os dias gravados vêm embaixo,
// como `children` do dia.
//
// ⚠️ NADA É "SALVO" DE NOVO: o diário e a água são gravados por DATA conforme
// a pessoa registra (UPSERT). A lista só LÊ o que ficou (`GET
// /fitness/history`) e abre qualquer dia NO PRÓPRIO TOPO, por `openDay` —
// nunca por `?dia=` para a mesma rota, que não relê nada.

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { AlertCircle, Droplets, Flame, History, Loader2, Ruler } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessView } from "../_components/fitness-view"
import { BTN_DARK, BTN_GOLD, CYAN, GOLD, H_SECTION, INPUT, PANEL, PILL, StateBox, todayIso } from "../_components/fitness-ui"
import { AreaLine } from "../_components/ui/charts"
import { Reveal } from "../_components/ui/motion-kit"
import { DUR, EASE } from "../_components/ui/motion"
import { HERO_NUMBER_STYLE, SP } from "../_components/ui/sp-tokens"

type HistoryDay = { date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number }
type HistoryPayload = { days: HistoryDay[]; goals: { daily_kcal_goal: number; water_goal_ml: number } }
type Measurement = { id_measurement: string; weight_kg: string | number | null; height_cm: string | number | null; measured_at: string }

export default function FitnessHistoryPage() {
  return <FitnessView>{(openDay) => <HistoryContent openDay={openDay} />}</FitnessView>
}

function HistoryContent({ openDay }: { openDay: (date: string) => void }) {
  const t = useTranslations("Fitness")
  const locale = useLocale()

  const [history, setHistory] = useState<HistoryPayload | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null)
  const [error, setError] = useState(false)

  const [measureOpen, setMeasureOpen] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [savingMeasure, setSavingMeasure] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const loadMeasurements = useCallback(async () => {
    try {
      const r = await fetch("/api/fitness/measurements", { headers: authHeaders() })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setMeasurements(Array.isArray(d.measurements) ? d.measurements : [])
    } catch {
      setError(true)
    }
  }, [authHeaders])

  useEffect(() => {
    if (!getToken()) return
    let alive = true
    fetch("/api/fitness/history?days=90", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => alive && setHistory(d))
      .catch(() => alive && setError(true))
    void loadMeasurements()
    return () => {
      alive = false
    }
  }, [authHeaders, loadMeasurements])

  const saveMeasurement = useCallback(async () => {
    const w = weight.trim() ? Number(weight.replace(",", ".")) : null
    const h = height.trim() ? Number(height.replace(",", ".")) : null
    if (w === null && h === null) {
      toast.error(t("measureMissing", "Informe peso e/ou altura"))
      return
    }
    setSavingMeasure(true)
    try {
      const res = await fetch("/api/fitness/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ weight_kg: w, height_cm: h }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("measureSaved", "Medição registrada!"))
      setMeasureOpen(false)
      setWeight("")
      setHeight("")
      void loadMeasurements()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("measureError", "Erro ao registrar medição"))
    } finally {
      setSavingMeasure(false)
    }
  }, [weight, height, authHeaders, loadMeasurements, t])

  const latest = measurements && measurements.length > 0 ? measurements[0] : null
  // A curva do peso: as medições com peso, da mais velha para a mais nova.
  const weightSeries = useMemo(
    () =>
      (measurements ?? [])
        .filter((m) => m.weight_kg !== null && m.weight_kg !== "")
        .map((m) => ({ date: m.measured_at, weight_kg: Number(m.weight_kg) }))
        .reverse()
        .slice(-20),
    [measurements]
  )
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" })
  const num = (v: string | number | null) => (v === null || v === undefined || v === "" ? null : Number(v))

  return (
    <>
      <section className="mx-auto mt-10 w-full max-w-5xl px-0 md:px-10">
        {error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={t("loadFailedTitle", "Não deu pra carregar.")}
            desc={t("historyLoadError", "Não deu para carregar o histórico.")}
            accent={PILL.history.bg}
          />
        ) : history === null || measurements === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
          </div>
        ) : (
          <>
            {/* PESO & ALTURA — o último registro em destaque, a lista embaixo. */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className={`${PANEL} p-4`} style={{ boxShadow: `8px 8px 0 0 ${PILL.history.bg}` }}>
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <Ruler className="h-4 w-4 text-[#FB923C]" /> {t("measureTitle", "Peso & altura")}
                </p>
                {latest ? (
                  <>
                    <p className="mt-2 fl-display text-5xl leading-none" style={HERO_NUMBER_STYLE}>
                      {num(latest.weight_kg) !== null ? `${num(latest.weight_kg)!.toFixed(1).replace(".", ",")} kg` : "—"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#9A938A]">
                      {num(latest.height_cm) !== null ? `${num(latest.height_cm)!.toFixed(0)} cm · ` : ""}
                      {fmtDate(latest.measured_at)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[#9A938A]">{t("measureEmpty", "Nenhuma medição ainda.")}</p>
                )}
                {weightSeries.length >= 2 && (
                  <div className="mt-4">
                    <AreaLine series={weightSeries} locale={locale} color={PILL.history.bg} />
                  </div>
                )}
                <button onClick={() => setMeasureOpen(true)} className={`${BTN_DARK} mt-3 px-3 py-1.5 text-[11px]`}>
                  {t("measureCta", "Registrar")}
                </button>
              </div>

              <div className={PANEL}>
                <div className="border-b-2 border-[#0B0B0D] bg-[#7C2D12] px-3 py-2 text-[#F5F1E8]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">{t("historyMeasuresTitle", "Medições")}</p>
                </div>
                {measurements.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-[#9A938A]">{t("historyMeasuresEmpty", "Nenhuma medição ainda.")}</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {measurements.map((m) => (
                      <li key={m.id_measurement} className="flex items-center justify-between gap-2 border-b border-[#F5F1E8]/10 px-3 py-2 text-sm last:border-b-0">
                        <span className="text-xs text-[#9A938A]">{fmtDate(m.measured_at)}</span>
                        <span className="font-bold">{num(m.weight_kg) !== null ? `${num(m.weight_kg)!.toFixed(1)} kg` : "—"}</span>
                        <span className="text-xs text-[#9A938A]">{num(m.height_cm) !== null ? `${num(m.height_cm)!.toFixed(0)} cm` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* OS DIAS — um por linha; abre na raiz pelo `?dia=`. */}
            <section className="mt-8">
              <h2 className={`${H_SECTION} px-3 md:px-0`}>
                <History className="h-4 w-4 text-[#FB923C]" /> {t("historyDaysTitle", "Os seus dias")}
              </h2>
              <p className="mt-1 px-3 text-[11px] text-[#9A938A] md:px-0">
                {t("historyDaysHint", "Os dias em que você registrou comida ou água. Toque num dia para abri-lo lá em cima.")}
              </p>
              {history.days.length === 0 ? (
                <div className="mt-3">
                  <StateBox
                    icon={<History className="h-6 w-6" />}
                    title={t("historyDaysEmptyTitle", "Nada gravado ainda.")}
                    desc={t("historyDaysEmpty", "O que você come e bebe fica guardado aqui, um dia por linha.")}
                    accent={PILL.history.bg}
                    action={
                      <button type="button" onClick={() => openDay(todayIso())} className={`${BTN_GOLD} px-5 py-2.5 text-xs`}>
                        {t("historyGoToday", "Registrar o dia de hoje")}
                      </button>
                    }
                  />
                </div>
              ) : (
                <>
                <HeatCalendar days={history.days} goal={history.goals.daily_kcal_goal} onOpen={openDay} locale={locale} />
                <ul className={`${PANEL} mt-4`}>
                  {history.days.map((d, i) => {
                    const kcalPct = Math.min(100, Math.round((d.kcal / history.goals.daily_kcal_goal) * 100))
                    const waterPct = Math.min(100, Math.round((d.water_ml / history.goals.water_goal_ml) * 100))
                    return (
                      <li key={d.date} className="border-b-2 border-[#0B0B0D] last:border-b-0">
                        <button
                          type="button"
                          onClick={() => openDay(d.date)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#1D1810]"
                          aria-label={t("historyOpenDay", "Abrir o dia {date}").replace("{date}", fmtDay(d.date))}
                        >
                          <span className="w-24 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]">
                            {fmtDay(d.date)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Flame className="h-3.5 w-3.5 shrink-0 text-[#FB923C]" />
                              <span className="font-bold">{d.kcal}</span>
                              <span className="text-[#9A938A]">/ {history.goals.daily_kcal_goal} kcal</span>
                            </span>
                            <span className="mt-1 block h-1.5 border border-[#0B0B0D] bg-[#1D1810]">
                              <GrowBar pct={kcalPct} color={GOLD} delay={Math.min(i, 8) * 0.035} />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Droplets className="h-3.5 w-3.5 shrink-0" style={{ color: CYAN }} />
                              <span className="font-bold">{(d.water_ml / 1000).toFixed(1)}</span>
                              <span className="text-[#9A938A]">/ {(history.goals.water_goal_ml / 1000).toFixed(1)} L</span>
                            </span>
                            <span className="mt-1 block h-1.5 border border-[#0B0B0D] bg-[#1D1810]">
                              <GrowBar pct={waterPct} color={CYAN} delay={Math.min(i, 8) * 0.035 + 0.05} />
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-[10px] text-[#9A938A] sm:block">
                            P {d.protein_g}g · C {d.carbs_g}g · G {d.fat_g}g
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                </>
              )}
            </section>
          </>
        )}
      </section>

      {/* Modal medição */}
      {measureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setMeasureOpen(false)}>
          <div
            className={`w-full max-w-sm ${PANEL} p-5 text-[#F5F1E8]`}
            style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="border-b-2 border-[#0B0B0D] pb-2 text-lg font-black uppercase">{t("measureModalTitle", "Registrar medição")}</h2>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("weightLabel", "Peso (kg)")}</span>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={`${INPUT} mt-1`} />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("heightLabel", "Altura (cm)")}</span>
              <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className={`${INPUT} mt-1`} />
            </label>
            <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
              <button onClick={() => setMeasureOpen(false)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {t("cancel", "Cancelar")}
              </button>
              <button onClick={() => void saveMeasurement()} disabled={savingMeasure} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {savingMeasure && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("measureSubmit", "Salvar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Barra que cresce da esquerda ao entrar (scaleX — composta, nunca width). */
function GrowBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      className="block h-full origin-left"
      style={{ width: `${pct}%`, background: color }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: DUR.enter, ease: EASE.paper, delay }}
    />
  )
}

/**
 * MAPA DE CALOR das últimas 13 semanas (spec visual §4.4): de relance, quais
 * semanas foram boas. Cor = quanto da meta de calorias o dia bateu; sem
 * registro = vazio. Cada quadrado abre o dia lá em cima.
 */
function HeatCalendar({
  days,
  goal,
  onOpen,
  locale,
}: {
  days: { date: string; kcal: number; water_ml: number }[]
  goal: number
  onOpen: (date: string) => void
  locale: string
}) {
  const t = useTranslations("Fitness")
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const today = todayIso()
  const start = useMemo(() => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 7 * 12 - d.getUTCDay())
    return d
  }, [today])
  const cells = Array.from({ length: 13 * 7 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
  const level = (date: string) => {
    const d = byDate.get(date)
    if (!d || (d.kcal <= 0 && d.water_ml <= 0)) return 0
    const r = goal > 0 ? d.kcal / goal : 0
    if (r > 1.1) return 4
    if (r >= 0.85) return 3
    if (r >= 0.5) return 2
    return 1
  }
  const fills = ["transparent", "rgba(13,148,136,.35)", "rgba(13,148,136,.65)", PILL.history.bg, SP.bad]
  const names = [t("heatLow", "pouco"), t("heatMid", "metade"), t("heatOn", "na meta"), t("heatOver", "acima")]
  return (
    <div className={`${PANEL} mt-3 p-3`} style={{ boxShadow: `6px 6px 0 0 ${PILL.history.bg}` }}>
      <Reveal className="grid grid-flow-col grid-rows-7 gap-1" step={0.004} max={91} y={4} tilt={false}>
        {cells.map((date) => {
          const lv = level(date)
          const future = date > today
          return (
            <button
              key={date}
              type="button"
              disabled={future}
              onClick={() => onOpen(date)}
              title={new Date(`${date}T12:00:00Z`).toLocaleDateString(locale)}
              aria-label={t("historyOpenDay", "Abrir o dia {date}").replace("{date}", date)}
              className="block aspect-square w-full border disabled:opacity-20"
              style={{
                background: fills[lv],
                borderColor: date === today ? SP.hot : lv ? "rgba(11,11,13,.6)" : "rgba(244,165,116,.25)",
              }}
            />
          )
        })}
      </Reveal>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]" style={{ color: SP.mute }}>
        <span>{t("heatLegend", "Calorias × meta, 13 semanas")}</span>
        {[1, 2, 3, 4].map((lv) => (
          <span key={lv} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 border border-[#0B0B0D]" style={{ background: fills[lv] }} />
            {names[lv - 1]}
          </span>
        ))}
      </p>
    </div>
  )
}
