"use client"

// Aba "Indicadores" do Esportes — KPIs de saúde/consistência calculados no back
// (GET /fitness/indicators).
//
// REPAGINADA "PLACAR BRASA" (2026-10-27; pedido do Alex: "os indicadores estão
// sem efeitos, feios, quadrados"): o "quadrado" era a grade de caixas iguais
// com o mesmo número de 30 px. Agora é um BENTO com hierarquia — o herói é a
// CONSISTÊNCIA (sequência + waffle dos 14 dias + pips da semana), e cada dado
// ganha a forma que responde à pergunta: IMC = arco semáforo com agulha,
// calorias/água = anel + barras com tampa, peso = linha com área, proteína =
// régua com faixa de referência, macros = barra 100% rotulada.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Activity, AlertCircle, Droplets, Dumbbell, Flame, HeartPulse, Scale, TrendingDown, TrendingUp } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { todayIso } from "./fitness-ui"
import { CountUp, Reveal, RingMeter } from "./ui/motion-kit"
import { ArcGauge, AreaLine, BarStrip, BulletMeter, Pips, StackBar, Waffle } from "./ui/charts"
import { HERO_NUMBER_STYLE, SP, TX, cardStyle } from "./ui/sp-tokens"

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

const MAGENTA = "#FF1F8E"
const ROOM = SP.room.indicators

const BMI_CLASS: Record<string, [string, string, string]> = {
  underweight: ["bmiUnder", "Abaixo do peso", SP.water],
  normal: ["bmiNormal", "Peso normal", SP.ok],
  overweight: ["bmiOver", "Sobrepeso", SP.warn],
  obese1: ["bmiOb1", "Obesidade I", "#FF8C2E"],
  obese2: ["bmiOb2", "Obesidade II", SP.bad],
  obese3: ["bmiOb3", "Obesidade III", SP.bad],
}

const fmtInt = (n: number) => String(Math.round(n))

function Card({
  kicker,
  icon,
  accent = SP.glow,
  children,
  className,
  hero = false,
}: {
  kicker: string
  icon: React.ReactNode
  accent?: string
  children: React.ReactNode
  className?: string
  hero?: boolean
}) {
  return (
    <div
      className={`relative h-full overflow-hidden border-[#0B0B0D] p-4 ${hero ? "border-[3px]" : "border-2"} ${className ?? ""}`}
      style={{
        background: SP.panel,
        ...cardStyle(hero ? ROOM : SP.band, hero ? 8 : 6),
        ...(hero ? { boxShadow: `inset 0 1px 0 rgba(255,210,166,.12), 8px 8px 0 0 ${ROOM}, 0 0 28px rgba(249,115,22,.22)` } : {}),
      }}
    >
      {hero && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-4 h-40 w-56"
          style={{ background: TX.halftone, maskImage: "linear-gradient(225deg,#000,transparent 70%)", WebkitMaskImage: "linear-gradient(225deg,#000,transparent 70%)" }}
        />
      )}
      <p className="relative flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: SP.mute }}>
        <span style={{ color: accent }}>{icon}</span>
        {kicker}
      </p>
      <div className="relative mt-3">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-2 border-dashed px-3 py-4 text-xs" style={{ borderColor: "rgba(244,165,116,.35)", color: SP.mute }}>
      {children}
    </p>
  )
}

function DeltaChip({ delta, goodDown = true }: { delta: number; goodDown?: boolean }) {
  const good = goodDown ? delta <= 0 : delta >= 0
  return (
    <span
      className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#0B0B0D]"
      style={{ background: good ? SP.ok : "#FF8C2E" }}
    >
      {delta <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}
      {String(delta).replace(".", ",")} kg
    </span>
  )
}

export function IndicatorsTab() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const [data, setData] = useState<Indicators | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const today = useMemo(() => todayIso(), [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setState("loading")
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

  const kcalSeries = useMemo(() => (data ? data.chart_14d.map((d) => ({ date: d.date, value: d.kcal })) : []), [data])
  const waterSeries = useMemo(() => (data ? data.chart_14d.map((d) => ({ date: d.date, value: d.water_ml })) : []), [data])
  const waffle = useMemo(
    () => (data ? data.chart_14d.map((d) => ({ date: d.date, on: d.kcal > 0 || d.water_ml > 0 })) : []),
    [data]
  )
  const fmtLiters = useCallback((n: number) => (n / 1000).toFixed(1).replace(".", ","), [])

  if (state === "loading") {
    // A forma dos gráficos em fantasma (nunca o spinner central): o bento já
    // está de pé e os números chegam.
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[2, 1, 1, 2, 2, 1, 1, 2].map((span, i) => (
          <div
            key={i}
            className={`relative h-44 overflow-hidden border-2 border-[#0B0B0D] ${span === 2 ? "md:col-span-2" : ""}`}
            style={{ background: SP.panel }}
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-1/3"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,210,166,.06), transparent)" }}
              initial={{ x: "-100%" }}
              animate={{ x: "400%" }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: i * 0.08 }}
            />
          </div>
        ))}
      </div>
    )
  }
  if (state === "error" || !data) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 border-2 border-[#0B0B0D] px-4 py-10 text-center" style={{ background: SP.panel }}>
        <AlertCircle className="h-6 w-6" style={{ color: SP.bad }} />
        <p className="text-sm" style={{ color: SP.mute }}>
          {t("indLoadError", "Erro ao carregar os indicadores.")}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]"
          style={{ background: SP.ember }}
        >
          {t("retry", "Tentar de novo")}
        </button>
      </div>
    )
  }

  const bmiMeta = data.bmi ? BMI_CLASS[data.bmi.class] || BMI_CLASS.normal : null
  const delta = data.weight.delta_30d
  const kcalPct = data.kcal.avg_7d != null && data.kcal.goal > 0 ? (data.kcal.avg_7d / data.kcal.goal) * 100 : 0
  const waterPct = data.water.avg_7d != null && data.water.goal > 0 ? (data.water.avg_7d / data.water.goal) * 100 : 0

  return (
    <Reveal
      className="mt-6 grid gap-4 md:grid-cols-4"
      step={0.05}
      cells={["md:col-span-2 md:row-span-2", undefined, undefined, "md:col-span-2", "md:col-span-2", "md:col-span-2", "md:col-span-2"]}
    >
      {/* ── HERÓI: consistência ── */}
      <div key="hero" className="h-full">
        <Card hero kicker={t("indStreak", "Sequência do diário")} icon={<Flame className="h-4 w-4" />} accent={SP.ember}>
          <div className="flex items-end gap-3">
            <Flame className="mb-2 h-10 w-10 shrink-0" style={{ color: SP.ember }} />
            <span style={HERO_NUMBER_STYLE}>
              <CountUp value={data.streak_days} format={fmtInt} className="fl-display text-[72px] leading-[0.85] md:text-[88px]" />
            </span>
            <span className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: SP.mute }}>
              {t("indStreakDays", "dias seguidos")}
            </span>
          </div>
          <p className="mt-1 text-[11px]" style={{ color: SP.dim }}>
            {t("indStreakSub", "Dias seguidos registrando comida ou água.")}
          </p>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: SP.mute }}>
            {t("indLast14", "Últimos 14 dias")}
          </p>
          <div className="mt-2">
            <Waffle days={waffle} today={today} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: SP.mute }}>
                <Dumbbell className="h-3.5 w-3.5" style={{ color: SP.room.workout }} />
                {t("indWorkoutsWeek", "Treinos na semana")}
              </p>
              <div className="mt-2">
                <Pips on={Math.min(7, data.workouts.sessions_7d)} />
              </div>
              <p className="mt-1 font-mono text-[11px]" style={{ color: SP.mute }}>
                {data.workouts.sessions_7d}/7 · {t("indWorkouts30", "{n} no mês").replace("{n}", String(data.workouts.sessions_30d))}
              </p>
            </div>
            {data.academy && (
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: SP.mute }}>
                  <Scale className="h-3.5 w-3.5" style={{ color: SP.room.academy }} />
                  {t("indFrequency", "Frequência na academia")}
                </p>
                <p className="mt-1 flex items-baseline gap-1">
                  <CountUp value={data.academy.frequency_30d} format={fmtInt} className="fl-display text-4xl leading-none text-[#FFF1E6]" />
                  <span className="font-mono text-[11px]" style={{ color: SP.mute }}>
                    / 30d
                  </span>
                </p>
                <Link href="/esportes/academia" className="mt-1 inline-block text-[11px] font-extrabold uppercase tracking-[0.12em] underline underline-offset-4" style={{ color: SP.glow }}>
                  {t("indSeeCalendar", "Ver calendário →")}
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── IMC: arco semáforo + agulha ── */}
      <div key="bmi" className="h-full">
        <Card kicker={t("indBmi", "IMC")} icon={<HeartPulse className="h-4 w-4" />} accent={bmiMeta ? bmiMeta[2] : SP.glow}>
          {data.bmi ? (
            <ArcGauge
              value={data.bmi.value}
              label={
                <>
                  <span className="fl-display block text-3xl leading-none text-[#FFF1E6]">{data.bmi.value.toFixed(1).replace(".", ",")}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: bmiMeta![2] }}>
                    {t(bmiMeta![0], bmiMeta![1])}
                  </span>
                </>
              }
            />
          ) : (
            <Empty>{t("indBmiEmpty", "Registre peso e altura pra calcular.")}</Empty>
          )}
        </Card>
      </div>

      {/* ── proteína: régua com referência ── */}
      <div key="protein" className="h-full">
        <Card kicker={t("indProtein", "Proteína")} icon={<Activity className="h-4 w-4" />}>
          {data.macros.protein_g_per_kg != null ? (
            <>
              <p className="flex items-baseline gap-1">
                <span className="fl-display text-4xl leading-none text-[#FFF1E6]">{String(data.macros.protein_g_per_kg).replace(".", ",")}</span>
                <span className="font-mono text-xs" style={{ color: SP.mute }}>
                  g/kg
                </span>
              </p>
              <div className="mt-4">
                <BulletMeter value={data.macros.protein_g_per_kg} max={3} band={[1.2, 2]} ticks={[0, 1.2, 2, 3]} />
              </div>
              <p className="mt-2 font-mono text-[10px]" style={{ color: SP.dim }}>
                {t("indProteinRef", "referência 1,2–2,0 g/kg")}
                {data.macros.protein_avg_g != null ? ` · ${t("indProteinAvg", "Média {n} g/dia").replace("{n}", String(data.macros.protein_avg_g))}` : ""}
              </p>
            </>
          ) : (
            <Empty>{t("indProteinEmpty", "Registre refeições pra calcular.")}</Empty>
          )}
        </Card>
      </div>

      {/* ── peso: linha com área ── */}
      <div key="weight" className="h-full">
        <Card kicker={t("indWeightChart", "Evolução do peso")} icon={<Scale className="h-4 w-4" />}>
          <div className="mb-3 flex items-center gap-2">
            {delta != null && <DeltaChip delta={delta} />}
            <span className="font-mono text-[10px]" style={{ color: SP.dim }}>
              {t("indWeightTrend", "Peso (30 dias)")}
            </span>
          </div>
          {data.weight.series.length >= 2 ? (
            <AreaLine series={data.weight.series} locale={locale} />
          ) : (
            <Empty>{t("indWeightChartEmpty", "Registre pelo menos 2 medições de peso pra ver a curva.")}</Empty>
          )}
        </Card>
      </div>

      {/* ── calorias: anel + barras ── */}
      <div key="kcal" className="h-full">
        <Card kicker={t("indKcalChart", "Calorias — últimos 14 dias")} icon={<Flame className="h-4 w-4" />}>
          <div className="mb-4 flex items-center gap-4">
            <RingMeter
              pct={kcalPct}
              color={SP.glow}
              size={84}
              stroke={10}
              label={
                <span className="fl-display text-lg leading-none text-[#FFF1E6]">{data.kcal.avg_7d != null ? data.kcal.avg_7d : "—"}</span>
              }
            />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: SP.mute }}>
                {t("indKcalAvg", "Calorias — média 7d")}
              </p>
              <p className="font-mono text-xs" style={{ color: SP.ink }}>
                {t("indGoal", "Meta")}: {data.kcal.goal} kcal
              </p>
              <p className="font-mono text-[11px]" style={{ color: SP.mute }}>
                {t("indOnTarget", "{n}/{d} dias na meta (30d)")
                  .replace("{n}", String(data.kcal.days_on_target_30d))
                  .replace("{d}", String(data.kcal.days_logged_30d))}
              </p>
            </div>
          </div>
          <BarStrip
            data={kcalSeries}
            goal={data.kcal.goal}
            color={SP.glow}
            goalLabel={`${t("indGoal", "Meta")} ${data.kcal.goal}`}
            fmt={(v) => `${v} kcal`}
            locale={locale}
            today={today}
          />
        </Card>
      </div>

      {/* ── água: anel ciano + barras ── */}
      <div key="water" className="h-full">
        <Card kicker={t("indWaterChart", "Água — últimos 14 dias")} icon={<Droplets className="h-4 w-4" />} accent={SP.water}>
          <div className="mb-4 flex items-center gap-4">
            <RingMeter
              pct={waterPct}
              color={SP.water}
              size={84}
              stroke={10}
              label={
                <span className="fl-display text-lg leading-none text-[#FFF1E6]">
                  {data.water.avg_7d != null ? `${fmtLiters(data.water.avg_7d)}L` : "—"}
                </span>
              }
            />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: SP.mute }}>
                {t("indWaterAvg", "Água — média 7d")}
              </p>
              <p className="font-mono text-xs" style={{ color: SP.ink }}>
                {t("indGoal", "Meta")}: {fmtLiters(data.water.goal)} L
              </p>
              <p className="font-mono text-[11px]" style={{ color: SP.mute }}>
                {t("indWaterTarget", "{n} dias na meta (30d)").replace("{n}", String(data.water.days_on_target_30d))}
                {data.water.ml_per_kg ? ` · ${data.water.ml_per_kg} ml/kg` : ""}
              </p>
            </div>
          </div>
          <BarStrip
            data={waterSeries}
            goal={data.water.goal}
            color={SP.water}
            goalLabel={`${t("indGoal", "Meta")} ${fmtLiters(data.water.goal)}L`}
            fmt={(v) => `${(v / 1000).toFixed(2)} L`}
            locale={locale}
            today={today}
          />
        </Card>
      </div>

      {/* ── macros: barra 100% rotulada ── */}
      <div key="macros" className="h-full">
        <Card kicker={t("indMacros", "Distribuição de macros (30d)")} icon={<Activity className="h-4 w-4" />}>
          {data.macros.pct ? (
            <>
              <StackBar
                parts={[
                  { pct: data.macros.pct.protein, color: SP.glow, label: t("indMacroP", "Proteína"), sub: `${data.macros.protein_avg_g ?? "—"} g/dia` },
                  { pct: data.macros.pct.carbs, color: SP.water, label: t("indMacroC", "Carboidratos"), sub: `${data.macros.carbs_avg_g ?? "—"} g/dia` },
                  { pct: data.macros.pct.fat, color: MAGENTA, label: t("indMacroF", "Gorduras"), sub: `${data.macros.fat_avg_g ?? "—"} g/dia` },
                ]}
              />
              <p className="mt-3 text-[11px]" style={{ color: SP.dim }}>
                {t("indMacrosHint", "% das calorias (proteína e carbo 4 kcal/g, gordura 9 kcal/g).")}
              </p>
            </>
          ) : (
            <Empty>{t("indMacrosEmpty", "Registre refeições no diário pra ver a distribuição.")}</Empty>
          )}
        </Card>
      </div>
    </Reveal>
  )
}
