"use client"

// Chave de parceiro da academia (mig 296 do backend) — o software da academia
// (o Coliseu) usa esta chave para criar/vincular a conta do aluno pela API
// `/partner/v1`. Espelha o card de token do Coliseu: a chave crua aparece UMA
// vez (o backend guarda só o hash); rotacionar invalida a anterior na hora,
// então pede confirmação.

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Copy, KeyRound, Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { BTN_DARK, BTN_GOLD, H_SECTION, PANEL } from "./academy-ui"

type KeyStatus = { existe: boolean; criado_em: string | null }

export function PartnerKeyCard({ academyId }: { academyId: string }) {
  const t = useTranslations("Academies")
  const locale = useLocale()
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [chave, setChave] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    let alive = true
    fetch(`/api/academies/${academyId}/partner-key`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setStatus({ existe: !!d.existe, criado_em: d.criado_em || null })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [academyId, authHeaders])

  const generate = useCallback(async () => {
    setGenerating(true)
    setConfirming(false)
    setCopied(false)
    try {
      const res = await fetch(`/api/academies/${academyId}/partner-key`, { method: "POST", headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.chave !== "string") throw new Error(data?.error || "")
      setChave(data.chave)
      setStatus({ existe: true, criado_em: data.criado_em || new Date().toISOString() })
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("partnerKeyError", "Falha ao gerar a chave"))
    } finally {
      setGenerating(false)
    }
  }, [academyId, authHeaders, t])

  const copy = useCallback(async () => {
    if (!chave) return
    try {
      await navigator.clipboard.writeText(chave)
      setCopied(true)
      toast.success(t("partnerKeyCopied", "Chave copiada"))
    } catch {
      toast.error(t("partnerKeyCopyError", "Não deu para copiar — selecione e copie à mão"))
    }
  }, [chave, t])

  return (
    <section className={`${PANEL} mt-4 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H_SECTION}>
          <KeyRound className="h-4 w-4 text-[#FB923C]" />
          {t("partnerKeyTitle", "Chave de parceiro (Coliseu)")}
        </h2>
        {status && (
          <span
            className={`border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase ${
              status.existe ? "bg-[#4fc95a] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"
            }`}
          >
            {status.existe ? t("partnerKeyActive", "Chave ativa") : t("partnerKeyNever", "Nunca gerada")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-[#9A938A]">
        {t(
          "partnerKeyIntro",
          "O software da academia usa esta chave para criar a conta dos alunos na Freelandoo e acompanhar foto, situação e treino."
        )}
      </p>

      {status?.existe && !chave && status.criado_em && (
        <p className="mt-2 text-[11px] text-[#9A938A]">
          {t("partnerKeyCreatedAt", "Gerada em {date}").replace(
            "{date}",
            new Date(status.criado_em).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
          )}
        </p>
      )}

      {chave && (
        <div className="mt-3 border-2 border-[#FB923C] bg-[#1D1810] p-3">
          <p className="text-[11px] font-extrabold uppercase text-[#FB923C]">
            {t("partnerKeyOnce", "Copie agora — esta chave não será mostrada de novo")}
          </p>
          <code className="mt-2 block select-all break-all font-mono text-xs text-[#F5F1E8]">{chave}</code>
          <button type="button" onClick={() => void copy()} className={`${BTN_GOLD} mt-3 px-4 py-2 text-xs`}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("partnerKeyCopiedCta", "Copiada") : t("partnerKeyCopyCta", "Copiar chave")}
          </button>
        </div>
      )}

      {!chave && status && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {status.existe && !confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
              {t("partnerKeyRotate", "Rotacionar chave")}
            </button>
          ) : status.existe && confirming ? (
            <>
              <button type="button" onClick={() => void generate()} disabled={generating} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("partnerKeyRotateConfirm", "Confirmar rotação")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="px-2 py-2 text-xs text-[#9A938A] hover:text-[#F5F1E8]">
                {t("partnerKeyCancel", "Cancelar")}
              </button>
              <p className="basis-full text-[11px] text-[#FB923C]">
                {t(
                  "partnerKeyRotateWarn",
                  "A chave atual para de valer na hora — a integração fica fora até a nova ser colada no sistema da academia."
                )}
              </p>
            </>
          ) : (
            <button type="button" onClick={() => void generate()} disabled={generating} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("partnerKeyGenerate", "Gerar chave")}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
