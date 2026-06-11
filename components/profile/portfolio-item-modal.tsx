"use client"

import { useEffect, useState } from "react"
import { Heart, Send, X, ExternalLink, Check } from "lucide-react"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Props = {
  item: PortfolioItem
  profileId: string
  onClose: () => void
  onLikeChange?: (itemId: string, liked: boolean, count: number) => void
}

export function PortfolioItemModal({ item, profileId, onClose, onLikeChange }: Props) {
  const t = useTranslations("Account")
  const [liked, setLiked] = useState<boolean>(!!item.liked_by_me)
  const [count, setCount] = useState<number>(item.likes_count ?? 0)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeMediaIdx, setActiveMediaIdx] = useState(0)

  useEffect(() => {
    setLiked(!!item.liked_by_me)
    setCount(item.likes_count ?? 0)
  }, [item.id_portfolio_item, item.liked_by_me, item.likes_count])

  const activeMedias = item.media.filter((m) => m.is_active !== false)
  const currentMedia = activeMedias[activeMediaIdx] ?? activeMedias[0]

  const { coupon: shareCoupon } = useShareCoupon()
  const baseShareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${item.id_portfolio_item}`
    : ""
  const shareUrl = shareCoupon?.code && baseShareUrl
    ? buildShareUrlWithCoupon(baseShareUrl, shareCoupon.code)
    : baseShareUrl

  const toggleLike = async () => {
    if (pending) return
    const token = localStorage.getItem("token")
    if (!token) {
      setAuthError(t("loginToLike", "Faça login para curtir."))
      return
    }
    setPending(true)
    setAuthError(null)
    const optimisticLiked = !liked
    const optimisticCount = count + (optimisticLiked ? 1 : -1)
    setLiked(optimisticLiked)
    setCount(optimisticCount)

    try {
      const res = await fetch("/api/ranking/like", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_portfolio_item: item.id_portfolio_item,
          id_profile: item.id_profile ?? profileId,
        }),
      })
      if (!res.ok) throw new Error(t("likeFailed", "Falha ao curtir"))
      const data = await res.json()
      const finalLiked = !!data.liked
      setLiked(finalLiked)
      onLikeChange?.(item.id_portfolio_item, finalLiked, optimisticCount)
    } catch {
      // rollback
      setLiked(!optimisticLiked)
      setCount(count)
      setAuthError(t("likeErrorRetry", "Erro ao registrar like. Tente novamente."))
    } finally {
      setPending(false)
    }
  }

  const share = async () => {
    if (!shareUrl) return
    const title = item.title ?? t("portfolioItemDefault", "Item de portfólio")
    const text = item.description ?? ""

    // Tenta compartilhar a imagem como arquivo (se navegador suportar)
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      currentMedia?.media_type !== "video" &&
      currentMedia?.media_url
    ) {
      try {
        const res = await fetch(currentMedia.media_url)
        if (res.ok) {
          const blob = await res.blob()
          const ext = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg")
          const file = new File([blob], `portfolio-${item.id_portfolio_item}.${ext}`, { type: blob.type })
          const shareData = { title, text, url: shareUrl, files: [file] } as ShareData & { files: File[] }
           
          const canShareFiles = typeof (navigator as any).canShare === "function" && (navigator as any).canShare({ files: [file] })
          if (canShareFiles) {
            await navigator.share(shareData)
            return
          }
        }
      } catch {
        // segue pro fallback
      }
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl })
        return
      } catch {
        // user cancelled — cai pro clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[95vh] rounded-2xl bg-[#F1EDE2] border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] overflow-hidden flex flex-col md:flex-row">
        {/* Imagem */}
        <div className="relative md:w-3/5 bg-[#0B0B0D] flex items-center justify-center min-h-[40vh] md:min-h-[60vh] md:border-r-2 md:border-[#0B0B0D]">
          {currentMedia ? (
            currentMedia.media_type === "video" ? (
              <video
                src={currentMedia.media_url}
                className="w-full h-full max-h-[80vh] object-contain"
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentMedia.media_url}
                alt={item.title ?? t("portfolioMediaAlt", "Mídia do portfólio")}
                className="w-full h-full max-h-[80vh] object-contain"
              />
            )
          ) : (
            <div className="text-[#F1EDE2]/50 text-sm">{t("noMedia", "Sem mídia")}</div>
          )}

          {/* Thumbnails secundários */}
          {activeMedias.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-full bg-black/60">
              {activeMedias.map((m, i) => (
                <button
                  key={m.id_portfolio_media}
                  onClick={() => setActiveMediaIdx(i)}
                  className={`h-2 w-2 rounded-full transition ${i === activeMediaIdx ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                  aria-label={`${t("mediaWord", "Mídia")} ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Descrição + ações */}
        <div className="md:w-2/5 flex flex-col text-[#0B0B0D]">
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#0B0B0D]/15">
            <h2 className="fl-display text-xl text-[#0B0B0D] line-clamp-1">{item.title || t("noTitle", "Sem título")}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close", "Fechar")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 px-5 py-4 overflow-y-auto space-y-4">
            {item.description ? (
              <p className="text-sm text-[#2b2b2e] whitespace-pre-line break-words">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-[#5b554b] italic">{t("noDescriptionDot", "Sem descrição.")}</p>
            )}

            {item.project_url && (
              <a
                href={item.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#E0A500] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("viewProject", "Ver projeto")}
              </a>
            )}

            {authError && <p className="text-xs font-medium text-[#b91c1c]">{authError}</p>}
          </div>

          <div className="px-5 py-4 border-t-2 border-[#0B0B0D]/15 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              disabled={pending}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${liked ? "fl-btn-gold" : "fl-btn-card"}`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {count} {count === 1 ? t("likeSingular", "like") : t("likePlural", "likes")}
            </button>
            <button
              type="button"
              onClick={share}
              className="fl-btn-card inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
            >
              {copied ? <Check className="h-4 w-4 text-[#16683f]" /> : <Send className="h-4 w-4" />}
              {copied ? t("copied", "Copiado") : t("share", "Compartilhar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
