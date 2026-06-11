"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Check, Send } from "lucide-react"
import {
  LoadingState,
  PageShell,
  TabloidPageIntro,
  TABLOID_ACTION_CLASSES,
} from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

const REQUESTABLE: Array<{ key: string; labelKey: string; label: string; hintKey?: string; hint?: string }> = [
  { key: "can_view_feed", labelKey: "permViewFeed", label: "Ver o feed" },
  { key: "can_post_feed", labelKey: "permPostFeed", label: "Postar no feed" },
  { key: "can_use_bees", labelKey: "permUseBees", label: "Usar Bees" },
  { key: "can_watch_courses", labelKey: "permWatchCourses", label: "Assistir cursos" },
  { key: "can_sell_courses", labelKey: "permSellCourses", label: "Vender cursos", hintKey: "permSellCoursesHintReq", hint: "Permite publicar cursos para venda" },
  { key: "can_message", labelKey: "permSendMessages", label: "Enviar mensagens" },
  { key: "can_receive_messages", labelKey: "permReceiveMessages", label: "Receber mensagens" },
  { key: "can_use_global_chat", labelKey: "permGlobalChat", label: "Chat global" },
  { key: "can_use_machine_chat", labelKey: "permSwarmChat", label: "Chat de enxames" },
]

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ParentalRequestPage() {
  const t = useTranslations("Account")
  const router = useRouter()
  const [selected, setSelected] = useState<string>("can_sell_courses")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [isMinor, setIsMinor] = useState<boolean | null>(null)

  const checkSelf = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        router.push("/login")
        return
      }
      const data = await res.json()
      setIsMinor(!!data?.is_minor)
      if (!data?.is_minor) router.push("/account")
    } catch {
      router.push("/account")
    }
  }, [router])

  useEffect(() => {
    checkSelf()
  }, [checkSelf])

  const submit = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/supervision/me/request-permission", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ permission_key: selected, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || t("sendRequestError", "Falha ao enviar pedido"))
        return
      }
      setSent((prev) => new Set(prev).add(selected))
      setNote("")
    } catch {
      setError(t("connectionError", "Erro de conexão. Tente novamente."))
    } finally {
      setSending(false)
    }
  }

  if (isMinor === null) {
    return (
      <PageShell className="tabloid-account-page md:pl-[80px]">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label={t("loading", "Carregando...")} />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="tabloid-account-page md:pl-[80px]">
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <TabloidPageIntro
          eyebrow={t("parentalEyebrow", "Supervisão")}
          title={t("requestPermissionTitle", "PEDIR PERMISSÃO.")}
          subtitle={t("requestPermissionSubtitle", "Envie um pedido ao responsável para liberar uma ação bloqueada.")}
          back={
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back", "Voltar")}
            </button>
          }
          className="mb-8"
        />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-[6px] border-2 border-red-500/35 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <article className="fl-card fl-hard rounded-[6px] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black text-[var(--fl-ink)]">{t("whichPermission", "Qual permissão você quer?")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#5b554b]">
              {t("requestPermissionHelp", "O responsável recebe a notificação e decide se libera. Você pode incluir um recado.")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REQUESTABLE.map((item) => {
              const isSent = sent.has(item.key)
              const isSelected = selected === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item.key)}
                  className={`flex items-start gap-2 rounded-[4px] border-2 p-3 text-left transition ${
                    isSelected
                      ? "border-[#0B0B0D] bg-[#F2B705]/20"
                      : "border-[#0B0B0D]/12 bg-white hover:border-[#0B0B0D]/35"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--fl-ink)]">{t(item.labelKey, item.label)}</p>
                    {item.hint && item.hintKey && <p className="text-xs text-[#5b554b]">{t(item.hintKey, item.hint)}</p>}
                  </div>
                  {isSent && <Check className="h-4 w-4 shrink-0 text-green-700" />}
                </button>
              )
            })}
          </div>

          <div className="mt-5">
            <label htmlFor="note" className="fl-label">
              {t("noteToGuardian", "Recado para o responsável (opcional)")}
            </label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder", "Ex.: Quero publicar um curso de violão. Posso?")}
              maxLength={280}
              className="fl-input resize-none"
            />
            <p className="mt-1 text-[10px] font-bold text-[#756d5f]">{note.length}/280</p>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={sending || !selected}
              className={TABLOID_ACTION_CLASSES}
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? t("sending", "Enviando...") : t("sendRequest", "Enviar pedido")}
            </button>
          </div>

          {sent.size > 0 && (
            <div className="mt-5 rounded-xl border-2 border-green-800/30 bg-green-100 p-3 text-sm font-bold text-green-800">
              {t("requestSent", "Pedido enviado. O responsável vai receber uma notificação.")}
            </div>
          )}
        </article>
      </main>
    </PageShell>
  )
}
