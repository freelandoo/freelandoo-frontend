"use client"

// /esportes/academia — MINHA ACADEMIA: o calendário de frequência e o
// histórico de mensalidades (repaginada "Placar Brasa", 2026-10-27).
//
// Três leituras: o bloco `academies` do `/fitness/summary` (o vínculo — a
// mesma resposta da raiz), e por vínculo `/fitness/academies/:id/month` (o
// calendário, mês a mês, no fuso de Brasília) e `/payments` (o histórico
// inteiro + se o "Pagar" pela Freelandoo está liberado). Mig 310.
//
// "Pagar" abre o checkout do Mercado Pago da Freelandoo; a volta cai aqui com
// `?mensalidade=success|cancel` (lido do `window` em efeito — `useSearchParams`
// obrigaria Suspense) e o talão ganha o carimbo "PAGO VIA FREELANDOO".

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { AlertCircle, BadgeCheck, Dumbbell, Flame, Loader2, Activity } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "../_components/fitness-shell"
import { FitnessHeadcard } from "../_components/fitness-headcard"
import { BTN_GOLD, PILL, StateBox, initialsOf } from "../_components/fitness-ui"
import { STATUS_KEYS } from "@/app/(header-only)/academias/[slug]/_components/academy-ui"
import { CalendarObject, type MonthData } from "../_components/ui/calendar-object"
import { DuesList, type DuePayment } from "../_components/ui/dues"
import { CountUp, Reveal, RingMeter } from "../_components/ui/motion-kit"
import { SP, TX, cardStyle } from "../_components/ui/sp-tokens"

type AcademySummary = {
  id_member: string
  academy: { nome: string; slug: string; avatar_url: string | null }
  membership_status: string
  plan_name: string | null
  expires_at: string | null
  linked_at?: string | null
  frequency_days_30d: number
}

const fmtInt = (n: number) => String(Math.round(n))

function auth(): HeadersInit | undefined {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export default function FitnessAcademyPage() {
  const t = useTranslations("Fitness")
  const { perfil } = useMeProfile()
  const [academies, setAcademies] = useState<AcademySummary[] | null>(null)
  const [error, setError] = useState(false)
  const [sel, setSel] = useState(0)

  useEffect(() => {
    const headers = auth()
    if (!headers) return
    let alive = true
    fetch(`/api/fitness/summary`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d) => alive && setAcademies(Array.isArray(d.academies) ? d.academies : []))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  const current = academies?.[Math.min(sel, (academies?.length ?? 1) - 1)] ?? null

  return (
    <FitnessShell>
      <FitnessHeadcard
        perfil={perfil}
        title={t("gymTitle", "Minha academia")}
        backHref="/esportes"
        active="academy"
        action={
          <Link href="/academias" className={`${BTN_GOLD} px-3 py-2 text-[11px]`}>
            <Dumbbell className="h-4 w-4" />
            {t("academiesCta", "Academias")}
          </Link>
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-3 md:px-10">
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
        ) : academies.length === 0 || !current ? (
          <EmptyGym />
        ) : (
          <>
            {academies.length > 1 && (
              <div className="mb-4 grid grid-cols-2 gap-0 border-2 border-[#0B0B0D] sm:flex">
                {academies.map((a, i) => (
                  <button
                    key={a.id_member}
                    type="button"
                    onClick={() => setSel(i)}
                    className="relative min-w-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em]"
                    style={{ color: i === sel ? "#0B0B0D" : SP.ink, background: i === sel ? "transparent" : SP.inner }}
                  >
                    {i === sel && (
                      <motion.span layoutId="esp-gym-tab" className="absolute inset-0" style={{ background: SP.ember }} />
                    )}
                    <span className="relative block truncate" title={a.academy.nome}>
                      {a.academy.nome}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <GymBoard key={current.id_member} gym={current} />
          </>
        )}
      </section>
    </FitnessShell>
  )
}

function GymBoard({ gym }: { gym: AcademySummary }) {
  const t = useTranslations("Fitness")
  const [month, setMonth] = useState<MonthData | null>(null)
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthError, setMonthError] = useState(false)
  const want = useRef<string | null>(null)
  const [dues, setDues] = useState<DuePayment[] | null>(null)
  const [payEnabled, setPayEnabled] = useState(false)
  const [justPaid, setJustPaid] = useState<string | null>(null)

  const loadMonth = useCallback(
    (ym?: string) => {
      const headers = auth()
      if (!headers) return
      want.current = ym ?? null
      setMonthLoading(true)
      setMonthError(false)
      fetch(`/api/fitness/academies/${gym.id_member}/month${ym ? `?ym=${ym}` : ""}`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
        .then((d: MonthData) => {
          // Folheando rápido: só a resposta do ÚLTIMO mês pedido vale.
          if ((want.current ?? d.ym) !== d.ym) return
          setMonth(d)
          setMonthLoading(false)
        })
        .catch(() => {
          setMonthError(true)
          setMonthLoading(false)
        })
    },
    [gym.id_member]
  )

  const loadDues = useCallback(async () => {
    const headers = auth()
    if (!headers) return null
    try {
      const r = await fetch(`/api/fitness/academies/${gym.id_member}/payments`, { headers, cache: "no-store" })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setDues(Array.isArray(d.payments) ? d.payments : [])
      setPayEnabled(d.pay_enabled === true)
      return (d.payments ?? []) as DuePayment[]
    } catch {
      setDues([])
      return null
    }
  }, [gym.id_member])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  // Volta do checkout: confere o pagamento (o webhook pode chegar depois do
  // redirecionamento — tenta de novo por até ~20 s) e carimba o talão.
  useEffect(() => {
    let alive = true
    let qs = ""
    try {
      qs = new URLSearchParams(window.location.search).get("mensalidade") || ""
    } catch {
      /* sem window */
    }
    ;(async () => {
      const first = await loadDues()
      if (!alive || !qs) return
      try {
        window.history.replaceState(null, "", window.location.pathname)
      } catch {
        /* nada */
      }
      if (qs === "cancel") {
        toast(t("payCanceledToast", "Pagamento não concluído."))
        return
      }
      const paidNow = (list: DuePayment[] | null) =>
        list?.find((p) => p.status === "paid" && p.paid_via === "freelandoo" && p.pending_checkout?.status === "paid")
      let hit = paidNow(first)
      for (let i = 0; !hit && i < 6 && alive; i++) {
        await new Promise((res) => setTimeout(res, 3000))
        hit = paidNow(await loadDues())
      }
      if (!alive) return
      if (hit) {
        setJustPaid(hit.external_id)
        toast.success(t("paySuccessToast", "Mensalidade paga! A academia já foi avisada."))
      } else {
        toast(t("payProcessingToast", "Pagamento em processamento — confirmamos assim que o Mercado Pago avisar."))
      }
    })()
    return () => {
      alive = false
    }
  }, [loadDues, t])

  const pay = useCallback(
    async (p: DuePayment) => {
      const headers = auth()
      if (!headers) return false
      try {
        const r = await fetch(
          `/api/fitness/academies/${gym.id_member}/payments/${encodeURIComponent(p.external_id)}/pay`,
          { method: "POST", headers }
        )
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d.checkout_url) {
          toast.error(d.error || t("payError", "Não foi possível iniciar o pagamento."))
          if (r.status === 409) void loadDues()
          return false
        }
        window.location.assign(d.checkout_url)
        return true
      } catch {
        toast.error(t("payError", "Não foi possível iniciar o pagamento."))
        return false
      }
    },
    [gym.id_member, loadDues, t]
  )

  const isCurrent = !!month && month.ym === month.today.slice(0, 7)
  const todayHit = !!month && month.days.includes(month.today)
  const denom = month ? month.elapsed + (isCurrent && todayHit ? 1 : 0) : 0
  const pct = denom > 0 && month ? (month.present / denom) * 100 : 0

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <MembershipCard gym={gym} />
          <Reveal className="grid grid-cols-3 gap-2.5" step={0.06}>
            <MetricCard
              label={t("gymMetricMonth", "no mês")}
              visual={
                <RingMeter
                  pct={pct}
                  color={SP.ok}
                  size={56}
                  stroke={7}
                  label={<span className="fl-display text-sm leading-none">{month ? `${month.present}/${denom}` : "—"}</span>}
                />
              }
            />
            <MetricCard
              label={t("gymMetricStreak", "seguidos")}
              icon={<Flame className="h-5 w-5" style={{ color: SP.ember }} />}
              value={isCurrent ? (month?.streak ?? 0) : null}
            />
            <MetricCard
              label={t("gymMetric30", "dias / 30d")}
              icon={<Activity className="h-5 w-5" style={{ color: SP.glow }} />}
              value={gym.frequency_days_30d}
            />
          </Reveal>
        </div>
        <div className="lg:col-span-5">
          <CalendarObject
            data={month}
            loading={monthLoading}
            error={monthError}
            onNavigate={(ym) => loadMonth(ym)}
            onRetry={() => loadMonth(want.current ?? undefined)}
          />
        </div>
      </div>

      <DuesList payments={dues} payEnabled={payEnabled} onPay={pay} highlight={justPaid} />
    </div>
  )
}

function MembershipCard({ gym }: { gym: AcademySummary }) {
  const t = useTranslations("Fitness")
  const ta = useTranslations("Academies")
  const locale = useLocale()
  const status = STATUS_KEYS[gym.membership_status] || STATUS_KEYS.pending
  const tone =
    gym.membership_status === "active"
      ? SP.ok
      : gym.membership_status === "overdue"
        ? SP.bad
        : gym.membership_status === "pending"
          ? SP.warn
          : "#9A938A"
  const since = gym.linked_at ? new Date(gym.linked_at).toLocaleDateString(locale) : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border-2 border-[#0B0B0D] p-4"
      style={{ background: SP.panel, ...cardStyle(SP.room.academy, 8) }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-32 w-40" style={{ background: TX.halftone, maskImage: "linear-gradient(225deg,#000,transparent 70%)", WebkitMaskImage: "linear-gradient(225deg,#000,transparent 70%)" }} />
      <div className="relative flex items-center gap-3">
        {gym.academy.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gym.academy.avatar_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-full border-2 border-[#0B0B0D] object-cover" />
        ) : (
          <span className="fl-display grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#0B0B0D] text-lg" style={{ background: SP.inner, color: SP.glow }}>
            {initialsOf(gym.academy.nome)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/academias/${gym.academy.slug}`} className="fl-display block truncate text-[26px] leading-none text-[#FFF1E6] hover:text-[#FB923C] md:text-[28px]">
            {gym.academy.nome}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: SP.mute }}>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5" style={{ color: SP.glow }} />
              {gym.plan_name || t("gymNoPlan", "Sem plano informado")}
            </span>
            {since && <span>· {t("gymLinkedSince", "vinculado desde {d}").replace("{d}", since)}</span>}
          </p>
        </div>
        <span className="hidden shrink-0 border-2 border-[#0B0B0D] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] sm:inline" style={{ background: tone }}>
          {ta(status[0], status[1])}
        </span>
      </div>
      <span className="relative mt-3 inline-block border-2 border-[#0B0B0D] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] sm:hidden" style={{ background: tone }}>
        {ta(status[0], status[1])}
      </span>
    </motion.div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  visual,
}: {
  label: string
  value?: number | null
  icon?: React.ReactNode
  visual?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 border-2 border-[#0B0B0D] px-2 py-3 text-center" style={{ background: SP.panel, ...cardStyle(SP.band, 4) }}>
      {visual ?? (
        <span className="flex items-center gap-1">
          {icon}
          {value == null ? (
            <span className="fl-display text-4xl leading-none" style={{ color: SP.dim }}>
              —
            </span>
          ) : (
            <CountUp value={value} format={fmtInt} className="fl-display text-4xl leading-none text-[#FFF1E6]" />
          )}
        </span>
      )}
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: SP.mute }}>
        {label}
      </span>
    </div>
  )
}

/** Sem academia: mostra o que a pessoa ganha (o calendário fantasma). */
function EmptyGym() {
  const t = useTranslations("Fitness")
  const ghost = useMemo(() => Array.from({ length: 35 }, (_, i) => i), [])
  return (
    <div className="grid items-center gap-8 md:grid-cols-2">
      <div className="relative mx-auto w-full max-w-sm border-2 border-dashed p-3 opacity-60" style={{ borderColor: SP.paperMute, background: `${SP.paper}18` }}>
        <div className="mb-2 h-10" style={{ background: `${SP.emberDeep}55` }} />
        <div className="grid grid-cols-7 gap-1">
          {ghost.map((i) => (
            <span key={i} className="aspect-square border border-dashed" style={{ borderColor: `${SP.paperMute}88` }} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="fl-display text-4xl leading-none text-[#FFF1E6]">{t("gymConnectTitle", "Conecte sua academia")}</h2>
        <p className="mt-3 text-sm" style={{ color: SP.mute }}>
          {t(
            "connectText",
            "Seu painel funciona sozinho. Conectando a uma academia parceira, você ganha frequência da catraca, mensalidades e um professor que monta seus treinos."
          )}
        </p>
        <Link href="/academias" className={`${BTN_GOLD} mt-5 px-6 py-3 text-xs`}>
          <Dumbbell className="h-4 w-4" />
          {t("connectCta", "Conecte-se a uma academia")}
        </Link>
      </div>
    </div>
  )
}
