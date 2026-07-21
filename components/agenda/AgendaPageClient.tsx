"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Calendar, Clock, Lock, Unlock, Plus, Trash2,
  AlertCircle, Briefcase, X, Pencil, Power, Users, BellRing,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProfileServiceEditModal } from "@/components/profile/profile-service-edit-modal"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"
import { Halftone, Underline } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface WeeklyRule {
  weekday: number
  is_enabled: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

interface Override {
  id: number
  override_date: string
  is_day_blocked: boolean
  custom_start_time: string | null
  custom_end_time: string | null
  extra_slots_json: string[] | null
  blocked_slots_json: string[] | null
  note: string | null
}

interface ProfileService {
  id_profile_service: number
  name: string
  description: string | null
  duration_minutes: number
  price_amount: number
  is_active: boolean
  member_profile_ids?: string[]
}

interface Booking {
  id: number
  client_name: string
  client_email: string
  client_whatsapp: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  payment_status: string
  deposit_amount: number
  professional_amount: number
  created_at: string
  service_name_snapshot?: string | null
  service_price_amount?: number | null
  client_profile_id?: string | null
  client_profile_display_name?: string | null
  // Perfil de origem do agendamento (agenda é da conta — mig 190)
  origin_profile_name?: string | null
  origin_is_user_account?: boolean
}

export interface ClanMember {
  id_member_profile: string
  display_name: string
  avatar_url: string | null
  username: string
  role: "owner" | "member"
}

/* Acento gold do tabloide (igual ranking). */
const PAPER = "#F1EDE2"

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function centsToReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

/* Inputs/selects no papel (cantos retos, borda preta). */
const PAPER_FIELD =
  "border-2 border-[#0B0B0D]/30 bg-white px-1.5 py-0.5 text-[12px] font-mono tabular-nums tracking-tight text-[#0B0B0D] focus:border-[#0B0B0D] focus:outline-none"
const MODAL_FIELD =
  "border-2 border-[#0B0B0D]/30 bg-white px-3 py-1.5 text-sm text-[#0B0B0D] focus:border-[#0B0B0D] focus:outline-none"

type Tab = "rules" | "services" | "bookings"

export default function AgendaPageClient({
  profileId,
  isClan = false,
  clanMembers = [],
  backHref,
}: {
  profileId: string
  isClan?: boolean
  clanMembers?: ClanMember[]
  backHref?: string
}) {
  const router = useRouter()
  const t = useTranslations("Agenda")
  const locale = useLocale()

  const WEEKDAY_NAMES = [
    t("daySun", "Domingo"), t("dayMon", "Segunda"), t("dayTue", "Terça"),
    t("dayWed", "Quarta"), t("dayThu", "Quinta"), t("dayFri", "Sexta"), t("daySat", "Sábado"),
  ]
  const WEEKDAY_ABBR = [
    t("abbrSun", "DOM"), t("abbrMon", "SEG"), t("abbrTue", "TER"),
    t("abbrWed", "QUA"), t("abbrThu", "QUI"), t("abbrFri", "SEX"), t("abbrSat", "SÁB"),
  ]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("rules")
  const [exceptionsOpen, setExceptionsOpen] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [rules, setRules] = useState<WeeklyRule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      weekday: i, is_enabled: i >= 1 && i <= 5,
      start_time: "08:00", end_time: "18:00",
      slot_duration_minutes: 60, buffer_minutes: 0,
    }))
  )
  const [overrides, setOverrides] = useState<Override[]>([])
  const [newOverrideDate, setNewOverrideDate] = useState("")
  const [newOverrideBlocked, setNewOverrideBlocked] = useState(false)
  const [newOverrideNote, setNewOverrideNote] = useState("")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<ProfileService[]>([])

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ProfileService | null>(null)

  // Lembrete de horário (anti-no-show) — config por subperfil (booking-settings).
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderHours, setReminderHours] = useState(24)
  const [reminderSaving, setReminderSaving] = useState(false)

  const headers = useCallback(() => {
    const token = getToken()
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }, [])

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 4000)
  }

  useEffect(() => {
    if (!getToken()) router.replace("/login")
  }, [router])

  useEffect(() => {
    if (!getToken()) return
    async function load() {
      setLoading(true)
      try {
        const [rulesRes, overridesRes, bookingsRes, servicesRes, settingsRes] = await Promise.all([
          fetch(`/api/profile/${profileId}/availability`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/availability-overrides`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/bookings`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/services`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/booking-settings`, { headers: headers() }),
        ])
        if (rulesRes.ok) {
          const d = await rulesRes.json()
          if (d.rules?.length) {
            const merged = Array.from({ length: 7 }, (_, i) => {
              const existing = d.rules.find((r: WeeklyRule) => r.weekday === i)
              return existing || { weekday: i, is_enabled: false, start_time: "08:00", end_time: "18:00", slot_duration_minutes: 60, buffer_minutes: 0 }
            })
            setRules(merged)
          }
        }
        if (overridesRes.ok) { const d = await overridesRes.json(); setOverrides(d.overrides || []) }
        if (bookingsRes.ok) {
          const d = await bookingsRes.json()
          const list = (d.bookings || []) as Booking[]
          list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
          setBookings(list)
        }
        if (servicesRes.ok) { const d = await servicesRes.json(); setServices(d.services || []) }
        if (settingsRes.ok) {
          const d = await settingsRes.json()
          const s = d.settings || {}
          setReminderEnabled(s.reminder_enabled !== false)
          setReminderHours(Number(s.reminder_hours_before) || 24)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [profileId, headers])

  async function saveRules() {
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/availability`, { method: "POST", headers: headers(), body: JSON.stringify({ rules }) })
      if (res.ok) showMsg("success", t("msgRulesSaved", "Disponibilidade semanal salva!"))
      else { const d = await res.json(); showMsg("error", d.error || t("msgSaveError", "Erro ao salvar")) }
    } catch { showMsg("error", t("msgConnError", "Erro de conexão")) }
    setSaving(false)
  }

  async function saveReminder(next: { enabled?: boolean; hours?: number }) {
    const enabled = next.enabled ?? reminderEnabled
    const hours = next.hours ?? reminderHours
    setReminderEnabled(enabled)
    setReminderHours(hours)
    setReminderSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/booking-settings`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ reminder_enabled: enabled, reminder_hours_before: hours }),
      })
      if (res.ok) showMsg("success", t("reminderSaved", "Lembrete atualizado!"))
      else showMsg("error", t("msgSaveError", "Erro ao salvar"))
    } catch {
      showMsg("error", t("msgConnError", "Erro de conexão"))
    }
    setReminderSaving(false)
  }

  async function saveOverride() {
    if (!newOverrideDate) { showMsg("error", t("msgPickDate", "Selecione uma data")); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/availability-overrides`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ override_date: newOverrideDate, is_day_blocked: newOverrideBlocked, note: newOverrideNote }),
      })
      if (res.ok) {
        const d = await res.json()
        setOverrides(prev => {
          const idx = prev.findIndex(o => o.override_date === newOverrideDate)
          if (idx >= 0) { const next = [...prev]; next[idx] = d.override; return next }
          return [...prev, d.override]
        })
        setNewOverrideDate(""); setNewOverrideBlocked(false); setNewOverrideNote("")
        showMsg("success", t("msgOverrideSaved", "Exceção salva!"))
      } else { const d = await res.json(); showMsg("error", d.error || t("msgError", "Erro")) }
    } catch { showMsg("error", t("msgConnError", "Erro de conexão")) }
    setSaving(false)
  }

  async function deleteOverride(id: number) {
    const token = getToken()
    await fetch(`/api/profile/${profileId}/availability-overrides`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ overrideId: id }),
    })
    setOverrides(prev => prev.filter(o => o.id !== id))
  }

  function openNewService() {
    setEditingService(null)
    setServiceModalOpen(true)
  }
  function openEditService(s: ProfileService) {
    setEditingService(s)
    setServiceModalOpen(true)
  }

  async function toggleServiceActive(s: ProfileService) {
    try {
      const res = await fetch(`/api/profile/${profileId}/services/${s.id_profile_service}`, {
        method: "PATCH", headers: headers(), body: JSON.stringify({ is_active: !s.is_active }),
      })
      if (res.ok) { const d = await res.json(); setServices(prev => prev.map(x => x.id_profile_service === d.service.id_profile_service ? d.service : x)) }
    } catch { showMsg("error", t("msgConnError", "Erro de conexão")) }
  }
  async function deleteService(s: ProfileService) {
    if (!confirm(t("confirmRemoveService", 'Remover serviço "{name}"?').replace("{name}", s.name))) return
    try {
      const res = await fetch(`/api/profile/${profileId}/services/${s.id_profile_service}`, { method: "DELETE", headers: headers() })
      if (res.ok) { setServices(prev => prev.filter(x => x.id_profile_service !== s.id_profile_service)); showMsg("success", t("msgServiceRemoved", "Serviço removido")) }
    } catch { showMsg("error", t("msgConnError", "Erro de conexão")) }
  }

  // Helper: nome do membro por id
  const memberById = useMemo(() => {
    const m = new Map<string, ClanMember>()
    clanMembers.forEach(c => m.set(c.id_member_profile, c))
    return m
  }, [clanMembers])

  const minLabel = t("minutesShort", "min")

  if (loading) {
    return (
      <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#F1EDE2]/15 border-t-[#F2B705]" />
      </div>
    )
  }

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24 text-[#F1EDE2]">
      {/* HERO */}
      <header className="relative mx-auto w-full max-w-6xl border-b-2 border-[#F1EDE2]/12 px-3 pb-8 pt-9 md:px-8 md:pt-12">
        <Halftone className="absolute right-2 top-6 hidden h-24 w-28 opacity-[0.1] md:block" />
        <button
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="mb-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F1EDE2]"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </button>
        <p className="fl-marker text-2xl text-[#F2B705]">
          {isClan ? t("clanEyebrow", "agenda do clan") : t("eyebrow", "a sua agenda")}
        </p>
        <h1 className="relative inline-block">
          <span className="fl-display block text-[16vw] leading-[0.86] text-[#F2B705] sm:text-[11vw] lg:text-[6.5rem]">
            {isClan ? t("clanTitle", "Operação") : t("title", "Agenda")}<span style={{ color: PAPER }}>.</span>
          </span>
          <Underline className="absolute -bottom-3 left-0 h-4 w-full text-[#F2B705]" />
        </h1>
        <p className="mt-6 max-w-2xl text-sm font-bold leading-relaxed text-[#C9C2B6]">
          {t("subtitle", "Disponibilidade, serviços e visão clara dos seus compromissos.")}
        </p>
      </header>

      {message && (
        <div className="mx-auto w-full max-w-6xl px-3 pt-4 md:px-8">
          <div className={cn(
            "flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2.5 text-sm font-bold",
            message.type === "success" ? "bg-[#00876B] text-white" : "bg-[#9A3412] text-white",
          )}>
            <AlertCircle className="h-4 w-4 shrink-0" />{message.text}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-3 py-8 md:px-8 lg:grid-cols-[220px_1fr]">
        {/* Navegação */}
        <aside className="min-w-0">
          <nav className="flex flex-wrap gap-2 lg:sticky lg:top-6 lg:flex-col">
            {([
              { key: "rules", label: t("tabAvailability", "Disponibilidade"), icon: Clock },
              { key: "services", label: t("tabServices", "Serviços"), icon: Briefcase },
              { key: "bookings", label: t("tabBookings", "Agendamentos"), icon: Calendar },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "inline-flex items-center gap-2 border-2 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition lg:w-full",
                  activeTab === key
                    ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                    : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]",
                )}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          {/* Agenda é da CONTA (mig 190): editar por qualquer perfil mexe na
              mesma grade. Clan tem agenda própria e não recebe o aviso. */}
          {!isClan && (
            <p className="mb-4 border-2 border-[#F2B705] bg-[#F2B705]/10 px-3 py-2 text-[11px] font-bold text-[#F2B705]">
              {t("sharedAgendaHint", "Agenda única da conta: todos os seus perfis compartilham estes horários.")}
            </p>
          )}
          {/* ─── Disponibilidade ─── */}
          {activeTab === "rules" && (
            <>
            <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
              <div className="px-4 pt-4 pb-3">
                <h2 className="fl-display text-2xl text-[#0B0B0D]">{t("availabilityTitle", "Disponibilidade semanal")}</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-[#6B6457]">
                  {isClan
                    ? t("availabilityDescClan", "Dias e horários em que o clan atende.")
                    : t("availabilityDesc", "Dias e horários em que você atende.")}
                </p>
              </div>
              <ul className="divide-y-2 divide-[#0B0B0D]/10 border-t-2 border-[#0B0B0D]/10">
                {rules.map((rule, i) => (
                  <li
                    key={rule.weekday}
                    className={cn(
                      "flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2",
                      rule.is_enabled ? "bg-transparent" : "bg-[#0B0B0D]/[0.04]",
                    )}
                  >
                    <label
                      className="flex w-[78px] shrink-0 cursor-pointer select-none items-center gap-2"
                      title={WEEKDAY_NAMES[rule.weekday]}
                    >
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={e => { const next = [...rules]; next[i] = { ...rule, is_enabled: e.target.checked }; setRules(next) }}
                        className="h-3.5 w-3.5 border-[#0B0B0D]/40 accent-[#F2B705]"
                      />
                      <span className={cn(
                        "text-[11px] font-extrabold uppercase tracking-[0.12em]",
                        rule.is_enabled ? "text-[#0B0B0D]" : "text-[#6B6457]",
                      )}>
                        {WEEKDAY_ABBR[rule.weekday]}
                      </span>
                    </label>

                    {rule.is_enabled ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={rule.start_time}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, start_time: e.target.value }; setRules(next) }}
                            aria-label={t("startTime", "Horário de início")}
                            className={PAPER_FIELD}
                          />
                          <span className="text-xs text-[#6B6457]">–</span>
                          <input
                            type="time"
                            value={rule.end_time}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, end_time: e.target.value }; setRules(next) }}
                            aria-label={t("endTime", "Horário de término")}
                            className={PAPER_FIELD}
                          />
                        </div>

                        <div className="flex items-center gap-1" title={t("slotDuration", "Duração do slot")}>
                          <Clock className="h-3 w-3 text-[#6B6457]" aria-hidden />
                          <select
                            value={rule.slot_duration_minutes}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, slot_duration_minutes: Number(e.target.value) }; setRules(next) }}
                            aria-label={t("slotDuration", "Duração do slot")}
                            className={PAPER_FIELD}
                          >
                            {[15, 30, 45, 60, 90, 120].map(m => (
                              <option key={m} value={m}>{m}m</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1" title={t("slotBuffer", "Intervalo entre slots")}>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B6457]">{t("bufferShort", "Int")}</span>
                          <select
                            value={rule.buffer_minutes}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, buffer_minutes: Number(e.target.value) }; setRules(next) }}
                            aria-label={t("slotBuffer", "Intervalo entre slots")}
                            className={PAPER_FIELD}
                          >
                            {[0, 5, 10, 15, 30].map(m => (
                              <option key={m} value={m}>+{m}m</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] italic text-[#6B6457]">{t("noService", "sem atendimento")}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 border-t-2 border-[#0B0B0D]/10 bg-[#0B0B0D]/[0.04] px-3 py-2.5">
                <button
                  onClick={saveRules}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? t("saving", "Salvando…") : t("save", "Salvar")}
                </button>
                <button
                  onClick={() => setExceptionsOpen(true)}
                  className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D]/40 bg-transparent px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] transition hover:border-[#0B0B0D]"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {t("exceptions", "Exceções")}
                  {overrides.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center bg-[#0B0B0D] px-1.5 text-[10px] font-mono text-[#F2B705]">
                      {overrides.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Lembrete de horário (anti-no-show) */}
            <div className="mt-5 border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
                    <BellRing className="h-5 w-5" /> {t("reminderConfigTitle", "Lembrete automático")}
                  </h2>
                  <p className="mt-0.5 max-w-md text-[11px] font-semibold text-[#6B6457]">
                    {t("reminderConfigDesc", "Avisa o cliente por e-mail antes do horário — reduz falta. Você ainda pode lembrar no WhatsApp com 1 toque na lista.")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderEnabled}
                  disabled={reminderSaving}
                  onClick={() => saveReminder({ enabled: !reminderEnabled })}
                  className={cn(
                    "relative h-7 w-12 shrink-0 border-2 border-[#0B0B0D] transition",
                    reminderEnabled ? "bg-[#F2B705]" : "bg-white",
                  )}
                  aria-label={t("reminderEnabledLabel", "Enviar lembrete")}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 border-2 border-[#0B0B0D] bg-[#0B0B0D] transition-all", reminderEnabled ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>

              {reminderEnabled && (
                <div className="mt-3 flex items-center gap-2 border-t-2 border-[#0B0B0D]/10 pt-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("reminderHoursLabel", "Antecedência")}</span>
                  <select
                    value={reminderHours}
                    disabled={reminderSaving}
                    onChange={(e) => saveReminder({ hours: Number(e.target.value) })}
                    className="border-2 border-[#0B0B0D]/30 bg-white px-2 py-1 text-[12px] font-bold text-[#0B0B0D] outline-none focus:border-[#0B0B0D]"
                  >
                    {[2, 3, 6, 12, 24, 48, 72].map((h) => (
                      <option key={h} value={h}>{t("hoursBefore", "{h}h antes").replace("{h}", String(h))}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            </>
          )}

          {/* ─── Serviços ─── */}
          {activeTab === "services" && (
            <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] p-6 shadow-[5px_5px_0_0_#0B0B0D]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="fl-display text-2xl text-[#0B0B0D]">{t("tabServices", "Serviços")}</h2>
                  <p className="text-sm text-[#6B6457]">
                    {isClan
                      ? t("servicesDescClan", "Cadastre os serviços que o clan oferece. Apenas ativos aparecem para o cliente.")
                      : t("servicesDesc", "Cadastre os serviços que você oferece. Apenas ativos aparecem para o cliente.")}
                  </p>
                </div>
                <button
                  onClick={openNewService}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />{t("addService", "Adicionar serviço")}
                </button>
              </div>
              {services.length === 0 ? (
                <div className="flex flex-col items-center border-2 border-dashed border-[#0B0B0D]/20 py-12 text-center">
                  <Briefcase className="mb-3 h-12 w-12 text-[#0B0B0D]/30" />
                  <p className="fl-display text-xl text-[#0B0B0D]">{t("noServicesTitle", "Nenhum serviço cadastrado.")}</p>
                  <p className="mt-1 text-xs text-[#6B6457]">{t("noServicesHint", 'Clique em "Adicionar serviço" para começar.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map(s => {
                    const mids = s.member_profile_ids || []
                    const participantes = mids.length === 0
                      ? clanMembers
                      : mids.map(id => memberById.get(id)).filter(Boolean) as ClanMember[]
                    const perMember = isClan && participantes.length > 0 ? s.price_amount / participantes.length : null
                    return (
                      <div key={s.id_profile_service}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 border-2 p-4",
                          s.is_active ? "border-[#0B0B0D]/25 bg-white/60" : "border-[#0B0B0D]/15 bg-white/30 opacity-60",
                        )}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="fl-display text-lg leading-none text-[#0B0B0D]">{s.name}</p>
                            {!s.is_active && <span className="bg-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#F1EDE2]">{t("inactive", "Inativo")}</span>}
                          </div>
                          {s.description && <p className="mt-0.5 text-xs text-[#6B6457]">{s.description}</p>}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6B6457]">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} {minLabel}</span>
                            <span className="font-extrabold text-[#E0A500]">{centsToReais(s.price_amount)}</span>
                            {perMember !== null && (
                              <span className="text-[#6B6457]">
                                {t("perMember", "{value}/membro").replace("{value}", centsToReais(perMember))}
                              </span>
                            )}
                          </div>
                          {isClan && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 shrink-0 text-[#6B6457]" />
                              {participantes.length === 0 ? (
                                <span className="text-xs text-[#6B6457]">{t("noMembersConfigured", "Sem membros configurados")}</span>
                              ) : mids.length === 0 ? (
                                <span className="text-xs text-[#6B6457]">{t("allMembers", "Todos os membros")}</span>
                              ) : (
                                participantes.map(m => (
                                  <Avatar key={m.id_member_profile} className="size-5 rounded-none border border-[#0B0B0D]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {m.avatar_url && <img src={m.avatar_url} alt={m.display_name} className="object-cover" />}
                                    <AvatarFallback className="rounded-none text-[8px]">{getInitials(m.display_name)}</AvatarFallback>
                                  </Avatar>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleServiceActive(s)} title={s.is_active ? t("deactivate", "Desativar") : t("activate", "Ativar")}
                            className="border-2 border-transparent p-2 text-[#6B6457] transition hover:border-[#0B0B0D] hover:text-[#0B0B0D]">
                            <Power className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEditService(s)} title={t("edit", "Editar")}
                            className="border-2 border-transparent p-2 text-[#6B6457] transition hover:border-[#0B0B0D] hover:text-[#0B0B0D]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteService(s)} title={t("remove", "Remover")}
                            className="border-2 border-transparent p-2 text-[#6B6457] transition hover:border-[#9A3412] hover:text-[#9A3412]">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Agendamentos (calendário mensal + lista) ─── */}
          {activeTab === "bookings" && (
            <AgendaBookingsExperience profileId={profileId} controlledBookings={bookings} />
          )}
        </section>
      </div>

      <ProfileServiceEditModal
        open={serviceModalOpen}
        onClose={() => {
          setServiceModalOpen(false)
          setEditingService(null)
        }}
        profileId={profileId}
        service={editingService}
        isClan={isClan}
        clanMembers={clanMembers}
        onSaved={(updated) => {
          const wasEdit = editingService !== null
          setServices((prev) => {
            const idx = prev.findIndex((x) => x.id_profile_service === updated.id_profile_service)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = updated as ProfileService
              return next
            }
            return [...prev, updated as ProfileService]
          })
          showMsg("success", wasEdit ? t("msgServiceUpdated", "Serviço atualizado!") : t("msgServiceCreated", "Serviço criado!"))
        }}
        onError={(msg) => showMsg("error", msg)}
      />

      {/* Modal: Exceções */}
      {exceptionsOpen && (
        <div className="fl-root fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setExceptionsOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 p-6">
              <div>
                <h2 className="fl-display text-2xl text-[#0B0B0D]">{t("exceptionsTitle", "Exceções por data")}</h2>
                <p className="mt-0.5 text-xs text-[#6B6457]">{t("exceptionsDesc", "Bloqueie dias inteiros ou ajuste horários específicos.")}</p>
              </div>
              <button onClick={() => setExceptionsOpen(false)} aria-label={t("close", "Fechar")} className="border-2 border-transparent p-2 text-[#6B6457] transition hover:border-[#0B0B0D] hover:text-[#0B0B0D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 flex flex-wrap items-end gap-3 border-2 border-[#0B0B0D]/20 bg-white/60 p-4">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("date", "Data")}</label>
                  <input type="date" value={newOverrideDate} onChange={e => setNewOverrideDate(e.target.value)} className={MODAL_FIELD} />
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={newOverrideBlocked} onChange={e => setNewOverrideBlocked(e.target.checked)}
                    className="h-4 w-4 border-[#0B0B0D]/40 accent-[#9A3412]" />
                  <span className="text-sm font-bold text-[#0B0B0D]">{t("blockWholeDay", "Bloquear dia inteiro")}</span>
                </label>
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("note", "Observação")}</label>
                  <input type="text" value={newOverrideNote} onChange={e => setNewOverrideNote(e.target.value)}
                    placeholder={t("notePlaceholder", "Ex: Feriado, viagem...")}
                    className={cn(MODAL_FIELD, "w-full")} />
                </div>
                <button onClick={saveOverride} disabled={saving}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                  <Plus className="h-4 w-4" />{t("add", "Adicionar")}
                </button>
              </div>
              {overrides.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#6B6457]">{t("noExceptions", "Nenhuma exceção cadastrada.")}</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map(ov => (
                    <div key={ov.id} className="flex items-center justify-between border-2 border-[#0B0B0D]/20 bg-white/60 p-3">
                      <div className="flex items-center gap-3">
                        {ov.is_day_blocked ? <Lock className="h-4 w-4 text-[#9A3412]" /> : <Unlock className="h-4 w-4 text-[#00876B]" />}
                        <div>
                          <span className="text-sm font-bold text-[#0B0B0D]">{new Date(ov.override_date + "T12:00:00").toLocaleDateString(locale)}</span>
                          <span className={cn(
                            "ml-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                            ov.is_day_blocked ? "bg-[#9A3412] text-white" : "bg-[#00876B] text-white",
                          )}>
                            {ov.is_day_blocked ? t("blocked", "Bloqueado") : t("custom", "Personalizado")}
                          </span>
                          {ov.note && <span className="ml-2 text-xs text-[#6B6457]">{ov.note}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteOverride(ov.id)} aria-label={t("remove", "Remover")}
                        className="border-2 border-transparent p-1.5 text-[#6B6457] transition hover:border-[#9A3412] hover:text-[#9A3412]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
