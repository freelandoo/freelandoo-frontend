"use client"

// /fitness/academia — MINHA ACADEMIA: frequência da catraca e mensalidades.
// A sala do pill LARANJA (pedido do Alex, 2026-09-10). Saiu do corpo da raiz
// para cá; o que ela lê é o bloco `academies` do MESMO `/fitness/summary` que
// a raiz usa — uma segunda consulta só de academia seria a segunda máquina
// para a mesma resposta.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, BadgeCheck, Dumbbell, Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "../_components/fitness-shell"
import { FitnessHeadcard } from "../_components/fitness-headcard"
import { BTN_GOLD, GOLD, INNER, PANEL, PAY_STATUS, PILL, StateBox, todayIso } from "../_components/fitness-ui"

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

export default function FitnessAcademyPage() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const { perfil } = useMeProfile()
  const [academies, setAcademies] = useState<AcademySummary[] | null>(null)
  const [error, setError] = useState(false)
  const date = useMemo(() => todayIso(), [])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    fetch(`/api/fitness/summary?date=${date}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => alive && setAcademies(Array.isArray(d.academies) ? d.academies : []))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [date])

  return (
    <FitnessShell>
      <FitnessHeadcard
        perfil={perfil}
        title={t("gymTitle", "Minha academia")}
        backHref="/fitness"
        active="academy"
        action={
          <Link href="/academias" className={`${BTN_GOLD} px-3 py-2 text-[11px]`}>
            <Dumbbell className="h-4 w-4" />
            {t("academiesCta", "Academias")}
          </Link>
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        {error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={t("loadFailedTitle", "Não deu pra carregar.")}
            desc={t("loadError", "Erro ao carregar o painel. Tente novamente.")}
            accent={PILL.academy.bg}
          />
        ) : academies === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
          </div>
        ) : academies.length === 0 ? (
          <StateBox
            icon={<Dumbbell className="h-6 w-6" />}
            title={t("gymTitle", "Minha academia")}
            desc={t(
              "connectText",
              "Seu painel funciona sozinho. Conectando a uma academia parceira, você ganha frequência da catraca, mensalidades e um professor que monta seus treinos."
            )}
            accent={PILL.academy.bg}
            action={
              <Link href="/academias" className={`${BTN_GOLD} px-6 py-3 text-xs`}>
                <Dumbbell className="h-4 w-4" />
                {t("connectCta", "Conecte-se a uma academia")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {academies.map((a) => (
              <div key={a.id_member} className={`${PANEL} p-4`} style={{ boxShadow: `8px 8px 0 0 ${PILL.academy.bg}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/academias/${a.academy.slug}`} className="fl-display text-2xl leading-none text-[#F5F1E8] hover:text-[#E0813F]">
                      {a.academy.nome}
                    </Link>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#9A938A]">
                      <BadgeCheck className="h-3.5 w-3.5 text-[#E0813F]" />
                      {a.plan_name || t("gymNoPlan", "Sem plano informado")} · {a.membership_status}
                    </p>
                  </div>
                  <div className={`${INNER} px-3 py-1 text-center`}>
                    <p className="fl-display text-3xl leading-none text-[#E0813F]">{a.frequency_days_30d}</p>
                    <p className="text-[10px] font-bold uppercase text-[#9A938A]">{t("gymFreq30", "dias / 30d")}</p>
                  </div>
                </div>

                {/* Calendário do mês (dias com giro) */}
                <MonthDots date={date} days={a.month_days} label={t("gymMonthLabel", "Presenças no mês")} />

                {/* Mensalidades */}
                <div className="mt-3 border-t-2 border-[#0B0B0D] pt-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("gymPayments", "Mensalidades")}</p>
                  {a.payments.length === 0 ? (
                    <p className="mt-1 text-xs text-[#9A938A]">{t("gymNoPayments", "Nenhuma mensalidade registrada.")}</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {a.payments.slice(0, 6).map((p) => {
                        const meta = PAY_STATUS[p.status] || PAY_STATUS.pending
                        return (
                          <li key={p.external_id} className="flex items-center justify-between text-xs">
                            <span className="text-[#9A938A]">
                              {p.due_date ? new Date(p.due_date).toLocaleDateString(locale) : "—"}
                            </span>
                            <span className="font-bold">
                              {(p.amount_cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}
                            </span>
                            <span
                              className={`border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${p.status === "paid" ? "bg-[#4fc95a] text-[#0B0B0D]" : p.status === "overdue" ? "bg-[#ff5a44] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}
                            >
                              {t(meta[0], meta[1])}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </FitnessShell>
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
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => {
          const dayStr = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`
          const hit = present.has(dayStr)
          return (
            <span
              key={dayStr}
              title={dayStr}
              className={`flex h-6 w-6 items-center justify-center border-2 text-[10px] font-bold ${hit ? "border-[#0B0B0D] text-[#0B0B0D]" : "border-[#0B0B0D] bg-[#1D1810] text-[#9A938A]"}`}
              style={hit ? { background: GOLD } : undefined}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </div>
  )
}
