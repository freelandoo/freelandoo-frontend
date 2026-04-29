"use client"

import { useEffect, useState } from "react"
import { Heart, Share2, X, ExternalLink, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"

type Props = {
  item: PortfolioItem
  profileId: string
  onClose: () => void
  onLikeChange?: (itemId: string, liked: boolean, count: number) => void
}

export function PortfolioItemModal({ item, profileId, onClose, onLikeChange }: Props) {
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

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${item.id_portfolio_item}`
    : ""

  const toggleLike = async () => {
    if (pending) return
    const token = localStorage.getItem("token")
    if (!token) {
      setAuthError("Faça login para curtir.")
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
      if (!res.ok) throw new Error("Falha ao curtir")
      const data = await res.json()
      const finalLiked = !!data.liked
      setLiked(finalLiked)
      onLikeChange?.(item.id_portfolio_item, finalLiked, optimisticCount)
    } catch {
      // rollback
      setLiked(!optimisticLiked)
      setCount(count)
      setAuthError("Erro ao registrar like. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  const share = async () => {
    if (!shareUrl) return
    const title = item.title ?? "Item de portfólio"
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="w-full max-w-4xl max-h-[95vh] rounded-2xl bg-background border border-border shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Imagem */}
        <div className="relative md:w-3/5 bg-black flex items-center justify-center min-h-[40vh] md:min-h-[60vh]">
          {currentMedia ? (
            currentMedia.media_type === "video" ? (
              <video
                src={currentMedia.media_url}
                className="w-full h-full max-h-[80vh] object-contain"
                controls
                playsInline
              />
            ) : (
              <img
                src={currentMedia.media_url}
                alt={item.title ?? "Mídia do portfólio"}
                className="w-full h-full max-h-[80vh] object-contain"
              />
            )
          ) : (
            <div className="text-muted-foreground text-sm">Sem mídia</div>
          )}

          {/* Thumbnails secundários */}
          {activeMedias.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-full bg-black/60">
              {activeMedias.map((m, i) => (
                <button
                  key={m.id_portfolio_media}
                  onClick={() => setActiveMediaIdx(i)}
                  className={`h-2 w-2 rounded-full transition ${i === activeMediaIdx ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                  aria-label={`Mídia ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Descrição + ações */}
        <div className="md:w-2/5 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold line-clamp-1">{item.title || "Sem título"}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 px-5 py-4 overflow-y-auto space-y-4">
            {item.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
            )}

            {item.project_url && (
              <a
                href={item.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver projeto
              </a>
            )}

            {authError && <p className="text-xs text-destructive">{authError}</p>}
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center gap-2">
            <Button
              variant={liked ? "default" : "outline"}
              onClick={toggleLike}
              disabled={pending}
              className="flex-1 gap-2"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {count} {count === 1 ? "like" : "likes"}
            </Button>
            <Button variant="outline" onClick={share} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Copiado" : "Compartilhar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
