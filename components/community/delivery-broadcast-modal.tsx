"use client"

/**
 * O MODAL DO DELIVERY PARA TODOS OS MEMBROS (mig 266).
 *
 * Pedido do Alex: "quando alguém abrir um delivery, todos os membros da
 * comunidade recebem um modal: fulano deseja receber ou enviar uma encomenda,
 * você pode levar ou buscar". Ele reaparece quando quem pediu SOBE a oferta —
 * para quem recusou o valor antigo, uma oferta nova é outro chamado.
 *
 * ⚠️ É PUSH (`delivery:broadcast`, registrado em `lib/realtime.ts`): quem está
 * com a Freelandoo aberta vê na hora. Quem não está não recebe modal nenhum —
 * e não deve: um modal de corrida esperando horas por alguém que abriu o site
 * depois venderia um chamado que já pode ter expirado. O quadro continua sendo
 * a fonte do que está aberto.
 *
 * ⚠️ UM POR VEZ, em FILA. Duas corridas abertas em sequência não podem se
 * sobrepor, e a segunda não pode apagar a primeira sem ninguém ter lido.
 */

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, Bike, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { onRealtime } from "@/lib/realtime"
import { getToken } from "@/lib/auth"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { deliveryBandLabel, deliveryDirectionLabel } from "./delivery-labels"

type Broadcast = {
  reason: "opened" | "raised"
  id_community: string
  community_name: string | null
  id_delivery: number
  requester_name: string | null
  requester_avatar?: string | null
  direction: "send" | "receive" | null
  weight_band: string | null
  band_label: string | null
  price_cents: number
  negotiable: boolean
  note: string | null
  pickup: string | null
  dropoff: string | null
}

export function DeliveryBroadcastModal() {
  const t = useTranslations("Community")
  const locale = useLocale()
  const enabled = useFeature("delivery_vizinho")
  const [queue, setQueue] = useState<Broadcast[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled) return
    return onRealtime("delivery:broadcast", (payload) => {
      const b = payload as Broadcast
      if (!b || !b.id_delivery) return
      // O mesmo chamado entra uma vez só: uma oferta nova SUBSTITUI a antiga
      // na fila, em vez de pedir duas respostas para a mesma corrida.
      setQueue((q) => [...q.filter((x) => x.id_delivery !== b.id_delivery), b])
    })
  }, [enabled])

  const current = queue[0] || null
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])

  const money = (cents: number) =>
    (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })

  const accept = async () => {
    if (!current) return
    setBusy(true)
    try {
      const tk = getToken()
      const res = await fetch(
        `/api/communities/${current.id_community}/deliveries/${current.id_delivery}/accept`,
        {
          method: "POST",
          headers: tk
            ? { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("delActionError", "Não deu certo."))
      toast.success(t("delAccepted", "Corrida aceita."))
      dismiss()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("delActionError", "Não deu certo."))
      // "Alguém já pegou" não tem o que tentar de novo: tira da fila.
      dismiss()
    } finally {
      setBusy(false)
    }
  }

  if (!enabled || !current || typeof document === "undefined") return null

  const who = current.requester_name || t("delSomeone", "Um vizinho")
  const headline = (
    current.direction === "send"
      ? t("delModalSend", "{name} quer enviar uma encomenda")
      : t("delModalReceive", "{name} quer receber uma encomenda")
  ).replace("{name}", who)
  const question =
    current.direction === "send"
      ? t("delModalCanTake", "Você pode levar?")
      : t("delModalCanFetch", "Você pode buscar?")
  const DirIcon = current.direction === "send" ? ArrowUpFromLine : ArrowDownToLine

  return createPortal(
    <div
      className="fl-sharp fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && dismiss()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8] shadow-[6px_6px_0_0_#F2B705]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {(current.reason === "raised"
              ? t("delModalRaised", "Oferta maior · {c}")
              : t("delModalEyebrow", "Delivery · {c}")
            ).replace("{c}", current.community_name || "")}
          </p>
          <button
            type="button"
            className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
            onClick={() => !busy && dismiss()}
            aria-label={t("delModalLater", "Agora não")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="fl-display mt-2 flex items-start gap-2 text-2xl leading-tight">
          <DirIcon className="mt-1 h-5 w-5 shrink-0 text-[#F2B705]" /> {headline}
        </p>
        <p className="mt-1 text-sm text-[#F5F1E8]/80">{question}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
              {t("delWeightTitle", "Quanto pesa?")}
            </p>
            <p className="mt-0.5 font-bold">{deliveryBandLabel(t, current.weight_band, current.band_label)}</p>
          </div>
          <div className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
              {t("delModalOffer", "Oferta")}
            </p>
            <p className="mt-0.5 font-extrabold text-[#F2B705]">{money(current.price_cents)}</p>
          </div>
        </div>

        {(current.pickup || current.dropoff) && (
          <p className="mt-3 text-[12px] text-[#9A938A]">
            {current.pickup || "—"} → {current.dropoff || "—"}
          </p>
        )}
        {current.note && <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#F5F1E8]/80">{current.note}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="inline-flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bike className="h-4 w-4" />}
            {deliveryDirectionLabel(t, current.direction, "courier")} · {money(current.price_cents)}
          </button>
          {/* A contraproposta mora no quadro: lá está o campo de valor e o
              retorno de quem pediu. */}
          <Link
            href={`/comunidades/${current.id_community}/delivery`}
            onClick={() => dismiss()}
            className="inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]"
          >
            {current.negotiable ? t("delProposeCta", "Propor outro valor") : t("delModalSeeBoard", "Ver no quadro")}
          </Link>
        </div>
        <button
          type="button"
          className="mt-3 w-full text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]"
          onClick={() => !busy && dismiss()}
        >
          {t("delModalLater", "Agora não")}
        </button>
      </div>
    </div>,
    document.body
  )
}
