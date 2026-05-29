"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Calendar, Clock, Lock, Unlock, Plus, Trash2,
  AlertCircle, Briefcase, X, Pencil, Power, Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileServiceEditModal } from "@/components/profile/profile-service-edit-modal"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"

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
}

export interface ClanMember {
  id_member_profile: string
  display_name: string
  avatar_url: string | null
  username: string
  role: "owner" | "member"
}

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const WEEKDAY_ABBR  = ["DOM",     "SEG",     "TER",   "QUA",    "QUI",    "SEX",   "SÁB"]

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
        const [rulesRes, overridesRes, bookingsRes, servicesRes] = await Promise.all([
          fetch(`/api/profile/${profileId}/availability`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/availability-overrides`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/bookings`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/services`, { headers: headers() }),
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
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [profileId, headers])

  async function saveRules() {
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/availability`, { method: "POST", headers: headers(), body: JSON.stringify({ rules }) })
      if (res.ok) showMsg("success", "Disponibilidade semanal salva!")
      else { const d = await res.json(); showMsg("error", d.error || "Erro ao salvar") }
    } catch { showMsg("error", "Erro de conexão") }
    setSaving(false)
  }

  async function saveOverride() {
    if (!newOverrideDate) { showMsg("error", "Selecione uma data"); return }
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
        showMsg("success", "Exceção salva!")
      } else { const d = await res.json(); showMsg("error", d.error || "Erro") }
    } catch { showMsg("error", "Erro de conexão") }
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
    } catch { showMsg("error", "Erro de conexão") }
  }
  async function deleteService(s: ProfileService) {
    if (!confirm(`Remover serviço "${s.name}"?`)) return
    try {
      const res = await fetch(`/api/profile/${profileId}/services/${s.id_profile_service}`, { method: "DELETE", headers: headers() })
      if (res.ok) { setServices(prev => prev.filter(x => x.id_profile_service !== s.id_profile_service)); showMsg("success", "Serviço removido") }
    } catch { showMsg("error", "Erro de conexão") }
  }

  // Helper: nome do membro por id
  const memberById = useMemo(() => {
    const m = new Map<string, ClanMember>()
    clanMembers.forEach(c => m.set(c.id_member_profile, c))
    return m
  }, [clanMembers])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141009] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#6B6354] border-t-[#F2B705]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141009] text-[#F5F1E8]">
      <header className="border-b border-[#2A2218] bg-[#141009]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => backHref ? router.push(backHref) : router.back()} className="p-2 rounded-lg hover:bg-[#2A2218] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="fl-marker text-base font-bold leading-none text-[#F2B705]">{isClan ? "Agenda do clan" : "Agenda"}</p>
            <h1 className="fl-display text-2xl leading-[0.9] text-[#F2B705] sm:text-3xl">
              {isClan ? "OPERAÇÃO." : "AGENDA."}
            </h1>
            <p className="mt-0.5 text-xs font-bold text-[#9A938A]">
              Disponibilidade, serviços e visão clara dos seus compromissos.
            </p>
          </div>
        </div>
      </header>

      {message && (
        <div className="max-w-[1600px] mx-auto px-4 pt-3">
          <div className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />{message.text}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-1 rounded-2xl border border-[#2A2218] bg-[#1D1810] p-2">
            {([
              { key: "rules", label: "Disponibilidade", icon: Clock },
              { key: "services", label: "Serviços", icon: Briefcase },
              { key: "bookings", label: "Agendamentos", icon: Calendar },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === key ? "bg-[#F2B705] text-[#1D1810]" : "text-[#C9C2B6] hover:bg-[#2A2218]"
                }`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {/* ─── Disponibilidade ─── */}
          {activeTab === "rules" && (
            <div className="bg-[#1D1810] border border-[#2A2218] rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <h2 className="text-base font-semibold tracking-tight">Disponibilidade semanal</h2>
                <p className="mt-0.5 text-[11px] text-[#8A8275]">
                  Dias e horários em que {isClan ? "o clan" : "você"} atende.
                </p>
              </div>
              <ul className="divide-y divide-[#2A2218]/70 border-t border-[#2A2218]/70">
                {rules.map((rule, i) => (
                  <li
                    key={rule.weekday}
                    className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2 transition-colors ${
                      rule.is_enabled ? "bg-[#1D1810]" : "bg-[#141009]/30"
                    }`}
                  >
                    <label
                      className="flex items-center gap-2 w-[78px] shrink-0 cursor-pointer select-none"
                      title={WEEKDAY_NAMES[rule.weekday]}
                    >
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={e => { const next = [...rules]; next[i] = { ...rule, is_enabled: e.target.checked }; setRules(next) }}
                        className="w-3.5 h-3.5 rounded border-[#6B6354] text-[#F2B705] focus:ring-[#F2B705] focus:ring-offset-0 bg-[#2A2218]"
                      />
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          rule.is_enabled ? "text-[#F5F1E8]" : "text-[#8A8275]"
                        }`}
                      >
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
                            aria-label="Horário de início"
                            className="bg-[#2A2218]/80 border border-[#3A3228]/60 rounded-md px-1.5 py-0.5 text-[12px] font-mono tabular-nums tracking-tight focus:border-[#F2B705]/60 focus:outline-none"
                          />
                          <span className="text-[#6B6354] text-xs">–</span>
                          <input
                            type="time"
                            value={rule.end_time}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, end_time: e.target.value }; setRules(next) }}
                            aria-label="Horário de término"
                            className="bg-[#2A2218]/80 border border-[#3A3228]/60 rounded-md px-1.5 py-0.5 text-[12px] font-mono tabular-nums tracking-tight focus:border-[#F2B705]/60 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1" title="Duração do slot">
                          <Clock className="w-3 h-3 text-[#8A8275]" aria-hidden />
                          <select
                            value={rule.slot_duration_minutes}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, slot_duration_minutes: Number(e.target.value) }; setRules(next) }}
                            aria-label="Duração do slot"
                            className="bg-[#2A2218]/80 border border-[#3A3228]/60 rounded-md pl-1.5 pr-1 py-0.5 text-[12px] font-mono tabular-nums focus:border-[#F2B705]/60 focus:outline-none"
                          >
                            {[15, 30, 45, 60, 90, 120].map(m => (
                              <option key={m} value={m}>{m}m</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1" title="Intervalo entre slots">
                          <span className="text-[10px] font-semibold text-[#8A8275] uppercase tracking-wider">Int</span>
                          <select
                            value={rule.buffer_minutes}
                            onChange={e => { const next = [...rules]; next[i] = { ...rule, buffer_minutes: Number(e.target.value) }; setRules(next) }}
                            aria-label="Intervalo entre slots"
                            className="bg-[#2A2218]/80 border border-[#3A3228]/60 rounded-md pl-1.5 pr-1 py-0.5 text-[12px] font-mono tabular-nums focus:border-[#F2B705]/60 focus:outline-none"
                          >
                            {[0, 5, 10, 15, 30].map(m => (
                              <option key={m} value={m}>+{m}m</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] italic text-[#6B6354]">sem atendimento</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#2A2218]/70 px-3 py-2.5 bg-[#141009]/40">
                <button
                  onClick={saveRules}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#F2B705] hover:bg-[#F2B705] text-[#1D1810] px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Salvando…" : "Salvar"}
                </button>
                <button
                  onClick={() => setExceptionsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#3A3228]/70 bg-[#2A2218]/70 hover:bg-[#2A2218] px-3 py-1.5 text-xs font-medium text-[#E3DDCC] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Exceções
                  {overrides.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-[#F2B705]/20 px-1.5 py-0 text-[10px] font-mono text-[#F2B705]">
                      {overrides.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Serviços ─── */}
          {activeTab === "services" && (
            <div className="bg-[#1D1810] border border-[#2A2218] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Serviços</h2>
                  <p className="text-sm text-[#9A938A]">Cadastre os serviços que {isClan ? "o clan" : "você"} oferece. Apenas ativos aparecem para o cliente.</p>
                </div>
                <button onClick={openNewService}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F2B705] hover:bg-[#F2B705] text-[#1D1810] rounded-lg text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" />Adicionar serviço
                </button>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-[#6B6354] mx-auto mb-3" />
                  <p className="text-[#9A938A]">Nenhum serviço cadastrado.</p>
                  <p className="text-xs text-[#8A8275] mt-1">Clique em &quot;Adicionar serviço&quot; para começar.</p>
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
                        className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${
                          s.is_active ? "bg-[#2A2218]/50 border-[#3A3228]" : "bg-[#1D1810]/50 border-[#2A2218]/50 opacity-60"
                        }`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{s.name}</p>
                            {!s.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-[#3A3228] text-[#C9C2B6]">Inativo</span>}
                          </div>
                          {s.description && <p className="text-xs text-[#9A938A] mt-0.5">{s.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#9A938A]">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.duration_minutes} min</span>
                            <span className="text-[#F2B705] font-medium">{centsToReais(s.price_amount)}</span>
                            {perMember !== null && (
                              <span className="text-[#8A8275]">
                                {centsToReais(perMember)}/membro
                              </span>
                            )}
                          </div>
                          {isClan && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <Users className="w-3.5 h-3.5 text-[#8A8275] shrink-0" />
                              {participantes.length === 0 ? (
                                <span className="text-xs text-[#8A8275]">Sem membros configurados</span>
                              ) : mids.length === 0 ? (
                                <span className="text-xs text-[#8A8275]">Todos os membros</span>
                              ) : (
                                participantes.map(m => (
                                  <Avatar key={m.id_member_profile} className="size-5 border border-[#6B6354]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {m.avatar_url && <img src={m.avatar_url} alt={m.display_name} className="object-cover" />}
                                    <AvatarFallback className="text-[8px]">{getInitials(m.display_name)}</AvatarFallback>
                                  </Avatar>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleServiceActive(s)} title={s.is_active ? "Desativar" : "Ativar"}
                            className="p-2 rounded-lg hover:bg-[#3A3228] text-[#9A938A] hover:text-[#F2B705] transition-colors">
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditService(s)} title="Editar"
                            className="p-2 rounded-lg hover:bg-[#3A3228] text-[#9A938A] hover:text-[#F5F1E8] transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteService(s)} title="Remover"
                            className="p-2 rounded-lg hover:bg-[#3A3228] text-[#9A938A] hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Agendamentos (calendário mensal + lista premium) ─── */}
          {activeTab === "bookings" && (
            <AgendaBookingsExperience profileId={profileId} controlledBookings={bookings} />
          )}
        </main>
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
          showMsg("success", wasEdit ? "Serviço atualizado!" : "Serviço criado!")
        }}
        onError={(msg) => showMsg("error", msg)}
      />

      {/* Modal: Exceções */}
      {exceptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setExceptionsOpen(false)}>
          <div className="bg-[#1D1810] border border-[#2A2218] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#2A2218]">
              <div>
                <h2 className="text-lg font-semibold">Exceções por data</h2>
                <p className="text-xs text-[#9A938A] mt-0.5">Bloqueie dias inteiros ou ajuste horários específicos.</p>
              </div>
              <button onClick={() => setExceptionsOpen(false)} className="p-2 rounded-lg hover:bg-[#2A2218] text-[#9A938A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-[#2A2218]/50 rounded-lg border border-[#3A3228]">
                <div>
                  <label className="block text-xs text-[#9A938A] mb-1">Data</label>
                  <input type="date" value={newOverrideDate} onChange={e => setNewOverrideDate(e.target.value)}
                    className="bg-[#2A2218] border border-[#3A3228] rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newOverrideBlocked} onChange={e => setNewOverrideBlocked(e.target.checked)}
                    className="w-4 h-4 rounded border-[#6B6354] text-red-500 focus:ring-red-500 bg-[#2A2218]" />
                  <span className="text-sm">Bloquear dia inteiro</span>
                </label>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-[#9A938A] mb-1">Observação</label>
                  <input type="text" value={newOverrideNote} onChange={e => setNewOverrideNote(e.target.value)}
                    placeholder="Ex: Feriado, viagem..."
                    className="w-full bg-[#2A2218] border border-[#3A3228] rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <button onClick={saveOverride} disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[#F2B705] hover:bg-[#F2B705] text-[#1D1810] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" />Adicionar
                </button>
              </div>
              {overrides.length === 0 ? (
                <p className="text-sm text-[#8A8275] text-center py-8">Nenhuma exceção cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map(ov => (
                    <div key={ov.id} className="flex items-center justify-between p-3 bg-[#2A2218]/50 rounded-lg border border-[#3A3228]">
                      <div className="flex items-center gap-3">
                        {ov.is_day_blocked ? <Lock className="w-4 h-4 text-red-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                        <div>
                          <span className="text-sm font-medium">{new Date(ov.override_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ov.is_day_blocked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                            {ov.is_day_blocked ? "Bloqueado" : "Personalizado"}
                          </span>
                          {ov.note && <span className="ml-2 text-xs text-[#8A8275]">{ov.note}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteOverride(ov.id)}
                        className="p-1.5 rounded-lg hover:bg-[#3A3228] text-[#9A938A] hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
