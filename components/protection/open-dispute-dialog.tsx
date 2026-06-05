"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, X } from "lucide-react"

type Domain = "product" | "booking"

const PRODUCT_REASONS: { value: string; label: string }[] = [
  { value: "product_not_arrived", label: "Não chegou" },
  { value: "product_wrong", label: "Chegou errado" },
  { value: "product_defective", label: "Chegou com defeito" },
  { value: "scam", label: "Golpe / fraude" },
  { value: "other", label: "Outro motivo" },
]
const BOOKING_REASONS: { value: string; label: string }[] = [
  { value: "service_no_show", label: "Prestador não apareceu" },
  { value: "scam", label: "Golpe / fraude" },
  { value: "other", label: "Outro motivo" },
]

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function OpenDisputeDialog({
  domain,
  refId,
  open,
  onClose,
}: {
  domain: Domain
  refId: number | string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const reasons = domain === "product" ? PRODUCT_REASONS : BOOKING_REASONS
  const [reason, setReason] = useState(reasons[0].value)
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submit = async () => {
    const token = getToken()
    if (!token) { setError("Faça login novamente."); return }
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("domain", domain)
      fd.append("ref_id", String(refId))
      fd.append("reason_code", reason)
      if (description.trim()) fd.append("description", description.trim())
      files.slice(0, 5).forEach((f) => fd.append("photos", f))
      const res = await fetch("/api/me/disputes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || "Falha ao abrir disputa")
      // Vai pra página self-service da disputa.
      if (d?.dispute?.id) router.push(`/account/disputas/${d.dispute.id}`)
      else onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir disputa")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fl-root fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
      <div className="fl-paper-card relative w-full max-w-lg rounded-[6px] border-2 border-[#0B0B0D] p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#3F3F46] hover:bg-black/10"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[4px] border-2 border-[#0B0B0D] bg-[#FEF3C7] text-[#854D0E]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-black text-[var(--fl-ink)]">Tive um problema</h2>
        </div>
        <p className="mb-4 text-xs text-[#5b554b]">
          Conte o que aconteceu. Se for produto errado ou com defeito, geramos a etiqueta
          de devolução automaticamente — o reembolso sai quando o produto voltar à origem.
        </p>

        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[#3F3F46]">Motivo</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-[4px] border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm"
        >
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[#3F3F46]">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Descreva o problema..."
          className="mb-3 w-full rounded-[4px] border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[#3F3F46]">Fotos (até 5)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
          className="mb-2 block w-full text-xs"
        />
        {files.length > 0 && (
          <p className="mb-3 text-[11px] text-[#756d5f]">{files.length} foto(s) selecionada(s)</p>
        )}

        {error && (
          <div className="mb-3 rounded-[4px] border-2 border-[#BE123C] bg-[#FFE4E6] px-3 py-2 text-xs font-bold text-[#9F1239]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border-2 border-[#0B0B0D] px-4 py-2 text-sm font-black text-[var(--fl-ink)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-[4px] border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-sm font-black text-[#1A1505] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Abrir disputa
          </button>
        </div>
      </div>
    </div>
  )
}
