"use client"

import { useEffect, useState } from "react"
import { Star, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  profileId: string
}

export function RateProfile({ profileId }: Props) {
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
    if (!rating) { setError("Selecione de 1 a 5 estrelas."); return }
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
      if (!res.ok) throw new Error(data.error || "Erro ao avaliar")
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao avaliar")
    } finally {
      setSubmitting(false)
    }
  }

  const display = hover || rating

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Avalie este profissional</h3>
        <p className="text-xs text-muted-foreground">
          Você tem um agendamento pago e pode deixar uma avaliação.
        </p>
      </div>

      {done ? (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          Avaliação enviada. Obrigado!
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
                  aria-label={`${v} estrela${v > 1 ? "s" : ""}`}
                >
                  <Star
                    className="h-7 w-7"
                    style={{
                      fill: filled ? "#facc15" : "transparent",
                      color: filled ? "#facc15" : "#9ca3af",
                    }}
                  />
                </button>
              )
            })}
            {rating > 0 && (
              <span className="ml-2 text-sm font-semibold tabular-nums">{rating}/5</span>
            )}
          </div>

          <Textarea
            placeholder="Comentário (opcional)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button onClick={submit} disabled={submitting || !rating} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar avaliação
          </Button>
        </>
      )}
    </div>
  )
}
