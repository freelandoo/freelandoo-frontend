"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Apple,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Loader2,
  Lock,
  Minus,
  Plus,
  Ruler,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { WorkoutTodayCard } from "./workout-today-card"

type Food = {
  id_food?: string
  external_ref?: string
  source?: string
  nome: string
  kcal_100g: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type FoodLog = {
  id_log: string
  meal: "cafe" | "almoco" | "jantar" | "lanche"
  food_nome: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type AcademySummary = {
  id_member: string
  academy: { nome: string; slug: string; avatar_url: string | null }
  membership_status: string
  plan_name: string | null
  expires_at: string | null
  month_days: string[]
  frequency_days_30d: number
  payments: { external_id: string; amount_cents: number; due_date: string | null; status: string; paid_at: string | null }[]
}

type Summary = {
  date: string
  goals: { daily_kcal_goal: number; water_goal_ml: number }
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  water_ml: number
  logs: FoodLog[]
  latest_measurement: { weight_kg: number | null; height_cm: number | null; measured_at: string } | null
  academies: AcademySummary[]
}

const MEALS: Array<{ id: FoodLog["meal"]; key: string; fallback: string }> = [
  { id: "cafe", key: "mealCafe", fallback: "Café da manhã" },
  { id: "almoco", key: "mealAlmoco", fallback: "Almoço" },
  { id: "lanche", key: "mealLanche", fallback: "Lanche" },
  { id: "jantar", key: "mealJantar", fallback: "Jantar" },
]

const PAY_STATUS: Record<string, [string, string]> = {
  paid: ["payPaid", "Pago"],
  pending: ["payPending", "Pendente"],
  overdue: ["payOverdue", "Atrasado"],
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function FitnessView() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const enabled = useFeature("fitness_academias")

  const [summary, setSummary] = useState<Summary | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "locked" | "error">("loading")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [searchOpen, setSearchOpen] = useState<FoodLog["meal"] | null>(null)
  const [tab, setTab] = useState<"local" | "off">("local")
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<Food | null>(null)
  const [grams, setGrams] = useState("100")
  const [adding, setAdding] = useState(false)

  const [measureOpen, setMeasureOpen] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [savingMeasure, setSavingMeasure] = useState(false)

  const [goalsOpen, setGoalsOpen] = useState(false)
  const [kcalGoal, setKcalGoal] = useState("2000")
  const [waterGoal, setWaterGoal] = useState("2000")

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setState("locked")
      return
    }
    try {
      const res = await fetch(`/api/fitness/summary?date=${date}`, { headers: authHeaders() })
      if (res.status === 403) {
        setState("locked")
        return
      }
      if (!res.ok) throw new Error()
      const data = (await res.json()) as Summary
      setSummary(data)
      setKcalGoal(String(data.goals.daily_kcal_goal))
      setWaterGoal(String(data.goals.water_goal_ml))
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [date, authHeaders])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  const doSearch = useCallback(
    async (which: "local" | "off") => {
      if (q.trim().length < 2) return
      setSearching(true)
      try {
        const path = which === "local" ? `/api/fitness/foods?q=` : `/api/fitness/foods/off?q=`
        const res = await fetch(`${path}${encodeURIComponent(q.trim())}`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResults(Array.isArray(data.foods) ? data.foods : [])
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("searchError", "Erro na busca"))
      } finally {
        setSearching(false)
      }
    },
    [q, authHeaders, t]
  )

  const addLog = useCallback(async () => {
    if (!picked || !searchOpen) return
    const qty = Number(grams)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(t("invalidGrams", "Quantidade inválida"))
      return
    }
    setAdding(true)
    try {
      let idFood = picked.id_food
      if (!idFood && picked.external_ref) {
        // produto do Open Food Facts: cacheia primeiro
        const cres = await fetch("/api/fitness/foods/off/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(picked),
        })
        const cdata = await cres.json()
        if (!cres.ok) throw new Error(cdata.error)
        idFood = cdata.food.id_food
      }
      const res = await fetch("/api/fitness/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id_food: idFood, meal: searchOpen, log_date: date, quantity_g: qty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("logAdded", "Adicionado ao diário!"))
      setPicked(null)
      setSearchOpen(null)
      setResults([])
      setQ("")
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("logError", "Erro ao adicionar"))
    } finally {
      setAdding(false)
    }
  }, [picked, searchOpen, grams, date, authHeaders, load, t])

  const removeLog = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/fitness/food-logs/${id}`, { method: "DELETE", headers: authHeaders() })
        if (!res.ok) throw new Error()
        void load()
      } catch {
        toast.error(t("logError", "Erro ao adicionar"))
      }
    },
    [authHeaders, load, t]
  )

  const setWater = useCallback(
    async (deltaMl: number) => {
      if (!summary) return
      const next = Math.max(0, summary.water_ml + deltaMl)
      setSummary({ ...summary, water_ml: next })
      try {
        await fetch("/api/fitness/water", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ log_date: date, total_ml: next }),
        })
      } catch {
        void load()
      }
    },
    [summary, date, authHeaders, load]
  )

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
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("measureError", "Erro ao registrar medição"))
    } finally {
      setSavingMeasure(false)
    }
  }, [weight, height, authHeaders, load, t])

  const saveGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ daily_kcal_goal: Number(kcalGoal), water_goal_ml: Number(waterGoal) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("goalsSaved", "Metas atualizadas!"))
      setGoalsOpen(false)
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("goalsError", "Erro ao salvar metas"))
    }
  }, [kcalGoal, waterGoal, authHeaders, load, t])

  const fmtDay = useMemo(() => {
    const d = new Date(`${date}T12:00:00Z`)
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  }, [date, locale])

  if (!enabled) {
    return (
      <div className="fl-sharp mx-auto max-w-3xl px-4 py-20 text-center">
        <Dumbbell className="mx-auto h-10 w-10 opacity-40" />
        <p className="mt-4 text-sm opacity-70">{t("disabled", "Recurso indisponível no momento.")}</p>
      </div>
    )
  }

  if (state === "locked") {
    return (
      <div className="fl-sharp mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center border-4 border-current">
          <Lock className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-black uppercase">{t("lockedTitle", "Painel Fitness")}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm opacity-70">
          {t(
            "lockedText",
            "O painel fitness é para quem está matriculado numa academia parceira (vincule pelo CPF) ou tem um subperfil assinante."
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/academias" className="border-2 border-current bg-yellow-400 px-5 py-3 text-xs font-black uppercase text-black">
            {t("lockedCtaGym", "Vincular minha academia")}
          </Link>
          <Link href="/account" className="border-2 border-current px-5 py-3 text-xs font-black uppercase">
            {t("lockedCtaSub", "Assinar um subperfil")}
          </Link>
        </div>
      </div>
    )
  }

  if (state === "loading" || !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin opacity-50" />
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="fl-sharp mx-auto max-w-3xl px-4 py-20 text-center text-sm opacity-70">
        {t("loadError", "Erro ao carregar o painel. Tente novamente.")}
      </div>
    )
  }

  const kcalPct = Math.min(100, Math.round((summary.totals.kcal / summary.goals.daily_kcal_goal) * 100))
  const waterPct = Math.min(100, Math.round((summary.water_ml / summary.goals.water_goal_ml) * 100))

  return (
    <div className="fl-sharp mx-auto max-w-5xl px-4 pb-24 pt-6">
      {/* Masthead + navegação de dia */}
      <header className="border-b-4 border-current pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-60">{t("eyebrow", "Painel Fitness")}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight">{t("title", "Meu dia")}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate((d) => shiftDate(d, -1))} className="border-2 border-current p-2" aria-label={t("prevDay", "Dia anterior")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="border-2 border-current px-3 py-2 text-xs font-black uppercase">{fmtDay}</span>
            <button onClick={() => setDate((d) => shiftDate(d, 1))} className="border-2 border-current p-2" aria-label={t("nextDay", "Próximo dia")}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setGoalsOpen(true)} className="border-2 border-current p-2" aria-label={t("goalsTitle", "Metas")}>
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cards do dia */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Calorias */}
        <div className="border-2 border-current p-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase">
            <Flame className="h-4 w-4" /> {t("kcalTitle", "Calorias")}
          </p>
          <p className="mt-2 text-3xl font-black">
            {Math.round(summary.totals.kcal)}
            <span className="text-sm font-bold opacity-50"> / {summary.goals.daily_kcal_goal} kcal</span>
          </p>
          <div className="mt-2 h-3 border-2 border-current">
            <div className="h-full bg-yellow-400" style={{ width: `${kcalPct}%` }} />
          </div>
          <p className="mt-2 text-[11px] opacity-60">
            P {Math.round(summary.totals.protein_g)}g · C {Math.round(summary.totals.carbs_g)}g · G {Math.round(summary.totals.fat_g)}g
          </p>
        </div>

        {/* Água */}
        <div className="border-2 border-current p-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase">
            <Droplets className="h-4 w-4" /> {t("waterTitle", "Água")}
          </p>
          <p className="mt-2 text-3xl font-black">
            {(summary.water_ml / 1000).toFixed(1)}
            <span className="text-sm font-bold opacity-50"> / {(summary.goals.water_goal_ml / 1000).toFixed(1)} L</span>
          </p>
          <div className="mt-2 h-3 border-2 border-current">
            <div className="h-full bg-sky-400" style={{ width: `${waterPct}%` }} />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => void setWater(-250)} className="border-2 border-current p-1.5" aria-label={t("waterMinus", "Remover copo")}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => void setWater(250)} className="flex items-center gap-1 border-2 border-current bg-sky-400 px-3 py-1.5 text-[11px] font-black uppercase text-black">
              <Plus className="h-3.5 w-3.5" /> {t("waterCup", "Copo 250ml")}
            </button>
          </div>
        </div>

        {/* Medidas */}
        <div className="border-2 border-current p-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase">
            <Ruler className="h-4 w-4" /> {t("measureTitle", "Peso & altura")}
          </p>
          {summary.latest_measurement ? (
            <p className="mt-2 text-3xl font-black">
              {summary.latest_measurement.weight_kg ? `${Number(summary.latest_measurement.weight_kg).toFixed(1)}kg` : "—"}
              <span className="text-sm font-bold opacity-50">
                {" "}
                {summary.latest_measurement.height_cm ? `· ${Number(summary.latest_measurement.height_cm).toFixed(0)}cm` : ""}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm opacity-60">{t("measureEmpty", "Nenhuma medição ainda.")}</p>
          )}
          <button onClick={() => setMeasureOpen(true)} className="mt-3 border-2 border-current px-3 py-1.5 text-[11px] font-black uppercase">
            {t("measureCta", "Registrar")}
          </button>
        </div>

        {/* Treino de hoje (fase 3) */}
        <WorkoutTodayCard date={date} />
      </div>

      {/* Diário de refeições */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 border-b-2 border-current pb-2 text-sm font-black uppercase tracking-wide">
          <Apple className="h-4 w-4" /> {t("diaryTitle", "Diário de refeições")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {MEALS.map((meal) => {
            const logs = summary.logs.filter((l) => l.meal === meal.id)
            const mealKcal = logs.reduce((acc, l) => acc + l.kcal, 0)
            return (
              <div key={meal.id} className="border-2 border-current">
                <div className="flex items-center justify-between border-b-2 border-current px-3 py-2">
                  <p className="text-xs font-black uppercase">{t(meal.key, meal.fallback)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold opacity-60">{Math.round(mealKcal)} kcal</span>
                    <button
                      onClick={() => {
                        setSearchOpen(meal.id)
                        setTab("local")
                        setQ("")
                        setResults([])
                        setPicked(null)
                        setGrams("100")
                      }}
                      className="border-2 border-current bg-yellow-400 p-1 text-black"
                      aria-label={t("addFood", "Adicionar alimento")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {logs.length === 0 ? (
                  <p className="px-3 py-4 text-xs opacity-50">{t("mealEmpty", "Nada registrado.")}</p>
                ) : (
                  <ul>
                    {logs.map((l) => (
                      <li key={l.id_log} className="flex items-center justify-between gap-2 border-b border-current/20 px-3 py-2 text-sm last:border-b-0">
                        <span className="min-w-0 flex-1 truncate">{l.food_nome}</span>
                        <span className="text-xs opacity-60">{Math.round(l.quantity_g)}g</span>
                        <span className="text-xs font-bold">{Math.round(l.kcal)} kcal</span>
                        <button onClick={() => void removeLog(l.id_log)} aria-label={t("removeLog", "Remover")}>
                          <Trash2 className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Academia: frequência + matrícula */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 border-b-2 border-current pb-2 text-sm font-black uppercase tracking-wide">
          <CalendarDays className="h-4 w-4" /> {t("gymTitle", "Minha academia")}
        </h2>
        {summary.academies.length === 0 ? (
          <div className="mt-4 border-2 border-dashed border-current p-6 text-center text-sm opacity-70">
            {t("gymEmpty", "Você ainda não vinculou nenhuma academia.")}{" "}
            <Link href="/academias" className="font-black underline">
              {t("gymEmptyCta", "Vincular agora")}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {summary.academies.map((a) => (
              <div key={a.id_member} className="border-2 border-current p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/academias/${a.academy.slug}`} className="text-lg font-black uppercase leading-tight hover:underline">
                      {a.academy.nome}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-xs opacity-60">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {a.plan_name || t("gymNoPlan", "Sem plano informado")} · {a.membership_status}
                    </p>
                  </div>
                  <div className="border-2 border-current px-3 py-1 text-center">
                    <p className="text-2xl font-black">{a.frequency_days_30d}</p>
                    <p className="text-[10px] font-bold uppercase opacity-60">{t("gymFreq30", "dias / 30d")}</p>
                  </div>
                </div>

                {/* Calendário do mês (dias com giro) */}
                <MonthDots date={date} days={a.month_days} label={t("gymMonthLabel", "Presenças no mês")} />

                {/* Mensalidades */}
                {a.payments.length > 0 && (
                  <div className="mt-3 border-t-2 border-current pt-2">
                    <p className="text-[11px] font-black uppercase opacity-60">{t("gymPayments", "Mensalidades")}</p>
                    <ul className="mt-1 space-y-1">
                      {a.payments.slice(0, 4).map((p) => {
                        const meta = PAY_STATUS[p.status] || PAY_STATUS.pending
                        return (
                          <li key={p.external_id} className="flex items-center justify-between text-xs">
                            <span className="opacity-70">
                              {p.due_date ? new Date(p.due_date).toLocaleDateString(locale) : "—"}
                            </span>
                            <span className="font-bold">
                              {(p.amount_cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}
                            </span>
                            <span
                              className={`border px-1.5 py-0.5 text-[10px] font-black uppercase ${p.status === "paid" ? "border-green-600 text-green-600" : p.status === "overdue" ? "border-red-600 text-red-600" : "border-current opacity-60"}`}
                            >
                              {t(meta[0], meta[1])}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal busca de alimento */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSearchOpen(null)}>
          <div className="fl-sharp flex max-h-[90vh] w-full max-w-lg flex-col border-4 border-current bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b-2 border-current p-4">
              <h2 className="text-lg font-black uppercase">{t("searchTitle", "Adicionar alimento")}</h2>
              <button onClick={() => setSearchOpen(null)} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {!picked ? (
              <>
                <div className="flex border-b-2 border-current">
                  <button
                    onClick={() => {
                      setTab("local")
                      setResults([])
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-black uppercase ${tab === "local" ? "bg-yellow-400 text-black" : ""}`}
                  >
                    {t("tabLocal", "Alimentos")}
                  </button>
                  <button
                    onClick={() => {
                      setTab("off")
                      setResults([])
                    }}
                    className={`flex-1 border-l-2 border-current px-3 py-2 text-xs font-black uppercase ${tab === "off" ? "bg-yellow-400 text-black" : ""}`}
                  >
                    {t("tabOff", "Produtos (código de barras)")}
                  </button>
                </div>
                <div className="flex items-center gap-2 border-b-2 border-current p-3">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void doSearch(tab)}
                    placeholder={tab === "local" ? t("searchLocalPh", "Ex.: arroz, frango, banana...") : t("searchOffPh", "Nome do produto ou marca")}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                  <button onClick={() => void doSearch(tab)} disabled={searching} className="border-2 border-current px-3 py-1 text-[11px] font-black uppercase">
                    {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("searchCta", "Buscar")}
                  </button>
                </div>
                <div className="min-h-40 flex-1 overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="p-4 text-xs opacity-50">
                      {tab === "off"
                        ? t("offHint", "Busca no Open Food Facts — produtos industrializados do mundo todo.")
                        : t("localHint", "Base TACO (alimentos brasileiros) + itens já usados.")}
                    </p>
                  ) : (
                    <ul>
                      {results.map((f, i) => (
                        <li key={f.id_food || f.external_ref || i}>
                          <button
                            onClick={() => setPicked(f)}
                            className="flex w-full items-center justify-between gap-2 border-b border-current/20 px-4 py-2.5 text-left text-sm hover:bg-current/5"
                          >
                            <span className="min-w-0 flex-1 truncate">{f.nome}</span>
                            <span className="text-xs font-bold opacity-60">{Math.round(f.kcal_100g)} kcal/100g</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4">
                <p className="text-sm font-black">{picked.nome}</p>
                <p className="mt-1 text-xs opacity-60">
                  {Math.round(picked.kcal_100g)} kcal · P {picked.protein_g}g · C {picked.carbs_g}g · G {picked.fat_g}g (100g)
                </p>
                <label className="mt-4 block">
                  <span className="text-[11px] font-bold uppercase opacity-70">{t("gramsLabel", "Quantidade (g)")}</span>
                  <input
                    autoFocus
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    inputMode="numeric"
                    className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 text-lg font-black outline-none"
                  />
                </label>
                <p className="mt-2 text-sm font-bold">
                  = {Math.round((picked.kcal_100g * (Number(grams) || 0)) / 100)} kcal
                </p>
                <div className="mt-4 flex justify-end gap-2 border-t-2 border-current pt-3">
                  <button onClick={() => setPicked(null)} className="border-2 border-current px-4 py-2 text-xs font-black uppercase">
                    {t("back", "Voltar")}
                  </button>
                  <button
                    onClick={() => void addLog()}
                    disabled={adding}
                    className="flex items-center gap-2 border-2 border-current bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
                  >
                    {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("addSubmit", "Adicionar")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal medição */}
      {measureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setMeasureOpen(false)}>
          <div className="fl-sharp w-full max-w-sm border-4 border-current bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="border-b-2 border-current pb-2 text-lg font-black uppercase">{t("measureModalTitle", "Registrar medição")}</h2>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase opacity-70">{t("weightLabel", "Peso (kg)")}</span>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 outline-none" />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase opacity-70">{t("heightLabel", "Altura (cm)")}</span>
              <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 outline-none" />
            </label>
            <div className="mt-4 flex justify-end gap-2 border-t-2 border-current pt-3">
              <button onClick={() => setMeasureOpen(false)} className="border-2 border-current px-4 py-2 text-xs font-black uppercase">
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={() => void saveMeasurement()}
                disabled={savingMeasure}
                className="flex items-center gap-2 border-2 border-current bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
              >
                {savingMeasure && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("measureSubmit", "Salvar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal metas */}
      {goalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setGoalsOpen(false)}>
          <div className="fl-sharp w-full max-w-sm border-4 border-current bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="border-b-2 border-current pb-2 text-lg font-black uppercase">{t("goalsTitle", "Metas")}</h2>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase opacity-70">{t("goalKcalLabel", "Meta diária de calorias (kcal)")}</span>
              <input value={kcalGoal} onChange={(e) => setKcalGoal(e.target.value)} inputMode="numeric" className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 outline-none" />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase opacity-70">{t("goalWaterLabel", "Meta diária de água (ml)")}</span>
              <input value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} inputMode="numeric" className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 outline-none" />
            </label>
            <div className="mt-4 flex justify-end gap-2 border-t-2 border-current pt-3">
              <button onClick={() => setGoalsOpen(false)} className="border-2 border-current px-4 py-2 text-xs font-black uppercase">
                {t("cancel", "Cancelar")}
              </button>
              <button onClick={() => void saveGoals()} className="border-2 border-current bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black">
                {t("goalsSubmit", "Salvar metas")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Grade de dias do mês com presença (giro de catraca) marcada. */
function MonthDots({ date, days, label }: { date: string; days: string[]; label: string }) {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const total = new Date(year, month, 0).getDate()
  const present = new Set(days.map((d) => String(d).slice(0, 10)))
  return (
    <div className="mt-3">
      <p className="text-[11px] font-black uppercase opacity-60">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => {
          const dayStr = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`
          const hit = present.has(dayStr)
          return (
            <span
              key={dayStr}
              title={dayStr}
              className={`flex h-6 w-6 items-center justify-center border text-[10px] font-bold ${hit ? "border-current bg-yellow-400 text-black" : "border-current/30 opacity-40"}`}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </div>
  )
}
