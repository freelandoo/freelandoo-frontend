"use client"

/**
 * SELO VERIFICADO (mig 268) — a tela de quem assina.
 *
 * R$9,90 por mês. O CARTÃO vem primeiro e cheio (é o único que renova
 * sozinho); o Pix fica ao lado, para quem não tem cartão, e compra um mês.
 *
 * ⚠️ QUEM TEM O SELO É DECIDIDO NO BACKEND (`is_verified`: pagou e está no
 * período, ou é administrador). A tela só pergunta e mostra — nunca recalcula.
 *
 * ⚠️ A PORTA DE SAÍDA NÃO DEPENDE DA FLAG DE VENDA: com a venda desligada, quem
 * já assina ainda chega aqui e cancela a renovação. Só o botão de assinar some.
 */

import { useCallback, useEffect, useState } from "react"
import { BadgeCheck, CreditCard, Loader2, QrCode } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { VerifiedBadge } from "@/components/profile/verified-badge"

type Status = {
  is_verified: boolean
  by_admin: boolean
  paid_until: string | null
  renews: boolean
  subscription_status: string | null
  monthly_cents: number
  for_sale: boolean
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E] p-5 shadow-[6px_6px_0_0_#F2B705]"

export default function VerifiedPage() {
  const t = useTranslations("Verified")
  const locale = useLocale()
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"card" | "pix" | "cancel" | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // O retorno do checkout: a confirmação chega pelo webhook, então a tela
  // insiste algumas vezes antes de dizer que ainda está processando.
  const [returning, setReturning] = useState(false)

  const money = useCallback(
    (cents: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format((cents || 0) / 100),
    [locale]
  )
  const date = useCallback(
    (iso: string | null) =>
      iso ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso)) : "",
    [locale]
  )

  const load = useCallback(async () => {
    try {
      const s = await api<Status>("/api/me/verification")
      setStatus(s)
      return s
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("loadError", "Não foi possível carregar.") })
      return null
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    // Lido do window (não useSearchParams, que tira a rota do pré-render).
    const back = new URLSearchParams(window.location.search).get("selo")
    if (back !== "success") {
      void load()
      return
    }
    setReturning(true)
    let tries = 0
    let cancelled = false
    const tick = async () => {
      const s = await load()
      if (cancelled) return
      if (s?.is_verified || tries >= 10) {
        setReturning(false)
        if (!s?.is_verified) {
          setMsg({ ok: true, text: t("processing", "Pagamento recebido — o selo aparece assim que ele for confirmado.") })
        }
        return
      }
      tries += 1
      setTimeout(tick, 3000)
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [load, t])

  async function subscribe(method: "card" | "pix") {
    setBusy(method)
    setMsg(null)
    try {
      const r = await api<{ checkout_url?: string }>("/api/me/verification/checkout", {
        method: "POST",
        body: JSON.stringify({ method }),
      })
      if (r.checkout_url) window.location.href = r.checkout_url
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("payError", "Não foi possível iniciar o pagamento.") })
      setBusy(null)
    }
  }

  async function cancel() {
    if (!window.confirm(t("cancelConfirm", "Cancelar a renovação? O selo continua até o fim do período pago."))) return
    setBusy("cancel")
    setMsg(null)
    try {
      const r = await api<{ message?: string }>("/api/me/verification/cancel", { method: "POST" })
      setMsg({ ok: true, text: r.message || t("canceled", "Renovação cancelada.") })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("cancelError", "Não foi possível cancelar.") })
    } finally {
      setBusy(null)
    }
  }

  const price = money(status?.monthly_cents ?? 990)

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageBackLink href="/account" className="mb-5" />

        <header className="mb-6 flex items-start gap-4">
          <VerifiedBadge size="lg" className="mt-1" />
          <div>
            <h1 className="fl-display text-3xl">{t("title", "Selo verificado")}</h1>
            <p className="mt-2 text-sm text-[#9A938A]">
              {t(
                "intro",
                "Um selo que brilha ao lado do seu nome no perfil, no feed e na vitrine — para quem chega saber que tem gente de verdade por trás da conta."
              )}
            </p>
          </div>
        </header>

        {msg && (
          <p
            role="status"
            className={`mb-4 border-2 border-[#0B0B0D] px-3 py-2 text-sm ${
              msg.ok ? "bg-[#1D3B26] text-[#C8F5D2]" : "bg-[#3B1D1D] text-[#F5C8C8]"
            }`}
          >
            {msg.text}
          </p>
        )}

        {loading || returning ? (
          <div className={`${PANEL} flex items-center gap-2 text-sm text-[#9A938A]`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {returning ? t("confirming", "Confirmando o pagamento…") : t("loading", "Carregando…")}
          </div>
        ) : !status ? null : status.is_verified ? (
          <section className={PANEL}>
            <h2 className="fl-display flex items-center gap-2 text-xl">
              <BadgeCheck className="h-5 w-5 text-[#F2B705]" /> {t("activeTitle", "Seu selo está ativo")}
            </h2>
            {status.by_admin ? (
              <p className="mt-2 text-sm text-[#F5F1E8]/80">
                {t("byAdmin", "Você administra a Freelandoo, então o selo já vem com a conta — sem cobrança.")}
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-[#F5F1E8]/80">
                  {(status.renews
                    ? t("renewsOn", "Renova sozinho em {date}.")
                    : t("activeUntil", "Ativo até {date}.")
                  ).replace("{date}", date(status.paid_until))}
                </p>
                {status.subscription_status === "past_due" && (
                  <p className="mt-2 text-xs text-[#F5C8C8]">
                    {t("pastDue", "A última cobrança não passou. O selo fica até a data acima; confira o cartão.")}
                  </p>
                )}
                {status.renews ? (
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={busy !== null}
                    className="mt-4 border-2 border-[#F5F1E8]/40 px-4 py-2 text-sm font-bold hover:bg-[#F5F1E8]/10 disabled:opacity-50"
                  >
                    {busy === "cancel" ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}{" "}
                    {t("cancel", "Cancelar renovação")}
                  </button>
                ) : (
                  status.for_sale && (
                    <button
                      type="button"
                      onClick={() => subscribe("card")}
                      disabled={busy !== null}
                      className="mt-4 bg-[#F2B705] px-4 py-2 text-sm font-extrabold text-[#0B0B0D] disabled:opacity-50"
                    >
                      {t("renewCard", "Renovar no cartão todo mês")}
                    </button>
                  )
                )}
              </>
            )}
          </section>
        ) : !status.for_sale ? (
          <section className={PANEL}>
            <p className="text-sm text-[#9A938A]">{t("notForSale", "O selo verificado não está à venda agora.")}</p>
          </section>
        ) : (
          <section className={PANEL}>
            <p className="fl-display text-4xl text-[#F2B705]">
              {price}
              <span className="ml-1 text-base text-[#9A938A]">{t("perMonth", "/mês")}</span>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-[#F5F1E8]/80">
              <li>• {t("perk1", "O selo aparece em todos os seus perfis.")}</li>
              <li>• {t("perk2", "No perfil, no feed e na vitrine de busca.")}</li>
              <li>• {t("perk3", "Cancele quando quiser — o selo fica até o fim do mês pago.")}</li>
            </ul>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => subscribe("card")}
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 bg-[#F2B705] px-4 py-3 text-sm font-extrabold text-[#0B0B0D] disabled:opacity-50"
              >
                {busy === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {t("payCard", "Assinar no cartão")}
              </button>
              <p className="text-center text-[11px] text-[#9A938A]">
                {t("payCardHint", "Renova sozinho todo mês. Dá para cancelar quando quiser.")}
              </p>
              <button
                type="button"
                onClick={() => subscribe("pix")}
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 border-2 border-[#F5F1E8]/40 px-4 py-3 text-sm font-bold hover:bg-[#F5F1E8]/10 disabled:opacity-50"
              >
                {busy === "pix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {t("payPix", "Pagar um mês no Pix")}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
