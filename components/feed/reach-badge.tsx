"use client"

// Alcance regional do post (A1, mig 328 do back) — peças usadas pelo card do
// feed e pelo card dos bees, para os dois não divergirem.
//  - ReachBadge: "até onde o seu post chegou". O back só manda `my_reach` no
//    post do DONO; para qualquer outro leitor ele vem null e nada aparece.
//  - useDislike: botão "não gostei" (um por pessoa, alternável, exclusivo com
//    a curtida). O número nunca aparece — só pesa no alcance.

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Radar } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"
import type { FeedReach } from "@/lib/types/portfolio-feed"

export function ReachBadge({ reach, variant = "dark" }: { reach?: FeedReach | null; variant?: "dark" | "overlay" }) {
  const t = useTranslations("Post")
  if (!reach) return null
  const place = reach.place || ""
  let text: string
  switch (reach.key) {
    case "country":
      text = t("reachCountry", "Seu post chegou ao Brasil todo")
      break
    case "state":
      text = t("reachState", "Seu post chegou ao seu estado · {place}").replace("{place}", place)
      break
    case "region":
      text = t("reachRegion", "Seu post chegou à sua região · {place}").replace("{place}", place)
      break
    case "area":
      text = t("reachArea", "Seu post chegou à sua área · {place}").replace("{place}", place)
      break
    default:
      text = place
        ? t("reachCity", "Seu post está na sua cidade · {place}").replace("{place}", place)
        : t("reachCityNoPlace", "Seu post está começando: cadastre sua cidade no perfil para ele subir")
  }
  return (
    <div
      className={cn(
        "fl-sharp inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[11px] font-semibold leading-tight",
        variant === "overlay"
          ? "bg-black/55 text-[#F2B705] ring-1 ring-[#F2B705]/40 backdrop-blur-sm"
          : "border border-[#F2B705]/35 bg-[#F2B705]/10 text-[#F2B705]"
      )}
      title={t("reachHint", "Só você vê. O post sobe de cidade para área, região, estado e Brasil conforme as pessoas interagem.")}
    >
      <Radar className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </div>
  )
}

/**
 * Estado do "não gostei". `endpoint` + `body` dizem onde gravar (post:
 * /api/ranking/dislike; bee: /api/bees/:id/dislike). `onUnliked` é chamado
 * quando o servidor tirou a curtida junto (exclusivos).
 */
export function useDislike({
  initial,
  endpoint,
  body,
  loginNext,
  onUnliked,
}: {
  initial: boolean
  endpoint: string
  body?: Record<string, unknown>
  loginNext: string
  onUnliked?: (likes_count: number | null) => void
}) {
  const router = useRouter()
  const [disliked, setDisliked] = useState(initial)
  const [pending, setPending] = useState(false)

  const toggle = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`)
      return
    }
    if (pending) return
    const was = disliked
    setDisliked(!was)
    setPending(true)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const now = !!data.disliked
      setDisliked(now)
      if (now) onUnliked?.(typeof data.likes_count === "number" ? data.likes_count : null)
    } catch {
      setDisliked(was)
    } finally {
      setPending(false)
    }
  }, [body, disliked, endpoint, loginNext, onUnliked, pending, router])

  return { disliked, setDisliked, toggle, pending }
}
