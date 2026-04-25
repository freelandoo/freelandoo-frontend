"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Calendar, Clock, DollarSign, Users, Lock, Unlock, Plus, Trash2, AlertCircle } from "lucide-react"

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

interface BookingSettings {
  deposit_amount: number
  platform_fee_amount: number
  currency: string
  allow_booking: boolean
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
  platform_fee_amount: number
  professional_amount: number
  confirmed_at: string | null
  created_at: string
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

function getToken() {
  if (typeof window === "undefined") return null
  try { return JSON.parse(localStorage.getItem("token") || "null") } catch { return null }
}

function centsToReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

export default function AgendaPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id_profile as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"rules" | "overrides" | "deposit" | "bookings">("rules")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Weekly rules
  const [rules, setRules] = useState<WeeklyRule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      weekday: i, is_enabled: i >= 1 && i <= 5,
      start_time: "08:00", end_time: "18:00",
      slot_duration_minutes: 60, buffer_minutes: 0,
    }))
  )

  // Overrides
  const [overrides, setOverrides] = useState<Override[]>([])
  const [newOverrideDate, setNewOverrideDate] = useState("")
  const [newOverrideBlocked, setNewOverrideBlocked] = useState(false)
  const [newOverrideNote, setNewOverrideNote] = useState("")

  // Booking settings
  const [settings, setSettings] = useState<BookingSettings>({
    deposit_amount: 5000, platform_fee_amount: 1000, currency: "BRL", allow_booking: false,
  })

  // Bookings list
  const [bookings, setBookings] = useState<Booking[]>([])

  const headers = useCallback(() => {
    const token = getToken()
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }, [])

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ─── Load data ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [rulesRes, overridesRes, settingsRes, bookingsRes] = await Promise.all([
          fetch(`/api/profile/${profileId}/availability`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/availability-overrides`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/booking-settings`, { headers: headers() }),
          fetch(`/api/profile/${profileId}/bookings`, { headers: headers() }),
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
        if (settingsRes.ok) { const d = await settingsRes.json(); if (d.settings) setSettings(d.settings) }
        if (bookingsRes.ok) { const d = await bookingsRes.json(); setBookings(d.bookings || []) }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [profileId, headers])

  // ─── Save weekly rules ────────────────────────────────────────────
  async function saveRules() {
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/availability`, {
        method: "POST", headers: headers(), body: JSON.stringify({ rules }),
      })
      if (res.ok) showMsg("success", "Disponibilidade semanal salva!")
      else { const d = await res.json(); showMsg("error", d.error || "Erro ao salvar") }
    } catch { showMsg("error", "Erro de conexão") }
    setSaving(false)
  }

  // ─── Save override ────────────────────────────────────────────────
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

  // ─── Save deposit settings ────────────────────────────────────────
  async function saveSettings() {
    if (settings.deposit_amount < 1000) { showMsg("error", "Valor mínimo do sinal: R$ 10,00"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/booking-settings`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ deposit_amount: settings.deposit_amount, allow_booking: settings.allow_booking }),
      })
      if (res.ok) showMsg("success", "Configurações salvas!")
      else { const d = await res.json(); showMsg("error", d.error || "Erro") }
    } catch { showMsg("error", "Erro de conexão") }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-600 border-t-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-sm text-zinc-400">Gerencie horários disponíveis e acompanhe agendamentos.</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-8">
          {([
            { key: "rules", label: "Disponibilidade", icon: Clock },
            { key: "overrides", label: "Exceções", icon: Calendar },
            { key: "deposit", label: "Sinal", icon: DollarSign },
            { key: "bookings", label: "Agendamentos", icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ─── Tab: Regras semanais ─────────────────────────────────── */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
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
                        className="w-4 h-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-800" />
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

              <button onClick={saveRules} disabled={saving}
                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar disponibilidade"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Tab: Exceções ────────────────────────────────────────── */}
        {activeTab === "overrides" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-1">Exceções por data</h2>
              <p className="text-sm text-zinc-400 mb-6">Bloqueie dias inteiros ou ajuste horários específicos.</p>

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
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
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
                        {ov.is_day_blocked ? (
                          <Lock className="w-4 h-4 text-red-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        )}
                        <div>
                          <span className="text-sm font-medium">{new Date(ov.override_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ov.is_day_blocked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                            {ov.is_day_blocked ? "Bloqueado" : "Personalizado"}
                          </span>
                          {ov.note && <span className="ml-2 text-xs text-zinc-500">{ov.note}</span>}
                        </div>
                      </div>
                      <button onClick={async () => {
                        const token = getToken()
                        await fetch(`/api/profile/${profileId}/availability-overrides`, {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ overrideId: ov.id }),
                        })
                        setOverrides(prev => prev.filter(o => o.id !== ov.id))
                      }} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Sinal de agendamento ────────────────────────────── */}
        {activeTab === "deposit" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-1">Sinal de agendamento</h2>
              <p className="text-sm text-zinc-400 mb-6">Configure o valor que o cliente paga para confirmar o horário.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Valor do sinal (R$)</label>
                  <input type="number" min="10" step="5"
                    value={(settings.deposit_amount / 100).toFixed(2)}
                    onChange={e => setSettings(s => ({ ...s, deposit_amount: Math.round(Number(e.target.value) * 100) }))}
                    className="w-full max-w-xs bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-lg font-mono" />
                  <p className="text-xs text-zinc-500 mt-1">Mínimo: R$ 10,00</p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 max-w-sm">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Valor do sinal</span>
                    <span className="font-medium">{centsToReais(settings.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Taxa Freelandoo</span>
                    <span className="text-red-400">- {centsToReais(1000)}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between text-sm">
                    <span className="text-zinc-300 font-medium">Você recebe</span>
                    <span className="text-emerald-400 font-bold">
                      {centsToReais(Math.max(0, settings.deposit_amount - 1000))}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  A Freelandoo fica com R$ 10,00 por agendamento confirmado.
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.allow_booking}
                    onChange={e => setSettings(s => ({ ...s, allow_booking: e.target.checked }))}
                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-800" />
                  <div>
                    <span className="text-sm font-medium">Habilitar agendamento público</span>
                    <p className="text-xs text-zinc-500">Clientes poderão agendar e pagar o sinal pelo seu perfil.</p>
                  </div>
                </label>

                <button onClick={saveSettings} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar configurações"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab: Agendamentos ────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-1">Agendamentos</h2>
              <p className="text-sm text-zinc-400 mb-6">Veja e gerencie os agendamentos deste perfil.</p>

              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">Nenhum agendamento ainda.</p>
                  <p className="text-xs text-zinc-500 mt-1">Quando clientes agendarem, os horários aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map(b => (
                    <div key={b.id} className={`p-4 rounded-lg border ${
                      b.status === "confirmed" ? "border-red-500/30 bg-red-500/5" : "border-zinc-700 bg-zinc-800/50"
                    }`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{b.client_name}</p>
                          <p className="text-xs text-zinc-400">{b.client_email} {b.client_whatsapp && `• ${b.client_whatsapp}`}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] || "bg-zinc-700 text-zinc-300"}`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(b.booking_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {b.start_time.substring(0, 5)} — {b.end_time.substring(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          Sinal: {centsToReais(b.deposit_amount)}
                        </span>
                        <span className="text-emerald-400">
                          Seu: {centsToReais(b.professional_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
