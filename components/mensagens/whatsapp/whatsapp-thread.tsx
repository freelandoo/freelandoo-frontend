"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2, Send, Smartphone, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import type { WhatsappInbox, WhatsappMessage } from "./use-whatsapp-inbox"

/**
 * A coluna direita da aba WhatsApp: a conversa aberta, ou o convite a conectar.
 *
 * ─── MÍDIA É BUSCADA SÓ QUANDO ALGUÉM PEDE ──────────────────────────────────
 *
 * O que chega aqui é o RÓTULO ("📷 Imagem") gravado na ingestão; o arquivo mora
 * na Evolution e desce por `/api/whatsapp/messages/:id/media` quando a pessoa
 * clica. Carregar tudo ao abrir a conversa baixaria o álbum inteiro de um
 * terceiro por causa de uma rolagem.
 */

const MEDIA_KINDS = new Set(["image", "audio", "video", "document"])

function MediaBubble({ message }: { message: WhatsappMessage }) {
  const t = useTranslations("Whatsapp")
  const [open, setOpen] = useState(false)
  const src = message.id_message ? `/api/whatsapp/messages/${message.id_message}/media` : null

  if (!src) return <span>{message.body}</span>

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left underline decoration-dotted underline-offset-2"
      >
        {message.body} · {t("openMedia", "abrir")}
      </button>
    )
  }

  if (message.media_type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={message.body} className="mt-1 max-h-72 w-auto" />
  }
  if (message.media_type === "audio") {
    return <audio src={src} controls className="mt-1 w-full max-w-[260px]" />
  }
  if (message.media_type === "video") {
    return <video src={src} controls className="mt-1 max-h-72 w-auto" />
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {t("downloadFile", "Baixar arquivo")}
    </a>
  )
}

export function WhatsappThread({
  inbox,
  onConnect,
}: {
  inbox: WhatsappInbox
  onConnect: () => void
}) {
  const t = useTranslations("Whatsapp")
  const locale = useLocale()
  const [draft, setDraft] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)

  const { info, conversations, activeId, messages, threadLoading, threadError, sending } = inbox
  const active = conversations.find((c) => c.id_conversation === activeId) || null
  const connected = info?.status === "connected"

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, activeId])

  // Trocou de conversa: o rascunho não pode viajar junto e sair para outra
  // pessoa sem ninguém notar.
  useEffect(() => {
    setDraft("")
  }, [activeId])

  async function submit() {
    const text = draft.trim()
    if (!text || sending) return
    try {
      await inbox.send(text)
      setDraft("")
    } catch {
      /* o erro já está no estado da thread */
    }
  }

  if (!activeId || !active) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <Smartphone className="h-10 w-10 text-white/15" />
        <p className="mt-4 text-sm font-semibold text-white/80">
          {connected
            ? t("pickConversation", "Escolha uma conversa")
            : t("connectTitle", "Traga o seu WhatsApp para cá")}
        </p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-white/45">
          {connected
            ? t("pickConversationHint", "As mensagens que chegarem no seu número aparecem aqui.")
            : t(
                "connectHint",
                "Conecte o seu número por QR Code e atenda as conversas do WhatsApp sem sair da Freelandoo."
              )}
        </p>
        {!connected && info?.configured !== false && (
          <button
            type="button"
            onClick={onConnect}
            className="mt-5 bg-gradient-to-br from-yellow-400 to-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
          >
            {t("connectCta", "Conectar meu WhatsApp")}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-white/[0.07] bg-black/20 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={inbox.closeConversation}
          className="text-white/60 hover:text-white md:hidden"
          aria-label={t("back", "Voltar")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A2218] text-xs font-bold text-white/80">
          {active.is_group ? (
            <Users className="h-4 w-4" />
          ) : (
            (active.title || "?").trim().slice(0, 2).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {active.title || t("unknownContact", "Contato sem nome")}
          </p>
          <p className="truncate text-[11px] text-white/50">
            {active.is_group ? t("groupLabel", "Grupo") : active.phone_display}
            {" · "}
            <span className={connected ? "text-emerald-400" : "text-white/40"}>
              {connected ? t("statusConnected", "conectado") : t("statusDisconnected", "desconectado")}
            </span>
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {threadLoading && messages.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-white/40">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("loadingThread", "Carregando conversa…")}
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id_message || m.wa_message_id || `${m.sent_at}-${i}`}
              className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] border px-3 py-2 text-sm",
                  m.direction === "out"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/90"
                )}
              >
                {m.sender_label && (
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                    {m.sender_label}
                  </p>
                )}
                <div className="whitespace-pre-wrap break-words">
                  {MEDIA_KINDS.has(m.media_type) ? <MediaBubble message={m} /> : m.body}
                </div>
                <p className="mt-1 text-right text-[10px] text-white/35">
                  {new Date(m.sent_at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        {threadError && <p className="py-2 text-center text-xs text-red-400">{threadError}</p>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/[0.07] bg-black/20 px-3 py-3">
        {connected ? (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void submit()
                }
              }}
              rows={1}
              placeholder={t("composerPlaceholder", "Escreva a resposta")}
              className="max-h-32 min-h-[40px] flex-1 resize-none border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#F2B705]/50"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={sending || !draft.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 text-black transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              aria-label={t("send", "Enviar")}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          // Sem sessão aberta o envio seria recusado pelo backend. Dizer isso
          // aqui, com o caminho de volta, é melhor que um campo que engole o
          // texto e devolve erro depois.
          <button
            type="button"
            onClick={onConnect}
            className="w-full border border-white/15 px-3 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:border-[#F2B705]/60 hover:text-[#F2B705]"
          >
            {t("reconnectToReply", "Reconecte o WhatsApp para responder")}
          </button>
        )}
      </div>
    </div>
  )
}
