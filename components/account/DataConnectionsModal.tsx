"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Database, Loader2, Plus, ShieldAlert, Trash2, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

interface DataConnection {
  id_connection: string
  name: string
  token_prefix: string
  status: "active" | "revoked"
  last_used_at: string | null
  last_ip: string | null
  created_at: string
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function DataConnectionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("DataConnections")
  const locale = useLocale()
  const [items, setItems] = useState<DataConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/me/data-connections", { headers: authHeaders(), cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "err")
      setItems(Array.isArray(data?.connections) ? data.connections : [])
    } catch {
      setError(t("loadError", "Erro ao carregar conexões"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (open) {
      setNewToken(null)
      setCreating(false)
      void load()
    }
  }, [open, load])

  const handleCreate = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/me/data-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "err")
      setNewToken(data?.token || null)
      setCreating(false)
      setName("")
      void load()
    } catch (e) {
      setError(e instanceof Error && e.message !== "err" ? e.message : t("createError", "Erro ao criar conexão"))
    } finally {
      setSaving(false)
    }
  }, [name, load, t])

  const handleRevoke = useCallback(
    async (id: string) => {
      if (!window.confirm(t("revokeConfirm", "Revogar esta conexão? O software conectado perde o acesso na hora."))) return
      setRevoking(id)
      try {
        const res = await fetch(`/api/me/data-connections/${id}/revoke`, {
          method: "POST",
          headers: authHeaders(),
        })
        if (!res.ok) throw new Error("err")
        void load()
      } catch {
        setError(t("revokeError", "Erro ao revogar"))
      } finally {
        setRevoking(null)
      }
    },
    [load, t]
  )

  const handleCopy = useCallback(async () => {
    if (!newToken) return
    try {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }, [newToken])

  const fmtDate = useCallback(
    (iso: string | null) => {
      if (!iso) return t("never", "nunca")
      return new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    },
    [locale, t]
  )

  if (!open) return null

  const activeItems = items.filter((c) => c.status === "active")

  return (
    <div className="fl-sharp fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg border-2 border-[#F1EDE2]/15 bg-[#141009] text-[#F5F1E8] shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-[#F1EDE2]/12 px-5 py-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#F2B705]" />
            <h2 className="fl-display text-xl leading-none text-[#F2B705]">
              {t("title", "Conexões de Dados")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close", "Fechar")} className="p-1 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {newToken ? (
            <div className="border-2 border-[#F2B705]/40 bg-[#F2B705]/5 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#F2B705]">
                <ShieldAlert className="h-4 w-4" />
                {t("tokenOnceTitle", "Guarde este token agora")}
              </p>
              <p className="mt-2 text-xs text-white/70">
                {t("tokenOnceHint", "Ele não será mostrado de novo. Cole no seu ERP/BI ou painel externo.")}
              </p>
              <div className="mt-3 flex items-stretch gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap border border-white/15 bg-black/40 px-3 py-2 text-xs">
                  {newToken}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 border border-[#F2B705] bg-[#F2B705] px-3 text-xs font-bold text-black"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t("copied", "Copiado") : t("copy", "Copiar")}
                </button>
              </div>
              <button type="button" onClick={() => setNewToken(null)} className="mt-3 text-xs text-white/50 underline">
                {t("tokenDone", "Já guardei, voltar à lista")}
              </button>
            </div>
          ) : creating ? (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#8a8275]">
                {t("nameLabel", "Nome da conexão")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("namePlaceholder", "Ex.: Meu painel de BI")}
                className="mt-1 w-full border-2 border-[#F1EDE2]/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#F2B705]/60"
              />
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || name.trim().length < 2}
                  className="inline-flex items-center gap-1.5 border-2 border-[#F2B705] bg-[#F2B705] px-4 py-2 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {t("createSubmit", "Gerar token")}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="border-2 border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider text-white/60"
                >
                  {t("cancel", "Cancelar")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs leading-relaxed text-white/60">
                {t(
                  "intro",
                  "Gere um token e cole num software externo (ERP, BI, planilha) para ele LER os dados da sua conta: perfis, serviços, cursos, produtos, redes sociais, nível e métricas. Somente leitura — nunca altera nada e não expõe dados financeiros."
                )}
              </p>
              {error && <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : activeItems.length === 0 ? (
                <p className="py-6 text-center text-xs text-white/40">{t("empty", "Nenhuma conexão ativa.")}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {activeItems.map((c) => (
                    <li key={c.id_connection} className="border-2 border-[#F1EDE2]/12 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{c.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-white/45">{c.token_prefix}…</p>
                          <p className="mt-1 text-[11px] text-white/50">
                            {t("lastUsed", "último uso:")} {fmtDate(c.last_used_at)}
                            {c.last_ip ? ` (${c.last_ip})` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevoke(c.id_connection)}
                          disabled={revoking === c.id_connection}
                          className="inline-flex items-center gap-1 border border-red-500/40 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-300 disabled:opacity-40"
                        >
                          {revoking === c.id_connection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          {t("revoke", "Revogar")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setCreating(true)}
                disabled={activeItems.length >= 3}
                className="mt-4 inline-flex items-center gap-1.5 border-2 border-[#F2B705] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#F2B705] disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("newConnection", "Nova conexão")}
              </button>
              {activeItems.length >= 3 && (
                <p className="mt-2 text-[11px] text-white/40">{t("limitHint", "Limite de 3 conexões ativas. Revogue uma para criar outra.")}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
