"use client"

// /fitness/historico — O HISTÓRICO: peso e altura (com o registro e a lista de
// medições) e os DIAS já gravados — o que a pessoa bebeu e comeu em cada dia.
// A sala do pill TURQUESA (pedido do Alex, 2026-09-10: "peso, altura,
// histórico (...) você vai salvar e vai ter um histórico").
//
// ⚠️ NADA É "SALVO" AQUI DE NOVO: o diário e a água já são gravados por DATA
// conforme a pessoa registra no Meu dia (UPSERT). Esta sala só LÊ o que
// ficou (`GET /fitness/history`, dias com algum registro, mais recentes
// primeiro) e abre qualquer um deles na raiz pelo deep-link `?dia=`.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, Droplets, Flame, History, Loader2, Ruler } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "../_components/fitness-shell"
import { FitnessHeadcard } from "../_components/fitness-headcard"
import { BTN_DARK, BTN_GOLD, CYAN, GOLD, H_SECTION, INPUT, PANEL, PILL, StateBox } from "../_components/fitness-ui"

type HistoryDay = { date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number }
type HistoryPayload = { days: HistoryDay[]; goals: { daily_kcal_goal: number; water_goal_ml: number } }
type Measurement = { id_measurement: string; weight_kg: string | number | null; height_cm: string | number | null; measured_at: string }

export default function FitnessHistoryPage() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const { perfil } = useMeProfile()

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
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" })
  const num = (v: string | number | null) => (v === null || v === undefined || v === "" ? null : Number(v))

  return (
    <FitnessShell>
      <FitnessHeadcard
        perfil={perfil}
        title={t("historyTitle", "Histórico")}
        backHref="/fitness"
        active="history"
        action={
          <button onClick={() => setMeasureOpen(true)} className={`${BTN_GOLD} px-3 py-2 text-[11px]`}>
            <Ruler className="h-4 w-4" />
            {t("measureCta", "Registrar")}
          </button>
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
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
                  <Ruler className="h-4 w-4 text-[#F2B705]" /> {t("measureTitle", "Peso & altura")}
                </p>
                {latest ? (
                  <>
                    <p className="mt-2 fl-display text-4xl leading-none text-[#F5F1E8]">
                      {num(latest.weight_kg) !== null ? `${num(latest.weight_kg)!.toFixed(1)} kg` : "—"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#9A938A]">
                      {num(latest.height_cm) !== null ? `${num(latest.height_cm)!.toFixed(0)} cm · ` : ""}
                      {fmtDate(latest.measured_at)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[#9A938A]">{t("measureEmpty", "Nenhuma medição ainda.")}</p>
                )}
                <button onClick={() => setMeasureOpen(true)} className={`${BTN_DARK} mt-3 px-3 py-1.5 text-[11px]`}>
                  {t("measureCta", "Registrar")}
                </button>
              </div>

              <div className={PANEL}>
                <div className="border-b-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
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
                <History className="h-4 w-4 text-[#F2B705]" /> {t("historyDaysTitle", "Os seus dias")}
              </h2>
              <p className="mt-1 px-3 text-[11px] text-[#9A938A] md:px-0">
                {t("historyDaysHint", "Os dias em que você registrou comida ou água. Toque num dia para abri-lo.")}
              </p>
              {history.days.length === 0 ? (
                <div className="mt-3">
                  <StateBox
                    icon={<History className="h-6 w-6" />}
                    title={t("historyDaysEmptyTitle", "Nada gravado ainda.")}
                    desc={t("historyDaysEmpty", "O que você come e bebe no Meu dia fica guardado aqui, um dia por linha.")}
                    accent={PILL.history.bg}
                    action={
                      <Link href="/fitness" className={`${BTN_GOLD} px-5 py-2.5 text-xs`}>
                        {t("historyGoToday", "Registrar o dia de hoje")}
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className={`${PANEL} mt-3`}>
                  {history.days.map((d) => {
                    const kcalPct = Math.min(100, Math.round((d.kcal / history.goals.daily_kcal_goal) * 100))
                    const waterPct = Math.min(100, Math.round((d.water_ml / history.goals.water_goal_ml) * 100))
                    return (
                      <li key={d.date} className="border-b-2 border-[#0B0B0D] last:border-b-0">
                        <Link
                          href={`/fitness?dia=${d.date}`}
                          className="flex items-center gap-3 px-3 py-3 transition hover:bg-[#1D1810]"
                          aria-label={t("historyOpenDay", "Abrir o dia {date}").replace("{date}", fmtDay(d.date))}
                        >
                          <span className="w-24 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]">
                            {fmtDay(d.date)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Flame className="h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
                              <span className="font-bold">{d.kcal}</span>
                              <span className="text-[#9A938A]">/ {history.goals.daily_kcal_goal} kcal</span>
                            </span>
                            <span className="mt-1 block h-1.5 border border-[#0B0B0D] bg-[#1D1810]">
                              <span className="block h-full" style={{ width: `${kcalPct}%`, background: GOLD }} />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Droplets className="h-3.5 w-3.5 shrink-0" style={{ color: CYAN }} />
                              <span className="font-bold">{(d.water_ml / 1000).toFixed(1)}</span>
                              <span className="text-[#9A938A]">/ {(history.goals.water_goal_ml / 1000).toFixed(1)} L</span>
                            </span>
                            <span className="mt-1 block h-1.5 border border-[#0B0B0D] bg-[#1D1810]">
                              <span className="block h-full" style={{ width: `${waterPct}%`, background: CYAN }} />
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-[10px] text-[#9A938A] sm:block">
                            P {d.protein_g}g · C {d.carbs_g}g · G {d.fat_g}g
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
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
    </FitnessShell>
  )
}
