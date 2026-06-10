"use client"

import { useEffect, useState } from "react"
import { Star, Loader2, Check } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Props = {
  profileId: string
}

export function RateProfile({ profileId }: Props) {
  const t = useTranslations("Profile")
  const [canRate, setCanRate] = useState<boolean | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [hover, setHover] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) { setCanRate(false); return }
    fetch(`/api/ranking/can-rate/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setCanRate(!!d.can_rate))
      .catch(() => setCanRate(false))
  }, [profileId])

  if (canRate !== true) return null

  const submit = async () => {
    if (!rating) { setError(t("rateSelectStars", "Selecione de 1 a 5 estrelas.")); return }
    const token = localStorage.getItem("token")
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/ranking/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_profile: profileId, rating, comment: comment.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("rateError", "Erro ao avaliar"))
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("rateError", "Erro ao avaliar"))
    } finally {
      setSubmitting(false)
    }
  }

  const display = hover || rating

  return (
    <div className="rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D] space-y-3">
      <div>
        <h3 className="fl-display text-xl text-[#0B0B0D]">{t("rateTitle", "Avalie este profissional")}</h3>
        <p className="text-xs text-[#5b554b]">
          {t("rateSubtitle", "Você tem um agendamento pago e pode deixar uma avaliação.")}
        </p>
      </div>

      {done ? (
        <p className="flex items-center gap-2 text-sm font-bold text-[#16683f]">
          <Check className="h-4 w-4" />
          {t("rateSent", "Avaliação enviada. Obrigado!")}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const v = i + 1
              const filled = v <= display
              return (
                <button
                  key={v}
                  type="button"
                  onMouseEnter={() => setHover(v)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(v)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${v} ${v > 1 ? t("starsPlural", "estrelas") : t("starSingular", "estrela")}`}
                >
                  <Star
                    className="h-7 w-7"
                    style={{
                      fill: filled ? "#E0A500" : "transparent",
                      color: filled ? "#E0A500" : "rgba(11,11,13,0.3)",
                    }}
                  />
                </button>
              )
            })}
            {rating > 0 && (
              <span className="ml-2 text-sm font-bold tabular-nums text-[#0B0B0D]">{rating}/5</span>
            )}
          </div>

          <textarea
            placeholder={t("commentOptional", "Comentário (opcional)")}
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="fl-input resize-none"
          />

          {error && <p className="text-xs font-medium text-[#b91c1c]">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !rating}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50 sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("sendRating", "Enviar avaliação")}
          </button>
        </>
      )}
    </div>
  )
}
