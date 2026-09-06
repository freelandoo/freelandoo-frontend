// lib/booking/slots.ts
// Como se LÊ um horário livre da API de agenda — a resposta escrita uma vez só.
//
// ═══ POR QUE ISTO É TÃO TOLERANTE ═══
//
// A agenda responde por duas portas (`/available-slots` e `/calendar/week`) e o
// formato de um horário já apareceu como string "14:00", como ISO com fuso,
// como minutos desde a meia-noite e dentro de objetos com nomes diferentes por
// dia. Cada parser novo escrito ao lado deste concordaria com ele hoje e
// discordaria na primeira resposta fora do feitio — e o sintoma seria a grade
// vazia com o backend dizendo que há vaga.
//
// Saiu do `schedule-booking-modal.tsx` quando a página de agendamento do site
// da comunidade (mig 221) passou a precisar da mesma leitura. Nada aqui foi
// reescrito na mudança: é o mesmo código, no lugar onde os dois alcançam.
//
// ⚠️ Fuso: horário é sempre convertido para o LOCAL de quem lê. Um ISO com
// fuso interpretado como texto mostraria 14:00 para quem tem 11:00 no relógio.

/** HH:mm no fuso local (para casar com a grade do modal). */
function localHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/**
 * Extrai HH:mm para casar com a grelha.
 * ISO com timezone → usa horário local do navegador (evita descasar com grade quando o backend manda UTC).
 */
function extractSlotStartTime(raw: unknown): string | null {
  if (raw == null) return null

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw
    if (n > 1_000_000_000_000) {
      const d = new Date(n)
      if (!Number.isNaN(d.getTime())) return localHM(d)
      return null
    }
    if (n > 1_000_000_000) {
      const d = new Date(n * 1000)
      if (!Number.isNaN(d.getTime())) return localHM(d)
      return null
    }
    if (n >= 0 && n < 24 * 60 && Number.isInteger(n)) {
      const h = Math.floor(n / 60)
      const m = n % 60
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }
    return null
  }

  const s = String(raw).trim()
  if (!s) return null

  const brHm = /^(\d{1,2})h(\d{2})$/i.exec(s)
  if (brHm) return `${brHm[1].padStart(2, "0")}:${brHm[2]}`

  const hmExec = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (hmExec && !/^\d{4}-\d{2}-\d{2}/.test(s) && !s.includes("T")) {
    return `${hmExec[1].padStart(2, "0")}:${hmExec[2]}`
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const asDate = new Date(s)
    if (!Number.isNaN(asDate.getTime())) return localHM(asDate)
  }

  const isoOrSpace = /[T ](\d{2}):(\d{2})(?::\d{2})?/.exec(s)
  if (isoOrSpace) return `${isoOrSpace[1]}:${isoOrSpace[2]}`

  const hmFallback = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (hmFallback) return `${hmFallback[1].padStart(2, "0")}:${hmFallback[2]}`
  return null
}

export function normalizeLabel(label: string): string {
  const e = extractSlotStartTime(label)
  return e ?? label
}

export type ApiSlotMeta = { start: string; end?: string; spots_remaining?: number | null }

/** Normaliza datas vindas da API para yyyy-MM-dd. */
function toDateOnlyISO(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (ymd) return ymd[1]
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (dmy) {
    const dd = dmy[1].padStart(2, "0")
    const mm = dmy[2].padStart(2, "0")
    return `${dmy[3]}-${mm}-${dd}`
  }
  return null
}

function parseSpotRemaining(x: Record<string, unknown>): number | undefined {
  const sr = x.spots_remaining ?? x.remaining ?? x.vagas ?? x.spots_left ?? x.capacity_remaining
  if (typeof sr === "number" && !Number.isNaN(sr)) return sr
  if (typeof sr === "string" && sr.trim() !== "" && !Number.isNaN(Number(sr))) return Number(sr)
  return undefined
}

function slotRecordToMeta(sl: unknown, depth = 0): ApiSlotMeta | null {
  if (depth > 4) return null
  if (typeof sl === "string") {
    const t = extractSlotStartTime(sl)
    return t ? { start: t, spots_remaining: undefined } : null
  }
  if (!sl || typeof sl !== "object") return null
  const x = sl as Record<string, unknown>

  if (x.available === false || x.is_available === false || x.bookable === false) {
    const t =
      extractSlotStartTime(x.start) ??
      extractSlotStartTime(x.start_time) ??
      extractSlotStartTime(x.startTime)
    if (t) return { start: t, spots_remaining: 0 }
  }

  const keys = [
    "start",
    "start_time",
    "startTime",
    "slot_start_time",
    "slot_start",
    "slotStart",
    "starts_at",
    "startsAt",
    "begin",
    "from",
    "hora_inicio",
    "horaInicio",
    "hora",
    "inicio",
    "time",
  ] as const
  const endRaw = x.end ?? x.end_time ?? x.endTime
  const endHm = endRaw != null ? extractSlotStartTime(endRaw) ?? undefined : undefined

  for (const k of keys) {
    const t = extractSlotStartTime(x[k])
    if (t) return { start: t, end: endHm, spots_remaining: parseSpotRemaining(x) }
  }

  for (const nest of ["period", "interval", "slot", "range", "window"] as const) {
    const inner = x[nest]
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const nested = slotRecordToMeta(inner, depth + 1)
      if (nested)
        return {
          ...nested,
          end: nested.end ?? endHm,
          spots_remaining: parseSpotRemaining(x) ?? nested.spots_remaining,
        }
    }
  }

  for (const v of Object.values(x)) {
    if (v !== null && typeof v === "object") continue
    const t = extractSlotStartTime(v)
    if (t) return { start: t, end: endHm, spots_remaining: parseSpotRemaining(x) }
  }
  return null
}

/** Remove wrappers comuns (`data`, `result`, `payload`) até o objeto útil (vários backends enviam um nível extra). */
function unwrapPayloadRoot(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  let cur: unknown = data
  for (let depth = 0; depth < 6; depth++) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break
    const o = cur as Record<string, unknown>
    const inner = o.data ?? o.result ?? o.payload ?? o.body ?? o.response
    if (inner && typeof inner === "object" && !Array.isArray(inner)) cur = inner
    else break
  }
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null
  return cur as Record<string, unknown>
}

/** `slots: { "yyyy-mm-dd": [ ... ] }` ou chaves equivalentes. */
function parseSlotsKeyedByDate(raw: Record<string, unknown>, dateISO: string): ApiSlotMeta[] {
  const rows: ApiSlotMeta[] = []
  for (const [key, val] of Object.entries(raw)) {
    const day = toDateOnlyISO(key)
    if (day != null && day !== dateISO) continue
    if (!Array.isArray(val)) continue
    for (const item of val) {
      const meta = slotRecordToMeta(item)
      if (meta) rows.push(meta)
    }
  }
  return rows
}

function parseSlotsPayload(data: unknown, dateISO?: string): ApiSlotMeta[] {
  if (Array.isArray(data)) {
    const rows: ApiSlotMeta[] = []
    for (const item of data) {
      const meta = slotRecordToMeta(item)
      if (meta) rows.push(meta)
    }
    return rows
  }
  const root = unwrapPayloadRoot(data)
  if (!root) return []

  for (const ak of ["data", "items", "results", "records"] as const) {
    const v = root[ak]
    if (Array.isArray(v) && v.length > 0) {
      const parsed = parseSlotsPayload(v, dateISO)
      if (parsed.length) return parsed
    }
  }

  const candidates = [
    root.slots,
    root.available_slots,
    root.availableSlots,
    root.free_slots,
    root.open_slots,
    root.horarios,
  ]
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue
    if (Array.isArray(c)) {
      const rows: ApiSlotMeta[] = []
      for (const item of c) {
        const meta = slotRecordToMeta(item)
        if (meta) rows.push(meta)
      }
      if (rows.length) return rows
      continue
    }
    if (dateISO) {
      const fromKeys = parseSlotsKeyedByDate(c as Record<string, unknown>, dateISO)
      if (fromKeys.length) return fromKeys
    }
  }

  return []
}

/** Lista plana: cada item pode ter `date` / `day` + horário. */
function parseFlatSlotsForDay(slots: unknown[], dateISO: string): ApiSlotMeta[] {
  const out: ApiSlotMeta[] = []
  for (const sl of slots) {
    if (!sl || typeof sl !== "object") continue
    const x = sl as Record<string, unknown>
    const sd =
      toDateOnlyISO(x.date) ??
      toDateOnlyISO(x.day) ??
      toDateOnlyISO(x.date_iso) ??
      toDateOnlyISO(x.slot_date) ??
      toDateOnlyISO(x.booking_date)
    if (sd != null && sd !== dateISO) continue
    const meta = slotRecordToMeta(sl)
    if (meta) out.push(meta)
  }
  return out
}

/** Resposta GET calendar/week: agrupado por dia ou lista plana. */
function parseSlotsFromWeekPayload(data: unknown, dateISO: string): ApiSlotMeta[] {
  const unwrapped = unwrapPayloadRoot(data)
  if (!unwrapped) return []
  const d = unwrapped
  let daysRaw: unknown =
    d.available_slots ??
    d.availableSlots ??
    d.days ??
    d.by_day ??
    d.slots_by_day

  const calendar = d.calendar
  if (!Array.isArray(daysRaw) && calendar && typeof calendar === "object" && !Array.isArray(calendar)) {
    const c = calendar as Record<string, unknown>
    daysRaw =
      c.available_slots ??
      c.availableSlots ??
      c.days ??
      daysRaw
  }

  if (!Array.isArray(daysRaw) && Array.isArray(d.slots)) {
    const first = (d.slots as unknown[])[0]
    if (first && typeof first === "object" && first !== null && "slots" in first) {
      daysRaw = d.slots
    }
  }

  const out: ApiSlotMeta[] = []

  if (Array.isArray(daysRaw)) {
    for (const entry of daysRaw) {
      if (!entry || typeof entry !== "object") continue
      const e = entry as Record<string, unknown>
      const entryDate =
        toDateOnlyISO(e.date) ??
        toDateOnlyISO(e.day) ??
        toDateOnlyISO(e.date_iso) ??
        toDateOnlyISO(e.booking_date)
      if (entryDate != null && entryDate !== dateISO) continue

      const slotsRaw = e.slots ?? e.available_slots ?? e.availableSlots ?? e.times ?? e.hours
      if (Array.isArray(slotsRaw)) {
        for (const sl of slotsRaw) {
          const meta = slotRecordToMeta(sl)
          if (meta) out.push(meta)
        }
      }
    }
  }

  if (out.length === 0 && Array.isArray(d.slots)) {
    out.push(...parseFlatSlotsForDay(d.slots as unknown[], dateISO))
  }

  return out
}

function dedupeSlotsByStart(slots: ApiSlotMeta[]): ApiSlotMeta[] {
  const m = new Map<string, ApiSlotMeta>()
  for (const s of slots) {
    const key = normalizeLabel(s.start)
    if (!m.has(key)) m.set(key, s)
  }
  return [...m.values()]
}

/**
 * Intervalo inclusivo [weekStart, weekEnd] alinhado ao backend (`BookingAvailabilityService`):
 * usa `dateISO + T12:00:00.000Z` e `getUTCDay()` → semana domingo–sábado em datas UTC.
 */
function utcWeekRangeInclusive(dateISO: string): { weekStart: string; weekEnd: string } {
  const anchor = new Date(`${dateISO}T12:00:00.000Z`)
  const dow = anchor.getUTCDay()
  const start = new Date(anchor)
  start.setUTCDate(anchor.getUTCDate() - dow)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  }
}

function ownerWeekAuthHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export async function loadSlotsForDate(
  profileId: string,
  dateISO: string,
  preferOwnerCalendarWeek: boolean,
): Promise<ApiSlotMeta[]> {
  const { weekStart, weekEnd } = utcWeekRangeInclusive(dateISO)
  const qs = new URLSearchParams({ date: dateISO })
  const weekParams = `weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`
  const publicWeekUrl = `/api/public/profile/${profileId}/calendar/week?${weekParams}`
  const ownerWeekUrl = `/api/profile/${profileId}/calendar/week?${weekParams}`

  async function fetchWeek(): Promise<Response> {
    const ah = preferOwnerCalendarWeek ? ownerWeekAuthHeaders() : undefined
    if (ah) {
      const r = await fetch(ownerWeekUrl, { cache: "no-store", headers: ah })
      if (r.ok) return r
    }
    return fetch(publicWeekUrl, { cache: "no-store" })
  }

  const [weekRes, slotRes] = await Promise.all([
    fetchWeek(),
    fetch(`/api/public/profile/${profileId}/available-slots?${qs}`, { cache: "no-store" }),
  ])

  const merged: ApiSlotMeta[] = []

  try {
    if (weekRes.ok) {
      const wd = await weekRes.json()
      merged.push(...parseSlotsFromWeekPayload(wd, dateISO))
    }
  } catch {
    /* ignora */
  }

  try {
    if (slotRes.ok) {
      const sd = await slotRes.json()
      merged.push(...parseSlotsPayload(sd, dateISO))
    }
  } catch {
    /* ignora */
  }

  return dedupeSlotsByStart(merged)
}
