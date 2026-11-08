"use client"

// A6: selo da nota da Classificação no perfil. Só aparece quando a pessoa
// escolheu "No meu perfil" — o servidor responde 404 em qualquer outro caso, e
// aí o selo simplesmente não desenha (sem aviso, sem espaço reservado).

import { useEffect, useState } from "react"
import { Award } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { classApi } from "@/lib/classificacao-api"

export function ClassificacaoBadge({ username }: { username: string | null | undefined }) {
  const t = useTranslations("Classificacao")
  const [score, setScore] = useState<number | null>(null)

  useEffect(() => {
    if (!username) return
    let alive = true
    classApi
      .publicByUsername(username)
      .then((r) => alive && setScore(Math.round(r.score)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [username])

  if (score == null) return null
  return (
    <div
      className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
      title={t("badgeHint", "Nota na prova de Classificação da Freelandoo (0 a 100; 50 é a média)")}
    >
      <Award className="h-4 w-4 text-[#F2B705]" />
      {t("badge", "Classificação")} <span className="tabular-nums text-[#F2B705]">{score}</span>
    </div>
  )
}
