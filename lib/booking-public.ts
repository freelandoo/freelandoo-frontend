/**
 * Contrato alinhado ao backend (BookingAvailabilityService):
 * GET /public/profile/:id/available-slots?date=YYYY-MM-DD — slots por regras semanais + overrides,
 * sem sobrepor início de booking ativo; horários passados removidos no dia atual.
 *
 * allow_booking vem de tb_profile_booking_settings quando o payload do perfil incluir o campo.
 */
export function profileAllowsPublicBooking(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return true
  const p = profile as Record<string, unknown>
  if (typeof p.allow_booking === "boolean") return p.allow_booking
  const bs = p.booking_settings
  if (bs && typeof bs === "object") {
    const ab = (bs as Record<string, unknown>).allow_booking
    if (typeof ab === "boolean") return ab
  }
  return true
}
