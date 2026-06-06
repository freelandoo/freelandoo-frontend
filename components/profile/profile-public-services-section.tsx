"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Briefcase, Clock, Cog, Plus, Scissors } from "lucide-react"
import { ServiceSelectionModal } from "@/components/calendar/ServiceSelectionModal"
import type { ProfileService } from "@/components/calendar/types"
import { ScheduleBookingModal } from "@/components/profile/schedule-booking-modal"
import {
  ProfileServiceEditModal,
  type ProfileServiceEditClanMember,
} from "@/components/profile/profile-service-edit-modal"
import { getToken } from "@/lib/auth"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { EmptyState, LoadingState } from "@/components/tabloide"

interface ProfilePublicServicesSectionProps {
  profileId: string
  /** Se false (tb_profile_booking_settings.allow_booking), não oferece fluxo de agendar horário. */
  allowPublicBooking?: boolean
  /** Dono do perfil: mostra engrenagem e edição. */
  showOwnerControls?: boolean
  isClan?: boolean
  clanMembers?: ProfileServiceEditClanMember[]
  /** Contador externo: quando muda, abre o modal de criar serviço (dispatch do + no header). */
  openCreateTrigger?: number
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
  openCreateTrigger,
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

  const openCreateService = useCallback(() => {
    setServiceSheet("create")
    setFeedbackError(null)
  }, [])

  // Trigger externo (do + no RetractableProfileHeader) abre o modal de criar serviço.
  // Usa ref para não reabrir o modal em remounts (troca de aba e volta).
  const lastSeenTriggerRef = useRef<number | undefined>(openCreateTrigger)
  useEffect(() => {
    if (!showOwnerControls) return
    if (typeof openCreateTrigger !== "number") return
    if (lastSeenTriggerRef.current === openCreateTrigger) return
    lastSeenTriggerRef.current = openCreateTrigger
    if (openCreateTrigger > 0) openCreateService()
  }, [openCreateTrigger, showOwnerControls, openCreateService])

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
        <EmptyState
          icon={<Briefcase className="h-7 w-7" />}
          title="Serviços indisponíveis"
          description="Não foi possível carregar os serviços agora. Tente novamente mais tarde."
        />
      </section>
    )
  }

  const visibleServices = showOwnerControls
    ? services
    : services.filter((s) => s.is_active !== false)

  return (
    <section id="services-section" className="mb-20 scroll-mt-24">
      {showOwnerControls && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="fl-display text-2xl text-[#F5F1E8] md:text-3xl">Serviços</h2>
            <p className="text-[11px] text-[#9A938A]">
              Serviços públicos oferecidos por este subperfil.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateService}
            className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            Serviço
          </button>
        </div>
      )}

      {(!allowPublicBooking || feedbackError) && (
        <div className="mb-4 space-y-2">
          {!allowPublicBooking ? (
            <p className="text-center text-xs text-[#9A938A] md:text-left">
              Agendamento online está desativado para este perfil — use mensagens ou outro canal de contato.
            </p>
          ) : null}
          {feedbackError ? (
            <p className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-center text-sm font-medium text-[#fca5a5] md:text-left">{feedbackError}</p>
          ) : null}
        </div>
      )}

      {state === "loading" ? (
        <LoadingState label="Carregando serviços…" />
      ) : visibleServices.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-7 w-7" />}
          title="Nenhum serviço"
          description="Nenhum serviço público disponível no momento."
        />
      ) : (
        <>
          {/* Cards de papel emoldurados, imagem 4:5. */}
          <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3">
          {visibleServices.map((s) => {
            const img = getServiceCoverUrl(s)
            const { integer, cents } = formatPriceParts(s.price_amount)
            const desc = s.description?.trim()
            // Co-autoria do clan: perfis anexados que dividem a venda.
            const coAuthors = isClan
              ? (s.member_profile_ids || [])
                  .map((id) => clanMembers.find((m) => m.id_member_profile === id))
                  .filter((m): m is ProfileServiceEditClanMember => !!m)
              : []

            return (
              <li
                key={s.id_profile_service}
                className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-left shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 border-b-2 border-[#0B0B0D] bg-[#1d1810]">
                  {showOwnerControls && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 z-10 cursor-pointer rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] p-1.5 text-[#0B0B0D] transition hover:bg-[#F2B705]"
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
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2212] to-[#141009]">
                      <Scissors className="h-11 w-11 text-[#F2B705]/40 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-xs font-bold leading-snug text-[#0B0B0D] md:text-sm">{s.name}</h3>
                    <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-[#E0A500] md:text-[11px]">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span className="tabular-nums">{s.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-[#5b554b] md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  {coAuthors.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {coAuthors.slice(0, 3).map((m) => (
                        <span
                          key={m.id_member_profile}
                          className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] py-0.5 pl-0.5 pr-1.5 text-[9px] font-semibold text-[#0B0B0D]/75 md:text-[10px]"
                          title={`@${m.username}`}
                        >
                          {m.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatar_url} alt={m.display_name} className="h-3.5 w-3.5 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0B0B0D]/15 text-[7px]">
                              {m.display_name?.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          @{m.username}
                        </span>
                      ))}
                      {coAuthors.length > 3 && (
                        <span className="text-[9px] font-semibold text-[#0B0B0D]/55 md:text-[10px]">
                          +{coAuthors.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-[#0B0B0D] tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-[#0B0B0D]/75 md:text-xs">,{cents}</span>
                      </p>

                      {allowPublicBooking ? (
                        <button
                          type="button"
                          className="fl-btn-gold shrink-0 rounded-full px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider md:px-3 md:text-[10px]"
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
