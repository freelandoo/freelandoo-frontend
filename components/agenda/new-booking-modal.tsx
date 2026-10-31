"use client"

// components/agenda/new-booking-modal.tsx
//
// "NOVO AGENDAMENTO" — o modal que aparece para o dono assim que alguém marca
// um horário (pedido do Alex, 2026-10-31), com o botão "Acessar agenda".
//
// Lê as notificações `booking_received` AINDA NÃO VISTAS
// (`GET /me/notifications/bookings-pending`), então cobre os dois momentos:
//  - o dono está com a Freelandoo aberta: o socket avisa `notification:new` e
//    o modal abre na hora;
//  - o dono estava fora: o modal abre logo que ele entra.
// Fechar ou acessar a agenda marca como vistas — a MESMA linha do sino, então
// o que foi visto aqui não reaparece lá como novidade (e vice-versa).

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { CalendarCheck, Loader2, X } from "lucide-react"
import { onRealtime } from "@/lib/realtime"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type PendingBooking = {
  id_notification: string
  created_at: string
  payload: {
    client_name?: string | null
    service_name?: string | null
    booking_date?: string | null
    start_time?: string | null
    payment_status?: string | null
    agenda_href?: string | null
  }
}

// O jogo é tela cheia e tem o próprio sino: o modal não interrompe uma partida.
const SKIP_PREFIXES = ["/meu-mundo", "/login", "/cadastro"]

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function NewBookingModal() {
  const t = useTranslations("Agenda")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname() || "/"
  const [items, setItems] = useState<PendingBooking[]>([])
  const [busy, setBusy] = useState(false)

  const skip = SKIP_PREFIXES.some((p) => pathname.startsWith(p))

  const load = useCallback(async () => {
    if (!getToken()) return
    try {
      const res = await fetch(`${getPublicBackendUrl()}/me/notifications/bookings-pending`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      /* o modal é aviso, nunca bloqueio: falhou, fica quieto */
    }
  }, [])

  // Este componente monta UMA vez (GlobalOverlays). Quem faz login navega sem
  // recarregar, então a busca também roda quando a sessão aparece/troca —
  // e só nessa hora, não a cada página.
  const loadedFor = useRef<string | null>(null)
  useEffect(() => {
    const token = getToken()
    if (!token || loadedFor.current === token) return
    loadedFor.current = token
    load()
  }, [pathname, load])

  useEffect(() => {
    return onRealtime("notification:new", (payload) => {
      const p = payload as { type?: string } | null
      if (p?.type === "booking_received") load()
    })
  }, [load])

  const markSeen = useCallback(async (list: PendingBooking[]) => {
    await Promise.all(
      list.map((b) =>
        fetch(
          `${getPublicBackendUrl()}/me/notifications/${encodeURIComponent(b.id_notification)}/mark-read`,
          { method: "POST", headers: authHeaders() }
        ).catch(() => null)
      )
    )
  }, [])

  const close = useCallback(() => {
    const seen = items
    setItems([])
    markSeen(seen)
  }, [items, markSeen])

  const openAgenda = useCallback(async () => {
    const href = items.find((b) => b.payload?.agenda_href)?.payload.agenda_href || "/account"
    setBusy(true)
    await markSeen(items)
    setItems([])
    setBusy(false)
    router.push(href)
  }, [items, markSeen, router])

  if (skip || items.length === 0 || typeof document === "undefined") return null

  const fmtDate = (ymd?: string | null) => {
    if (!ymd) return ""
    const d = new Date(`${ymd.slice(0, 10)}T12:00:00`)
    if (Number.isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d)
  }
  const payLabel = (s?: string | null) =>
    s === "paid"
      ? t("payPaid", "Pago")
      : s === "on_site"
        ? t("payOnSite", "Paga no balcão")
        : null

  const title =
    items.length === 1
      ? t("newBookingTitle", "Novo agendamento!")
      : t("newBookingsTitle", "{n} novos agendamentos!").replace("{n}", String(items.length))

  return createPortal(
    <div
      className="fl-sharp fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8] shadow-[6px_6px_0_0_#F2B705]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            <CalendarCheck className="h-4 w-4 text-[#F2B705]" />
            {t("newBookingEyebrow", "Agenda")}
          </p>
          <button
            type="button"
            className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
            onClick={() => !busy && close()}
            aria-label={t("newBookingClose", "Fechar")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="fl-display mt-2 text-3xl leading-none">{title}</p>

        <ul className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
          {items.map((b) => {
            const p = b.payload || {}
            const pay = payLabel(p.payment_status)
            return (
              <li key={b.id_notification} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-base font-extrabold">
                    {p.client_name || t("newBookingSomeone", "Um cliente")}
                  </p>
                  {p.start_time && (
                    <p className="shrink-0 font-mono text-lg font-bold tabular-nums text-[#F2B705]">
                      {p.start_time}
                    </p>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#9A938A]">
                  {[p.service_name, fmtDate(p.booking_date)].filter(Boolean).join(" · ")}
                  {pay && (
                    <span className="ml-2 bg-[#F5F1E8] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D]">
                      {pay}
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          disabled={busy}
          onClick={openAgenda}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
          {t("newBookingCta", "Acessar agenda")}
        </button>
      </div>
    </div>,
    document.body
  )
}
