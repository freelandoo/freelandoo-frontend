"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { startOfWeek, endOfWeek, format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Save, Calendar, Clock, Lock, Unlock, Plus, Trash2,
  AlertCircle, Briefcase, ListOrdered, X, Pencil, Power,
  ChevronLeft, ChevronRight, Loader2, LayoutGrid, List as ListIcon,
} from "lucide-react"
import { MiniCalendar } from "@/components/calendar/MiniCalendar"
import { WeeklyTimeGrid } from "@/components/calendar/WeeklyTimeGridDynamic"
import type { CalendarEvent, AvailableSlot } from "@/components/calendar/types"

// ─── Types ───────────────────────────────────────────────────────────
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

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  confirmed: "Confirmado",
  canceled: "Cancelado",
  completed: "Concluído",
  no_show: "Não compareceu",
  expired: "Expirado",
}
const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-red-500/20 text-red-400",
  canceled: "bg-zinc-500/20 text-zinc-400",
  completed: "bg-green-500/20 text-green-400",
  no_show: "bg-orange-500/20 text-orange-400",
  expired: "bg-zinc-600/20 text-zinc-500",
}
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", canceled: "Cancelado",
}
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  refunded: "bg-blue-500/20 text-blue-400",
  canceled: "bg-zinc-500/20 text-zinc-400",
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function centsToReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

type Tab = "rules" | "services" | "bookings"
type BookingsView = "list" | "calendar"

export default function AgendaPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id_profile as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("rules")
  const [bookingsView, setBookingsView] = useState<BookingsView>("list")
  const [exceptionsOpen, setExceptionsOpen] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [month, setMonth] = useState<Date>(() => new Date())
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 0 }), [weekStart])

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

  // Week data (calendar tab)
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([])
  const [weekAvailable, setWeekAvailable] = useState<{ date: string; slots: AvailableSlot[] }[]>([])
  const [weekLoading, setWeekLoading] = useState(false)

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ProfileService | null>(null)
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", duration_minutes: 60, price_reais: "0,00", is_active: true,
  })

  const headers = useCallback(() => {
    const token = getToken()
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }, [])

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 4000)
  }

  // Auth guard: sem token, redireciona para login.
  useEffect(() => {
    if (!getToken()) router.replace("/login")
  }, [router])

  // Load main data
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

  // Load week data when on bookings/calendar
  const fetchWeek = useCallback(async () => {
    setWeekLoading(true)
    try {
      const ws = format(weekStart, "yyyy-MM-dd")
      const we = format(weekEnd, "yyyy-MM-dd")
      const res = await fetch(`/api/profile/${profileId}/calendar/week?weekStart=${ws}&weekEnd=${we}`, { headers: headers() })
      if (res.ok) {
        const d = await res.json()
        setWeekEvents(d.events || [])
        setWeekAvailable(d.availableSlots || [])
      }
    } finally { setWeekLoading(false) }
  }, [profileId, weekStart, weekEnd, headers])

  useEffect(() => {
    if (activeTab === "bookings" && bookingsView === "calendar") fetchWeek()
  }, [activeTab, bookingsView, fetchWeek])

  // ─── Mutations ─────────────────────────────────────────────────────
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

  // Services CRUD
  function openNewService() {
    setEditingService(null)
    setServiceForm({ name: "", description: "", duration_minutes: 60, price_reais: "0,00", is_active: true })
    setServiceModalOpen(true)
  }
  function openEditService(s: ProfileService) {
    setEditingService(s)
    setServiceForm({
      name: s.name, description: s.description || "",
      duration_minutes: s.duration_minutes,
      price_reais: (s.price_amount / 100).toFixed(2).replace(".", ","),
      is_active: s.is_active,
    })
    setServiceModalOpen(true)
  }
  function parsePriceReais(input: string): number {
    const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
    const n = Number(cleaned)
    if (!isFinite(n) || n < 0) return -1
    return Math.round(n * 100)
  }
  async function saveService() {
    const price = parsePriceReais(serviceForm.price_reais)
    if (!serviceForm.name.trim()) { showMsg("error", "Informe o nome do serviço"); return }
    if (!serviceForm.duration_minutes || serviceForm.duration_minutes <= 0) { showMsg("error", "Duração inválida"); return }
    if (price < 0) { showMsg("error", "Valor inválido"); return }
    setSaving(true)
    const body = {
      name: serviceForm.name.trim(), description: serviceForm.description.trim() || null,
      duration_minutes: serviceForm.duration_minutes, price_amount: price, is_active: serviceForm.is_active,
    }
    try {
      const res = editingService
        ? await fetch(`/api/profile/${profileId}/services/${editingService.id_profile_service}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) })
        : await fetch(`/api/profile/${profileId}/services`, { method: "POST", headers: headers(), body: JSON.stringify(body) })
      if (res.ok) {
        const d = await res.json()
        setServices(prev => editingService
          ? prev.map(s => s.id_profile_service === d.service.id_profile_service ? d.service : s)
          : [...prev, d.service])
        setServiceModalOpen(false)
        showMsg("success", editingService ? "Serviço atualizado!" : "Serviço criado!")
      } else { const d = await res.json(); showMsg("error", d.error || "Erro ao salvar") }
    } catch { showMsg("error", "Erro de conexão") }
    setSaving(false)
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

  const goPrev = () => setWeekStart(prev => addDays(prev, -7))
  const goNext = () => setWeekStart(prev => addDays(prev, 7))
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const headerLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} — ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-600 border-t-yellow-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">Agenda</h1>
            <p className="text-xs text-zinc-400">Gerencie horários, serviços e agendamentos.</p>
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

      {/* Layout */}
      <div className="max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
            <MiniCalendar
              selectedWeekStart={weekStart}
              onWeekChange={(ws) => { setWeekStart(ws); setMonth(ws); setActiveTab("bookings"); setBookingsView("calendar") }}
              month={month}
              onMonthChange={setMonth}
            />
          </div>

          <nav className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 space-y-1">
            {([
              { key: "rules", label: "Disponibilidade", icon: Clock },
              { key: "services", label: "Serviços", icon: Briefcase },
              { key: "bookings", label: "Agendamentos", icon: Calendar },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === key ? "bg-yellow-400 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800"
                }`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {/* ─── Disponibilidade ─────────────────────────────────────── */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-1">Disponibilidade semanal</h2>
                <p className="text-sm text-zinc-400 mb-6">Configure os dias e horários em que você atende.</p>
                <div className="space-y-3">
                  {rules.map((rule, i) => (
                    <div key={rule.weekday} className={`flex flex-wrap items-center gap-4 p-4 rounded-lg border transition-all ${
                      rule.is_enabled ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
                    }`}>
                      <label className="flex items-center gap-3 min-w-[140px] cursor-pointer">
                        <input type="checkbox" checked={rule.is_enabled}
                          onChange={e => { const next = [...rules]; next[i] = { ...rule, is_enabled: e.target.checked }; setRules(next) }}
                          className="w-4 h-4 rounded border-zinc-600 text-yellow-400 focus:ring-yellow-400 bg-zinc-800" />
                        <span className="text-sm font-medium">{WEEKDAY_NAMES[rule.weekday]}</span>
                      </label>
                      {rule.is_enabled && (
                        <>
                          <div className="flex items-center gap-2">
                            <input type="time" value={rule.start_time}
                              onChange={e => { const next = [...rules]; next[i] = { ...rule, start_time: e.target.value }; setRules(next) }}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
                            <span className="text-zinc-500">—</span>
                            <input type="time" value={rule.end_time}
                              onChange={e => { const next = [...rules]; next[i] = { ...rule, end_time: e.target.value }; setRules(next) }}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-400">Duração:</label>
                            <select value={rule.slot_duration_minutes}
                              onChange={e => { const next = [...rules]; next[i] = { ...rule, slot_duration_minutes: Number(e.target.value) }; setRules(next) }}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
                              {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-400">Intervalo:</label>
                            <select value={rule.buffer_minutes}
                              onChange={e => { const next = [...rules]; next[i] = { ...rule, buffer_minutes: Number(e.target.value) }; setRules(next) }}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
                              {[0, 5, 10, 15, 30].map(m => <option key={m} value={m}>{m} min</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button onClick={saveRules} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar disponibilidade"}
                  </button>
                  <button onClick={() => setExceptionsOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors">
                    <Calendar className="w-4 h-4" />Exceções
                    {overrides.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">
                        {overrides.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Serviços ──────────────────────────────────────────── */}
          {activeTab === "services" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Serviços</h2>
                  <p className="text-sm text-zinc-400">Cadastre os serviços que você oferece. Apenas ativos aparecem para o cliente.</p>
                </div>
                <button onClick={openNewService}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" />Adicionar serviço
                </button>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">Nenhum serviço cadastrado.</p>
                  <p className="text-xs text-zinc-500 mt-1">Clique em &quot;Adicionar serviço&quot; para começar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map(s => (
                    <div key={s.id_profile_service}
                      className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${
                        s.is_active ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
                      }`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{s.name}</p>
                          {!s.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">Inativo</span>}
                        </div>
                        {s.description && <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.duration_minutes} min</span>
                          <span className="text-yellow-400 font-medium">{centsToReais(s.price_amount)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleServiceActive(s)} title={s.is_active ? "Desativar" : "Ativar"}
                          className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-yellow-400 transition-colors">
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditService(s)} title="Editar"
                          className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteService(s)} title="Remover"
                          className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Agendamentos (Listagem + Calendário fundidos) ─────── */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              {/* Topbar */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-200 text-xs font-medium hover:bg-zinc-800">Hoje</button>
                  <button onClick={goPrev} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={goNext} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"><ChevronRight className="w-4 h-4" /></button>
                  <p className="text-sm font-semibold text-zinc-100 capitalize ml-2">{headerLabel}</p>
                  {weekLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                </div>
                <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                  <button onClick={() => setBookingsView("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      bookingsView === "list" ? "bg-yellow-400 text-zinc-900" : "text-zinc-300 hover:bg-zinc-700"
                    }`}>
                    <ListIcon className="w-3.5 h-3.5" />Lista
                  </button>
                  <button onClick={() => setBookingsView("calendar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      bookingsView === "calendar" ? "bg-yellow-400 text-zinc-900" : "text-zinc-300 hover:bg-zinc-700"
                    }`}>
                    <LayoutGrid className="w-3.5 h-3.5" />Calendário
                  </button>
                </div>
              </div>

              {bookingsView === "list" && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold mb-1 flex items-center gap-2"><ListOrdered className="w-5 h-5" /> Listagem de agendamentos</h2>
                  <p className="text-sm text-zinc-400 mb-6">Do mais recente para o mais antigo.</p>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">Nenhum agendamento encontrado ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map(b => {
                        const amountPaid = b.service_price_amount ?? b.deposit_amount
                        const duration = (() => {
                          const [sh, sm] = b.start_time.split(":").map(Number)
                          const [eh, em] = b.end_time.split(":").map(Number)
                          return (eh * 60 + em) - (sh * 60 + sm)
                        })()
                        return (
                          <div key={b.id} className={`p-4 rounded-lg border ${
                            b.status === "confirmed" ? "border-red-500/30 bg-red-500/5" : "border-zinc-700 bg-zinc-800/50"
                          }`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                {b.client_profile_id ? (
                                  <a href={`/freelancer/${b.client_profile_id}`} target="_blank" rel="noreferrer"
                                     className="font-medium text-sm text-yellow-400 hover:underline">
                                    {b.client_profile_display_name || b.client_name}
                                  </a>
                                ) : (
                                  <p className="font-medium text-sm">{b.client_name}</p>
                                )}
                                <p className="text-xs text-zinc-400">{b.client_email}{b.client_whatsapp && ` • ${b.client_whatsapp}`}</p>
                                {b.service_name_snapshot && (
                                  <p className="text-xs text-zinc-300 mt-1">
                                    <Briefcase className="inline w-3 h-3 mr-1" />{b.service_name_snapshot}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[b.payment_status] || "bg-zinc-700 text-zinc-300"}`}>
                                  {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                                </span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] || "bg-zinc-700 text-zinc-300"}`}>
                                  {STATUS_LABELS[b.status] || b.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(b.booking_date + "T12:00:00").toLocaleDateString("pt-BR")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {b.start_time.substring(0, 5)} — {b.end_time.substring(0, 5)} ({duration} min)
                              </span>
                              <span className="text-zinc-300">
                                Valor pago: <strong className="text-yellow-400">{centsToReais(amountPaid)}</strong>
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {bookingsView === "calendar" && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 sm:p-4">
                  <WeeklyTimeGrid
                    weekStart={weekStart}
                    events={weekEvents}
                    availableBackground={weekAvailable}
                    height={680}
                    readOnly
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Serviço */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setServiceModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">{editingService ? "Editar serviço" : "Novo serviço"}</h2>
              <button onClick={() => setServiceModalOpen(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nome</label>
                <input type="text" value={serviceForm.name}
                  onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Corte de cabelo"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Descrição (opcional)</label>
                <textarea value={serviceForm.description}
                  onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Duração</label>
                  <select value={serviceForm.duration_minutes}
                    onChange={e => setServiceForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                    {[15, 30, 45, 60, 90, 120, 180, 240].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Valor (R$)</label>
                  <input type="text" value={serviceForm.price_reais}
                    onChange={e => setServiceForm(f => ({ ...f, price_reais: e.target.value }))}
                    placeholder="0,00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={serviceForm.is_active}
                  onChange={e => setServiceForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-600 text-yellow-400 bg-zinc-800" />
                <span className="text-sm">Ativo (visível para clientes)</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-zinc-800">
              <button onClick={() => setServiceModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-sm">Cancelar</button>
              <button onClick={saveService} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exceções */}
      {exceptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setExceptionsOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold">Exceções por data</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Bloqueie dias inteiros ou ajuste horários específicos.</p>
              </div>
              <button onClick={() => setExceptionsOpen(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Data</label>
                  <input type="date" value={newOverrideDate} onChange={e => setNewOverrideDate(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newOverrideBlocked} onChange={e => setNewOverrideBlocked(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 text-red-500 focus:ring-red-500 bg-zinc-800" />
                  <span className="text-sm">Bloquear dia inteiro</span>
                </label>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-zinc-400 mb-1">Observação</label>
                  <input type="text" value={newOverrideNote} onChange={e => setNewOverrideNote(e.target.value)}
                    placeholder="Ex: Feriado, viagem..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <button onClick={saveOverride} disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" />Adicionar
                </button>
              </div>
              {overrides.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhuma exceção cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map(ov => (
                    <div key={ov.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-center gap-3">
                        {ov.is_day_blocked ? <Lock className="w-4 h-4 text-red-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                        <div>
                          <span className="text-sm font-medium">{new Date(ov.override_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ov.is_day_blocked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                            {ov.is_day_blocked ? "Bloqueado" : "Personalizado"}
                          </span>
                          {ov.note && <span className="ml-2 text-xs text-zinc-500">{ov.note}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteOverride(ov.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors">
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
