"use client"

import { useCallback, useEffect, useState } from "react"
import { Briefcase, Clock, Cog, Loader2, Plus, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServiceSelectionModal } from "@/components/calendar/ServiceSelectionModal"
import type { ProfileService } from "@/components/calendar/types"
import { ScheduleBookingModal } from "@/components/profile/schedule-booking-modal"
import {
  ProfileServiceEditModal,
  type ProfileServiceEditClanMember,
} from "@/components/profile/profile-service-edit-modal"

interface ProfilePublicServicesSectionProps {
  profileId: string
  /** Se false (tb_profile_booking_settings.allow_booking), não oferece fluxo de agendar horário. */
  allowPublicBooking?: boolean
  /** Dono do perfil: mostra engrenagem e edição. */
  showOwnerControls?: boolean
  isClan?: boolean
  clanMembers?: ProfileServiceEditClanMember[]
}

/** Partes do preço para exibir inteiros grandes e centavos menores (estilo mock). */
function formatPriceParts(cents: number) {
  const safe = Math.max(0, Math.round(Number.isFinite(cents) ? cents : 0))
  const intPart = Math.floor(safe / 100)
  const frac = safe % 100
  return {
    integer: intPart.toLocaleString("pt-BR"),
    cents: frac.toString().padStart(2, "0"),
  }
}

function authHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function ProfilePublicServicesSection({
  profileId,
  allowPublicBooking = true,
  showOwnerControls = false,
  isClan = false,
  clanMembers = [],
}: ProfilePublicServicesSectionProps) {
  const [services, setServices] = useState<ProfileService[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [bookingService, setBookingService] = useState<ProfileService | null>(null)
  const [pickedSlot, setPickedSlot] = useState<{ dateISO: string; startTime: string } | null>(null)

  /** `create` = novo serviço; caso contrário edição do serviço indicado. */
  const [serviceSheet, setServiceSheet] = useState<ProfileService | "create" | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState("loading")
      try {
        const ah = authHeaders()
        if (showOwnerControls && ah) {
          const authRes = await fetch(`/api/profile/${profileId}/services`, { headers: ah })
          if (authRes.ok && !cancelled) {
            const d = await authRes.json()
            const list = (d.services || []) as ProfileService[]
            setServices(list)
            setState("loaded")
            return
          }
        }

        const res = await fetch(`/api/public/profile/${profileId}/services`)
        const d = await res.json()
        if (!res.ok || cancelled) throw new Error("fail")
        const list = (d.services || []) as ProfileService[]
        setServices(list.filter((s) => s.is_active !== false))
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId, showOwnerControls])

  const resetBookingFlow = useCallback(() => {
    setScheduleOpen(false)
    setCheckoutOpen(false)
    setBookingService(null)
    setPickedSlot(null)
  }, [])

  const openSchedule = (s: ProfileService) => {
    setBookingService(s)
    setScheduleOpen(true)
  }

  const openEdit = (s: ProfileService) => {
    setServiceSheet(s)
    setFeedbackError(null)
  }

  const openCreateService = () => {
    setServiceSheet("create")
    setFeedbackError(null)
  }

  const handleScheduleContinue = (dateISO: string, startTime: string) => {
    setPickedSlot({ dateISO, startTime })
    setScheduleOpen(false)
    setCheckoutOpen(true)
  }

  const handleConfirmBooking = async (
    serviceId: number,
    client: { name: string; email: string; whatsapp: string },
  ) => {
    if (!pickedSlot) return
    const res = await fetch(`/api/public/profile/${profileId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: client.name,
        client_email: client.email,
        client_whatsapp: client.whatsapp || null,
        booking_date: pickedSlot.dateISO,
        start_time: pickedSlot.startTime,
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

  const handleEditSaved = useCallback((updated: ProfileService) => {
    setServices((prev) => {
      const idx = prev.findIndex((x) => x.id_profile_service === updated.id_profile_service)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
  }, [])

  if (state === "error") {
    return (
      <section id="services-section" className="mb-20 scroll-mt-24">
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os serviços agora. Tente novamente mais tarde.</p>
        </div>
      </section>
    )
  }

  const visibleServices = showOwnerControls
    ? services
    : services.filter((s) => s.is_active !== false)

  const showCreateService = showOwnerControls

  return (
    <section id="services-section" className="mb-20 scroll-mt-24">
      <div className="mb-8 flex items-center justify-center md:justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">Serviços</h2>
        </div>
        {showCreateService ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="hidden font-medium text-primary hover:bg-primary/10 md:flex"
            onClick={openCreateService}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Novo serviço
          </Button>
        ) : null}
      </div>

      {showCreateService ? (
        <div className="mb-6 flex justify-center md:hidden">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full max-w-xs font-medium"
            onClick={openCreateService}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Novo serviço
          </Button>
        </div>
      ) : null}

      <div className="mb-8 space-y-2">
        {!allowPublicBooking ? (
          <p className="text-center text-xs text-muted-foreground md:text-left">
            Agendamento online está desativado para este perfil — use mensagens ou outro canal de contato.
          </p>
        ) : null}
        {feedbackError ? (
          <p className="text-center text-sm text-destructive md:text-left">{feedbackError}</p>
        ) : null}
      </div>

      {state === "loading" ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : visibleServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">Nenhum serviço público disponível no momento.</p>
        </div>
      ) : (
        <>
          {/* 2 colunas até xl; xl+: 3 colunas como o portfólio. Imagem 4:5. */}
          <ul className="grid grid-cols-2 items-stretch gap-2 md:gap-3 lg:gap-3 xl:grid-cols-3 xl:gap-2">
          {visibleServices.map((s) => {
            const img = s.image_url?.trim()
            const { integer, cents } = formatPriceParts(s.price_amount)
            const desc = s.description?.trim()

            return (
              <li
                key={s.id_profile_service}
                className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border border-zinc-800 bg-[#121212] text-left shadow-md md:rounded-lg"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 bg-zinc-900">
                  {showOwnerControls && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-black/55 p-1.5 text-zinc-100 backdrop-blur-sm transition hover:bg-black/75 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(s)
                      }}
                      aria-label={`Editar serviço: ${s.name}`}
                    >
                      <Cog className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa/dinâmica do serviço
                    <img src={img} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <Scissors className="h-11 w-11 text-zinc-600/90 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug text-white">{s.name}</h3>
                    <div className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-yellow-500">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span className="tabular-nums">{s.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-3 text-[11px] font-normal leading-relaxed text-zinc-300">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <hr className="my-3 border-zinc-700/80" />

                    <p className="text-xl font-bold leading-none tracking-tight text-white tabular-nums sm:text-2xl">
                      R$ {integer}
                      <span className="align-top text-xs font-semibold text-white/95 sm:text-sm">,{cents}</span>
                    </p>

                    {allowPublicBooking ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-full bg-yellow-400 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300 active:scale-[0.99] sm:py-2.5 sm:text-[11px]"
                        onClick={() => openSchedule(s)}
                        aria-label={`Agendar: ${s.name}`}
                      >
                        Agendar
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
          </ul>
        </>
      )}

      <ScheduleBookingModal
        open={scheduleOpen && !!bookingService}
        onClose={() => {
          setScheduleOpen(false)
          setBookingService(null)
        }}
        profileId={profileId}
        service={bookingService}
        preferOwnerCalendarWeek={showOwnerControls}
        onContinue={handleScheduleContinue}
      />

      {checkoutOpen && bookingService && pickedSlot && (
        <ServiceSelectionModal
          open
          onClose={resetBookingFlow}
          services={[bookingService]}
          lockedServiceId={bookingService.id_profile_service}
          dateISO={pickedSlot.dateISO}
          startTime={pickedSlot.startTime}
          onConfirm={handleConfirmBooking}
        />
      )}

      <ProfileServiceEditModal
        open={serviceSheet !== null}
        onClose={() => setServiceSheet(null)}
        profileId={profileId}
        service={serviceSheet !== null && serviceSheet !== "create" ? serviceSheet : null}
        isClan={isClan}
        clanMembers={clanMembers}
        onSaved={(updated) => {
          handleEditSaved(updated)
          setFeedbackError(null)
        }}
        onError={(msg) => {
          setFeedbackError(msg)
          window.setTimeout(() => setFeedbackError(null), 5000)
        }}
      />
    </section>
  )
}
