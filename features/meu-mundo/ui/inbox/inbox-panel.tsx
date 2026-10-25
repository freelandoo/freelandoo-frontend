"use client"

// features/meu-mundo/ui/inbox/inbox-panel.tsx — o SINO e a CAIXA DE ENTRADA
// do jogo num painel só (mm3d-30). Duas vistas:
//  • Notificações: histórico do sino (tb_mm_notice), mais recentes primeiro,
//    agrupadas por dia, com filtro; tocar abre o conteúdo e marca como lida;
//    "Marcar todas como lidas".
//  • Caixa: Mensagens (as conversas da Freelandoo, sem cópia — desde o mm3d-32
//    abrem a thread no chat do jogo; sem o chat, o /mensagens em outra aba),
//    Presentes, Oficiais, Promoções e Compras (tb_mm_mail).
//    Carta aberta = lida; presente tem "Resgatar" (o servidor entrega uma vez).
// Listas paginadas por cursor ("Carregar mais"), nada virtualizado: 30 linhas
// leves por página. Estados de carregando, vazio e erro em todas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Bell, CheckCheck, ExternalLink, Gift, Inbox, Loader2, Mail, MessageCircle, ReceiptText, RefreshCw } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import {
  getConversations,
  getMail,
  getMailItem,
  getMailPrefs,
  getNotices,
  postMailClaim,
  postMailPrefs,
  postMailReadAll,
  postNoticesRead,
  type ConversationRow,
} from "../../data"
import type { BodyId, InboxCounts, MailTab, MMMail, MMNotice, NoticeFilter } from "../../types"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { archivo } from "../status/evo-skin"
import { expressionSrc } from "../portraits"
import { noticeExpression, noticeText, speaksAsCharacter } from "./inbox-logic"
import { PlatformMark } from "./notice-stack"
import { giftLabel, giftThumb } from "../items/item-catalog"

type Tr = (key: string, fallback: string) => string
export type InboxView = { view: "notices" } | { view: "mail"; tab?: MailTab | "messages"; open?: string | null }

const FILTERS: { id: NoticeFilter; key: string; fb: string }[] = [
  { id: "all", key: "ibAll", fb: "Todas" },
  { id: "unread", key: "ibUnread", fb: "Não lidas" },
  { id: "character", key: "ibCharacter", fb: "Personagem" },
  { id: "rewards", key: "ibRewards", fb: "Presentes e compras" },
  { id: "official", key: "ibOfficial", fb: "Oficiais" },
]
const TABS: { id: MailTab | "messages"; key: string; fb: string }[] = [
  { id: "messages", key: "ibMessages", fb: "Mensagens" },
  { id: "gift", key: "ibGifts", fb: "Presentes" },
  { id: "official", key: "ibOfficialTab", fb: "Oficiais" },
  { id: "promo", key: "ibPromos", fb: "Promoções" },
  { id: "receipt", key: "ibReceipts", fb: "Compras" },
]

export interface InboxPanelProps {
  initial: InboxView
  body: BodyId
  counts: InboxCounts | null
  onCounts: (c: InboxCounts) => void
  onClose: () => void
  onOpenStatus: () => void
  /** depois de resgatar: a vida mudou (geladeira, moedas, vestuário) */
  onClaimed: () => void
  /** mm3d-32: abre a conversa no chat do jogo (sem ela, o /mensagens em outra aba) */
  onOpenConversation?: (id: string, title: string) => void
}

export default function InboxPanel({ initial, body, counts, onCounts, onClose, onOpenStatus, onClaimed, onOpenConversation }: InboxPanelProps) {
  const t = useTranslations("MeuMundo")
  const [view, setView] = useState<"notices" | "mail">(initial.view)
  const [openMail, setOpenMail] = useState<string | null>(initial.view === "mail" ? (initial.open ?? null) : null)
  const [tab, setTab] = useState<MailTab | "messages">(initial.view === "mail" ? (initial.tab ?? "gift") : "gift")
  return (
    <EvoDialog fixed z="z-[78]" labelId="mm-inbox" eyebrow={t("ibEyebrow", "Meu Mundo")} title={view === "notices" ? t("ibNoticesTitle", "Notificações") : t("ibMailTitle", "Caixa de entrada")} onClose={onClose} width="max-w-lg">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-[14px] p-1" role="tablist" aria-label={t("ibViews", "Notificações e caixa de entrada")} style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${MM.border}` }}>
        <Seg active={view === "notices"} onClick={() => setView("notices")} icon={<Bell className="h-4 w-4" />} count={counts?.notices ?? 0} label={t("ibNoticesTitle", "Notificações")} />
        <Seg
          active={view === "mail"}
          onClick={() => {
            setView("mail")
            setOpenMail(null)
          }}
          icon={<Mail className="h-4 w-4" />}
          count={counts?.mail ?? 0}
          label={t("ibMailShort", "Caixa")}
        />
      </div>
      {view === "notices" ? (
        <NoticeList
          t={t}
          body={body}
          onCounts={onCounts}
          onOpen={(n) => {
            if (n.mailId) {
              setView("mail")
              setTab(mailTabOf(n))
              setOpenMail(n.mailId)
            } else if (n.kind === "need" || n.kind === "life") {
              onClose()
              onOpenStatus()
            }
          }}
        />
      ) : openMail ? (
        <MailDetail id={openMail} t={t} onBack={() => setOpenMail(null)} onCounts={onCounts} onClaimed={onClaimed} />
      ) : (
        <MailList t={t} tab={tab} onTab={setTab} onOpen={setOpenMail} onCounts={onCounts} onOpenConversation={onOpenConversation} />
      )}
    </EvoDialog>
  )
}

const mailTabOf = (n: MMNotice): MailTab => (n.kind === "gift" ? "gift" : n.kind === "promo" ? "promo" : n.kind === "purchase" ? "receipt" : "official")

function Seg({ active, onClick, icon, count, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; count: number; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${archivo.className} flex h-10 items-center justify-center gap-2 rounded-[11px] text-[14px] font-semibold`}
      style={{ background: active ? MM.rubySoft : "transparent", color: active ? MM.text : MM.muted, border: active ? `1px solid ${MM.rubyBorder}` : "1px solid transparent" }}
    >
      {icon}
      {label}
      {count > 0 && <CountBadge n={count} />}
    </button>
  )
}

export function CountBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums" style={{ background: MM.ruby, color: "#fff" }}>
      {n > 99 ? "99+" : n}
    </span>
  )
}

function Chips<T extends string>({ items, value, onChange, t, label }: { items: { id: T; key: string; fb: string }[]; value: T; onChange: (v: T) => void; t: Tr; label: string }) {
  return (
    <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`${archivo.className} h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold`}
          style={{ background: value === it.id ? MM.ruby : MM.card, color: value === it.id ? "#fff" : MM.muted, border: `1px solid ${value === it.id ? MM.rubyBorder : MM.border}` }}
        >
          {t(it.key, it.fb)}
        </button>
      ))}
    </div>
  )
}

/** Hoje / Ontem / data — e a hora de cada linha (relógio do aparelho, idioma da pessoa). */
function useWhen() {
  const locale = useLocale()
  return useMemo(() => {
    const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" })
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" })
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    return {
      group(iso: string, t: Tr) {
        const d = new Date(iso)
        const now = new Date()
        const y = new Date(now.getTime() - 86400000)
        if (key(d) === key(now)) return t("ibToday", "Hoje")
        if (key(d) === key(y)) return t("ibYesterday", "Ontem")
        return day.format(d)
      },
      time: (iso: string) => time.format(new Date(iso)),
      full: (iso: string) => `${day.format(new Date(iso))} · ${time.format(new Date(iso))}`,
    }
  }, [locale])
}

function useMounted() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return alive
}

// ═══ notificações ══════════════════════════════════════════════════════════
function NoticeList({ t, body, onCounts, onOpen }: { t: Tr; body: BodyId; onCounts: (c: InboxCounts) => void; onOpen: (n: MMNotice) => void }) {
  const [filter, setFilter] = useState<NoticeFilter>("all")
  const [items, setItems] = useState<MMNotice[] | null>(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const alive = useMounted()
  const when = useWhen()

  const load = useCallback(
    async (before: string | null) => {
      const token = getToken()
      if (!token) return
      if (before) setLoadingMore(true)
      else {
        setItems(null)
        setError(false)
      }
      const r = await getNotices(token, filter, before)
      if (!alive.current) return
      setLoadingMore(false)
      if (!r.ok) {
        if (!before) setError(true)
        return
      }
      setItems((prev) => (before && prev ? [...prev, ...r.data.items] : r.data.items))
      setMore(r.data.more)
      onCounts(r.data.counts)
    },
    [filter, onCounts, alive],
  )
  useEffect(() => {
    void load(null)
  }, [load])

  const markAll = async () => {
    const token = getToken()
    if (!token) return
    const r = await postNoticesRead(token, "all")
    if (r.ok) {
      onCounts(r.data.counts)
      setItems((l) => (l ? (filter === "unread" ? [] : l.map((n) => ({ ...n, read: true }))) : l))
    }
  }
  const open = async (n: MMNotice) => {
    const token = getToken()
    if (token && !n.read) {
      setItems((l) => l?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? l)
      const r = await postNoticesRead(token, [n.id])
      if (r.ok) onCounts(r.data.counts)
    }
    onOpen(n)
  }

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <Chips items={FILTERS} value={filter} onChange={setFilter} t={t} label={t("ibFilter", "Filtrar notificações")} />
      </div>
      <div className="mb-2 flex justify-end">
        <EvoButton variant="ghost" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => void markAll()} disabled={!items?.some((n) => !n.read)}>
          {t("ibMarkAll", "Marcar todas como lidas")}
        </EvoButton>
      </div>
      {error ? (
        <ErrorState t={t} onRetry={() => void load(null)} />
      ) : items === null ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <Empty icon={<Bell className="h-6 w-6" />} text={filter === "unread" ? t("ibEmptyUnread", "Tudo lido por aqui.") : t("ibEmptyNotices", "Nenhuma notificação ainda.")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((n, i) => {
            const g = when.group(n.createdAt, t)
            const head = i === 0 || g !== when.group(items[i - 1].createdAt, t)
            const txt = noticeText(n, t)
            return (
              <li key={n.id}>
                {head && (
                  <div className={`${archivo.className} px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em]`} style={{ color: MM.gold }}>
                    {g}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left"
                  style={{ background: n.read ? "transparent" : MM.card, border: `1px solid ${n.read ? "transparent" : MM.border}` }}
                >
                  <NoticeAvatar n={n} body={body} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] ${n.read ? "font-medium" : "font-semibold"}`} style={{ color: n.read ? MM.muted : MM.text }}>
                      {txt.title}
                    </span>
                    {txt.line && (
                      <span className="block truncate text-[12px]" style={{ color: MM.muted }}>
                        {txt.line}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] tabular-nums" style={{ color: MM.muted }}>
                      {when.time(n.createdAt)}
                    </span>
                    {!n.read && <span className="h-2 w-2 rounded-full" style={{ background: MM.ruby }} aria-label={t("ibNew", "Não lida")} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {more && items && <MoreButton t={t} loading={loadingMore} onClick={() => void load(items[items.length - 1]?.id ?? null)} />}
    </>
  )
}

function NoticeAvatar({ n, body }: { n: MMNotice; body: BodyId }) {
  if (!speaksAsCharacter(n)) return <PlatformMark kind={n.kind} size={40} />
  return (
    // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, mesmo arquivo do card (cache)
    <img src={expressionSrc(body, noticeExpression(n))} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-full object-cover" style={{ background: "#232733" }} />
  )
}

// ═══ caixa ═════════════════════════════════════════════════════════════════
function MailList({
  t,
  tab,
  onTab,
  onOpen,
  onCounts,
  onOpenConversation,
}: {
  t: Tr
  tab: MailTab | "messages"
  onTab: (v: MailTab | "messages") => void
  onOpen: (id: string) => void
  onCounts: (c: InboxCounts) => void
  onOpenConversation?: (id: string, title: string) => void
}) {
  return (
    <>
      <Chips items={TABS} value={tab} onChange={onTab} t={t} label={t("ibMailTabs", "Categorias da caixa")} />
      {tab === "messages" ? <Conversations t={t} onOpenConversation={onOpenConversation} /> : <Letters key={tab} t={t} tab={tab} onOpen={onOpen} onCounts={onCounts} />}
    </>
  )
}

function Letters({ t, tab, onOpen, onCounts }: { t: Tr; tab: MailTab; onOpen: (id: string) => void; onCounts: (c: InboxCounts) => void }) {
  const [items, setItems] = useState<MMMail[] | null>(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [promos, setPromos] = useState<boolean | null>(null)
  const alive = useMounted()
  const when = useWhen()

  const load = useCallback(
    async (before: string | null) => {
      const token = getToken()
      if (!token) return
      if (before) setLoadingMore(true)
      else setError(false)
      const r = await getMail(token, tab, before)
      if (!alive.current) return
      setLoadingMore(false)
      if (!r.ok) {
        if (!before) setError(true)
        return
      }
      setItems((prev) => (before && prev ? [...prev, ...r.data.items] : r.data.items))
      setMore(r.data.more)
      onCounts(r.data.counts)
    },
    [tab, onCounts, alive],
  )
  useEffect(() => {
    void load(null)
  }, [load])
  useEffect(() => {
    if (tab !== "promo") return
    const token = getToken()
    if (!token) return
    void getMailPrefs(token).then((r) => alive.current && r.ok && setPromos(r.data.prefs.promos))
  }, [tab, alive])

  const readAll = async () => {
    const token = getToken()
    if (!token) return
    const r = await postMailReadAll(token)
    if (r.ok) {
      onCounts(r.data.counts)
      setItems((l) => l?.map((m) => ({ ...m, read: true })) ?? l)
    }
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        {tab === "promo" && promos !== null ? (
          <label className="flex items-center gap-2 text-[13px]" style={{ color: MM.muted }}>
            <input
              type="checkbox"
              checked={promos}
              onChange={async (e) => {
                const v = e.target.checked
                setPromos(v)
                const token = getToken()
                if (token) {
                  const r = await postMailPrefs(token, v)
                  if (r.ok) setPromos(r.data.prefs.promos)
                }
              }}
              className="h-4 w-4 accent-[#AD1644]"
            />
            {t("ibPromosPref", "Receber promoções")}
          </label>
        ) : (
          <span />
        )}
        <EvoButton variant="ghost" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => void readAll()} disabled={!items?.some((m) => !m.read)}>
          {t("ibMarkAllShort", "Marcar como lidas")}
        </EvoButton>
      </div>
      {error ? (
        <ErrorState t={t} onRetry={() => void load(null)} />
      ) : items === null ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <Empty icon={<Inbox className="h-6 w-6" />} text={emptyMail(tab, t)} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onOpen(m.id)}
                className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left"
                style={{ background: m.read ? "transparent" : MM.card, border: `1px solid ${m.read ? "transparent" : MM.border}` }}
              >
                <MailIcon m={m} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[14px] ${m.read ? "font-medium" : "font-semibold"}`} style={{ color: m.read ? MM.muted : MM.text }}>
                    {mailTitle(m, t)}
                  </span>
                  <span className="block truncate text-[12px]" style={{ color: MM.muted }}>
                    {m.kind === "gift" ? (m.claimedAt ? t("ibClaimed", "Resgatado") : t("ibToClaim", "Toque para resgatar")) : t("ibFromPlatform", "Meu Mundo")} · {when.full(m.createdAt)}
                  </span>
                </span>
                {!m.read && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: MM.ruby }} aria-label={t("ibNew", "Não lida")} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {more && items && <MoreButton t={t} loading={loadingMore} onClick={() => void load(items[items.length - 1]?.id ?? null)} />}
    </>
  )
}

function emptyMail(tab: MailTab, t: Tr) {
  if (tab === "gift") return t("ibEmptyGifts", "Nenhum presente por enquanto.")
  if (tab === "promo") return t("ibEmptyPromos", "Nenhuma promoção agora.")
  if (tab === "receipt") return t("ibEmptyReceipts", "Suas compras aparecem aqui.")
  return t("ibEmptyOfficial", "Nenhum comunicado.")
}

/** Texto do jogo traduz; título de comunicado/promoção/presente é do admin (conteúdo). */
function mailTitle(m: MMMail, t: Tr) {
  if (m.kind === "receipt" && m.data.polens != null) return t("ntPolensLine", "{n} Poléns entraram na sua carteira.").replace("{n}", String(m.data.polens))
  return m.title
}

function MailIcon({ m }: { m: MMMail }) {
  const Icon = m.kind === "gift" ? Gift : m.kind === "receipt" ? ReceiptText : null
  if (!Icon) return <PlatformMark kind={m.kind === "promo" ? "promo" : "official"} size={40} />
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: MM.card, color: MM.gold, border: `1px solid ${MM.goldBorder}` }} aria-hidden>
      <Icon className="h-5 w-5" />
    </span>
  )
}

function MailDetail({ id, t, onBack, onCounts, onClaimed }: { id: string; t: Tr; onBack: () => void; onCounts: (c: InboxCounts) => void; onClaimed: () => void }) {
  const [mail, setMail] = useState<MMMail | null>(null)
  const [error, setError] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const alive = useMounted()
  const when = useWhen()

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(false)
    const r = await getMailItem(token, id)
    if (!alive.current) return
    if (!r.ok) return setError(true)
    setMail(r.data.mail)
    onCounts(r.data.counts)
  }, [id, onCounts, alive])
  useEffect(() => {
    void load()
  }, [load])

  const claim = async () => {
    const token = getToken()
    if (!token || claiming || !mail) return
    setClaiming(true)
    setClaimError(null)
    const r = await postMailClaim(token, mail.id)
    if (!alive.current) return
    setClaiming(false)
    if (!r.ok) {
      setClaimError(
        r.code === "stack"
          ? t("ibClaimFull", "A geladeira não cabe mais desse item. Coma ou abra espaço e tente de novo.")
          : r.status === 0
            ? t("levelNetError", "Sem conexão. Tente de novo.")
            : r.error,
      )
      return
    }
    const { mailId: _m, replay: _r, ...result } = r.data.claim
    void _m
    void _r
    setMail({ ...mail, claimedAt: mail.claimedAt ?? new Date().toISOString(), claimResult: result, read: true })
    onClaimed()
  }

  return (
    <div>
      <button type="button" onClick={onBack} className={`${archivo.className} mb-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold`} style={{ color: MM.muted }}>
        <ArrowLeft className="h-4 w-4" /> {t("ibBack", "Voltar à caixa")}
      </button>
      {error ? (
        <ErrorState t={t} onRetry={() => void load()} />
      ) : !mail ? (
        <Skeleton rows={2} />
      ) : (
        <article className="rounded-[14px] p-3" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
          <div className="flex items-center gap-3">
            <MailIcon m={mail} />
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold leading-5" style={{ color: MM.text }}>
                {mailTitle(mail, t)}
              </h3>
              <p className="text-[12px]" style={{ color: MM.muted }}>
                {t("ibFromPlatform", "Meu Mundo")} · {when.full(mail.createdAt)}
              </p>
            </div>
          </div>
          {mail.body && (
            <p className="mt-3 whitespace-pre-line text-[14px] leading-5" style={{ color: MM.text }}>
              {mail.body}
            </p>
          )}
          {mail.kind === "receipt" && mail.data.product && (
            <p className="mt-3 text-[13px]" style={{ color: MM.muted }}>
              {t("ibReceiptProduct", "Pacote: {name}").replace("{name}", mail.data.product)}
            </p>
          )}
          {mail.gift && (
            <div className="mt-3 flex items-center gap-3 rounded-[14px] p-2.5" style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${MM.goldBorder}` }}>
              <GiftThumb gift={mail.gift} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold" style={{ color: MM.text }}>
                  {giftLabel(mail.gift, t)}
                </div>
                <div className="text-[12px]" style={{ color: MM.muted }}>
                  {mail.claimedAt ? claimedWhere(mail, t) : t("ibGiftReady", "Pronto para resgatar")}
                </div>
              </div>
              {!mail.claimedAt && (
                <EvoButton variant="primary" size="sm" loading={claiming} onClick={() => void claim()} icon={<Gift className="h-4 w-4" />}>
                  {t("ibClaim", "Resgatar")}
                </EvoButton>
              )}
            </div>
          )}
          {claimError && (
            <p className="mt-2 text-[12px] font-semibold" style={{ color: MM.danger }} role="alert">
              {claimError}
            </p>
          )}
        </article>
      )}
    </div>
  )
}

function claimedWhere(m: MMMail, t: Tr) {
  const r = m.claimResult
  if (r?.alreadyOwned) return t("ibGiftOwned", "Você já tinha — continua no seu vestuário.")
  if (r?.where === "fridge") return t("ibGiftFridge", "Recebido · está na sua geladeira (aba Itens).")
  if (r?.where === "wardrobe") return t("ibGiftWardrobe", "Recebido · está no seu vestuário (aba Itens).")
  if (r?.where === "wallet") return t("ibGiftWallet", "Recebido · moedas na sua carteira do jogo.")
  return t("ibClaimed", "Resgatado")
}

function GiftThumb({ gift }: { gift: NonNullable<MMMail["gift"]> }) {
  const src = giftThumb(gift)
  if (!src)
    return (
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px]" style={{ background: MM.card, color: MM.gold }} aria-hidden>
        <Gift className="h-6 w-6" />
      </span>
    )
  // eslint-disable-next-line @next/next/no-img-element -- miniatura estática do catálogo
  return <img src={src} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 rounded-[12px] object-cover" style={{ background: "#232733" }} />
}

// ═══ mensagens (o chat que já existe) ══════════════════════════════════════
function Conversations({ t, onOpenConversation }: { t: Tr; onOpenConversation?: (id: string, title: string) => void }) {
  const [items, setItems] = useState<ConversationRow[] | null>(null)
  const [error, setError] = useState(false)
  const alive = useMounted()
  const when = useWhen()
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(false)
    setItems(null)
    const r = await getConversations(token)
    if (!alive.current) return
    if (!r.ok) return setError(true)
    setItems(r.data.items)
  }, [alive])
  useEffect(() => {
    void load()
  }, [load])
  if (error) return <ErrorState t={t} onRetry={() => void load()} />
  if (items === null) return <Skeleton />
  if (!items.length) return <Empty icon={<MessageCircle className="h-6 w-6" />} text={t("ibEmptyMessages", "Nenhuma conversa ainda.")} />
  return (
    <>
      <p className="mb-2 text-[12px]" style={{ color: MM.muted }}>
        {onOpenConversation
          ? t("ibMessagesHintGame", "Suas conversas da Freelandoo. Abrem aqui, no chat do jogo.")
          : t("ibMessagesHint", "Suas conversas da Freelandoo. Abrem em outra aba, sem sair do jogo.")}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((c) => (
          <li key={c.id}>
            <ConversationLink
              id={c.id}
              onOpen={onOpenConversation ? () => onOpenConversation(c.id, c.title) : undefined}
              className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left"
              style={{ background: c.unread ? MM.card : "transparent", border: `1px solid ${c.unread ? MM.border : "transparent"}` }}
            >
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar de pessoa em lista (regra 4: <img> lazy)
                <img src={c.avatar} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" style={{ background: "#232733" }} />
              ) : (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: MM.card, color: MM.gold }} aria-hidden>
                  <MessageCircle className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[14px] ${c.unread ? "font-semibold" : "font-medium"}`} style={{ color: c.unread ? MM.text : MM.muted }}>
                  {c.title}
                </span>
                <span className="block truncate text-[12px]" style={{ color: MM.muted }}>
                  {c.preview ?? ""}
                  {c.at ? ` · ${when.full(c.at)}` : ""}
                </span>
              </span>
              {c.unread > 0 ? <CountBadge n={c.unread} /> : !onOpenConversation && <ExternalLink className="h-4 w-4 shrink-0" style={{ color: MM.muted }} aria-hidden />}
            </ConversationLink>
          </li>
        ))}
      </ul>
    </>
  )
}

/** A linha da conversa: botão que abre no jogo, ou o link antigo para o /mensagens. */
function ConversationLink({ id, onOpen, className, style, children }: { id: string; onOpen?: () => void; className: string; style: React.CSSProperties; children: React.ReactNode }) {
  if (onOpen)
    return (
      <button type="button" onClick={onOpen} className={className} style={style}>
        {children}
      </button>
    )
  return (
    <a href={`/mensagens?c=${encodeURIComponent(id)}`} target="_blank" rel="noopener" className={className} style={style}>
      {children}
    </a>
  )
}

// ═══ estados ═══════════════════════════════════════════════════════════════
function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[14px] p-2" style={{ background: MM.card }}>
          <span className="h-10 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="flex-1">
            <span className="block h-3 w-2/3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="mt-2 block h-2.5 w-1/3 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
          </span>
        </div>
      ))}
    </div>
  )
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-[14px]" style={{ color: MM.muted }}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: MM.card, color: MM.gold }}>
        {icon}
      </span>
      {text}
    </div>
  )
}

function ErrorState({ t, onRetry }: { t: Tr; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-[14px]" style={{ color: MM.muted }} role="alert">
      {t("ibLoadFail", "Não carregou agora.")}
      <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
        {t("ibRetry", "Tentar de novo")}
      </EvoButton>
    </div>
  )
}

function MoreButton({ t, loading, onClick }: { t: Tr; loading: boolean; onClick: () => void }) {
  return (
    <div className="mt-2 flex justify-center">
      <EvoButton variant="ghost" size="sm" onClick={onClick} disabled={loading} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
        {t("ibMore", "Carregar mais")}
      </EvoButton>
    </div>
  )
}
