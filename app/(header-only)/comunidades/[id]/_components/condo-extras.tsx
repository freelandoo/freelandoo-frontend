"use client"

// Página do CONDOMÍNIO (migs 196-199). Modalidade de comunidade com regras
// próprias, então tem tela própria em vez de espremer tudo na da comunidade.
//
// Privacidade guiando a UI: quem não é morador confirmado não vê mural, quadro
// de anúncios, enquetes nem lista de vizinhos — vê a portaria (CondoResidence).
// Unidade/vaga de terceiro só aparece na aba de administração.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Building2, Loader2, MapPin, Megaphone, Plus, ShieldCheck,
  ShoppingBag, Trash2, Users, Vote, Wrench, Check, X, KeyRound, Car, Ticket,
} from "lucide-react"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

/* --------------------------------- tipos --------------------------------- */

export type CondoCommunity = {
  id_profile: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  // Opcional: o backend só devolve a contagem para quem é de dentro.
  member_count?: number
  kind?: "common" | "academy" | "condo"
  address?: {
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    cep?: string | null
    municipio?: string | null
    estado?: string | null
  } | null
  address_is_full?: boolean
  viewer_is_member?: boolean
  viewer_is_admin?: boolean
  viewer_is_resident?: boolean
  viewer_has_pending_claim?: boolean
  viewer_units?: { id_unit: number; number: string; block_name: string | null }[]
  viewer_parking?: { id_spot: number; code: string }[]
}

type Block = { id_block: number; name: string; units_count: number }
type Unit = {
  id_unit: number
  id_block: number | null
  number: string
  block_name: string | null
  is_taken: boolean
  parking_count: number
  holder_username?: string | null
  holder_name?: string | null
}
type Spot = {
  id_spot: number
  code: string
  id_unit: number | null
  unit_number: string | null
  block_name: string | null
  is_taken: boolean
  holder_username?: string | null
}
type Structure = {
  blocks: Block[]
  units: Unit[]
  parking: Spot[]
  viewer: {
    is_admin: boolean
    is_resident: boolean
    has_pending_claim: boolean
    units: { id_unit: number; number: string; block_name: string | null }[]
    parking: { id_spot: number; code: string; id_unit: number | null }[]
  }
}
type Notice = {
  id_notice: number
  scope: "general" | "unit" | "parking"
  title: string | null
  body: string
  is_pinned: boolean
  created_at: string
  id_author: string
  author_username: string | null
  author_name: string | null
  unit_number: string | null
  block_name: string | null
  spot_code: string | null
  is_read: boolean
}
type Listing = {
  id_listing: number
  id_user: string
  kind: "service" | "product"
  title: string
  description: string | null
  price_cents: number | null
  contact: string | null
  status: "active" | "archived"
  created_at: string
  owner_username: string | null
  owner_name: string | null
}
type QuotaBlock = { free: number; purchased: number; used: number; total: number; remaining: number }
type Quota = {
  quota: { service?: QuotaBlock; product?: QuotaBlock }
  price_cents: number
  price_polens: number
}
type PollOption = { id_option: number; label: string; votes?: number }
type Poll = {
  id_poll: number
  question: string
  description: string | null
  status: string
  is_open: boolean
  closes_at: string | null
  created_at: string
  votes_total: number
  my_option: number | null
  options: PollOption[]
  author_username: string | null
}
type Claim = {
  id_claim: number
  id_user: string
  target_type: "unit" | "parking"
  status: string
  created_at: string
  claimant_username: string | null
  claimant_name: string | null
  unit_number: string | null
  block_name: string | null
  spot_code: string | null
  current_holder_username: string | null
}
type Resident = {
  id_user: string
  role: "leader" | "vice" | "member"
  user_name: string | null
  user_username: string | null
  is_resident: boolean
  top_profile_avatar: string | null
  units?: { id_unit: number; number: string; block_name: string | null }[]
}

type Tab = "mural" | "services" | "products" | "polls" | "residents" | "admin"

/* -------------------------------- helpers -------------------------------- */

const CARD = "border-2 border-[#0B0B0D] bg-[#15120E] p-4"
const INPUT =
  "h-10 w-full border-2 border-[#0B0B0D] bg-[#0B0B0D]/40 px-3 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/35 outline-none focus:border-[#F2B705]/60"
const BTN =
  "inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
const BTN_GHOST =
  "inline-flex items-center gap-2 border-2 border-[#F5F1E8]/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]"

function authHeaders(): Record<string, string> {
  const tk = getToken()
  return tk ? { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

/* ------------------------------- componente ------------------------------ */

export function CondoExtras({
  communityId,
  isAdmin,
  isResident,
  onReload,
}: {
  communityId: string
  isAdmin: boolean
  isResident: boolean
  onReload: () => void
}) {
  const t = useTranslations("Condo")
  const locale = useLocale()
  const id = communityId

  const [tab, setTab] = useState<Tab>("mural")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [structure, setStructure] = useState<Structure | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [unreadNotices, setUnreadNotices] = useState(0)
  const [services, setServices] = useState<Listing[]>([])
  const [products, setProducts] = useState<Listing[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [residents, setResidents] = useState<Resident[]>([])

  // Papéis vêm de FORA (da casca da comunidade), e não de `structure`: a
  // portaria e a planta moram no CondoResidence agora, e duas fontes para a
  // mesma pergunta acabariam divergindo enquanto uma delas ainda carrega.
  const canSeeInside = isResident || isAdmin

  const money = useCallback(
    (cents: number) => (Number(cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )
  const date = useCallback(
    (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    [locale]
  )

  /* ------------------------------ carregamento ---------------------------- */

  const loadStructure = useCallback(async () => {
    try {
      const res = await fetch(`/api/condos/${id}/structure`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setStructure(data)
    } catch {
      /* silencioso: o cartão de reivindicação cobre o estado sem estrutura */
    }
  }, [id])

  const loadNotices = useCallback(async () => {
    try {
      const res = await fetch(`/api/condos/${id}/notices`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setNotices(Array.isArray(data.notices) ? data.notices : [])
        setUnreadNotices(Number(data.unread_count) || 0)
      }
    } catch {
      /* silencioso */
    }
  }, [id])

  const loadListings = useCallback(async () => {
    try {
      const [s, p, q] = await Promise.all([
        fetch(`/api/condos/${id}/listings?kind=service`, { headers: authHeaders() }),
        fetch(`/api/condos/${id}/listings?kind=product`, { headers: authHeaders() }),
        fetch(`/api/condos/${id}/listings/quota`, { headers: authHeaders() }),
      ])
      const sd = await s.json()
      const pd = await p.json()
      const qd = await q.json()
      if (s.ok) setServices(Array.isArray(sd.listings) ? sd.listings : [])
      if (p.ok) setProducts(Array.isArray(pd.listings) ? pd.listings : [])
      if (q.ok) setQuota(qd)
    } catch {
      /* silencioso */
    }
  }, [id])

  const loadPolls = useCallback(async () => {
    try {
      const res = await fetch(`/api/condos/${id}/polls`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setPolls(Array.isArray(data.polls) ? data.polls : [])
    } catch {
      /* silencioso */
    }
  }, [id])

  const loadResidents = useCallback(async () => {
    try {
      const res = await fetch(`/api/communities/${id}/members`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setResidents(Array.isArray(data.members) ? data.members : [])
    } catch {
      /* silencioso */
    }
  }, [id])

  useEffect(() => { loadStructure() }, [loadStructure])
  useEffect(() => {
    if (!canSeeInside) return
    loadNotices()
    loadListings()
    loadPolls()
    loadResidents()
  }, [canSeeInside, loadNotices, loadListings, loadPolls, loadResidents])

  /* ------------------------------- vaga ----------------------------------- */
  // A reivindicação de APARTAMENTO saiu daqui (migs 205/206): virou a portaria
  // do CondoResidence, onde o morador escolhe da planta e o apartamento aceita
  // mais de uma pessoa. A VAGA continua aqui — vaga tem um dono, não moradores.

  const [spotCode, setSpotCode] = useState("")
  const submitSpotClaim = async () => {
    if (!spotCode.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/condos/${id}/claims/parking`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code: spotCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("claimError", "Não foi possível reivindicar."))
      setMsg(
        data.status === "approved"
          ? t("spotApproved", "Vaga vinculada à sua unidade.")
          : t("spotPending", "Esta vaga já tem responsável. A administração vai decidir.")
      )
      setSpotCode("")
      await loadStructure()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("claimError", "Não foi possível reivindicar."))
    } finally {
      setBusy(false)
    }
  }

  /* --------------------------------- avisos ------------------------------- */

  const [noticeScope, setNoticeScope] = useState<"general" | "unit" | "parking">("general")
  const [noticeTargetUnit, setNoticeTargetUnit] = useState("")
  const [noticeTargetSpot, setNoticeTargetSpot] = useState("")
  const [noticeTitle, setNoticeTitle] = useState("")
  const [noticeBody, setNoticeBody] = useState("")

  const submitNotice = async () => {
    if (!noticeBody.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/condos/${id}/notices`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          scope: noticeScope,
          title: noticeTitle.trim() || null,
          body: noticeBody.trim(),
          id_unit: noticeScope === "unit" ? Number(noticeTargetUnit) || null : null,
          id_spot: noticeScope === "parking" ? Number(noticeTargetSpot) || null : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("noticeError", "Não foi possível publicar o aviso."))
      setNoticeTitle("")
      setNoticeBody("")
      setMsg(
        data.delivered_to_holder
          ? t("noticeDelivered", "Aviso enviado ao responsável.")
          : noticeScope === "general"
            ? t("noticePublished", "Aviso publicado no mural.")
            : t("noticeNoHolder", "Aviso registrado — a unidade ainda não tem responsável.")
      )
      await loadNotices()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("noticeError", "Não foi possível publicar o aviso."))
    } finally {
      setBusy(false)
    }
  }

  const deleteNotice = async (idNotice: number) => {
    setNotices((prev) => prev.filter((n) => n.id_notice !== idNotice))
    try {
      await fetch(`/api/condos/${id}/notices/${idNotice}`, { method: "DELETE", headers: authHeaders() })
    } catch {
      /* já removido otimisticamente */
    }
  }

  const markRead = async (idNotice: number) => {
    setNotices((prev) => prev.map((n) => (n.id_notice === idNotice ? { ...n, is_read: true } : n)))
    setUnreadNotices((n) => Math.max(0, n - 1))
    try {
      await fetch(`/api/condos/${id}/notices/${idNotice}/read`, { method: "POST", headers: authHeaders() })
    } catch {
      /* silencioso */
    }
  }

  /* -------------------------------- anúncios ------------------------------ */

  const [listTitle, setListTitle] = useState("")
  const [listDesc, setListDesc] = useState("")
  const [listPrice, setListPrice] = useState("")
  const [listContact, setListContact] = useState("")
  const [needsSlotFor, setNeedsSlotFor] = useState<"service" | "product" | null>(null)

  const currentKind: "service" | "product" = tab === "products" ? "product" : "service"
  const currentQuota = quota?.quota?.[currentKind]

  const submitListing = async () => {
    if (!listTitle.trim()) return
    setBusy(true)
    setMsg(null)
    setNeedsSlotFor(null)
    try {
      const res = await fetch(`/api/condos/${id}/listings`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind: currentKind,
          title: listTitle.trim(),
          description: listDesc.trim() || null,
          contact: listContact.trim() || null,
          price_cents: listPrice.trim() ? Math.round(Number(listPrice.replace(",", ".")) * 100) : null,
        }),
      })
      const data = await res.json()
      if (res.status === 402 || data.needs_slot) {
        setNeedsSlotFor(currentKind)
        setMsg(data.error || t("quotaReached", "Limite de anúncios ativos atingido."))
        return
      }
      if (!res.ok) throw new Error(data.error || t("listingError", "Não foi possível publicar."))
      setListTitle("")
      setListDesc("")
      setListPrice("")
      setListContact("")
      await loadListings()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("listingError", "Não foi possível publicar."))
    } finally {
      setBusy(false)
    }
  }

  const archiveListing = async (idListing: number) => {
    try {
      await fetch(`/api/condos/${id}/listings/${idListing}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "archived" }),
      })
      await loadListings()
    } catch {
      /* silencioso */
    }
  }

  const buySlotMoney = async (kind: "service" | "product") => {
    setBusy(true)
    try {
      const res = await fetch(`/api/condos/${id}/listing-slots/checkout`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ kind, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || t("slotError", "Não foi possível iniciar o pagamento."))
      window.location.href = data.checkout_url
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("slotError", "Não foi possível iniciar o pagamento."))
      setBusy(false)
    }
  }

  const buySlotPolens = async (kind: "service" | "product") => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/condos/${id}/listing-slots/polens`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ kind, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("slotError", "Não foi possível comprar a vaga."))
      setMsg(t("slotBoughtPolens", "Vaga liberada."))
      setNeedsSlotFor(null)
      await loadListings()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("slotError", "Não foi possível comprar a vaga."))
    } finally {
      setBusy(false)
    }
  }

  /* -------------------------------- enquetes ------------------------------ */

  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])
  const [pollFormOpen, setPollFormOpen] = useState(false)

  const submitPoll = async () => {
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (!pollQuestion.trim() || opts.length < 2) {
      setMsg(t("pollNeedsOptions", "Escreva a pergunta e pelo menos duas opções."))
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/condos/${id}/polls`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ question: pollQuestion.trim(), options: opts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("pollError", "Não foi possível criar a enquete."))
      setPollQuestion("")
      setPollOptions(["", ""])
      setPollFormOpen(false)
      await loadPolls()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("pollError", "Não foi possível criar a enquete."))
    } finally {
      setBusy(false)
    }
  }

  const votePoll = async (idPoll: number, idOption: number) => {
    setPolls((prev) => prev.map((p) => (p.id_poll === idPoll ? { ...p, my_option: idOption } : p)))
    try {
      await fetch(`/api/condos/${id}/polls/${idPoll}/vote`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ id_option: idOption }),
      })
      await loadPolls()
    } catch {
      /* silencioso */
    }
  }

  const closePoll = async (idPoll: number) => {
    try {
      await fetch(`/api/condos/${id}/polls/${idPoll}/close`, { method: "POST", headers: authHeaders() })
      await loadPolls()
    } catch {
      /* silencioso */
    }
  }

  /* ------------------------------ administração --------------------------- */

  /* --------------------------------- render ------------------------------- */

  const tabs: { key: Tab; label: string; icon: typeof Megaphone; badge?: number }[] = [
    { key: "mural", label: t("tabMural", "Mural"), icon: Megaphone, badge: unreadNotices },
    { key: "services", label: t("tabServices", "Serviços"), icon: Wrench },
    { key: "products", label: t("tabProducts", "Produtos"), icon: ShoppingBag },
    { key: "polls", label: t("tabPolls", "Enquetes"), icon: Vote },
    { key: "residents", label: t("tabResidents", "Moradores"), icon: Users },
    ...(isAdmin ? [{ key: "admin" as Tab, label: t("tabAdmin", "Administração"), icon: ShieldCheck }] : []),
  ]

  // Sem moldura de página: isto é uma SEÇÃO dentro da casca padrão de
  // comunidade. Capa, nome, endereço e o botão de entrar são de lá — repetir
  // aqui era o que fazia o condomínio parecer outro site.
  //
  // Quem ainda não confirmou apartamento não vê nada disto: o que ele vê é a
  // portaria, renderizada pelo CondoResidence acima.
  if (!canSeeInside) return null

  return (
    <div className="fl-sharp space-y-4 text-[#F5F1E8]">
      {msg && (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs font-bold">{msg}</p>
      )}
      <div>
        <>
            {/* Abas */}
            <div className="mt-6 flex flex-wrap gap-1 border-b-2 border-[#0B0B0D]">
              {tabs.map((tb) => {
                const Icon = tb.icon
                const active = tab === tb.key
                return (
                  <button
                    key={tb.key}
                    type="button"
                    onClick={() => setTab(tb.key)}
                    className="-mb-0.5 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
                    style={{ borderBottom: active ? "4px solid #F2B705" : "4px solid transparent", opacity: active ? 1 : 0.55 }}
                  >
                    <Icon className="h-4 w-4" /> {tb.label}
                    {tb.badge ? <span className="bg-[#F2B705] px-1 text-[10px] text-[#0B0B0D]">{tb.badge}</span> : null}
                  </button>
                )
              })}
            </div>

            {/* MURAL / AVISOS */}
            {tab === "mural" && (
              <div className="mt-5 space-y-4">
                <div className={CARD}>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("newNotice", "Novo aviso")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {([
                      ["general", t("scopeGeneral", "Geral")],
                      ["unit", t("scopeUnit", "Para um apartamento")],
                      ["parking", t("scopeParking", "Para uma vaga")],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNoticeScope(key)}
                        className="border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                        style={{
                          borderColor: noticeScope === key ? "#F2B705" : "rgba(245,241,232,0.15)",
                          color: noticeScope === key ? "#F2B705" : "rgba(245,241,232,0.6)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {noticeScope === "unit" && (
                    <select className={`${INPUT} mt-3`} value={noticeTargetUnit} onChange={(e) => setNoticeTargetUnit(e.target.value)}>
                      <option value="">{t("pickUnit", "Escolha o apartamento")}</option>
                      {(structure?.units || []).map((u) => (
                        <option key={u.id_unit} value={u.id_unit}>
                          {[u.block_name, u.number].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                    </select>
                  )}
                  {noticeScope === "parking" && (
                    <select className={`${INPUT} mt-3`} value={noticeTargetSpot} onChange={(e) => setNoticeTargetSpot(e.target.value)}>
                      <option value="">{t("pickSpot", "Escolha a vaga")}</option>
                      {(structure?.parking || []).map((s) => (
                        <option key={s.id_spot} value={s.id_spot}>{s.code}</option>
                      ))}
                    </select>
                  )}
                  <input className={`${INPUT} mt-3`} placeholder={t("noticeTitlePlaceholder", "Título (opcional)")} value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} />
                  <textarea
                    className={`${INPUT} mt-3 h-24 py-2`}
                    placeholder={t("noticeBodyPlaceholder", "Escreva o aviso...")}
                    value={noticeBody}
                    maxLength={2000}
                    onChange={(e) => setNoticeBody(e.target.value)}
                  />
                  <button type="button" className={`${BTN} mt-3`} disabled={busy || !noticeBody.trim()} onClick={submitNotice}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} {t("publish", "Publicar")}
                  </button>
                </div>

                {notices.length === 0 ? (
                  <p className="px-1 py-8 text-center text-sm text-[#9A938A]">{t("noNotices", "Nenhum aviso ainda.")}</p>
                ) : (
                  notices.map((n) => (
                    <div key={n.id_notice} className={CARD}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em]"
                            style={{
                              background: n.scope === "general" ? "#1D1810" : "#F2B705",
                              color: n.scope === "general" ? "#9A938A" : "#0B0B0D",
                            }}
                          >
                            {n.scope === "general"
                              ? t("scopeGeneral", "Geral")
                              : n.scope === "unit"
                                ? `${t("scopeUnitShort", "Apto")} ${[n.block_name, n.unit_number].filter(Boolean).join(" · ")}`
                                : `${t("scopeParkingShort", "Vaga")} ${n.spot_code}`}
                          </span>
                          {n.title && <p className="mt-2 fl-display text-lg leading-tight">{n.title}</p>}
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#F5F1E8]/85">{n.body}</p>
                          <p className="mt-2 text-[11px] text-[#9A938A]">
                            @{n.author_username} · {date(n.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {n.scope !== "general" && !n.is_read && (
                            <button type="button" className={BTN_GHOST} onClick={() => markRead(n.id_notice)}>
                              <Check className="h-3 w-3" /> {t("markRead", "Lido")}
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" className={BTN_GHOST} onClick={() => deleteNotice(n.id_notice)}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SERVIÇOS / PRODUTOS */}
            {(tab === "services" || tab === "products") && (
              <div className="mt-5 space-y-4">
                {currentQuota && (
                  <div className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                    {t("quotaLine", "{used} de {total} anúncios ativos")
                      .replace("{used}", String(currentQuota.used))
                      .replace("{total}", String(currentQuota.total))}
                    {currentQuota.purchased > 0 && (
                      <> · {t("quotaPurchased", "{n} vaga(s) comprada(s)").replace("{n}", String(currentQuota.purchased))}</>
                    )}
                  </div>
                )}

                <div className={CARD}>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                    {currentKind === "service" ? t("newService", "Anunciar serviço") : t("newProduct", "Anunciar produto")}
                  </p>
                  <input className={`${INPUT} mt-3`} placeholder={t("listingTitlePlaceholder", "O que você oferece?")} value={listTitle} onChange={(e) => setListTitle(e.target.value)} />
                  <textarea className={`${INPUT} mt-3 h-20 py-2`} placeholder={t("listingDescPlaceholder", "Detalhes (opcional)")} value={listDesc} onChange={(e) => setListDesc(e.target.value)} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input className={INPUT} placeholder={t("listingPricePlaceholder", "Preço em R$ (opcional)")} value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
                    <input className={INPUT} placeholder={t("listingContactPlaceholder", "Como te chamar (opcional)")} value={listContact} onChange={(e) => setListContact(e.target.value)} />
                  </div>
                  <button type="button" className={`${BTN} mt-3`} disabled={busy || !listTitle.trim()} onClick={submitListing}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("publish", "Publicar")}
                  </button>

                  {needsSlotFor === currentKind && quota && (
                    <div className="mt-4 border-2 border-[#F2B705]/40 bg-[#1D1810] p-3">
                      <p className="flex items-center gap-2 text-sm font-bold text-[#F2B705]">
                        <Ticket className="h-4 w-4" /> {t("slotTitle", "Vaga extra de anúncio")}
                      </p>
                      <p className="mt-1 text-xs text-[#9A938A]">
                        {t("slotDesc", "Compre uma vaga para manter mais um anúncio ativo. A vaga é sua para sempre e volta a ficar livre quando você arquiva um anúncio.")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quota.price_cents > 0 && (
                          <button type="button" className={BTN} disabled={busy} onClick={() => buySlotMoney(currentKind)}>
                            {money(quota.price_cents)}
                          </button>
                        )}
                        {quota.price_polens > 0 && (
                          <button type="button" className={BTN} disabled={busy} onClick={() => buySlotPolens(currentKind)}>
                            {t("slotPolens", "{n} Poléns").replace("{n}", String(quota.price_polens))}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {(currentKind === "service" ? services : products).length === 0 ? (
                  <p className="px-1 py-8 text-center text-sm text-[#9A938A]">{t("noListings", "Nada anunciado por aqui ainda.")}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(currentKind === "service" ? services : products).map((l) => (
                      <div key={l.id_listing} className={CARD}>
                        <p className="fl-display text-lg leading-tight">{l.title}</p>
                        {l.description && <p className="mt-1 whitespace-pre-wrap text-sm text-[#F5F1E8]/80">{l.description}</p>}
                        {l.price_cents != null && (
                          <p className="mt-2 text-sm font-extrabold text-[#F2B705]">{money(l.price_cents)}</p>
                        )}
                        <p className="mt-2 text-[11px] text-[#9A938A]">
                          @{l.owner_username}
                          {l.contact ? ` · ${l.contact}` : ""}
                        </p>
                        {l.status === "active" && (
                          <button type="button" className={`${BTN_GHOST} mt-3`} onClick={() => archiveListing(l.id_listing)}>
                            <Trash2 className="h-3 w-3" /> {t("archive", "Arquivar")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ENQUETES */}
            {tab === "polls" && (
              <div className="mt-5 space-y-4">
                {pollFormOpen ? (
                  <div className={CARD}>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("newPoll", "Nova enquete")}</p>
                    <input className={`${INPUT} mt-3`} placeholder={t("pollQuestionPlaceholder", "O que você quer perguntar?")} value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
                    {pollOptions.map((opt, i) => (
                      <input
                        key={i}
                        className={`${INPUT} mt-2`}
                        placeholder={t("pollOptionPlaceholder", "Opção {n}").replace("{n}", String(i + 1))}
                        value={opt}
                        onChange={(e) => setPollOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                      />
                    ))}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pollOptions.length < 10 && (
                        <button type="button" className={BTN_GHOST} onClick={() => setPollOptions((p) => [...p, ""])}>
                          <Plus className="h-3 w-3" /> {t("pollAddOption", "Opção")}
                        </button>
                      )}
                      <button type="button" className={BTN} disabled={busy} onClick={submitPoll}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />} {t("pollCreate", "Criar")}
                      </button>
                      <button type="button" className={BTN_GHOST} onClick={() => setPollFormOpen(false)}>{t("cancel", "Cancelar")}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={BTN} onClick={() => setPollFormOpen(true)}>
                    <Plus className="h-4 w-4" /> {t("newPoll", "Nova enquete")}
                  </button>
                )}

                {polls.length === 0 ? (
                  <p className="px-1 py-8 text-center text-sm text-[#9A938A]">{t("noPolls", "Nenhuma enquete ainda.")}</p>
                ) : (
                  polls.map((p) => {
                    const total = p.options.reduce((acc, o) => acc + (o.votes || 0), 0)
                    const voted = p.my_option != null
                    return (
                      <div key={p.id_poll} className={CARD}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="fl-display text-lg leading-tight">{p.question}</p>
                          {!p.is_open && (
                            <span className="shrink-0 bg-[#1D1810] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                              {t("pollClosed", "Encerrada")}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {p.options.map((o) => {
                            const pct = total > 0 ? Math.round(((o.votes || 0) / total) * 100) : 0
                            const mine = p.my_option === o.id_option
                            return (
                              <button
                                key={o.id_option}
                                type="button"
                                disabled={voted || !p.is_open}
                                onClick={() => votePoll(p.id_poll, o.id_option)}
                                className="relative w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-sm disabled:cursor-default"
                              >
                                {(voted || !p.is_open) && (
                                  <span aria-hidden className="absolute inset-y-0 left-0 bg-[#F2B705]/20" style={{ width: `${pct}%` }} />
                                )}
                                <span className="relative flex items-center justify-between gap-2">
                                  <span className={mine ? "font-extrabold text-[#F2B705]" : ""}>{o.label}</span>
                                  {(voted || !p.is_open) && <span className="text-[11px] font-bold text-[#9A938A]">{pct}%</span>}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-[#9A938A]">
                          {t("pollVotes", "{n} voto(s)").replace("{n}", String(p.votes_total))} · @{p.author_username}
                        </p>
                        {isAdmin && p.is_open && (
                          <button type="button" className={`${BTN_GHOST} mt-2`} onClick={() => closePoll(p.id_poll)}>
                            <X className="h-3 w-3" /> {t("pollClose", "Encerrar")}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* MORADORES */}
            {tab === "residents" && (
              <div className="mt-5 space-y-3">
                {!isAdmin && (
                  <p className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3 text-[11px] text-[#9A938A]">
                    {t("residentsPrivacy", "Por privacidade, o apartamento de cada vizinho só aparece para a administração.")}
                  </p>
                )}
                {residents.map((r) => (
                  <div key={r.id_user} className="flex items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{r.user_name || r.user_username}</p>
                      <p className="text-[11px] text-[#9A938A]">
                        @{r.user_username}
                        {r.role !== "member" ? ` · ${r.role === "leader" ? t("roleAdmin", "Administração") : t("roleVice", "Vice")}` : ""}
                        {!r.is_resident ? ` · ${t("notConfirmed", "sem unidade confirmada")}` : ""}
                      </p>
                      {isAdmin && r.units && r.units.length > 0 && (
                        <p className="text-[11px] font-bold text-[#F2B705]">
                          {r.units.map((u) => [u.block_name, u.number].filter(Boolean).join(" · ")).join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ADMINISTRAÇÃO */}
            {tab === "admin" && isAdmin && (
              <div className="mt-5 space-y-4">
                {/* A fila de reivindicações e o cadastro de blocos saíram
                    daqui: viraram a portaria e a planta do CondoResidence
                    (migs 205/206), logo acima nesta mesma página. Manter uma
                    segunda tela decidindo moradia seria manter o conflito E1
                    vivo — aprovar ali derrubava o morador anterior em silêncio. */}
                <div className={CARD}>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("unitsAndSpots", "Unidades e vagas")}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(structure?.units || []).map((u) => (
                      <div key={u.id_unit} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm">
                        <strong>{[u.block_name, u.number].filter(Boolean).join(" · ")}</strong>
                        <p className="text-[11px] text-[#9A938A]">
                          {u.holder_username ? `@${u.holder_username}` : t("unitFree", "livre")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(structure?.parking || []).map((s) => (
                      <div key={s.id_spot} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm">
                        <strong className="inline-flex items-center gap-1"><Car className="h-3 w-3" /> {s.code}</strong>
                        <p className="text-[11px] text-[#9A938A]">
                          {s.holder_username ? `@${s.holder_username}` : t("unitFree", "livre")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Vaga de garagem do próprio morador — fora das abas, sempre à mão. */}
            {isResident && (
              <div className={`mt-6 ${CARD}`}>
                <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <Car className="h-4 w-4" /> {t("myParking", "Minhas vagas")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(structure?.viewer.parking || []).map((s) => (
                    <span key={s.id_spot} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-xs font-bold text-[#F2B705]">{s.code}</span>
                  ))}
                  {(structure?.viewer.parking || []).length === 0 && (
                    <span className="text-xs text-[#9A938A]">{t("noParking", "Nenhuma vaga cadastrada.")}</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input className={INPUT} placeholder={t("spotPlaceholder", "Número da vaga")} value={spotCode} onChange={(e) => setSpotCode(e.target.value)} />
                  <button type="button" className={BTN} disabled={busy || !spotCode.trim()} onClick={submitSpotClaim}>
                    <Plus className="h-4 w-4" /> {t("addSpot", "Cadastrar")}
                  </button>
                </div>
              </div>
            )}
        </>
      </div>
    </div>
  )
}
