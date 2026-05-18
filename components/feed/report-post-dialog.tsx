"use client"

import { useState } from "react"
import { Flag, Loader2, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

const REASONS: { value: string; label: string; i18nKey: string }[] = [
  { value: "spam",            label: "Spam",                       i18nKey: "reasonSpam" },
  { value: "fraud",           label: "Golpe / fraude",             i18nKey: "reasonFraud" },
  { value: "harassment",      label: "Assédio / ofensa",           i18nKey: "reasonHarassment" },
  { value: "inappropriate",   label: "Conteúdo impróprio",         i18nKey: "reasonInappropriate" },
  { value: "hate",            label: "Discurso de ódio",           i18nKey: "reasonHateSpeech" },
  { value: "forbidden_item",  label: "Produto/serviço proibido",   i18nKey: "reasonForbiddenItem" },
  { value: "personal_data",   label: "Dados pessoais",             i18nKey: "reasonPersonalData" },
  { value: "other",           label: "Outro",                      i18nKey: "reasonOther" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { reason_category: string; reason: string }) => Promise<void>
}

export function ReportPostDialog({ open, onOpenChange, onSubmit }: Props) {
  const t = useTranslations("Post")
  const [category, setCategory] = useState("spam")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!open) return null

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ reason_category: category, reason: reason.trim() })
      setSent(true)
      setReason("")
      setCategory("spam")
      setTimeout(() => {
        setSent(false)
        onOpenChange(false)
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reportFailureError", "Falha {status}").replace("{status}", ""))
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
          aria-label={t("closeButton", "Fechar")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2 className="inline-flex items-center gap-2 text-lg font-bold">
          <Flag className="h-4 w-4 text-amber-300" aria-hidden /> {t("reportPostTitle", "Denunciar publicação")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("reportInfoText", "A moderação revisa todas as denúncias. Posts com várias denúncias podem ser ocultados.")}
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
              {t(r.i18nKey, r.label)}
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
        {sent && <p className="mt-3 text-sm text-emerald-300">{t("reportSentSuccess", "Denúncia enviada. Obrigado.")}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            {t("cancelButton", "Cancelar")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || sent}
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
