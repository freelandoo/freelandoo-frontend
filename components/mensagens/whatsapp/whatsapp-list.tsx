"use client"

import { Loader2, MessageSquare, Plug, Users } from "lucide-react"
import { TabloidSearch } from "@/components/tabloide/pieces"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import type { WhatsappInbox } from "./use-whatsapp-inbox"

/**
 * A coluna esquerda da aba WhatsApp: o estado da conexão em cima, as conversas
 * embaixo.
 *
 * ─── O CARTÃO DE CONEXÃO FICA AQUI, E SEMPRE ────────────────────────────────
 *
 * Ele não some depois de conectar. É por ele que a pessoa confere QUAL número
 * está ligado antes de responder por ele, e é por ele que ela desconecta —
 * esconder a saída depois da entrada é o erro que a regra do "porta de saída
 * trancada" evita do lado do backend.
 */

function relativeTime(iso: string | null, locale: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days < 7) return d.toLocaleDateString(locale, { weekday: "short" })
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
}

/**
 * Esqueleto de carregamento. Escrito aqui e não importado de `components/ui`:
 * o kit tabloide é a fronteira desta pasta, e um retângulo pulsando não merece
 * uma peça nova no kit.
 */
function Bar({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse bg-white/10", className)} />
}

export function WhatsappList({
  inbox,
  onConnect,
}: {
  inbox: WhatsappInbox
  onConnect: () => void
}) {
  const t = useTranslations("Whatsapp")
  const locale = useLocale()
  const { info, conversations, listLoading, listError, search, setSearch, activeId } = inbox

  const connected = info?.status === "connected"
  // Sem ENV de Evolution não existe conexão possível nesta instalação: dizer
  // isso é melhor que oferecer um botão que só falha depois do clique.
  const unconfigured = info ? !info.configured : false
  // Caiu por inatividade: a tela DIZ o motivo. O provider de i18n não
  // interpola, então o número de dias entra por replace, como no resto da casa.
  const idleCut = !connected && info?.disconnect_reason === "idle"
  const idleNotice = t(
    "idleDisconnected",
    "Desconectamos o seu WhatsApp porque a caixa ficou {days} dias sem uso. Nada foi perdido: reconecte para voltar a receber por aqui."
  ).replace("{days}", String(info?.idle_days ?? 30))

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        {unconfigured ? (
          <p className="border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
            {t(
              "notConfigured",
              "A integração com o WhatsApp ainda não está disponível nesta instalação."
            )}
          </p>
        ) : connected ? (
          <button
            type="button"
            onClick={onConnect}
            className="flex w-full items-center gap-2 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/15"
          >
            <span className="h-2 w-2 shrink-0 bg-emerald-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                {t("connectedChip", "WhatsApp conectado")}
              </span>
              {info?.number && (
                <span className="block truncate text-[11px] text-white/50">{info.number}</span>
              )}
            </span>
          </button>
        ) : (
          <>
            {idleCut && (
              <p className="mb-2 border-l-2 border-[#F2B705] bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-white/60">
                {idleNotice}
              </p>
            )}
            <button
              type="button"
              onClick={onConnect}
              className="flex w-full items-center justify-center gap-2 bg-gradient-to-br from-yellow-400 to-amber-500 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-[1.01]"
            >
              <Plug className="h-3.5 w-3.5" />
              {idleCut ? t("reconnectCta", "Reconectar meu WhatsApp") : t("connectCta", "Conectar meu WhatsApp")}
            </button>
          </>
        )}
      </div>

      <TabloidSearch
        sticky
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder", "Buscar contato ou número")}
        clearLabel={t("clearSearch", "Limpar busca")}
      />

      <div className="flex-1 overflow-y-auto">
        {listLoading && conversations.length === 0 ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-3 w-3/4" />
                  <Bar className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listError ? (
          <p className="p-6 text-center text-sm text-red-400">{listError}</p>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm font-semibold text-white/80">
              {connected
                ? t("emptyConnectedTitle", "Nenhuma conversa ainda")
                : t("emptyDisconnectedTitle", "Conecte o seu WhatsApp")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              {connected
                ? t(
                    "emptyConnectedHint",
                    "Quando alguém te escrever no WhatsApp, a conversa aparece aqui."
                  )
                : t(
                    "emptyDisconnectedHint",
                    "Leia o QR Code com o seu celular e atenda as suas conversas aqui dentro."
                  )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {conversations.map((c) => (
              <li key={c.id_conversation}>
                <button
                  type="button"
                  onClick={() => inbox.openConversation(c.id_conversation)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                    activeId === c.id_conversation && "bg-white/5"
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2218] text-xs font-bold text-white/80">
                    {c.is_group ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      (c.title || "?").trim().slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {c.title || t("unknownContact", "Contato sem nome")}
                      </span>
                      <span className="shrink-0 text-[10px] text-white/40">
                        {relativeTime(c.last_message_at, locale)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-xs",
                          c.unread_count > 0 ? "text-white" : "text-white/50"
                        )}
                      >
                        {c.last_message_preview || c.phone_display}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread_count}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {listLoading && conversations.length > 0 && (
          <p className="flex items-center justify-center gap-2 py-3 text-xs text-white/40">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("updating", "Atualizando…")}
          </p>
        )}
      </div>
    </div>
  )
}
