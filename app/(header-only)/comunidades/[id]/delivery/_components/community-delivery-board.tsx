"use client"

/**
 * O QUADRO DE DELIVERY ENTRE VIZINHOS (mig 248).
 *
 * Qualquer MORADOR abre um chamado pago; qualquer MORADOR aceita e recebe. Não
 * existe papel promovido de entregador — o Alex falou "como professor" na
 * primeira descrição e corrigiu em seguida: "qualquer um da comunidade pode ir
 * receber".
 *
 * ⚠️ É PÁGINA, e não painel embaixo do headcard. O quadro tem a lista de
 * chamados abertos, o formulário de abertura, as minhas corridas nas DUAS
 * pontas (pedi / entreguei) e a carteira do entregador — isso não cabe embaixo
 * de um headcard sem empurrar o feed para longe, que é justamente o que os
 * painéis nasceram para evitar. Mesma decisão do Ranking e dos Indicadores.
 *
 * ⚠️ A TELA MOSTRA O LÍQUIDO, NÃO O BRUTO. Cada tipo de corrida chega do
 * backend já com `net_cents` calculado pela régua do gateway ATIVO. Se o card
 * anunciasse "R$3" e caíssem R$1,01 na carteira, o vizinho descobriria na
 * primeira corrida e não faria a segunda. O bruto aparece junto, como "o
 * vizinho paga", para a conta ficar inteira na mesma linha.
 *
 * ⚠️ NENHUM NÚMERO DE TARIFA É ESCRITO AQUI. A mesma corrida de R$3 rende
 * R$2,49 no Stripe (o que roda hoje) e R$1,01 no Asaas (o escolhido, hoje
 * desligado). Cravar qualquer um dos dois criaria uma tela que fica errada no
 * dia do switch, sem ninguém perceber.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bike,
  Check,
  Clock,
  Loader2,
  PackageCheck,
  Plus,
  ShieldAlert,
  Truck,
  X,
} from "lucide-react"
import { PageBackLink } from "@/components/tabloide"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import { getToken, getStoredUser } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"
import { accentHex } from "../../_components/community-ui"

type DeliveryType = {
  kind: string
  label: string
  price_cents: number
  expires_minutes: number
  confirm_hours: number
  gross_cents: number
  estimated_fee_cents: number
  net_cents: number
}

type Delivery = {
  id_delivery: number
  id_requester: string
  id_courier: string | null
  kind: string
  price_cents: number
  courier_cents: number
  note: string | null
  pickup: string | null
  dropoff: string | null
  status: "open" | "accepted" | "delivered" | "completed" | "canceled" | "expired"
  payment_status: string
  /**
   * ⚠️ O BACKEND SÓ MANDA ISTO PARA QUEM PAGA (quem pediu). A cobrança nasce
   * quando o ENTREGADOR aceita, e quem paga é o pedinte — que não estava na
   * tela naquele instante. É por este link que ele paga a corrida que já
   * aceitaram para ele.
   */
  checkout_url?: string | null
  created_at: string
  expires_at: string
  confirm_due_at: string | null
  requester_username: string | null
  requester_name: string | null
  courier_username: string | null
  courier_name: string | null
}

type Board = {
  types: DeliveryType[]
  deliveries: Delivery[]
  viewer: {
    id_user: string
    is_available: boolean
    accept_blocked_until: string | null
    recent_cancels: number
  }
}

type Community = {
  id_profile: string
  display_name: string
  kind?: string | null
  community_theme: { accent?: string } | null
}

const CARD = "border-2 border-[#0B0B0D] bg-[#15120E] p-4"
const INPUT =
  "h-10 w-full border-2 border-[#0B0B0D] bg-[#0B0B0D]/40 px-3 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/35 outline-none focus:border-[#F2B705]/60"
const BTN_GHOST =
  "inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] disabled:opacity-50"

function authHeaders(): Record<string, string> {
  const tk = getToken()
  return tk
    ? { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

export function CommunityDeliveryBoard({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")
  const locale = useLocale()

  const [community, setCommunity] = useState<Community | null>(null)
  const [board, setBoard] = useState<Board | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | "new" | null>(null)
  const [tab, setTab] = useState<"open" | "mine">("open")

  const [formOpen, setFormOpen] = useState(false)
  const [kind, setKind] = useState<string>("")
  const [note, setNote] = useState("")
  const [pickup, setPickup] = useState("")
  const [dropoff, setDropoff] = useState("")

  const viewerId = getStoredUser()?.id_user ?? null

  const money = useCallback(
    (cents: number) =>
      (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
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

      const bRes = await fetch(
        `/api/communities/${communityId}/deliveries?status=${tab === "mine" ? "all" : "open"}${
          tab === "mine" ? "&mine=1" : ""
        }`,
        { headers }
      )
      const bData = await bRes.json().catch(() => ({}))
      if (!bRes.ok) {
        // A recusa é DITA: quem não é morador ainda vê o nome da comunidade e a
        // saída, com o motivo escrito — em vez de um quadro vazio que pareceria
        // "ninguém chamou ninguém".
        setErrorMsg(bData?.error || t("delLoadError", "Não deu para carregar os chamados."))
        setState("error")
        return
      }
      setBoard(bData)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [communityId, tab, t])

  useEffect(() => {
    void load()
  }, [load])

  // ⚠️ PUSH, NÃO POLL. O evento `delivery:changed` está na lista `events` de
  // `lib/realtime.ts` — evento fora dela simplesmente não chega, e o quadro
  // ficaria mostrando "aberto" um chamado que alguém já pegou, até um F5.
  useEffect(() => {
    return onRealtime("delivery:changed", () => {
      void load()
    })
  }, [load])

  const accent = accentHex(community?.community_theme?.accent)
  // `board?.types || []` cria um array NOVO a cada render, e um `useMemo` que
  // depende dele recalcularia sempre — o memo viraria enfeite. Memoizado aqui,
  // a identidade só muda quando o quadro muda.
  const types = useMemo(() => board?.types || [], [board])
  const chosen = useMemo(() => types.find((x) => x.kind === kind) || null, [types, kind])

  const act = useCallback(
    async (id: number, path: string, okMsg: string) => {
      setBusy(id)
      setMsg(null)
      try {
        const res = await fetch(
          `/api/communities/${communityId}/deliveries/${id}/${path}`,
          { method: "POST", headers: authHeaders() }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t("delActionError", "Não deu certo."))
        // O aceite devolve a URL do checkout de QUEM PEDIU — não é o entregador
        // que paga. Quem vê o link é o pedinte, no card dele.
        setMsg(okMsg)
        await load()
      } catch (err) {
        setMsg(err instanceof Error ? err.message : t("delActionError", "Não deu certo."))
      } finally {
        setBusy(null)
      }
    },
    [communityId, load, t]
  )

  const openCall = async () => {
    if (!kind) return
    setBusy("new")
    setMsg(null)
    try {
      const res = await fetch(`/api/communities/${communityId}/deliveries`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind,
          note: note.trim() || null,
          pickup: pickup.trim() || null,
          dropoff: dropoff.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("delOpenError", "Não deu para abrir o chamado."))
      setNote("")
      setPickup("")
      setDropoff("")
      setKind("")
      setFormOpen(false)
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("delOpenError", "Não deu para abrir o chamado."))
    } finally {
      setBusy(null)
    }
  }

  const toggleAvailable = async () => {
    if (!board) return
    try {
      await fetch(`/api/communities/${communityId}/deliveries/availability`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ available: !board.viewer.is_available }),
      })
      await load()
    } catch {
      /* silencioso: o toggle é conveniência, não caminho crítico */
    }
  }

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
            {errorMsg || t("delLoadError", "Não deu para carregar os chamados.")}
          </p>
          <div className="mt-4 flex justify-center">
            <PageBackLink href={`/comunidades/${communityId}`} />
          </div>
        </div>
      </div>
    )
  }

  const blockedUntil = board?.viewer.accept_blocked_until
    ? new Date(board.viewer.accept_blocked_until)
    : null
  const blocked = !!blockedUntil && blockedUntil > new Date()

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
            {t("delEyebrow", "Entre vizinhos")}
          </p>
          <h1 className="fl-display mt-1 text-4xl leading-none text-[#F5F1E8]">
            {t("delTitle", "Delivery")}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[#9A938A]">
            {t(
              "delIntro",
              "Peça para alguém buscar na portaria ou levar de um apartamento ao outro. Qualquer vizinho pode pegar o chamado e receber por isso."
            )}
          </p>
        </header>

        {msg && (
          <p className="mx-3 mt-4 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs font-bold md:mx-0">
            {msg}
          </p>
        )}

        {/* "Disponível agora" é DISPONIBILIDADE, não papel: ele não dá direito
            de aceitar (qualquer morador já tem), só faz o aviso chegar. */}
        <div className="mx-3 mt-5 flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3 md:mx-0">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]">
              {t("delAvailableTitle", "Me chame")}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9A938A]">
              {t(
                "delAvailableHint",
                "Ligado, você recebe um aviso quando alguém abrir um chamado aqui. Aceitar já é seu direito de morador — isto é só o aviso."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAvailable}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
            style={
              board?.viewer.is_available
                ? { background: accent, color: "#0B0B0D" }
                : { background: "#1D1810", color: "#F5F1E8" }
            }
          >
            <Bike className="h-4 w-4" />
            {board?.viewer.is_available
              ? t("delAvailableOn", "Disponível agora")
              : t("delAvailableOff", "Ficar disponível")}
          </button>
        </div>

        {blocked && (
          <p className="mx-3 mt-3 border-2 border-[#C2410C]/50 bg-[#1D1810] px-4 py-3 text-xs font-bold text-[#F5F1E8] md:mx-0">
            {t(
              "delBlocked",
              "Você cancelou corridas demais nos últimos dias. Espere um pouco para aceitar outra."
            )}
          </p>
        )}

        {/* ── abrir um chamado ── */}
        <div className="mx-3 mt-5 md:mx-0">
          {formOpen ? (
            <div className={CARD}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                {t("delNewTitle", "Chamar alguém")}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {types.map((ty) => {
                  const on = ty.kind === kind
                  return (
                    <button
                      key={ty.kind}
                      type="button"
                      onClick={() => setKind(ty.kind)}
                      className="border-2 border-[#0B0B0D] px-3 py-2 text-left"
                      style={{
                        background: on ? accent : "#1D1810",
                        color: on ? "#0B0B0D" : "#F5F1E8",
                      }}
                    >
                      <span className="block text-xs font-extrabold uppercase tracking-[0.1em]">
                        {ty.label}
                      </span>
                      <span
                        className="mt-0.5 block text-[11px] font-bold"
                        style={{ color: on ? "#0B0B0D" : "#9A938A" }}
                      >
                        {t("delYouPay", "Você paga {v}").replace("{v}", money(ty.price_cents))}
                      </span>
                    </button>
                  )
                })}
              </div>

              <input
                className={`${INPUT} mt-3`}
                placeholder={t("delPickupPlaceholder", "Buscar onde? (portaria, apto 32…)")}
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
              <input
                className={`${INPUT} mt-3`}
                placeholder={t("delDropoffPlaceholder", "Levar aonde?")}
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
              <textarea
                className={`${INPUT} mt-3 h-20 py-2`}
                placeholder={t("delNotePlaceholder", "Detalhes (opcional)")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {chosen && (
                <p className="mt-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[11px] text-[#9A938A]">
                  {t(
                    "delChargeWhen",
                    "Você só é cobrado quando alguém aceitar. Se ninguém pegar, o chamado expira e não custa nada."
                  )}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === "new" || !kind}
                  onClick={openCall}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {busy === "new" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("delOpenCta", "Abrir chamado")}
                </button>
                <button type="button" className={BTN_GHOST} onClick={() => setFormOpen(false)}>
                  {t("listCancel", "Cancelar")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              style={{ background: accent }}
            >
              <Plus className="h-5 w-5" /> {t("delNewTitle", "Chamar alguém")}
            </button>
          )}
        </div>

        {/* ── as duas filas ── */}
        <div className="mx-3 mt-6 flex gap-1 border-b-2 border-[#F5F1E8]/15 md:mx-0">
          {(
            [
              ["open", t("delTabOpen", "Abertos")],
              ["mine", t("delTabMine", "Meus")],
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
          {(board?.deliveries || []).length === 0 ? (
            <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
              <Truck className="mx-auto h-10 w-10" style={{ color: accent }} />
              <p className="mt-4 text-sm text-[#9A938A]">
                {tab === "mine"
                  ? t("delEmptyMine", "Você ainda não pediu nem entregou nada por aqui.")
                  : t("delEmptyOpen", "Nenhum chamado aberto agora.")}
              </p>
            </div>
          ) : (
            (board?.deliveries || []).map((d) => {
              const ty = types.find((x) => x.kind === d.kind)
              const mineAsRequester = String(d.id_requester) === String(viewerId)
              const mineAsCourier = !!d.id_courier && String(d.id_courier) === String(viewerId)
              return (
                <div key={d.id_delivery} className={CARD}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="fl-display text-lg leading-tight text-[#F5F1E8]">
                        {ty?.label || d.kind}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#9A938A]">
                        @{d.requester_username}
                        {d.pickup ? ` · ${d.pickup}` : ""}
                        {d.dropoff ? ` → ${d.dropoff}` : ""}
                      </p>
                    </div>
                    <span
                      className="shrink-0 border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]"
                      style={{ background: "#1D1810", color: accent }}
                    >
                      {t(`delStatus_${d.status}`, d.status)}
                    </span>
                  </div>

                  {d.note && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#F5F1E8]/80">{d.note}</p>
                  )}

                  {/* ⚠️ AS DUAS PONTAS DO DINHEIRO, na mesma linha: o que quem
                      pede paga e o que quem entrega RECEBE. Mostrar só o bruto
                      faria o vizinho descobrir a diferença na carteira. */}
                  <p className="mt-3 text-sm font-extrabold" style={{ color: accent }}>
                    {t("delYouGet", "Você recebe {v}").replace(
                      "{v}",
                      money(d.courier_cents || ty?.net_cents || 0)
                    )}
                    <span className="ml-2 text-[11px] font-bold text-[#9A938A]">
                      {t("delNeighborPays", "· o vizinho paga {v}").replace(
                        "{v}",
                        money(d.price_cents)
                      )}
                    </span>
                  </p>

                  {d.status === "open" && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-[#9A938A]">
                      <Clock className="h-3 w-3" />
                      {t("delExpiresAt", "Vale até {v}").replace(
                        "{v}",
                        new Date(d.expires_at).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      )}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Aceitar: só chamado aberto de OUTRA pessoa, e só quem
                        não está de castigo. */}
                    {d.status === "open" && !mineAsRequester && (
                      <button
                        type="button"
                        disabled={busy === d.id_delivery || blocked}
                        onClick={() =>
                          act(d.id_delivery, "accept", t("delAccepted", "Corrida aceita."))
                        }
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] disabled:opacity-50"
                        style={{ background: accent }}
                      >
                        {busy === d.id_delivery ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Bike className="h-3 w-3" />
                        )}
                        {t("delAcceptCta", "Eu busco")}
                      </button>
                    )}

                    {d.status === "open" && mineAsRequester && (
                      <button
                        type="button"
                        disabled={busy === d.id_delivery}
                        className={BTN_GHOST}
                        onClick={() =>
                          act(d.id_delivery, "cancel", t("delCanceled", "Chamado cancelado."))
                        }
                      >
                        <X className="h-3 w-3" /> {t("delCancelCta", "Cancelar")}
                      </button>
                    )}

                    {/* ⚠️ QUEM PAGA É QUEM PEDIU, e ele não estava na tela
                        quando aceitaram. O link aparece no card dele, e some
                        sozinho quando o webhook confirma o pagamento. */}
                    {mineAsRequester &&
                      d.payment_status === "pending" &&
                      d.checkout_url && (
                        <a
                          href={d.checkout_url}
                          className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                          style={{ background: accent }}
                        >
                          {t("delPayCta", "Pagar {v}").replace("{v}", money(d.price_cents))}
                        </a>
                      )}

                    {d.status === "accepted" && mineAsCourier && (
                      <button
                        type="button"
                        disabled={busy === d.id_delivery}
                        onClick={() =>
                          act(d.id_delivery, "delivered", t("delDelivered", "Entrega marcada."))
                        }
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                        style={{ background: accent }}
                      >
                        <PackageCheck className="h-3 w-3" /> {t("delDeliveredCta", "Entreguei")}
                      </button>
                    )}

                    {d.status === "delivered" && mineAsRequester && (
                      <button
                        type="button"
                        disabled={busy === d.id_delivery}
                        onClick={() =>
                          act(d.id_delivery, "confirm", t("delConfirmed", "Entrega confirmada."))
                        }
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                        style={{ background: accent }}
                      >
                        <Check className="h-3 w-3" /> {t("delConfirmCta", "Recebi")}
                      </button>
                    )}

                    {/* Desistir: a qualquer momento (decisão do Alex) e o
                        dinheiro volta inteiro para quem pagou. */}
                    {(d.status === "accepted" || d.status === "delivered") && mineAsCourier && (
                      <button
                        type="button"
                        disabled={busy === d.id_delivery}
                        className={BTN_GHOST}
                        onClick={() =>
                          act(d.id_delivery, "release", t("delReleased", "Corrida devolvida."))
                        }
                      >
                        <X className="h-3 w-3" /> {t("delReleaseCta", "Não vou conseguir")}
                      </button>
                    )}
                  </div>

                  {/* O entregador precisa SABER que o vizinho ainda não pagou —
                      senão ele entrega e descobre depois que não há repasse. */}
                  {mineAsCourier && d.payment_status === "pending" && (
                    <p className="mt-2 text-[11px] text-[#9A938A]">
                      {t(
                        "delWaitingPayment",
                        "Esperando o vizinho pagar. O repasse só sai depois que o pagamento cair."
                      )}
                    </p>
                  )}

                  {d.status === "delivered" && mineAsRequester && d.confirm_due_at && (
                    <p className="mt-2 text-[11px] text-[#9A938A]">
                      {t(
                        "delConfirmDue",
                        "Se você não confirmar até {v}, a gente libera o pagamento sozinho."
                      ).replace(
                        "{v}",
                        new Date(d.confirm_due_at).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      )}
                    </p>
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
