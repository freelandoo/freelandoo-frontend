"use client"

// POST IMPULSIONADO NO FEED (Freelandoo Ads, mig 461).
// - Etiqueta "Impulsionado" (publicidade identificada — CDC art. 36).
// - Faixa de ação pelo objetivo: Ver perfil / Chamar no WhatsApp.
// - Visualização = card ≥ 50% na tela por 1 s, uma vez por montagem (o
//   servidor ainda limita a 3 por pessoa por dia).
// - Clique no perfil / WhatsApp de dentro do card também conta.

import { memo, useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MessageCircle, Megaphone, UserRound } from "lucide-react"
import { adEvent } from "@/lib/ads-api"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedPost } from "@/lib/types/portfolio-feed"

function SponsoredFrameImpl({ post, children }: { post: FeedPost; children: ReactNode }) {
  const t = useTranslations("Ads")
  const ref = useRef<HTMLDivElement | null>(null)
  const sp = post.sponsored
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !sp) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(
      ([e]) => {
        if (counted.current) return
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            counted.current = true
            adEvent(sp.id_campaign, "impression")
          }, 1000)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { threshold: [0, 0.5] }
    )
    io.observe(el)
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest("a")
      if (!a) return
      const href = a.getAttribute("href") || ""
      if (/wa\.me|whatsapp/i.test(href)) adEvent(sp.id_campaign, "whatsapp")
      else if (post.public_profile_url && href.startsWith(post.public_profile_url)) adEvent(sp.id_campaign, "profile")
    }
    el.addEventListener("click", onClick, true)
    return () => {
      io.disconnect()
      if (timer) clearTimeout(timer)
      el.removeEventListener("click", onClick, true)
    }
  }, [sp, post.public_profile_url])

  if (!sp) return <>{children}</>
  return (
    <div ref={ref} className="relative">
      {children}
      <span className="pointer-events-none absolute right-2 top-14 z-[4] inline-flex items-center gap-1 border-2 border-black bg-[#F2B705] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000]">
        <Megaphone className="h-3 w-3" />
        {t("sponsored", "Impulsionado")}
      </span>
      {sp.objective !== "views" && (
        <motion.div
          className="flex items-center gap-2 border-b border-[#F5F1E8]/10 bg-[#0b0804] px-4 py-2.5"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#C9C2B6]">{post.profile_name}</span>
          {sp.objective === "whatsapp" && post.whatsapp_url ? (
            <a
              href={post.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              data-no-gesture
              className="inline-flex items-center gap-1.5 border-2 border-black bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-black shadow-[3px_3px_0_#000]"
            >
              <MessageCircle className="h-4 w-4" />
              {t("ctaWhats", "Chamar no WhatsApp")}
            </a>
          ) : post.public_profile_url ? (
            <Link
              href={post.public_profile_url}
              data-no-gesture
              className="inline-flex items-center gap-1.5 border-2 border-black bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-black shadow-[3px_3px_0_#000]"
            >
              <UserRound className="h-4 w-4" />
              {t("ctaProfile", "Ver perfil")}
            </Link>
          ) : null}
        </motion.div>
      )}
    </div>
  )
}

export const SponsoredFrame = memo(SponsoredFrameImpl)
