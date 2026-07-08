"use client"

// Aba "Indicadores" do painel fitness: KPIs de saúde/consistência calculados
// no back (GET /fitness/indicators) + gráficos leves em HTML/SVG na identidade
// (barras mono-série dourado/ciano com linha de meta, linha de peso com
// marcadores, distribuição de macros com gaps e rótulos diretos).

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  CalendarCheck,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Indicators = {
  bmi: { value: number; class: string; weight_kg: number; height_cm: number } | null
  weight: { series: { date: string; weight_kg: number }[]; delta_30d: number | null }
  kcal: { goal: number; avg_7d: number | null; avg_30d: number | null; days_logged_30d: number; days_on_target_30d: number }
  macros: {
    protein_avg_g: number | null
    carbs_avg_g: number | null
    fat_avg_g: number | null
    protein_g_per_kg: number | null
    pct: { protein: number; carbs: number; fat: number } | null
  }
  water: { goal: number; avg_7d: number | null; avg_30d: number | null; days_on_target_30d: number; ml_per_kg: number | null }
  streak_days: number
  workouts: { sessions_7d: number; sessions_30d: number }
  academy: { frequency_30d: number } | null
  chart_14d: { date: string; kcal: number; water_ml: number }[]
}

const GOLD = "#F2B705"
const CYAN = "#16c8e8"
const MAGENTA = "#ff1f8e"
const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"

const BMI_CLASS: Record<string, [string, string, string]> = {
  underweight: ["bmiUnder", "Abaixo do peso", CYAN],
  normal: ["bmiNormal", "Peso normal", "#4fc95a"],
  overweight: ["bmiOver", "Sobrepeso", GOLD],
  obese1: ["bmiOb1", "Obesidade I", "#ff8c2e"],
  obese2: ["bmiOb2", "Obesidade II", "#ff5a44"],
  obese3: ["bmiOb3", "Obesidade III", "#ff5a44"],
}

function Tile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: string
}) {
  return (
    <div className={`${PANEL} p-4`}>
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        <span style={{ color: accent || GOLD }}>{icon}</span> {label}
      </p>
      <p className="mt-2 text-3xl font-black leading-none">{value}</p>
      {sub && <p className="mt-2 text-[11px] text-[#9A938A]">{sub}</p>}
    </div>
  )
}

/** Barras diárias mono-série (14 dias) com linha tracejada de meta. */
function DailyBars({
  data,
  goal,
  color,
  goalLabel,
  fmt,
  locale,
}: {
  data: { date: string; value: number }[]
  goal: number
  color: string
  goalLabel: string
  fmt: (v: number) => string
  locale: string
}) {
  const max = Math.max(goal * 1.15, ...data.map((d) => d.value), 1)
  const goalPct = Math.min(100, (goal / max) * 100)
  return (
    <div>
      <div className="relative h-32">
        {/* linha de meta */}
        <div
          className="absolute inset-x-0 z-10 border-t-2 border-dashed border-[#F5F1E8]/35"
          style={{ bottom: `${goalPct}%` }}
        >
          <span className="absolute -top-4 right-0 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
            {goalLabel}
          </span>
        </div>
        <div className="flex h-full items-end gap-[2px]">
          {data.map((d) => (
            <div
              key={d.date}
              title={`${new Date(`${d.date}T12:00:00Z`).toLocaleDateString(locale)} · ${fmt(d.value)}`}
              className="group relative flex-1 cursor-default"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%`, background: color }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d) => (
          <span key={d.date} className="flex-1 text-center text-[8px] font-bold text-[#9A938A]">
            {new Date(`${d.date}T12:00:00Z`).getUTCDate()}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Linha de peso (SVG) com marcadores e rótulo direto no último ponto. */
function WeightLine({ series, locale }: { series: { date: string; weight_kg: number }[]; locale: string }) {
  const pts = series
  const min = Math.min(...pts.map((p) => p.weight_kg))
  const max = Math.max(...pts.map((p) => p.weight_kg))
  const pad = Math.max(0.5, (max - min) * 0.15)
  const lo = min - pad
  const hi = max + pad
  const x = (i: number) => (pts.length === 1 ? 50 : (i / (pts.length - 1)) * 100)
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100
  const points = pts.map((p, i) => `${x(i)},${y(p.weight_kg)}`).join(" ")
  const last = pts[pts.length - 1]
  return (
    <div className="relative h-36 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <polyline points={points} fill="none" stroke={GOLD} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      {pts.map((p, i) => (
        <span
          key={`${p.date}-${i}`}
          title={`${new Date(p.date).toLocaleDateString(locale)} · ${p.weight_kg.toFixed(1)} kg`}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-[#15120E]"
          style={{ left: `${x(i)}%`, top: `${y(p.weight_kg)}%`, background: GOLD }}
        />
      ))}
      <span
        className="absolute -translate-y-1/2 whitespace-nowrap pl-3 text-xs font-black text-[#F5F1E8]"
        style={{ left: `${x(pts.length - 1)}%`, top: `${y(last.weight_kg)}%` }}
      >
        {last.weight_kg.toFixed(1)} kg
      </span>
    </div>
  )
}

export function IndicatorsTab() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const [data, setData] = useState<Indicators | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch("/api/fitness/indicators", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      setData(await res.json())
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const kcalSeries = useMemo(
    () => (data ? data.chart_14d.map((d) => ({ date: d.date, value: d.kcal })) : []),
    [data]
  )
  const waterSeries = useMemo(
    () => (data ? data.chart_14d.map((d) => ({ date: d.date, value: d.water_ml })) : []),
    [data]
  )

  if (state === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "error" || !data) {
    return <p className="py-16 text-center text-sm text-[#9A938A]">{t("indLoadError", "Erro ao carregar os indicadores.")}</p>
  }

  const bmiMeta = data.bmi ? BMI_CLASS[data.bmi.class] || BMI_CLASS.normal : null
  const delta = data.weight.delta_30d

  return (
    <div className="mt-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={<HeartPulse className="h-4 w-4" />}
          label={t("indBmi", "IMC")}
          accent={bmiMeta ? bmiMeta[2] : GOLD}
          value={
            data.bmi ? (
              <>
                {data.bmi.value.toFixed(1).replace(".", ",")}
                <span className="ml-2 align-middle text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: bmiMeta![2] }}>
                  {t(bmiMeta![0], bmiMeta![1])}
                </span>
              </>
            ) : (
              "—"
            )
          }
          sub={
            data.bmi
              ? `${data.bmi.weight_kg.toFixed(1)} kg · ${data.bmi.height_cm.toFixed(0)} cm`
              : t("indBmiEmpty", "Registre peso e altura pra calcular.")
          }
        />
        <Tile
          icon={delta !== null && delta < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          label={t("indWeightTrend", "Peso (30 dias)")}
          accent={delta === null ? GOLD : delta <= 0 ? "#4fc95a" : "#ff8c2e"}
          value={
            delta === null ? "—" : `${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")} kg`
          }
          sub={t("indWeightTrendSub", "Variação desde a medição de 30 dias atrás.")}
        />
        <Tile
          icon={<Flame className="h-4 w-4" />}
          label={t("indKcalAvg", "Calorias — média 7d")}
          value={data.kcal.avg_7d !== null ? `${data.kcal.avg_7d}` : "—"}
          sub={`${t("indGoal", "Meta")}: ${data.kcal.goal} kcal · ${t("indOnTarget", "{n}/{d} dias na meta (30d)")
            .replace("{n}", String(data.kcal.days_on_target_30d))
            .replace("{d}", String(data.kcal.days_logged_30d))}`}
        />
        <Tile
          icon={<Activity className="h-4 w-4" />}
          label={t("indProtein", "Proteína")}
          value={
            data.macros.protein_g_per_kg !== null ? `${String(data.macros.protein_g_per_kg).replace(".", ",")} g/kg` : "—"
          }
          sub={
            data.macros.protein_avg_g !== null
              ? `${t("indProteinAvg", "Média {n} g/dia").replace("{n}", String(data.macros.protein_avg_g))} · ${t("indProteinRef", "referência 1,2–2,0 g/kg")}`
              : t("indProteinEmpty", "Registre refeições pra calcular.")
          }
        />
        <Tile
          icon={<Droplets className="h-4 w-4" />}
          label={t("indWaterAvg", "Água — média 7d")}
          accent={CYAN}
          value={data.water.avg_7d !== null ? `${(data.water.avg_7d / 1000).toFixed(1).replace(".", ",")} L` : "—"}
          sub={`${t("indGoal", "Meta")}: ${(data.water.goal / 1000).toFixed(1)} L · ${t("indWaterTarget", "{n} dias na meta (30d)").replace("{n}", String(data.water.days_on_target_30d))}${data.water.ml_per_kg ? ` · ${data.water.ml_per_kg} ml/kg` : ""}`}
        />
        <Tile
          icon={<CalendarCheck className="h-4 w-4" />}
          label={t("indStreak", "Sequência do diário")}
          value={`${data.streak_days} ${t("indDays", "dias")}`}
          sub={t("indStreakSub", "Dias seguidos registrando comida ou água.")}
        />
        <Tile
          icon={<Dumbbell className="h-4 w-4" />}
          label={t("indWorkouts", "Treinos concluídos")}
          value={data.workouts.sessions_30d}
          sub={`${t("indWorkouts7", "{n} nos últimos 7 dias").replace("{n}", String(data.workouts.sessions_7d))} · 30d`}
        />
        {data.academy && (
          <Tile
            icon={<Scale className="h-4 w-4" />}
            label={t("indFrequency", "Frequência na academia")}
            value={`${data.academy.frequency_30d} ${t("indDays", "dias")}`}
            sub={t("indFrequencySub", "Giros de catraca nos últimos 30 dias.")}
          />
        )}
      </div>

      {/* Gráficos 14 dias */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className={`${PANEL} p-4`}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("indKcalChart", "Calorias — últimos 14 dias")}
          </p>
          <div className="mt-4">
            <DailyBars
              data={kcalSeries}
              goal={data.kcal.goal}
              color={GOLD}
              goalLabel={`${t("indGoal", "Meta")} ${data.kcal.goal}`}
              fmt={(v) => `${v} kcal`}
              locale={locale}
            />
          </div>
        </div>
        <div className={`${PANEL} p-4`}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("indWaterChart", "Água — últimos 14 dias")}
          </p>
          <div className="mt-4">
            <DailyBars
              data={waterSeries}
              goal={data.water.goal}
              color={CYAN}
              goalLabel={`${t("indGoal", "Meta")} ${(data.water.goal / 1000).toFixed(1)}L`}
              fmt={(v) => `${(v / 1000).toFixed(2)} L`}
              locale={locale}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Evolução do peso */}
        <div className={`${PANEL} p-4`}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("indWeightChart", "Evolução do peso")}
          </p>
          {data.weight.series.length >= 2 ? (
            <div className="mt-4 pr-16">
              <WeightLine series={data.weight.series} locale={locale} />
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#9A938A]">
              {t("indWeightChartEmpty", "Registre pelo menos 2 medições de peso pra ver a curva.")}
            </p>
          )}
        </div>

        {/* Distribuição de macros */}
        <div className={`${PANEL} p-4`}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("indMacros", "Distribuição de macros (30d)")}
          </p>
          {data.macros.pct ? (
            <>
              <div className="mt-4 flex h-8 gap-[2px]">
                <div style={{ width: `${data.macros.pct.protein}%`, background: GOLD }} />
                <div style={{ width: `${data.macros.pct.carbs}%`, background: CYAN }} />
                <div style={{ width: `${data.macros.pct.fat}%`, background: MAGENTA }} />
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0" style={{ background: GOLD }} />
                  {t("indMacroP", "Proteína")} — <strong>{data.macros.pct.protein}%</strong>
                  <span className="text-[#9A938A]">({data.macros.protein_avg_g} g/dia)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0" style={{ background: CYAN }} />
                  {t("indMacroC", "Carboidratos")} — <strong>{data.macros.pct.carbs}%</strong>
                  <span className="text-[#9A938A]">({data.macros.carbs_avg_g} g/dia)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0" style={{ background: MAGENTA }} />
                  {t("indMacroF", "Gorduras")} — <strong>{data.macros.pct.fat}%</strong>
                  <span className="text-[#9A938A]">({data.macros.fat_avg_g} g/dia)</span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-[#9A938A]">
                {t("indMacrosHint", "% das calorias (proteína e carbo 4 kcal/g, gordura 9 kcal/g).")}
              </p>
            </>
          ) : (
            <p className="mt-4 text-xs text-[#9A938A]">
              {t("indMacrosEmpty", "Registre refeições no diário pra ver a distribuição.")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
