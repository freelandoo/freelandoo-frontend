"use client"

import { useState } from "react"
import { Flag, Loader2, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

const REASONS: { value: string; i18nKey: string; defaultLabel: string }[] = [
  { value: "spam",            i18nKey: "reportReasonSpam",          defaultLabel: "Spam" },
  { value: "fraud",           i18nKey: "reportReasonFraud",         defaultLabel: "Golpe / fraude" },
  { value: "harassment",      i18nKey: "reportReasonHarassment",    defaultLabel: "Assédio / ofensa" },
  { value: "inappropriate",   i18nKey: "reportReasonInappropriate", defaultLabel: "Conteúdo impróprio" },
  { value: "hate",            i18nKey: "reportReasonHate",          defaultLabel: "Discurso de ódio" },
  { value: "forbidden_item",  i18nKey: "reportReasonForbiddenItem", defaultLabel: "Produto/serviço proibido" },
  { value: "personal_data",   i18nKey: "reportReasonPersonalData",  defaultLabel: "Dados pessoais" },
  { value: "other",           i18nKey: "reportReasonOther",         defaultLabel: "Outro" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { reason_category: string; reason: string }) => Promise<void>
}

export function ReportMessageDialog({ open, onOpenChange, onSubmit }: Props) {
  const t = useTranslations("Conversation")
  const [category, setCategory] = useState("spam")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ reason_category: category, reason: reason.trim() })
      setReason("")
      setCategory("spam")
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reportSubmitError", "Falha ao enviar"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-accent"
          aria-label={t("cancelAriaLabel", "Fechar")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2 className="inline-flex items-center gap-2 text-lg font-bold">
          <Flag className="h-4 w-4 text-amber-300" aria-hidden /> {t("reportMessageTitle", "Denunciar mensagem")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("reportMessageDescription", "A moderação revisa todas as denúncias. Mensagens com várias denúncias são ocultadas automaticamente.")}
        </p>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("reasonLabel", "Motivo")}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setCategory(r.value)}
              className={`rounded-md border px-3 py-2 text-left text-xs transition ${category === r.value ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t(r.i18nKey, r.defaultLabel)}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("detailsLabel", "Detalhes (opcional)")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 280))}
          rows={3}
          placeholder={t("detailsPlaceholder", "Descreva o que aconteceu (máx. 280 caracteres).")}
          className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            {t("cancelReportButton", "Cancelar")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Flag className="h-3 w-3" aria-hidden />}
            {t("submitReportButton", "Enviar denúncia")}
          </button>
        </div>
      </div>
    </div>
  )
}
