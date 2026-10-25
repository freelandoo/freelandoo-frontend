"use client"

// features/meu-mundo/ui/chat/chat-panel.tsx — mm3d-32: chat do jogo.
//
// Duas abas: Global (todos os jogadores, sala meu_mundo) e Conversas (as da
// Freelandoo, perfil-conta). Tocar numa conversa — ou "Mensagem" no card do
// jogador, ou no nome de quem falou no Global — abre a thread aqui dentro;
// "Abrir na Freelandoo" leva ao /mensagens. O histórico é um só: nada é
// guardado no jogo. No celular nada rola além da lista (data-mm-scroll).

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ExternalLink, Flag, Globe, MessageCircle, Send } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { MM } from "../hud/tokens"
import { archivo } from "../status/evo-skin"
import { getConversations, type ChatLine, type ConversationRow } from "../../data"
import { cleanDraft, DIRECT_MAX, GLOBAL_MAX, type Line } from "./chat-logic"
import { useDirectThread } from "./use-direct-thread"

export type ChatView = { tab: "global" } | { tab: "dms" } | { tab: "thread"; conversationId: string; title: string }

export interface ChatPanelProps {
  token: string | null
  view: ChatView
  setView: (v: ChatView) => void
  lines: Line[]
  onSendGlobal: (text: string) => void
  onReport: (id: string) => void
  onDirectTo: (line: ChatLine) => void
  /** perfil-conta de quem joga (o ator da conversa); null = ainda carregando */
  actorId: string | null
  dmUnread: number
  onClose: () => void
}

// Altura fixa do miolo: a lista rola, o resto (abas, campo) fica parado.
const BODY_H = "min(520px, calc(100dvh - 132px))"

export default function ChatPanel({ token, view, setView, lines, onSendGlobal, onReport, onDirectTo, actorId, dmUnread, onClose }: ChatPanelProps) {
  const t = useTranslations("MeuMundo")
  return (
    <EvoDialog fixed z="z-[78]" width="max-w-lg" labelId="mm-chat-title" title={t("chTitle", "Chat")} onClose={onClose}>
      <div data-mm-panel className="flex flex-col" style={{ height: BODY_H }}>
        <div className="mb-2 grid shrink-0 grid-cols-2 gap-1 rounded-[14px] p-1" role="tablist" style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${MM.border}` }}>
          <Tab on={view.tab === "global"} onClick={() => setView({ tab: "global" })} icon={<Globe className="h-4 w-4" />} label={t("chGlobal", "Global")} />
          <Tab on={view.tab !== "global"} onClick={() => setView({ tab: "dms" })} icon={<MessageCircle className="h-4 w-4" />} label={t("chDms", "Conversas")} count={dmUnread} />
        </div>
        {view.tab === "global" && <GlobalTab lines={lines} onSend={onSendGlobal} onReport={onReport} onDirectTo={onDirectTo} />}
        {view.tab === "dms" && <DmList token={token} onOpen={(c) => setView({ tab: "thread", conversationId: c.id, title: c.title })} />}
        {view.tab === "thread" && (
          <Thread key={view.conversationId} token={token} actorId={actorId} conversationId={view.conversationId} title={view.title} onBack={() => setView({ tab: "dms" })} />
        )}
      </div>
    </EvoDialog>
  )
}

function Tab({ on, onClick, icon, label, count = 0 }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`${archivo.className} flex h-9 items-center justify-center gap-2 rounded-[11px] text-[14px] font-semibold max-[759px]:h-8 max-[759px]:text-[13px]`}
      style={{ background: on ? MM.rubySoft : "transparent", color: on ? MM.text : MM.muted, border: on ? `1px solid ${MM.rubyBorder}` : "1px solid transparent" }}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums" style={{ background: MM.ruby, color: "#fff" }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

/** Lista que desce sozinha quando chega linha nova (se já estava no fim). */
function useStickBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (first.current || el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight
    if (el.scrollHeight > 0) first.current = false
  }, [dep])
  return ref
}

function useClock() {
  const locale = useLocale()
  return useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" })
    return (iso: string) => f.format(new Date(iso))
  }, [locale])
}

function Avatar({ url, size }: { url: string | null | undefined; size: number }) {
  if (!url) return <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: "rgba(255,255,255,0.10)" }} aria-hidden />
  // eslint-disable-next-line @next/next/no-img-element -- avatar de pessoa em lista (regra 4: <img> lazy)
  return <img src={url} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, background: "#232733" }} />
}

function Composer({ max, onSend, placeholder }: { max: number; onSend: (text: string) => void; placeholder: string }) {
  const t = useTranslations("MeuMundo")
  const [draft, setDraft] = useState("")
  // Teclado virtual só quando a pessoa toca no campo (no celular ele cobriria o mundo).
  const [focusNow] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches)
  const submit = () => {
    const text = cleanDraft(draft, max)
    if (!text) return
    onSend(text)
    setDraft("")
  }
  return (
    <form
      className="mt-2 flex shrink-0 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        autoFocus={focusNow}
        value={draft}
        maxLength={max}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="send"
        className="h-11 min-w-0 flex-1 rounded-[12px] px-3 text-sm outline-none placeholder:text-[#8d939c] focus-visible:ring-2 focus-visible:ring-[#E5BE70] max-[759px]:h-10"
        style={{ background: "rgba(0,0,0,0.35)", color: MM.text, border: `1px solid ${MM.border}` }}
      />
      <EvoButton type="submit" variant="primary" aria-label={t("chSend", "Enviar")} title={t("chSend", "Enviar")} disabled={!draft.trim()} icon={<Send className="h-4 w-4" />} />
    </form>
  )
}

function GlobalTab({ lines, onSend, onReport, onDirectTo }: { lines: Line[]; onSend: (t: string) => void; onReport: (id: string) => void; onDirectTo: (l: ChatLine) => void }) {
  const t = useTranslations("MeuMundo")
  const clock = useClock()
  const ref = useStickBottom(lines.length)
  // Denunciar pede um segundo toque (o primeiro só arma) — toque sem querer não vira denúncia.
  const [armed, setArmed] = useState<string | null>(null)
  return (
    <>
      <div ref={ref} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1" data-mm-scroll>
        {lines.length === 0 && <p className="py-6 text-center text-sm" style={{ color: MM.muted }}>{t("chEmpty", "Ninguém falou ainda. Diga oi!")}</p>}
        {lines.map((l) => (
          <div key={l.id} className="flex items-start gap-2" style={{ color: l.pending ? MM.muted : MM.text }}>
            <Avatar url={l.mine ? null : l.avatar} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                {l.mine || !l.profileId ? (
                  <span className="truncate font-bold" style={{ color: l.mine ? MM.gold : MM.text }}>
                    {l.mine ? t("chYou", "Você") : l.name}
                  </span>
                ) : (
                  <button type="button" className="truncate font-bold underline-offset-2 hover:underline" style={{ color: MM.text }} onClick={() => onDirectTo(l as ChatLine)}>
                    {l.name}
                  </button>
                )}
                {l.at && <time style={{ color: MM.muted }}>{clock(l.at)}</time>}
                {!l.mine && !l.pending && (
                  <button
                    type="button"
                    aria-label={t("chReport", "Denunciar")}
                    title={t("chReport", "Denunciar")}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5"
                    style={{ color: armed === l.id ? MM.danger : MM.muted, border: `1px solid ${armed === l.id ? MM.danger : "transparent"}` }}
                    onClick={() => {
                      if (armed === l.id) {
                        setArmed(null)
                        onReport(l.id)
                      } else setArmed(l.id)
                    }}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {armed === l.id && <span className="text-[11px] font-semibold">{t("chReport", "Denunciar")}</span>}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{l.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Composer max={GLOBAL_MAX} onSend={onSend} placeholder={t("chGlobalPh", "Fale com todos do Meu Mundo")} />
    </>
  )
}

function DmList({ token, onOpen }: { token: string | null; onOpen: (c: { id: string; title: string }) => void }) {
  const t = useTranslations("MeuMundo")
  const [rows, setRows] = useState<ConversationRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!token) return
    let alive = true
    void getConversations(token).then((r) => {
      if (!alive) return
      setFailed(!r.ok)
      setRows(r.ok ? r.data.items : [])
    })
    return () => {
      alive = false
    }
  }, [token, attempt])
  if (failed)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm" style={{ color: MM.muted }} role="alert">
        {t("ibLoadFail", "Não carregou agora.")}
        <EvoButton
          variant="gold"
          size="sm"
          onClick={() => {
            setFailed(false)
            setRows(null)
            setAttempt((n) => n + 1)
          }}
        >
          {t("ibRetry", "Tentar de novo")}
        </EvoButton>
      </div>
    )
  if (!rows) return <p className="py-6 text-center text-sm" style={{ color: MM.muted }}>{t("chLoading", "Carregando…")}</p>
  if (!rows.length) return <p className="py-6 text-center text-sm" style={{ color: MM.muted }}>{t("chNoDms", "Nenhuma conversa ainda. Toque num jogador e escolha Mensagem.")}</p>
  return (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain" data-mm-scroll>
      {rows.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onOpen({ id: c.id, title: c.title })}
          className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left"
          style={{ background: c.unread ? MM.card : "transparent", border: `1px solid ${c.unread ? MM.border : "transparent"}` }}
        >
          <Avatar url={c.avatar} size={36} />
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[14px] ${c.unread ? "font-semibold" : "font-medium"}`} style={{ color: c.unread ? MM.text : MM.muted }}>
              {c.title}
            </span>
            <span className="block truncate text-[12px]" style={{ color: MM.muted }}>
              {c.preview ?? ""}
            </span>
          </span>
          {c.unread > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums" style={{ background: MM.ruby, color: "#fff" }}>
              {c.unread > 99 ? "99+" : c.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function Thread({ token, actorId, conversationId, title, onBack }: { token: string | null; actorId: string | null; conversationId: string; title: string; onBack: () => void }) {
  const t = useTranslations("MeuMundo")
  const { items, loading, error, send } = useDirectThread(token, conversationId, actorId)
  const ref = useStickBottom(items.length)
  return (
    <>
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold" style={{ color: MM.muted }}>
          <ArrowLeft className="h-4 w-4" />
          {t("chBack", "Conversas")}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: MM.text }}>
          {title}
        </span>
        <a href={`/mensagens?c=${encodeURIComponent(conversationId)}`} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center gap-1 text-xs" style={{ color: MM.gold }}>
          {t("chOpenSite", "Abrir na Freelandoo")} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div ref={ref} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1" data-mm-scroll>
        {(loading || !actorId) && !items.length && <p className="py-6 text-center text-sm" style={{ color: MM.muted }}>{t("chLoading", "Carregando…")}</p>}
        {items.map((m) => (
          <div key={m.id} className={m.mine ? "flex justify-end" : "flex"}>
            <p
              className="max-w-[80%] whitespace-pre-wrap break-words rounded-[14px] px-3 py-2 text-sm"
              style={{ background: m.mine ? MM.rubyFill : MM.card, color: m.pending ? MM.muted : "#fff", border: `1px solid ${m.mine ? MM.rubyBorder : MM.border}` }}
            >
              {m.text}
            </p>
          </div>
        ))}
        {error && (
          <p className="text-center text-xs font-semibold" style={{ color: MM.danger }} role="alert">
            {error}
          </p>
        )}
      </div>
      <Composer max={DIRECT_MAX} onSend={(text) => void send(text)} placeholder={t("chDmPh", "Escreva uma mensagem")} />
    </>
  )
}
