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
  /** Ate quando a mensalidade esta paga. `null` = rascunho, nunca pago. */
  paid_until: string | null
  /** O backend ja resolve `status ativo E dentro da vigencia` — nao refazer a
      conta aqui: duas respostas para "esta no ar?" divergem na primeira
      mudanca de regra, e o vizinho veria um estado e o dono outro. */
  is_live: boolean
  /** Assinatura no cartao. `null` = pago por Pix/Polens, sem recorrencia. */
  subscription_ref: string | null
  subscription_status: "active" | "past_due" | "canceled" | null
  owner_username: string | null
  owner_name: string | null
  owner_avatar: string | null
}

type QuotaBlock = {
  /** Anuncios do morador que estao NO AR (pagos e vigentes). */
  live: number
  /** Escritos e parados: rascunho nunca pago ou mensalidade vencida. */
  unpaid: number
  /** Cortesia opcional. Hoje vale 0 — a vitrine cobra desde o primeiro. */
  free: number
}
/** Os tipos de entrega que o add-on "+R$3" pode somar ao pedido. */
type DeliveryOption = {
  kind: string
  label: string
  price_cents: number
}

type QuotaPayload = {
  quota: Partial<Record<ListingKind, QuotaBlock>>
  /** Mensalidade do anuncio (mig 252). */
  monthly_cents: number
  monthly_polens: number
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
  /** Os anuncios do PROPRIO dono, inclusive os parados (rascunho/vencido). */
  const [mine, setMine] = useState<Listing[]>([])
  /** O anuncio que esta esperando pagamento, com a escolha cartao x Pix. */
  const [paying, setPaying] = useState<Listing | null>(null)
  const [quota, setQuota] = useState<QuotaPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
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
      // ⚠️ DUAS LISTAS, E ELAS RESPONDEM PERGUNTAS DIFERENTES: a publica so
      // traz o que esta PAGO (e o que os vizinhos veem), e a `mine=1` traz
      // tambem os rascunhos e vencidos do proprio dono — sem ela, o anuncio
      // que ele acabou de escrever sumiria da tela e ele nao teria por onde
      // pagar.
      const [l, q, m] = await Promise.all([
        fetch(`/api/communities/${communityId}/listings?kind=${kind}`, { headers: authHeaders() }),
        fetch(`/api/communities/${communityId}/listings/quota?kind=${kind}`, {
          headers: authHeaders(),
        }),
        canPublish
          ? fetch(`/api/communities/${communityId}/listings?kind=${kind}&mine=1`, {
              headers: authHeaders(),
            })
          : Promise.resolve(null),
      ])
      const ld = await l.json()
      const qd = await q.json()
      if (l.ok) setItems(Array.isArray(ld.listings) ? ld.listings : [])
      if (q.ok) setQuota(qd)
      if (m && m.ok) {
        const md = await m.json()
        setMine(Array.isArray(md.listings) ? md.listings : [])
      }
    } catch {
      /* silencioso: o estado vazio já diz que não há nada para mostrar */
    } finally {
      setLoading(false)
    }
  }, [communityId, kind, canPublish])

  useEffect(() => {
    load()
  }, [load])

  const myQuota = quota?.quota?.[kind] || null

  /**
   * Os anuncios do dono que NAO estao na vitrine: rascunho nunca pago ou
   * mensalidade vencida.
   *
   * ⚠️ Quem decide e o `is_live` do backend, nunca uma conta de data feita
   * aqui: o relogio do navegador pode estar errado, e duas respostas para
   * "esta no ar?" divergiriam entre o que o dono ve e o que o vizinho ve.
   */
  const parados = useMemo(
    () => mine.filter((l) => l.status === "active" && !l.is_live),
    [mine]
  )

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    setMsg(null)
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
      if (!res.ok) throw new Error(data.error || t("listError", "Não foi possível publicar."))
      setTitle("")
      setDesc("")
      setPrice("")
      setContact("")
      setFormOpen(false)
      await load()
      // ⚠️ O ANUNCIO NASCE FORA DA VITRINE. Sem abrir o pagamento aqui, a
      // pessoa apertaria "Publicar", veria a tela se fechar e NADA apareceria
      // para os vizinhos — sem erro nenhum, que e o pior jeito de cobrar.
      if (data.needs_payment && data.listing) setPaying(data.listing as Listing)
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

  /**
   * Poe o anuncio no ar.
   *
   * ⚠️ `card` cria uma ASSINATURA que renova sozinha; `pix` compra UM MES e
   * a renovacao volta a ser um gesto da pessoa. Recorrencia em Pix nao existe
   * no Mercado Pago — e por isso que os dois nao sao a mesma coisa com um
   * icone diferente.
   */
  const payListing = async (l: Listing, method: "card" | "pix") => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/communities/${communityId}/listings/${l.id_listing}/billing/checkout`,
        { method: "POST", headers: authHeaders(), body: JSON.stringify({ method }) }
      )
      const data = await res.json()
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error || t("listBillError", "Não foi possível iniciar o pagamento."))
      }
      window.location.href = data.checkout_url
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : t("listBillError", "Não foi possível iniciar o pagamento.")
      )
      setBusy(false)
    }
  }

  const payListingPolens = async (l: Listing) => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/communities/${communityId}/listings/${l.id_listing}/billing/polens`,
        { method: "POST", headers: authHeaders(), body: JSON.stringify({ months: 1 }) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("listBillError", "Não foi possível pagar o anúncio."))
      setMsg(t("listBillPaid", "Anúncio no ar."))
      setPaying(null)
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("listBillError", "Não foi possível pagar o anúncio."))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Solta a renovacao automatica.
   *
   * ⚠️ NAO TIRA O ANUNCIO DO AR — o mes ja pago e de quem pagou, e o texto
   * do botao diz isso. Prometer "cancelar" e tirar na hora seria cobrar o mes
   * e entregar meio.
   */
  const cancelBilling = async (l: Listing) => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities/${communityId}/listings/${l.id_listing}/billing`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("listBillError", "Não foi possível cancelar."))
      setMsg(data.message || t("listBillCanceled", "Renovação cancelada."))
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("listBillError", "Não foi possível cancelar."))
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

            {quota && (
              <p className="mt-3 flex items-center gap-2 text-[11px] text-[#9A938A]">
                <Ticket className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {t("listBillHint", "Publicar custa {price} por mês por anúncio.").replace(
                  "{price}",
                  money(quota.monthly_cents)
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3">
            {/* ⚠️ O CONTADOR "0 de 2" MORREU COM A COTA (mig 252): nao ha teto,
                entao um "X de Y" nao tem Y. O que a pessoa precisa saber agora
                e quantos dos anuncios DELA estao no ar e quantos estao parados
                esperando pagamento. */}
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
              {myQuota
                ? t("listLiveLine", "{n} no ar").replace("{n}", String(myQuota.live)) +
                  (myQuota.unpaid > 0
                    ? " · " +
                      t("listUnpaidLine", "{n} esperando pagamento").replace(
                        "{n}",
                        String(myQuota.unpaid)
                      )
                    : "")
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

      {/* ⚠️ OS ANUNCIOS PARADOS PRECISAM DE UMA PORTA, e ela nao pode ser a
          vitrine: la eles nao aparecem (e o que "a vitrine cobra" significa).
          Sem este bloco, quem escreveu um anuncio e nao pagou nao teria como
          voltar a ele — o texto ficaria preso no banco, invisivel ate para o
          dono, e a cobranca pareceria ter engolido o trabalho dele. */}
      {canPublish && parados.length > 0 && (
        <div className="border-2 border-[#F2B705]/40 bg-[#1D1810] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[#F2B705]">
            <Ticket className="h-4 w-4" />{" "}
            {t("listParkedTitle", "Seus anúncios fora do ar")}
          </p>
          <p className="mt-1 text-xs text-[#9A938A]">
            {t(
              "listParkedDesc",
              "Eles estão guardados e ninguém os vê. Pague a mensalidade para voltarem à vitrine."
            )}
          </p>
          <div className="mt-3 space-y-2">
            {parados.map((l) => (
              <div
                key={l.id_listing}
                className="flex flex-wrap items-center justify-between gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-[#F5F1E8]">{l.title}</span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                    style={{ background: accent }}
                    disabled={busy}
                    onClick={() => setPaying(l)}
                  >
                    {t("listBillPay", "Pôr no ar")}
                  </button>
                  <button
                    type="button"
                    className={BTN_GHOST}
                    disabled={busy}
                    onClick={() => archive(l.id_listing)}
                    aria-label={t("listArchive", "Arquivar")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
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
            // ⚠️ `souDono`, e nao `mine`: `mine` agora e o ESTADO com a lista do
            // proprio dono. Reusar o nome aqui sombrearia a lista inteira e a
            // secao de anuncios parados leria o booleano de uma linha.
            const souDono = !!currentUserId && String(l.id_user) === String(currentUserId)
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
                {souDono && l.paid_until && (
                  <p className="mt-1 text-[11px] text-[#9A938A]">
                    {(l.subscription_ref && l.subscription_status === "active"
                      ? t("listBillRenews", "Renova em {date}")
                      : t("listBillUntil", "No ar até {date}")
                    ).replace("{date}", new Date(l.paid_until).toLocaleDateString(locale))}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Comprar só existe quando há PREÇO e o anúncio é de OUTRA
                      pessoa: sem preço não há o que cobrar (o anúncio é convite
                      para conversar, e o backend recusa), e comprar de si mesmo
                      é um pedido que nasce para ser cancelado. */}
                  {canBuy && !souDono && l.price_cents != null && l.price_cents > 0 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                      style={{ background: accent }}
                      onClick={() => openBuy(l)}
                    >
                      <ShoppingCart className="h-3 w-3" /> {t("listBuy", "Comprar")}
                    </button>
                  )}
                  {(souDono || isAdmin) && l.status === "active" && (
                    <button type="button" className={BTN_GHOST} onClick={() => archive(l.id_listing)}>
                      <Trash2 className="h-3 w-3" /> {t("listArchive", "Arquivar")}
                    </button>
                  )}
                  {/* ⚠️ SO O DONO VE A COBRANCA. Ate quando esta pago e se ha
                      assinatura viva sao assunto dele — o vizinho so precisa
                      saber que o anuncio existe. */}
                  {souDono && l.subscription_ref && l.subscription_status === "active" && (
                    <button
                      type="button"
                      className={BTN_GHOST}
                      disabled={busy}
                      onClick={() => cancelBilling(l)}
                    >
                      {t("listBillCancel", "Cancelar renovação")}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ⚠️ ESTE MODAL TAMBEM VAI POR PORTAL, pelo mesmo motivo do de compra:
          a pagina tem cards ROTACIONADOS, e ancestral com `transform` deixa de
          ser a janela para um filho `fixed` — preso no fluxo ele abriria
          DENTRO de um card. */}
      {paying &&
        quota &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fl-sharp fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            onClick={() => !busy && setPaying(null)}
          >
            <div
              className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                    {t("listBillTitle", "Pôr o anúncio no ar")}
                  </p>
                  <p className="fl-display mt-1 truncate text-2xl leading-tight">{paying.title}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
                  onClick={() => !busy && setPaying(null)}
                  aria-label={t("listCancel", "Cancelar")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm text-[#F5F1E8]/80">
                {t("listBillPrice", "{price} por mês enquanto o anúncio estiver na vitrine.").replace(
                  "{price}",
                  money(quota.monthly_cents)
                )}
              </p>

              {/* ⚠️ O CARTAO VEM PRIMEIRO E CHEIO: e o unico que renova sozinho,
                  e e o caminho que o Alex pediu como natural. O Pix fica ao
                  lado, apagado, para quem nao tem cartao. */}
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
                  style={{ background: accent }}
                  disabled={busy}
                  onClick={() => payListing(paying, "card")}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("listBillCard", "Assinar no cartão")}
                </button>
                <p className="text-[11px] text-[#9A938A]">
                  {t("listBillCardHint", "Renova sozinho todo mês. Dá para cancelar quando quiser.")}
                </p>

                <button
                  type="button"
                  className={BTN_GHOST + " w-full justify-center py-2.5"}
                  disabled={busy}
                  onClick={() => payListing(paying, "pix")}
                >
                  {t("listBillPix", "Pagar um mês no Pix")}
                </button>
                {/* ⚠️ O AVISO NAO E DETALHE: no Pix nao existe recorrencia, entao
                    a pessoa PRECISA saber que vai ter que voltar — descobrir
                    isso quando o anuncio sumir e a pior hora. */}
                <p className="text-[11px] text-[#9A938A]">
                  {t(
                    "listBillPixHint",
                    "Vale 30 dias. Como o Pix não tem cobrança automática, você renova quando quiser continuar."
                  )}
                </p>

                {quota.monthly_polens > 0 && (
                  <button
                    type="button"
                    className={BTN_GHOST + " w-full justify-center py-2.5"}
                    disabled={busy}
                    onClick={() => payListingPolens(paying)}
                  >
                    {t("listBillPolens", "Usar {n} Poléns").replace(
                      "{n}",
                      String(quota.monthly_polens)
                    )}
                  </button>
                )}
              </div>

              {msg && <p className="mt-3 text-xs text-[#F2B705]">{msg}</p>}
            </div>
          </div>,
          document.body
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
