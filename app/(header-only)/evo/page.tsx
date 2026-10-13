"use client"

/**
 * VINCULAR O APP EVO BRAZIL (mig 278) — `/evo`.
 *
 * O jogo virou app Android à parte. Dentro do app não há senha: a pessoa abre
 * esta página no navegador do celular (onde já está logada na Freelandoo), lê
 * o código e digita no app — ou aperta "Abrir no app", que devolve o código
 * pelo link `evobrazil://vincular?code=…`.
 *
 * O endereço é curto de propósito (`/evo`): o app pede para a pessoa DIGITAR
 * este endereço no navegador quando não consegue abri-lo sozinho.
 *
 * ⚠️ O código vale 5 minutos e UMA troca. Gerar outro mata o anterior (é o
 * backend que decide — esta tela só mostra e conta o tempo).
 *
 * Embaixo, os aparelhos com a conta vinculada: desligar um aqui faz o app
 * daquele aparelho cair para a tela de vincular na próxima abertura.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Copy, Loader2, RefreshCw, Smartphone, Trash2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { copyText } from "@/lib/clipboard"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"

type Code = { code: string; expires_at: string; ttl_seconds: number }
type Session = {
  id_app_session: string
  app: string
  device_label: string | null
  created_at: string
  last_used_at: string
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E] p-5 shadow-[6px_6px_0_0_#F2B705]"

export default function EvoAppLinkPage() {
  const t = useTranslations("EvoApp")
  const locale = useLocale()
  const [logged, setLogged] = useState<boolean | null>(null)
  const [code, setCode] = useState<Code | null>(null)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sessions, setSessions] = useState<Session[] | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const r = await api<{ sessions: Session[] }>("/api/me/app-sessions")
      setSessions(r.sessions)
    } catch {
      setSessions([])
    }
  }, [])

  const generate = useCallback(async () => {
    setBusy(true)
    setErr(null)
    setCopied(false)
    try {
      const r = await api<Code>("/api/me/app-link-code", { method: "POST" })
      setCode(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("genError", "Não foi possível gerar o código."))
    } finally {
      setBusy(false)
    }
  }, [t])

  // Sessão lida do navegador num efeito (no servidor não há localStorage).
  useEffect(() => {
    const ok = !!getToken()
    setLogged(ok)
    if (ok) {
      void generate()
      void loadSessions()
    }
  }, [generate, loadSessions])

  // Contagem regressiva a partir da validade que o BACKEND devolveu.
  useEffect(() => {
    if (!code) return
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(code.expires_at).getTime() - Date.now()) / 1000))
      setLeft(s)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [code])

  // O app consumiu o código? A lista de aparelhos é o único sinal que a
  // página tem — confere a cada 5 s enquanto o código está vivo.
  useEffect(() => {
    if (!code || left <= 0) return
    const id = window.setInterval(() => void loadSessions(), 5000)
    return () => window.clearInterval(id)
  }, [code, left, loadSessions])

  async function revoke(id: string) {
    if (!window.confirm(t("revokeConfirm", "Desligar este aparelho? O app dele vai pedir um código novo."))) return
    try {
      await api(`/api/me/app-sessions/${encodeURIComponent(id)}`, { method: "DELETE" })
      await loadSessions()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("revokeError", "Não foi possível desligar o aparelho."))
    }
  }

  async function copy() {
    if (!code) return
    if (await copyText(code.code.replace("-", ""))) setCopied(true)
  }

  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso)
    )
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
  const expired = !!code && left <= 0
  const deepLink = code ? `evobrazil://vincular?code=${encodeURIComponent(code.code.replace("-", ""))}` : "#"

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageBackLink href="/account" className="mb-5" />

        <header className="mb-6 flex items-start gap-4">
          <Smartphone className="mt-1 h-8 w-8 shrink-0 text-[#F2B705]" />
          <div>
            <h1 className="fl-display text-3xl">{t("title", "Vincular o app EVO Brazil")}</h1>
            <p className="mt-2 text-sm text-[#9A938A]">
              {t(
                "intro",
                "Abra o app EVO Brazil no celular e digite o código abaixo na tela \"Vincular conta\". Ele vale 5 minutos e uma vez só."
              )}
            </p>
          </div>
        </header>

        {err && (
          <p role="alert" className="mb-4 border-2 border-[#0B0B0D] bg-[#3B1D1D] px-3 py-2 text-sm text-[#F5C8C8]">
            {err}
          </p>
        )}

        {logged === false ? (
          <section className={PANEL}>
            <p className="text-sm">{t("needLogin", "Entre na sua conta da Freelandoo para gerar o código.")}</p>
            <Link
              href="/login?next=/evo"
              className="mt-4 inline-flex h-11 items-center border-2 border-[#0B0B0D] bg-[#F2B705] px-5 text-sm font-bold uppercase tracking-wider text-[#0B0B0D]"
            >
              {t("login", "Entrar")}
            </Link>
          </section>
        ) : (
          <section className={PANEL}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9A938A]">{t("codeLabel", "Seu código")}</p>
            {!code ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[#9A938A]">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("generating", "Gerando…")}
              </div>
            ) : (
              <>
                <p
                  className={`fl-display mt-3 select-all text-center text-5xl tracking-[0.2em] sm:text-6xl ${
                    expired ? "text-[#9A938A] line-through" : "text-[#F2B705]"
                  }`}
                  aria-live="polite"
                >
                  {code.code}
                </p>
                <p className="mt-3 text-center text-sm text-[#9A938A]">
                  {expired ? t("expired", "Este código venceu. Gere outro.") : t("expiresIn", "Vence em {time}").replace("{time}", mmss)}
                </p>
              </>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {code && !expired && (
                <a
                  href={deepLink}
                  className="inline-flex h-11 items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                >
                  <Smartphone className="h-4 w-4" /> {t("openApp", "Abrir no app")}
                </a>
              )}
              {code && !expired && (
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="inline-flex h-11 items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 text-sm font-bold uppercase tracking-wider"
                >
                  <Copy className="h-4 w-4" /> {copied ? t("copied", "Copiado") : t("copy", "Copiar")}
                </button>
              )}
              <button
                type="button"
                onClick={() => void generate()}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t("another", "Gerar outro")}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-[#9A938A]">
              {t("openAppHint", "\"Abrir no app\" só funciona no celular com o EVO Brazil instalado.")}
            </p>
          </section>
        )}

        {logged && (
          <section className={`${PANEL} mt-6`}>
            <h2 className="fl-display text-xl">{t("devicesTitle", "Aparelhos vinculados")}</h2>
            {sessions === null ? (
              <p className="mt-3 text-sm text-[#9A938A]">{t("loading", "Carregando…")}</p>
            ) : sessions.length === 0 ? (
              <p className="mt-3 text-sm text-[#9A938A]">{t("noDevices", "Nenhum aparelho vinculado ainda.")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#0B0B0D]">
                {sessions.map((s) => (
                  <li key={s.id_app_session} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.device_label || t("unknownDevice", "Aparelho sem nome")}</p>
                      <p className="text-xs text-[#9A938A]">
                        {t("lastUsed", "Último uso: {date}").replace("{date}", date(s.last_used_at))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void revoke(s.id_app_session)}
                      aria-label={t("revoke", "Desligar")}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#3B1D1D] px-3 text-xs font-bold uppercase tracking-wider text-[#F5C8C8]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("revoke", "Desligar")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
