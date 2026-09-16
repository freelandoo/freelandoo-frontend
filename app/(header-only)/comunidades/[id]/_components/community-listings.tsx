"use client"

// A VITRINE de serviços e de produtos das comunidades territoriais.
//
// ─── ELA JÁ EXISTIA E MORAVA NO LUGAR ERRADO ────────────────────────────────
//
// O quadro da mig 198 vivia DENTRO do bloco de extras do condomínio, como duas
// abas internas entre avisos e enquetes — três níveis de navegação abaixo do
// que é, na prática, o produto do lugar: o que o vizinho vende e o que ele faz.
// Agora é ABA de primeira classe, ao lado do Feed, e o bairro ganhou a mesma.
//
// ⚠️ ESTE COMPONENTE É O ÚNICO DONO DA VITRINE. Ela FOI REMOVIDA do
// `condo-extras.tsx` de propósito: deixar nos dois lugares faria publicar num
// não aparecer no outro — e o morador acharia que o anúncio se perdeu.
//
// ⚠️ A PORTA É A GENÉRICA (`/api/communities/:id/listings`), nunca
// `/api/condos/...`: o mesmo componente serve condomínio e bairro, e a rota
// antiga só conhece a primeira modalidade. A de condo continua montada no
// backend para o front em cache, não para código novo.

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, Package, Plus, ShoppingCart, Ticket, Trash2, Truck, Wrench, X } from "lucide-react"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

export type ListingKind = "service" | "product"

export type Listing = {
  id_listing: number
  id_user: string
  kind: ListingKind
  title: string
  description: string | null
  price_cents: number | null
  contact: string | null
  image_url: string | null
  status: "active" | "archived"
  created_at: string
  owner_username: string | null
  owner_name: string | null
  owner_avatar: string | null
}

type QuotaBlock = {
  free: number
  purchased: number
  used: number
  total: number
  remaining: number
}
/** Os tipos de entrega que o add-on "+R$3" pode somar ao pedido. */
type DeliveryOption = {
  kind: string
  label: string
  price_cents: number
}

type QuotaPayload = {
  quota: Partial<Record<ListingKind, QuotaBlock>>
  price_cents: number
  price_polens: number
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

export function CommunityListings({
  communityId,
  kind,
  accent,
  canPublish,
  isAdmin,
  currentUserId,
  canBuy,
}: {
  communityId: string
  kind: ListingKind
  accent: string
  /** Morador confirmado (condo) / reconhecido (bairro). Quem não é, só lê. */
  canPublish: boolean
  isAdmin: boolean
  currentUserId: string | null
  /**
   * Liga o checkout vizinho-a-vizinho (mig 249). Desligado — pela flag do
   * Painel de Controle ou porque quem olha não é morador — a vitrine volta a
   * ser o mural com o contato do anunciante, que é como ela nasceu.
   */
  canBuy?: boolean
}) {
  const t = useTranslations("Community")
  const locale = useLocale()

  const [items, setItems] = useState<Listing[]>([])
  const [quota, setQuota] = useState<QuotaPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [needsSlot, setNeedsSlot] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [price, setPrice] = useState("")
  const [contact, setContact] = useState("")

  /* ── o checkout vizinho-a-vizinho (mig 249) ─────────────────────────────── */
  const [buying, setBuying] = useState<Listing | null>(null)
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([])
  const [pickedDelivery, setPickedDelivery] = useState<string>("")
  const [buyBusy, setBuyBusy] = useState(false)
  const [buyMsg, setBuyMsg] = useState<string | null>(null)

  const money = useCallback(
    (cents: number) =>
      (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, q] = await Promise.all([
        fetch(`/api/communities/${communityId}/listings?kind=${kind}`, { headers: authHeaders() }),
        fetch(`/api/communities/${communityId}/listings/quota?kind=${kind}`, {
          headers: authHeaders(),
        }),
      ])
      const ld = await l.json()
      const qd = await q.json()
      if (l.ok) setItems(Array.isArray(ld.listings) ? ld.listings : [])
      if (q.ok) setQuota(qd)
    } catch {
      /* silencioso: o estado vazio já diz que não há nada para mostrar */
    } finally {
      setLoading(false)
    }
  }, [communityId, kind])

  useEffect(() => {
    load()
  }, [load])

  const myQuota = quota?.quota?.[kind] || null

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    setMsg(null)
    setNeedsSlot(false)
    try {
      const res = await fetch(`/api/communities/${communityId}/listings`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind,
          title: title.trim(),
          description: desc.trim() || null,
          contact: contact.trim() || null,
          price_cents: price.trim()
            ? Math.round(Number(price.replace(",", ".")) * 100)
            : null,
        }),
      })
      const data = await res.json()
      // 402 = cota estourada. O backend devolve o preço junto, então a oferta
      // da vaga extra aparece no mesmo lugar em que a recusa foi lida.
      if (res.status === 402 || data.needs_slot) {
        setNeedsSlot(true)
        setMsg(data.error || t("listQuotaReached", "Limite de anúncios ativos atingido."))
        return
      }
      if (!res.ok) throw new Error(data.error || t("listError", "Não foi possível publicar."))
      setTitle("")
      setDesc("")
      setPrice("")
      setContact("")
      setFormOpen(false)
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("listError", "Não foi possível publicar."))
    } finally {
      setBusy(false)
    }
  }

  const archive = async (idListing: number) => {
    try {
      await fetch(`/api/communities/${communityId}/listings/${idListing}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "archived" }),
      })
      await load()
    } catch {
      /* silencioso */
    }
  }

  const buySlotMoney = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/communities/${communityId}/listing-slots/checkout`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ kind, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error || t("listSlotError", "Não foi possível iniciar o pagamento."))
      }
      window.location.href = data.checkout_url
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : t("listSlotError", "Não foi possível iniciar o pagamento.")
      )
      setBusy(false)
    }
  }

  const buySlotPolens = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities/${communityId}/listing-slots/polens`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ kind, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("listSlotError", "Não foi possível comprar a vaga."))
      setMsg(t("listSlotBought", "Vaga liberada."))
      setNeedsSlot(false)
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("listSlotError", "Não foi possível comprar a vaga."))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Abre o modal de compra e busca os tipos de entrega.
   *
   * ⚠️ OS PREÇOS DA ENTREGA VÊM DO BACKEND, da MESMA tabela admin-editável que
   * o delivery usa. Escrever "R$3" aqui faria a vitrine cobrar três reais no
   * dia em que o painel já dissesse quatro.
   */
  const openBuy = useCallback(
    async (l: Listing) => {
      setBuying(l)
      setPickedDelivery("")
      setBuyMsg(null)
      try {
        const res = await fetch(`/api/communities/${communityId}/deliveries`, {
          headers: authHeaders(),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && Array.isArray(data.types)) setDeliveryOptions(data.types)
        else setDeliveryOptions([])
      } catch {
        // Sem a lista, o modal só não oferece o add-on — comprar continua de pé.
        setDeliveryOptions([])
      }
    },
    [communityId]
  )

  const confirmBuy = async () => {
    if (!buying) return
    setBuyBusy(true)
    setBuyMsg(null)
    try {
      const res = await fetch(
        `/api/communities/${communityId}/listings/${buying.id_listing}/checkout`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ delivery_kind: pickedDelivery || null }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error || t("buyError", "Não foi possível iniciar o pagamento."))
      }
      window.location.href = data.checkout_url
    } catch (err) {
      setBuyMsg(err instanceof Error ? err.message : t("buyError", "Não foi possível iniciar o pagamento."))
      setBuyBusy(false)
    }
  }

  const chosenDelivery = deliveryOptions.find((d) => d.kind === pickedDelivery) || null
  const buyTotal = (buying?.price_cents || 0) + (chosenDelivery?.price_cents || 0)

  const Icon = kind === "service" ? Wrench : Package
  const emptyText =
    kind === "service"
      ? t("listEmptyServices", "Ninguém ofereceu um serviço por aqui ainda.")
      : t("listEmptyProducts", "Ninguém anunciou um produto por aqui ainda.")

  const header = useMemo(
    () =>
      kind === "service"
        ? t("listNewService", "Anunciar um serviço")
        : t("listNewProduct", "Anunciar um produto"),
    [kind, t]
  )

  return (
    <div className="space-y-4">
      {msg && (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs font-bold text-[#F5F1E8]">
          {msg}
        </p>
      )}

      {/* Quem não mora aqui lê a vitrine e não publica nela — e a tela DIZ
          isso, em vez de simplesmente não ter botão: ferramenta escondida sem
          explicação é o pior jeito de esconder. */}
      {canPublish ? (
        formOpen ? (
          <div className={CARD}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              {header}
            </p>
            <input
              className={`${INPUT} mt-3`}
              placeholder={t("listTitlePlaceholder", "O que você oferece?")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className={`${INPUT} mt-3 h-20 py-2`}
              placeholder={t("listDescPlaceholder", "Detalhes (opcional)")}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className={INPUT}
                placeholder={t("listPricePlaceholder", "Preço em R$ (opcional)")}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <input
                className={INPUT}
                placeholder={t("listContactPlaceholder", "Como te chamar (opcional)")}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
                style={{ background: accent }}
                disabled={busy || !title.trim()}
                onClick={submit}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{" "}
                {t("listPublish", "Publicar")}
              </button>
              <button type="button" className={BTN_GHOST} onClick={() => setFormOpen(false)}>
                {t("listCancel", "Cancelar")}
              </button>
            </div>

            {needsSlot && quota && (
              <div className="mt-4 border-2 border-[#F2B705]/40 bg-[#1D1810] p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-[#F2B705]">
                  <Ticket className="h-4 w-4" /> {t("listSlotTitle", "Vaga extra de anúncio")}
                </p>
                <p className="mt-1 text-xs text-[#9A938A]">
                  {t(
                    "listSlotDesc",
                    "Compre uma vaga para manter mais um anúncio ativo. A vaga é sua para sempre e volta a ficar livre quando você arquiva um anúncio."
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quota.price_cents > 0 && (
                    <button type="button" className={BTN_GHOST} disabled={busy} onClick={buySlotMoney}>
                      {money(quota.price_cents)}
                    </button>
                  )}
                  {quota.price_polens > 0 && (
                    <button type="button" className={BTN_GHOST} disabled={busy} onClick={buySlotPolens}>
                      {t("listSlotPolens", "{n} Poléns").replace("{n}", String(quota.price_polens))}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
              {myQuota
                ? t("listQuotaLine", "{used} de {total} anúncios ativos")
                    .replace("{used}", String(myQuota.used))
                    .replace("{total}", String(myQuota.total))
                : header}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              style={{ background: accent }}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" /> {header}
            </button>
          </div>
        )
      ) : (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3 text-xs font-bold text-[#9A938A]">
          {t("listResidentToPublish", "Confirme seu endereço para anunciar aqui.")}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
          <Icon className="mx-auto h-10 w-10" style={{ color: accent }} />
          <p className="mt-4 text-sm text-[#9A938A]">{emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((l) => {
            const mine = !!currentUserId && String(l.id_user) === String(currentUserId)
            return (
              <div key={l.id_listing} className={CARD}>
                {l.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.image_url}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-40 w-full border-2 border-[#0B0B0D] object-cover"
                  />
                )}
                <p className="fl-display text-lg leading-tight text-[#F5F1E8]">{l.title}</p>
                {l.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#F5F1E8]/80">{l.description}</p>
                )}
                {l.price_cents != null && (
                  <p className="mt-2 text-sm font-extrabold" style={{ color: accent }}>
                    {money(l.price_cents)}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-[#9A938A]">
                  @{l.owner_username}
                  {l.contact ? ` · ${l.contact}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Comprar só existe quando há PREÇO e o anúncio é de OUTRA
                      pessoa: sem preço não há o que cobrar (o anúncio é convite
                      para conversar, e o backend recusa), e comprar de si mesmo
                      é um pedido que nasce para ser cancelado. */}
                  {canBuy && !mine && l.price_cents != null && l.price_cents > 0 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                      style={{ background: accent }}
                      onClick={() => openBuy(l)}
                    >
                      <ShoppingCart className="h-3 w-3" /> {t("listBuy", "Comprar")}
                    </button>
                  )}
                  {(mine || isAdmin) && l.status === "active" && (
                    <button type="button" className={BTN_GHOST} onClick={() => archive(l.id_listing)}>
                      <Trash2 className="h-3 w-3" /> {t("listArchive", "Arquivar")}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ⚠️ O MODAL VAI POR PORTAL NO BODY e é `z-[100]`. A página da
          comunidade tem cards ROTACIONADOS, e ancestral com `transform` deixa
          de ser a janela para um filho `fixed`: preso no fluxo, ele abriria
          dentro de um card da vitrine. */}
      {buying &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fl-sharp fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            onClick={() => !buyBusy && setBuying(null)}
          >
            <div
              className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                    {t("buyTitle", "Comprar do vizinho")}
                  </p>
                  <p className="fl-display mt-1 truncate text-2xl leading-tight">{buying.title}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
                  onClick={() => !buyBusy && setBuying(null)}
                  aria-label={t("listCancel", "Cancelar")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm font-extrabold" style={{ color: accent }}>
                {money(buying.price_cents || 0)}
              </p>

              {/* ── o add-on "+R$3" ─────────────────────────────────────────
                  O Alex: "se precisar que alguém busque na recepção, ou leve do
                  apartamento que vendeu ao que comprou, quem comprou pode pagar
                  R$3 a mais e esses R$3 ficam disponíveis para alguém buscar". */}
              {deliveryOptions.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                    {t("buyDeliveryTitle", "Precisa que alguém traga?")}
                  </p>
                  <p className="mt-1 text-[11px] text-[#9A938A]">
                    {t(
                      "buyDeliveryHint",
                      "A gente soma ao seu pagamento e abre um chamado aqui na comunidade. Qualquer vizinho pode pegar e receber por isso."
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPickedDelivery("")}
                      className="border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                      style={
                        pickedDelivery === ""
                          ? { background: accent, color: "#0B0B0D" }
                          : { background: "#1D1810", color: "#F5F1E8" }
                      }
                    >
                      {t("buyNoDelivery", "Eu busco")}
                    </button>
                    {deliveryOptions.map((d) => (
                      <button
                        key={d.kind}
                        type="button"
                        onClick={() => setPickedDelivery(d.kind)}
                        className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                        style={
                          pickedDelivery === d.kind
                            ? { background: accent, color: "#0B0B0D" }
                            : { background: "#1D1810", color: "#F5F1E8" }
                        }
                      >
                        <Truck className="h-3 w-3" /> {d.label} +{money(d.price_cents)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                  {t("buyTotal", "Total")}
                </p>
                <p className="fl-display text-2xl leading-none" style={{ color: accent }}>
                  {money(buyTotal)}
                </p>
              </div>

              {/* A promessa que faz a pessoa clicar: o dinheiro fica retido. */}
              <p className="mt-3 text-[11px] text-[#9A938A]">
                {t(
                  "buyHoldbackNote",
                  "O pagamento fica retido até você confirmar que recebeu. Se algo der errado, dá para contestar."
                )}
              </p>

              {buyMsg && (
                <p className="mt-3 border-2 border-[#0B0B0D] bg-[#0B0B0D]/40 px-3 py-2 text-xs font-bold">
                  {buyMsg}
                </p>
              )}

              <button
                type="button"
                disabled={buyBusy}
                onClick={confirmBuy}
                className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
                style={{ background: accent }}
              >
                {buyBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {t("buyCta", "Pagar {v}").replace("{v}", money(buyTotal))}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
