"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { startOfWeek, endOfWeek, format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { MiniCalendar } from "./MiniCalendar"
import { WeeklyTimeGrid } from "./WeeklyTimeGridDynamic"
import { ServiceSelectionModal } from "./ServiceSelectionModal"
import type { CalendarEvent, ProfileService, AvailableSlot } from "./types"

interface ProfileScheduleSectionProps {
  profileId: string
  profileName: string
}

interface WeekDataResponse {
  weekStart: string
  weekEnd: string
  availableSlots: { date: string; slots: AvailableSlot[] }[]
  events: CalendarEvent[]
}

type FetchState = "idle" | "loading" | "loaded" | "error"

export function ProfileScheduleSection({ profileId, profileName }: ProfileScheduleSectionProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [month, setMonth] = useState<Date>(() => new Date())
  const [data, setData] = useState<WeekDataResponse | null>(null)
  const [services, setServices] = useState<ProfileService[]>([])
  const [fetchState, setFetchState] = useState<FetchState>("idle")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ dateISO: string; startTime: string } | null>(null)

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 0 }), [weekStart])
  const weekStartIso = useMemo(() => format(weekStart, "yyyy-MM-dd"), [weekStart])
  const weekEndIso = useMemo(() => format(weekEnd, "yyyy-MM-dd"), [weekEnd])

  const fetchWeek = useCallback(async () => {
    setFetchState("loading")
    try {
      const res = await fetch(`/api/public/profile/${profileId}/calendar/week?weekStart=${weekStartIso}&weekEnd=${weekEndIso}`)
      const d = await res.json()
      if (!res.ok || !d || !Array.isArray(d.availableSlots)) {
        setFetchState("error")
        return
      }
      setData(d)
      setFetchState("loaded")
    } catch {
      setFetchState("error")
    }
  }, [profileId, weekStartIso, weekEndIso])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/public/profile/${profileId}/services`)
      .then(r => r.ok ? r.json() : { services: [] })
      .then(d => { if (!cancelled) setServices(d.services || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profileId])

  const handleAvailableClick = useCallback((slot: { dateISO: string; startTime: string }) => {
    setSelectedSlot({ dateISO: slot.dateISO, startTime: slot.startTime })
    setModalOpen(true)
  }, [])

  const handleConfirm = async (serviceId: number, client: { name: string; email: string; whatsapp: string }) => {
    if (!selectedSlot) return
    const res = await fetch(`/api/public/profile/${profileId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: client.name,
        client_email: client.email,
        client_whatsapp: client.whatsapp || null,
        booking_date: selectedSlot.dateISO,
        start_time: selectedSlot.startTime,
        id_profile_service: serviceId,
      }),
    })
    const d = await res.json()
    if (res.ok && d.checkout_url) {
      window.location.href = d.checkout_url
    } else {
      throw new Error(d.error || "Erro ao agendar")
    }
  }

  const goPrev = () => setWeekStart(prev => addDays(prev, -7))
  const goNext = () => setWeekStart(prev => addDays(prev, 7))
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))

  const headerLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} — ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`

  if (fetchState === "error") {
    return (
      <section id="agenda-section" className="mb-20 max-w-6xl mx-auto scroll-mt-24">
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
          <p className="text-zinc-400 text-sm">Não foi possível carregar a agenda agora. Tente novamente em instantes.</p>
        </div>
      </section>
    )
  }

  const showLoading = fetchState === "idle" || (fetchState === "loading" && !data)

  return (
    <section id="agenda-section" className="mb-20 max-w-6xl mx-auto scroll-mt-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-zinc-100">Agenda</h2>
        <p className="text-zinc-400 text-sm">Escolha um horário com {profileName}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <MiniCalendar
              selectedWeekStart={weekStart}
              onWeekChange={(ws) => { setWeekStart(ws); setMonth(ws) }}
              month={month}
              onMonthChange={setMonth}
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Legenda</p>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400/40" /> Horário disponível</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-600/80" /> Reservado</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-500/80" /> Aguardando pagamento</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-zinc-600" /> Bloqueado</li>
            </ul>
          </div>
        </aside>

        {/* Main calendar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-200 text-xs font-medium hover:bg-zinc-800">Hoje</button>
              <button onClick={goPrev} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={goNext} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <p className="text-sm font-semibold text-zinc-100 capitalize">{headerLabel}</p>
            {fetchState === "loading" ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <span className="w-4" />}
          </div>

          <div className="p-2 sm:p-4 relative">
            {showLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/40 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}
            <WeeklyTimeGrid
              weekStart={weekStart}
              events={data?.events || []}
              availableBackground={data?.availableSlots}
              onAvailableClick={handleAvailableClick}
              height={620}
            />
          </div>
        </div>
      </div>

      {selectedSlot && (
        <ServiceSelectionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          services={services}
          dateISO={selectedSlot.dateISO}
          startTime={selectedSlot.startTime}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  )
}
