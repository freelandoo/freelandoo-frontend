"use client"

import { useState } from "react"
import { Loader2, MessageCircle, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { useActionConsent } from "@/hooks/use-action-consent"

/**
 * Finalizar compra — SÓ RETIRADA (mig 264).
 *
 * A Loja voltou sem frete: quem compra paga o produto na plataforma e combina a
 * retirada com o vendedor na conversa que abre sozinha depois do pagamento.
 * Por isso não há CEP, opção de frete, CPF de envio nem endereço aqui — tudo
 * isso existia para a etiqueta do Melhor Envio. Nome e e-mail são opcionais:
 * o backend usa os da conta quando vêm vazios.
 */

interface Product {
  id_profile_product: number
  name: string
  price_amount: number
}

interface BuyProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product
}

function formatBRL(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function BuyProductDialog({ open, onClose, product }: BuyProductDialogProps) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const { ensureConsent } = useActionConsent()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const total = product.price_amount

  async function submit() {
    setError(null)
    if (!(await ensureConsent("purchase"))) return
    setSubmitting(true)
    try {
      const token = getToken()
      if (!token) {
        setError(t("loginRequired", "Faça login para continuar"))
        setSubmitting(false)
        return
      }
      const sharedCoupon = getCapturedCoupon()
      const res = await fetch(`/api/me/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_profile_product: product.id_profile_product,
          quantity: 1,
          buyer_name: name.trim() || null,
          buyer_email: email.trim() || null,
          buyer_whatsapp: whatsapp.trim() || null,
          ...(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) {
        setError(data?.error || t("checkoutStartError", "Não foi possível iniciar o checkout"))
        setSubmitting(false)
        return
      }
      window.location.href = data.checkout_url
    } catch {
      setError(t("connectionTryAgain", "Erro de conexão. Tente novamente."))
      setSubmitting(false)
    }
  }

  const inputCls =
    "border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm text-[#0B0B0D] outline-none focus:border-[#F2B705]"

  return (
    <div
      className="fl-root fl-sharp fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] p-6 text-[#0B0B0D] shadow-[6px_6px_0_0_#F2B705]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-2 hover:bg-[#0B0B0D]/10"
          aria-label={t("closeButtonAria", "Fechar")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2 className="fl-display text-2xl leading-none">{t("finishPurchaseTitle", "Finalizar compra")}</h2>
        <p className="mt-1 text-xs text-[#0B0B0D]/70">{product.name}</p>

        <div className="mt-4 flex items-start gap-3 border-2 border-[#0B0B0D] bg-[#F2B705]/25 p-3 text-sm leading-relaxed">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {t(
              "pickupNotice",
              "Retirada com o vendedor. Depois do pagamento abrimos uma conversa entre vocês para combinar onde e quando retirar.",
            )}
          </p>
        </div>

        <dl className="mt-4 space-y-1 border-2 border-[#0B0B0D] bg-white p-3 text-sm">
          <div className="flex justify-between"><dt>{t("productLineLabel", "Produto")}</dt><dd className="tabular-nums">{formatBRL(product.price_amount, locale)}</dd></div>
          <div className="flex justify-between"><dt>{t("pickupLineLabel", "Retirada")}</dt><dd>{t("pickupFree", "sem frete")}</dd></div>
          <div className="flex justify-between border-t border-[#0B0B0D]/20 pt-1 font-semibold"><dt>{t("totalLineLabel", "Total")}</dt><dd className="tabular-nums">{formatBRL(total, locale)}</dd></div>
        </dl>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0B0B0D]/70">
            {t("pickupContactTitle", "Seus dados (opcional — usamos os da sua conta)")}
          </p>
          <input
            className={inputCls}
            placeholder={t("fullNamePlaceholder", "Nome completo")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            className={inputCls}
            placeholder={t("emailPlaceholder", "E-mail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder={t("whatsappPlaceholder", "WhatsApp (opcional)")}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("payButton", "Pagar {total}").replace("{total}", formatBRL(total, locale))}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#0B0B0D]/60">
          {t("stripeRedirectNotice", "Você será redirecionado para concluir o pagamento com segurança.")}
        </p>
      </div>
    </div>
  )
}
