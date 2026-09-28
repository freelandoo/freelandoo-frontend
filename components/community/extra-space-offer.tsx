"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

/**
 * Pet e carro ADICIONAIS (mig 264): o primeiro de cada é grátis; do segundo em
 * diante o backend responde 402 com `needs_slot`, a modalidade e o preço — e é
 * ESTA peça que transforma a recusa em oferta.
 *
 * Peça única das duas portas de criar (o "+" do pet/carro e o menu da foto):
 * escrita duas vezes, uma delas mostraria "não foi possível adicionar" onde a
 * outra oferece o pagamento.
 *
 * O pagamento É a criação: o backend cria o espaço vazio quando o pagamento
 * cai, e a tela de retorno (`/espaco-adicional`) leva a pessoa até ele.
 */

export type ExtraSpaceKind = "pet" | "car"

export type ExtraSpaceOfferState = { kind: ExtraSpaceKind; price_cents: number } | null

/** Lê a resposta do POST /pets|/cars: devolve a oferta quando é recusa por vaga. */
export function readExtraSpaceOffer(status: number, json: unknown): ExtraSpaceOfferState {
  const j = json as { needs_slot?: boolean; kind?: string; price_cents?: number } | null
  if (status !== 402 || !j?.needs_slot) return null
  if (j.kind !== "pet" && j.kind !== "car") return null
  return { kind: j.kind, price_cents: Number(j.price_cents) || 0 }
}

export function ExtraSpaceOffer({
  offer,
  onClose,
}: {
  offer: ExtraSpaceOfferState
  onClose: () => void
}) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!offer || typeof document === "undefined") return null

  const price = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    offer.price_cents / 100,
  )
  const isPet = offer.kind === "pet"

  const pay = async () => {
    const token = getToken()
    if (!token || paying) return
    setPaying(true)
    setError(null)
    try {
      const res = await fetch("/api/me/space-slots/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: offer.kind }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.checkout_url) {
        setError(json?.error || t("extraSpacePayError", "Não foi possível abrir o pagamento agora."))
        setPaying(false)
        return
      }
      window.location.href = json.checkout_url
    } catch {
      setError(t("extraSpacePayError", "Não foi possível abrir o pagamento agora."))
      setPaying(false)
    }
  }

  // Portal no body e acima dos modais de troca (z-[70]/z-[80]): é deles que a
  // oferta costuma nascer, e abaixo deles ela nasceria escondida.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fl-root fl-sharp fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B0D]/85 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !paying) onClose()
      }}
    >
      <div className="relative w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F1EDE2] p-6 text-[#0B0B0D] shadow-[6px_6px_0_0_#F2B705]">
        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          aria-label={t("close", "Fechar")}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center hover:bg-[#0B0B0D]/10"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A6400]">
          {isPet ? t("extraPetEyebrow", "Pet adicional") : t("extraCarEyebrow", "Carro adicional")}
        </p>
        <h2 className="fl-display mt-2 text-3xl leading-none">{price}</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#0B0B0D]/60">
          {t("extraSpaceOnce", "Pagamento único, vitalício")}
        </p>
        <p className="mt-4 text-sm leading-relaxed">
          {isPet
            ? t(
                "extraPetBody",
                "Seu primeiro pet é grátis. Para cadastrar mais um, é {price} uma vez só — o pet novo já nasce assim que o pagamento cair.",
              ).replace("{price}", price)
            : t(
                "extraCarBody",
                "Seu primeiro carro é grátis. Para cadastrar mais um, é {price} uma vez só — o carro novo já nasce assim que o pagamento cair.",
              ).replace("{price}", price)}
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void pay()}
            disabled={paying}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#0B0B0D] disabled:opacity-60"
          >
            {paying && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("extraSpacePay", "Pagar {price}").replace("{price}", price)}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={paying}
            className="h-10 text-sm font-semibold text-[#0B0B0D]/70 hover:text-[#0B0B0D]"
          >
            {t("extraSpaceNotNow", "Agora não")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
