"use client"

// A página de agendamento do site da comunidade (mig 221).
//
// ═══ TRÊS PASSOS, E O PRIMEIRO TEM AS DUAS ESCOLHAS ═══
//
//   1. o que  +  com quem   (na mesma tela, decisão do Alex)
//   2. quando (calendário e horários da agenda de VERDADE)
//   3. confirmar (e pagar o sinal, no fluxo que já existe)
//
// Serviço e profissional na mesma tela porque um determina o outro: serviço
// pertence a UM perfil (`provider_profile_id`), então escolher o corte já diz
// com quem é. Separar em dois passos daria à segunda tela uma escolha entre um.
// Aqui as duas listas conversam: escolher a pessoa filtra os serviços, escolher
// o serviço marca a pessoa.
//
// ═══ O QUE ESTA TELA NÃO REINVENTA ═══
//
// A leitura de horário livre é `lib/booking/slots` — a MESMA do modal de
// agendamento do perfil. E a criação do agendamento é o mesmo
// `POST /public/profile/:id/bookings`, com sinal, taxa e agenda da conta
// (mig 190). Um segundo caminho de agendamento significaria dois lugares
// decidindo se o horário está livre, e o site venderia o horário que o
// calendário recusa.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  UserRound,
} from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { loadSlotsForDate, normalizeLabel, type ApiSlotMeta } from "@/lib/booking/slots"
import type {
  CommunitySiteConfig,
  ShowcaseService,
  SiteProfessional,
} from "@/types/community-site"

/** Quantos dias o trilho oferece e quantos aparecem de uma vez. */
const RANGE_DAYS = 42
const STRIP_SIZE = 7

type Step = "choose" | "when" | "confirm"

function dateOnly(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

function money(cents: number | null | undefined, locale: string): string | null {
  if (cents === null || cents === undefined) return null
  const n = Number(cents)
  if (!Number.isFinite(n)) return null
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(n / 100)
}

function duration(minutes: number | null | undefined, h: string, m: string): string | null {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return null
  const hh = Math.floor(total / 60)
  const mm = total % 60
  if (hh === 0) return `${mm}${m}`
  if (mm === 0) return `${hh}${h}`
  return `${hh}${h}${String(mm).padStart(2, "0")}`
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("token")
  } catch {
    // Navegador com armazenamento bloqueado: trata como deslogado, que é o
    // estado verdadeiro do ponto de vista da API.
    return null
  }
}

export function SiteBookingView({
  config,
  services,
  professionals,
  homeHref,
  platformBookingUrl = null,
}: {
  config: CommunitySiteConfig
  services: ShowcaseService[]
  professionals: SiteProfessional[]
  /** De volta para o site — o mesmo endereço por onde a pessoa chegou. */
  homeHref: string
  /**
   * Endereço desta MESMA página no domínio da plataforma.
   *
   * Só existe quando o site está sendo servido por domínio próprio. Ali o
   * `/login` não é alcançável (tudo que não é página do site cai na home dele),
   * e a sessão é por origem — quem não está logado precisa terminar do lado da
   * Freelandoo. `null` = já estamos lá, e o login é aqui mesmo.
   */
  platformBookingUrl?: string | null
}) {
  const t = useTranslations("SiteBooking")
  const locale = useLocale()
  const theme = config.theme

  const [step, setStep] = useState<Step>("choose")
  // O serviço pode vir escolhido do card da vitrine (`?servico=`).
  //
  // ⚠️ Lido do `window`, e NÃO com `useSearchParams`: esse hook obriga um
  // Suspense e tira a rota do pré-render estático — o build do projeto já
  // quebrou exatamente assim. Como é `useState` com inicializador, roda uma vez
  // no cliente e não desencadeia renderização extra.
  const [serviceId, setServiceId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const raw = new URLSearchParams(window.location.search).get("servico")
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  })
  // Com uma pessoa só não há escolha a fazer; com o serviço já marcado, quem
  // atende é o dono dele.
  const [proId, setProId] = useState<string | null>(() => {
    if (professionals.length === 1) return professionals[0].id_profile
    return null
  })
  const [date, setDate] = useState<string>(() => dateOnly(new Date()))
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<ApiSlotMeta[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [windowStart, setWindowStart] = useState(0)

  const service = services.find((s) => s.id_profile_service === serviceId) || null

  useEffect(() => {
    if (!service?.provider_profile_id) return
    setProId((current) => current || service.provider_profile_id || null)
  }, [service])
  const professional = professionals.find((p) => p.id_profile === proId) || null

  // O serviço manda: quem o oferece é o dono dele. Por isso a lista de pessoas
  // é filtrada pelo serviço escolhido, e não o contrário — e escolher o serviço
  // já marca a pessoa.
  const visibleProfessionals = useMemo(() => {
    if (!service?.provider_profile_id) return professionals
    return professionals.filter((p) => p.id_profile === service.provider_profile_id)
  }, [professionals, service])

  const visibleServices = useMemo(() => {
    if (!proId) return services
    return services.filter((s) => s.provider_profile_id === proId)
  }, [services, proId])

  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: RANGE_DAYS }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d
    })
  }, [])

  const visibleDays = days.slice(windowStart, windowStart + STRIP_SIZE)

  // Horários do dia escolhido. Só busca no passo do calendário: no primeiro
  // passo a pessoa ainda pode trocar de profissional, e cada troca custaria uma
  // consulta que ela não pediu.
  useEffect(() => {
    if (step !== "when" || !proId) return
    let cancelled = false
    setLoadingSlots(true)
    setTime(null)
    loadSlotsForDate(proId, date, false)
      .then((list) => {
        if (!cancelled) setSlots(list)
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [step, proId, date])

  const confirm = useCallback(async () => {
    if (!service || !proId || !time) return
    const token = getToken()
    if (!token) {
      setError(t("loginNeeded", "Entre na sua conta para confirmar o horário."))
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/profile/${proId}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_date: date,
          start_time: time,
          id_profile_service: service.id_profile_service,
          client_whatsapp: whatsapp || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.checkout_url) {
        // O sinal é cobrado no fluxo que já existe — esta tela não inventa
        // pagamento nenhum.
        window.location.href = data.checkout_url
        return
      }
      setError(data.error || t("bookError", "Não foi possível concluir o agendamento."))
    } catch {
      setError(t("bookError", "Não foi possível concluir o agendamento."))
    } finally {
      setSending(false)
    }
  }, [service, proId, time, date, whatsapp, t])

  const canAdvance = step === "choose" ? !!service && !!proId : step === "when" ? !!time : true

  const stepTitles = [
    t("step1", "O que e com quem"),
    t("step2", "Quando"),
    t("step3", "Confirmar"),
  ]
  const stepIndex = step === "choose" ? 0 : step === "when" ? 1 : 2

  return (
    <div
      className="fl-sharp min-h-[100dvh]"
      style={{ background: theme.background, color: theme.textPrimary }}
    >
      <header
        className="border-b-2 px-5 py-4 md:px-10"
        style={{ background: theme.surface, borderColor: theme.background }}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]"
            style={{ color: theme.textSecondary }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back", "Voltar ao site")}
          </Link>
          <span
            className="fl-display text-lg leading-none tracking-[0.12em]"
            style={{ color: theme.primary }}
          >
            {config.siteName}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-10 md:py-16">
        {/* Os três passos ficam à vista o tempo todo: quem agenda quer saber
            quanto falta antes de começar. */}
        <ol className="mb-10 flex flex-wrap items-center gap-3">
          {stepTitles.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && (
                <span
                  aria-hidden
                  className="h-px w-6"
                  style={{ background: theme.textSecondary }}
                />
              )}
              <span
                className="flex items-center gap-2 border-2 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={
                  i === stepIndex
                    ? { background: theme.primary, color: theme.background, borderColor: theme.background }
                    : {
                        borderColor: i < stepIndex ? theme.primary : theme.textSecondary,
                        color: i < stepIndex ? theme.primary : theme.textSecondary,
                      }
                }
              >
                {i < stepIndex && <Check className="h-3 w-3" />}
                {label}
              </span>
            </li>
          ))}
        </ol>

        {/* ─── Passo 1: serviço + profissional ───────────────────────────── */}
        {step === "choose" && (
          <div className="space-y-10">
            <section>
              <h2 className="fl-display text-3xl leading-none md:text-4xl">
                {t("serviceTitle", "Escolha o serviço")}
              </h2>
              {services.length === 0 ? (
                <p className="mt-4 text-sm" style={{ color: theme.textSecondary }}>
                  {t("noServices", "Ainda não há serviços cadastrados para agendar.")}
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {visibleServices.map((s) => {
                    const price = money(s.price_amount, locale)
                    const dur = duration(s.duration_minutes, t("hour", "h"), t("min", "min"))
                    const selected = s.id_profile_service === serviceId
                    return (
                      <button
                        key={s.id_profile_service}
                        type="button"
                        onClick={() => {
                          setServiceId(selected ? null : s.id_profile_service)
                          // Escolher o serviço já diz com quem é: o dono dele.
                          if (!selected && s.provider_profile_id) {
                            setProId(s.provider_profile_id)
                          }
                        }}
                        className="flex items-start gap-4 border-2 p-4 text-left"
                        style={{
                          background: theme.surface,
                          borderColor: selected ? theme.primary : "#0B0B0D",
                          boxShadow: selected ? `4px 4px 0 0 ${theme.primary}` : undefined,
                        }}
                      >
                        {s.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.image_url}
                            alt={s.name}
                            loading="lazy"
                            className="h-16 w-16 shrink-0 border-2 border-[#0B0B0D] object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold uppercase tracking-[0.06em]">
                            {s.name}
                          </span>
                          {s.description && (
                            <span
                              className="mt-1 block text-xs leading-relaxed"
                              style={{ color: theme.textSecondary }}
                            >
                              {s.description}
                            </span>
                          )}
                          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {price && (
                              <span className="fl-display text-lg leading-none" style={{ color: theme.primary }}>
                                {price}
                              </span>
                            )}
                            {dur && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                                style={{ color: theme.textSecondary }}
                              >
                                <Clock className="h-3 w-3" />
                                {dur}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Com uma pessoa só, a escolha não existe — mostrar uma lista de um
                seria pedir uma decisão que já está tomada. */}
            {professionals.length > 1 && (
              <section>
                <h2 className="fl-display text-3xl leading-none md:text-4xl">
                  {t("professionalTitle", "Com quem")}
                </h2>
                <div className="mt-5 flex flex-wrap gap-4">
                  {visibleProfessionals.map((p) => {
                    const selected = p.id_profile === proId
                    return (
                      <button
                        key={p.id_profile}
                        type="button"
                        onClick={() => {
                          const next = selected ? null : p.id_profile
                          setProId(next)
                          // Trocar de pessoa larga o serviço que era de outra.
                          if (next && service && service.provider_profile_id !== next) {
                            setServiceId(null)
                          }
                        }}
                        className="flex items-center gap-3 border-2 p-3 text-left"
                        style={{
                          background: theme.surface,
                          borderColor: selected ? theme.primary : "#0B0B0D",
                          boxShadow: selected ? `4px 4px 0 0 ${theme.primary}` : undefined,
                        }}
                      >
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatar_url}
                            alt={p.name}
                            loading="lazy"
                            data-avatar
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            data-avatar
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2"
                            style={{ borderColor: theme.primary, color: theme.primary }}
                          >
                            <UserRound className="h-5 w-5" />
                          </span>
                        )}
                        <span>
                          <span className="block text-sm font-extrabold">{p.name}</span>
                          <span
                            className="block text-[11px] font-extrabold uppercase tracking-[0.12em]"
                            style={{ color: theme.textSecondary }}
                          >
                            {p.profession || t("professionalFallback", "Profissional")}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── Passo 2: o calendário de verdade ──────────────────────────── */}
        {step === "when" && (
          <section>
            <h2 className="fl-display text-3xl leading-none md:text-4xl">
              {t("whenTitle", "Escolha o dia e a hora")}
            </h2>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWindowStart((v) => Math.max(0, v - STRIP_SIZE))}
                disabled={windowStart === 0}
                aria-label={t("prevDays", "Dias anteriores")}
                className="border-2 p-2 disabled:opacity-30"
                style={{ borderColor: theme.textSecondary }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex flex-1 gap-2 overflow-x-auto">
                {visibleDays.map((d) => {
                  const iso = dateOnly(d)
                  const selected = iso === date
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setDate(iso)}
                      className="flex min-w-[64px] flex-1 flex-col items-center border-2 px-2 py-3"
                      style={{
                        background: selected ? theme.primary : theme.surface,
                        color: selected ? theme.background : theme.textPrimary,
                        borderColor: "#0B0B0D",
                      }}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                        {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d)}
                      </span>
                      <span className="fl-display mt-1 text-xl leading-none">{d.getDate()}</span>
                      <span className="text-[10px] uppercase">
                        {new Intl.DateTimeFormat(locale, { month: "short" }).format(d)}
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setWindowStart((v) => Math.min(RANGE_DAYS - STRIP_SIZE, v + STRIP_SIZE))
                }
                disabled={windowStart + STRIP_SIZE >= RANGE_DAYS}
                aria-label={t("nextDays", "Próximos dias")}
                className="border-2 p-2 disabled:opacity-30"
                style={{ borderColor: theme.textSecondary }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8">
              {loadingSlots ? (
                <p
                  className="flex items-center gap-2 text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loadingSlots", "Consultando a agenda...")}
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm" style={{ color: theme.textSecondary }}>
                  {t("noSlots", "Sem horário livre neste dia. Tente outro.")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {slots.map((s) => {
                    const label = normalizeLabel(s.start)
                    const selected = label === time
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setTime(label)}
                        className="border-2 px-2 py-3 text-sm font-extrabold"
                        style={{
                          background: selected ? theme.primary : theme.surface,
                          color: selected ? theme.background : theme.textPrimary,
                          borderColor: "#0B0B0D",
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Passo 3: confirmação ──────────────────────────────────────── */}
        {step === "confirm" && service && professional && time && (
          <section>
            <h2 className="fl-display text-3xl leading-none md:text-4xl">
              {t("confirmTitle", "Confirme seu horário")}
            </h2>

            <dl
              className="mt-6 border-2 p-5"
              style={{ background: theme.surface, borderColor: "#0B0B0D" }}
            >
              {[
                { icon: Check, term: t("summaryService", "Serviço"), value: service.name },
                {
                  icon: UserRound,
                  term: professional.profession || t("professionalFallback", "Profissional"),
                  value: professional.name,
                },
                {
                  icon: CalendarDays,
                  term: t("summaryWhen", "Quando"),
                  value: `${new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(`${date}T12:00:00`))} · ${time}`,
                },
              ].map((row) => (
                <div key={row.term} className="flex items-center gap-3 py-2">
                  <row.icon className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />
                  <dt
                    className="w-28 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                    style={{ color: theme.textSecondary }}
                  >
                    {row.term}
                  </dt>
                  <dd className="text-sm font-extrabold">{row.value}</dd>
                </div>
              ))}
              {money(service.price_amount, locale) && (
                <div className="flex items-center gap-3 border-t-2 pt-3" style={{ borderColor: theme.background }}>
                  <span
                    className="w-28 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("summaryPrice", "Valor")}
                  </span>
                  <span className="fl-display text-2xl leading-none" style={{ color: theme.primary }}>
                    {money(service.price_amount, locale)}
                  </span>
                </div>
              )}
            </dl>

            <label className="mt-6 block">
              <span
                className="block text-[11px] font-extrabold uppercase tracking-[0.12em]"
                style={{ color: theme.textSecondary }}
              >
                {t("whatsappLabel", "WhatsApp para contato (opcional)")}
              </span>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                placeholder="(11) 90000-0000"
                className="mt-2 w-full border-2 px-3 py-3 text-sm outline-none"
                style={{
                  background: theme.background,
                  borderColor: "#0B0B0D",
                  color: theme.textPrimary,
                }}
              />
            </label>

            <p className="mt-4 text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
              {t(
                "depositNote",
                "Ao confirmar, você paga o sinal que reserva o horário. O restante é combinado direto com quem atende."
              )}
            </p>

            {/* Domínio próprio: o login da Freelandoo não é alcançável ali, e a
                sessão é por origem. Em vez de um erro sem saída, a pessoa
                termina do lado da plataforma com a escolha já feita. */}
            {platformBookingUrl && !getToken() && (
              <a
                href={platformBookingUrl}
                className="mt-6 inline-block border-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
                style={{ background: theme.primary, color: theme.background, borderColor: "#0B0B0D" }}
              >
                {t("finishOnPlatform", "Terminar na Freelandoo")}
              </a>
            )}
          </section>
        )}

        {error && (
          <p
            className="mt-6 border-2 px-4 py-3 text-sm"
            style={{ borderColor: "#EF4444", color: "#FCA5A5", background: theme.surface }}
          >
            {error}
          </p>
        )}

        {/* ─── Navegação ─────────────────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep(step === "confirm" ? "when" : "choose")}
            className="border-2 px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em] disabled:opacity-30"
            style={{ borderColor: theme.textSecondary, color: theme.textSecondary }}
            disabled={step === "choose"}
          >
            {t("previous", "Voltar")}
          </button>

          {step === "confirm" ? (
            <button
              type="button"
              onClick={confirm}
              disabled={sending}
              className="inline-flex items-center gap-2 border-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ background: theme.primary, color: theme.background, borderColor: "#0B0B0D" }}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("confirmCta", "Confirmar agendamento")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === "choose" ? "when" : "confirm")}
              disabled={!canAdvance}
              className="border-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em] disabled:opacity-30"
              style={{ background: theme.primary, color: theme.background, borderColor: "#0B0B0D" }}
            >
              {t("next", "Próximo")}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
