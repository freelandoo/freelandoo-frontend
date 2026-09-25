"use client"

/**
 * O QUE EU COMPREI E O QUE EU VENDI na vitrine do vizinho (mig 249).
 *
 * É aqui que a venda termina: quem vendeu marca "entreguei", quem comprou
 * confirma (ou contesta), e o repasse do vendedor aparece com a data em que o
 * dinheiro fica sacável.
 *
 * ⚠️ O HOLDBACK É DITO EM VOZ ALTA. O vendedor vê "disponível em <data>" em vez
 * de um saldo que simplesmente não dá para sacar — retenção silenciosa parece
 * defeito, e esta é a tela em que ele viria procurar o dinheiro.
 *
 * ⚠️ E A DISPUTA TEM PRAZO, que também é dito: ela vale enquanto o repasse está
 * retido. Depois que o dinheiro foi liberado não há o que congelar, e um botão
 * que aceita o clique sem fazer nada é pior que botão nenhum.
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  Clock,
  Loader2,
  PackageCheck,
  ShieldAlert,
  ShoppingBag,
  Store,
} from "lucide-react"
import { PageBackLink } from "@/components/tabloide"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"
import { accentHex } from "../../_components/community-ui"

type Order = {
  id_order: number
  id_listing: number | null
  listing_title: string
  listing_kind: "service" | "product"
  price_cents: number
  delivery_cents: number
  amount_cents: number
  platform_fee_cents: number
  processor_fee_cents: number
  seller_cents: number
  courier_cents: number
  status: "pending" | "paid" | "delivered" | "completed" | "disputed" | "canceled" | "refunded"
  /** ⚠️ Só chega para quem COMPROU — é a sessão de checkout no nome dele. */
  checkout_url?: string | null
  confirm_due_at: string | null
  created_at: string
  buyer_username: string | null
  seller_username: string | null
  community_name: string
  dispute_status: string | null
}

type Payout = {
  id_payout: number
  /**
   * ⚠️ O VÍNCULO É ESTE, e ele é UNIQUE na tabela (um repasse por pedido).
   * Casar o repasse pelo TÍTULO erraria justamente no caso comum: o mesmo
   * anúncio vendido duas vezes gera dois pedidos com o MESMO título (ele é
   * snapshot), e a segunda venda mostraria a data de liberação da primeira.
   */
  id_order: number
  listing_title: string
  net_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido"
  available_at: string
  community_name: string
}

type Payload = {
  bought: Order[]
  sold: Order[]
  payouts: Payout[]
  summary: {
    aguardando_cents: number
    aprovado_cents: number
    pago_cents: number
    revertido_cents: number
    vendas: number
  }
}

type Community = {
  id_profile: string
  display_name: string
  community_theme: { accent?: string } | null
  // A modalidade decide a cor TRAVADA do estilo gamers (lockedAccentFor).
  kind?: string | null
}

const CARD = "border-2 border-[#0B0B0D] bg-[#15120E] p-4"
const BTN_GHOST =
  "inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] disabled:opacity-50"

function authHeaders(): Record<string, string> {
  const tk = getToken()
  return tk
    ? { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

export function CommunityOrdersView({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")
  const locale = useLocale()

  const [community, setCommunity] = useState<Community | null>(null)
  const [data, setData] = useState<Payload | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [tab, setTab] = useState<"bought" | "sold">("bought")
  const [disputing, setDisputing] = useState<number | null>(null)
  const [disputeReason, setDisputeReason] = useState("not_received")
  const [disputeDetail, setDisputeDetail] = useState("")

  const money = useCallback(
    (cents: number) =>
      (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )
  const when = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }),
    [locale]
  )

  const load = useCallback(async () => {
    try {
      const headers = authHeaders()
      const cRes = await fetch(`/api/communities/${communityId}`, { headers })
      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setErrorMsg(cData?.error || t("notFound", "Comunidade não encontrada."))
        setState("error")
        return
      }
      setCommunity(cData.community)

      const oRes = await fetch(`/api/communities/${communityId}/orders/mine`, { headers })
      const oData = await oRes.json().catch(() => ({}))
      if (!oRes.ok) {
        setErrorMsg(oData?.error || t("ordLoadError", "Não deu para carregar os pedidos."))
        setState("error")
        return
      }
      setData(oData)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [communityId, t])

  useEffect(() => {
    void load()
  }, [load])

  // Push, não poll. O evento está na lista de `lib/realtime.ts`.
  useEffect(() => {
    return onRealtime("listing-order:changed", () => {
      void load()
    })
  }, [load])

  const accent = accentHex(community?.community_theme?.accent, community?.kind)

  const act = useCallback(
    async (id: number, path: string, body?: unknown) => {
      setBusy(id)
      setMsg(null)
      try {
        const res = await fetch(`/api/communities/${communityId}/orders/${id}/${path}`, {
          method: "POST",
          headers: authHeaders(),
          body: body ? JSON.stringify(body) : undefined,
        })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(d.error || t("ordActionError", "Não deu certo."))
        setDisputing(null)
        setDisputeDetail("")
        await load()
      } catch (err) {
        setMsg(err instanceof Error ? err.message : t("ordActionError", "Não deu certo."))
      } finally {
        setBusy(null)
      }
    },
    [communityId, load, t]
  )

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "error" || !community) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 max-w-sm text-sm text-[#9A938A]">
            {errorMsg || t("ordLoadError", "Não deu para carregar os pedidos.")}
          </p>
          <div className="mt-4 flex justify-center">
            <PageBackLink href={`/comunidades/${communityId}`} />
          </div>
        </div>
      </div>
    )
  }

  const list = tab === "bought" ? data?.bought || [] : data?.sold || []

  return (
    <div className="fl-root fl-sharp relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F1EDE2]">
      <div className="relative mx-auto max-w-4xl px-0 pt-6 md:px-6">
        <PageBackLink
          href={`/comunidades/${communityId}`}
          label={community.display_name}
          className="px-3 md:px-0"
        />

        <header className="mt-5 px-3 md:px-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            {t("ordEyebrow", "Vitrine do vizinho")}
          </p>
          <h1 className="fl-display mt-1 text-4xl leading-none text-[#F5F1E8]">
            {t("ordTitle", "Meus pedidos")}
          </h1>
        </header>

        {msg && (
          <p className="mx-3 mt-4 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs font-bold md:mx-0">
            {msg}
          </p>
        )}

        {/* O saldo de quem vende, com a retenção DITA. */}
        {(data?.summary?.aguardando_cents || data?.summary?.aprovado_cents) ? (
          <div className="mx-3 mt-5 grid gap-3 sm:grid-cols-2 md:mx-0">
            <div className={CARD}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("ordHeldTitle", "Retido")}
              </p>
              <p className="fl-display mt-1 text-2xl leading-none" style={{ color: accent }}>
                {money(data?.summary?.aguardando_cents || 0)}
              </p>
              <p className="mt-1 text-[11px] text-[#9A938A]">
                {t(
                  "ordHeldHint",
                  "Fica retido por alguns dias depois da entrega — é o prazo em que quem comprou ainda pode contestar."
                )}
              </p>
            </div>
            <div className={CARD}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("ordAvailableTitle", "Liberado")}
              </p>
              <p className="fl-display mt-1 text-2xl leading-none" style={{ color: accent }}>
                {money(data?.summary?.aprovado_cents || 0)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mx-3 mt-6 flex gap-1 border-b-2 border-[#F5F1E8]/15 md:mx-0">
          {(
            [
              ["bought", t("ordTabBought", "Comprei")],
              ["sold", t("ordTabSold", "Vendi")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="-mb-0.5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]"
              style={{
                borderBottom: tab === key ? `4px solid ${accent}` : "4px solid transparent",
                opacity: tab === key ? 1 : 0.5,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mx-3 mt-5 space-y-3 md:mx-0">
          {list.length === 0 ? (
            <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
              {tab === "bought" ? (
                <ShoppingBag className="mx-auto h-10 w-10" style={{ color: accent }} />
              ) : (
                <Store className="mx-auto h-10 w-10" style={{ color: accent }} />
              )}
              <p className="mt-4 text-sm text-[#9A938A]">
                {tab === "bought"
                  ? t("ordEmptyBought", "Você ainda não comprou nada por aqui.")
                  : t("ordEmptySold", "Você ainda não vendeu nada por aqui.")}
              </p>
            </div>
          ) : (
            list.map((o) => {
              const payout =
                tab === "sold"
                  ? (data?.payouts || []).find((p) => p.id_order === o.id_order)
                  : undefined
              return (
                <div key={o.id_order} className={CARD}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="fl-display text-lg leading-tight text-[#F5F1E8]">
                        {o.listing_title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#9A938A]">
                        {tab === "bought"
                          ? `@${o.seller_username} · ${when(o.created_at)}`
                          : `@${o.buyer_username} · ${when(o.created_at)}`}
                      </p>
                    </div>
                    <span
                      className="shrink-0 border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]"
                      style={{ background: "#1D1810", color: accent }}
                    >
                      {t(`ordStatus_${o.status}`, o.status)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-extrabold" style={{ color: accent }}>
                    {tab === "bought"
                      ? money(o.amount_cents)
                      : t("ordYouGet", "Você recebe {v}").replace("{v}", money(o.seller_cents))}
                    {o.delivery_cents > 0 && (
                      <span className="ml-2 text-[11px] font-bold text-[#9A938A]">
                        {t("ordWithDelivery", "· com entrega ({v})").replace(
                          "{v}",
                          money(o.delivery_cents)
                        )}
                      </span>
                    )}
                  </p>

                  {/* ⚠️ A RETENÇÃO DITA EM VOZ ALTA: o vendedor vê a data em que
                      o dinheiro fica sacável, em vez de um saldo que não sai. */}
                  {tab === "sold" && payout?.status === "aguardando" && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-[#9A938A]">
                      <Clock className="h-3 w-3" />
                      {t("ordAvailableAt", "Disponível em {v}").replace(
                        "{v}",
                        when(payout.available_at)
                      )}
                    </p>
                  )}

                  {o.dispute_status === "open" && (
                    <p className="mt-2 flex items-center gap-1.5 border-2 border-[#C2410C]/50 bg-[#1D1810] px-3 py-2 text-[11px] font-bold">
                      <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "#F2B705" }} />
                      {t("ordDisputeOpen", "Em análise. A gente avisa quando decidir.")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Quem comprou e ainda não pagou volta ao checkout. */}
                    {tab === "bought" && o.status === "pending" && o.checkout_url && (
                      <a
                        href={o.checkout_url}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                        style={{ background: accent }}
                      >
                        {t("ordPayCta", "Pagar {v}").replace("{v}", money(o.amount_cents))}
                      </a>
                    )}

                    {tab === "sold" && o.status === "paid" && (
                      <button
                        type="button"
                        disabled={busy === o.id_order}
                        onClick={() => act(o.id_order, "delivered")}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                        style={{ background: accent }}
                      >
                        <PackageCheck className="h-3 w-3" /> {t("ordDeliveredCta", "Entreguei")}
                      </button>
                    )}

                    {tab === "bought" && o.status === "delivered" && (
                      <button
                        type="button"
                        disabled={busy === o.id_order}
                        onClick={() => act(o.id_order, "confirm")}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                        style={{ background: accent }}
                      >
                        <Check className="h-3 w-3" /> {t("ordConfirmCta", "Recebi")}
                      </button>
                    )}

                    {/* A disputa vale enquanto o dinheiro está retido — inclusive
                        depois de o pedido concluir sozinho pelo prazo. */}
                    {tab === "bought" &&
                      ["paid", "delivered", "completed"].includes(o.status) &&
                      o.dispute_status !== "open" && (
                        <button
                          type="button"
                          className={BTN_GHOST}
                          onClick={() => setDisputing(o.id_order)}
                        >
                          <AlertTriangle className="h-3 w-3" />{" "}
                          {t("ordDisputeCta", "Tive um problema")}
                        </button>
                      )}
                  </div>

                  {tab === "bought" && o.status === "delivered" && o.confirm_due_at && (
                    <p className="mt-2 text-[11px] text-[#9A938A]">
                      {t(
                        "ordConfirmDue",
                        "Se você não confirmar até {v}, a gente considera entregue."
                      ).replace("{v}", when(o.confirm_due_at))}
                    </p>
                  )}

                  {disputing === o.id_order && (
                    <div className="mt-3 border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                        {t("ordDisputeTitle", "O que aconteceu?")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(
                          [
                            ["not_received", t("ordReasonNotReceived", "Não chegou")],
                            ["not_as_described", t("ordReasonNotAsDescribed", "Não era isso")],
                            ["other", t("ordReasonOther", "Outro")],
                          ] as const
                        ).map(([v, label]) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDisputeReason(v)}
                            className="border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                            style={
                              disputeReason === v
                                ? { background: accent, color: "#0B0B0D" }
                                : { background: "#15120E", color: "#F5F1E8" }
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="mt-3 h-20 w-full border-2 border-[#0B0B0D] bg-[#0B0B0D]/40 px-3 py-2 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/35 outline-none"
                        placeholder={t("ordDisputeDetail", "Conte o que houve (opcional)")}
                        value={disputeDetail}
                        onChange={(e) => setDisputeDetail(e.target.value)}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy === o.id_order}
                          onClick={() =>
                            act(o.id_order, "dispute", {
                              reason: disputeReason,
                              detail: disputeDetail.trim() || null,
                            })
                          }
                          className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                          style={{ background: accent }}
                        >
                          {busy === o.id_order ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {t("ordDisputeSend", "Abrir contestação")}
                        </button>
                        <button
                          type="button"
                          className={BTN_GHOST}
                          onClick={() => setDisputing(null)}
                        >
                          {t("listCancel", "Cancelar")}
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-[#9A938A]">
                        {t(
                          "ordDisputeNote",
                          "O pagamento fica congelado enquanto a Freelandoo analisa."
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
