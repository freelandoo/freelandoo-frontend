"use client"

// /fitness/treino — O TREINO: a ficha do dia, com os checks e o editor da
// ficha própria. A sala do pill ROSA (pedido do Alex, 2026-09-10). O card e o
// modal grande são os MESMOS que moravam na raiz (`workout-today-card`);
// mudou só a casa. As propostas do professor também batem aqui, porque é
// aqui que uma ficha nova aparece depois de aceita.

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "../_components/fitness-shell"
import { FitnessHeadcard } from "../_components/fitness-headcard"
import { FitnessProposalsGate } from "../_components/proposals-modal"
import { WorkoutTodayCard } from "../_components/workout-today-card"
import { BTN_DARK, PANEL, PILL, shiftDate, todayIso } from "../_components/fitness-ui"

export default function FitnessWorkoutPage() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const { perfil } = useMeProfile()
  const [date, setDate] = useState(() => todayIso())
  const [refreshKey, setRefreshKey] = useState(0)

  const fmtDay = new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  const isToday = date === todayIso()

  return (
    <FitnessShell>
      <FitnessProposalsGate onApplied={() => setRefreshKey((k) => k + 1)} />

      <FitnessHeadcard perfil={perfil} title={t("workoutTitle", "Treino")} backHref="/fitness" active="workout" />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        <div className={`${PANEL} flex items-center justify-between gap-2 px-2 py-2`}>
          <button onClick={() => setDate((d) => shiftDate(d, -1))} className={`${BTN_DARK} p-2`} aria-label={t("prevDay", "Dia anterior")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F2B705]">{fmtDay}</p>
            {!isToday && (
              <button onClick={() => setDate(todayIso())} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A] hover:text-[#F5F1E8]">
                {t("today", "Hoje")} →
              </button>
            )}
          </div>
          <button onClick={() => setDate((d) => shiftDate(d, 1))} className={`${BTN_DARK} p-2`} aria-label={t("nextDay", "Próximo dia")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4" style={{ boxShadow: `8px 8px 0 0 ${PILL.workout.bg}` }}>
          <WorkoutTodayCard date={date} refreshKey={refreshKey} />
        </div>
      </section>
    </FitnessShell>
  )
}
