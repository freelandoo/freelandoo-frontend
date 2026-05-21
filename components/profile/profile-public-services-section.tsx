"use client"

import { useCallback, useEffect, useState } from "react"
import { Briefcase, Clock, Cog, Loader2, Scissors } from "lucide-react"
import { ServiceSelectionModal } from "@/components/calendar/ServiceSelectionModal"
import type { ProfileService } from "@/components/calendar/types"
import { ScheduleBookingModal } from "@/components/profile/schedule-booking-modal"
import {
  ProfileServiceEditModal,
  type ProfileServiceEditClanMember,
} from "@/components/profile/profile-service-edit-modal"
import { getToken } from "@/lib/auth"
import { getCapturedCoupon } from "@/lib/share-coupon"

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

function getServiceCoverUrl(service: ProfileService) {
  const direct = service.image_url?.trim()
  if (direct) return direct

  const media = service.media || []
  const cover =
    media.find((m) => m.media_type === "image" || m.mime_type?.startsWith("image/")) ||
    media[0]

  return cover?.url?.trim() || cover?.media_url?.trim() || cover?.thumbnail_url?.trim() || ""
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
    client: { whatsapp: string },
  ) => {
    if (!pickedSlot) return
    const token = getToken()
    if (!token) throw new Error("Faça login para agendar")
    const sharedCoupon = getCapturedCoupon()
    const res = await fetch(`/api/public/profile/${profileId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_whatsapp: client.whatsapp || null,
        booking_date: pickedSlot.dateISO,
        start_time: pickedSlot.startTime,
        id_profile_service: serviceId,
        ...(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
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
        next[idx] = { ...next[idx], ...updated, media: updated.media ?? next[idx].media }
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

  return (
    <section id="services-section" className="mb-20 scroll-mt-24">
      {(!allowPublicBooking || feedbackError) && (
        <div className="mb-4 space-y-2 px-4 md:px-0">
          {!allowPublicBooking ? (
            <p className="text-center text-xs text-muted-foreground md:text-left">
              Agendamento online está desativado para este perfil — use mensagens ou outro canal de contato.
            </p>
          ) : null}
          {feedbackError ? (
            <p className="text-center text-sm text-destructive md:text-left">{feedbackError}</p>
          ) : null}
        </div>
      )}

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
          <ul className="-mx-4 grid grid-cols-3 items-stretch gap-px md:mx-0">
          {visibleServices.map((s) => {
            const img = getServiceCoverUrl(s)
            const { integer, cents } = formatPriceParts(s.price_amount)
            const desc = s.description?.trim()

            return (
              <li
                key={s.id_profile_service}
                className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#121212] text-left"
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

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-xs font-bold leading-snug text-white md:text-sm">{s.name}</h3>
                    <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-yellow-500 md:text-[11px]">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span className="tabular-nums">{s.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-zinc-300 md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-white tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-white/95 md:text-xs">,{cents}</span>
                      </p>

                      {allowPublicBooking ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-full bg-yellow-400 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300 active:scale-[0.99] md:px-3 md:text-[10px]"
                          onClick={() => openSchedule(s)}
                          aria-label={`Agendar: ${s.name}`}
                        >
                          Agendar
                        </button>
                      ) : null}
                    </div>
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
        onMediaChanged={(serviceId, media) => {
          setServices((prev) =>
            prev.map((service) =>
              service.id_profile_service === serviceId
                ? { ...service, media }
                : service
            )
          )
        }}
        onError={(msg) => {
          setFeedbackError(msg)
          window.setTimeout(() => setFeedbackError(null), 5000)
        }}
      />
    </section>
  )
}
