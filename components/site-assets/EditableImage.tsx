"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ImagePlus } from "lucide-react"
import { MediaCropModal } from "@/components/media/media-crop-modal"
import { type ProcessedImage } from "@/lib/media/image-processing"
import { slotDef, type SiteAssetSlot } from "@/lib/site-asset-slots"
import { useSiteAssets } from "./SiteAssetsProvider"
import { getStoredUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

function checkAdmin(): boolean {
  const u = getStoredUser()
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}

export function EditableImage({
  slot,
  className,
  slotConfig,
  fallback,
  sizes = "100vw",
}: {
  slot: string
  className?: string
  slotConfig?: Partial<SiteAssetSlot>
  fallback?: React.ReactNode
  /** Hint de largura renderizada pro next/image (ex.: "(min-width:768px) 33vw, 100vw"). */
  sizes?: string
}) {
  const { assets, setAsset } = useSiteAssets()
  const def = slotDef(slot, slotConfig)
  // admin só após mount (evita mismatch de hidratação — SSR não vê localStorage).
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    setAdmin(checkAdmin())
  }, [])
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const url = assets[slot]

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (f) setCropFile(f)
  }

  async function onCropConfirm(image: ProcessedImage) {
    setCropFile(null)
    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const fd = new FormData()
      fd.append("image", image.file, "asset.webp")
      const res = await fetch(`/api/admin/site-assets/${slot}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.asset?.image_url) setAsset(slot, data.asset.image_url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {url ? (
        // next/image: assets do site são poucos e públicos/SEO (política de
        // imagem F3.S6) — otimização Vercel compensa aqui.
        <Image src={url} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-[#1D1810]">
            <ImagePlus className="h-8 w-8 text-[#F2B705]/40" />
          </div>
        )
      )}

      {admin && (
        <>
          <label className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center gap-2 bg-black/0 text-sm font-bold text-transparent transition hover:bg-black/45 hover:text-white">
            <ImagePlus className="h-5 w-5" />
            {uploading ? "Enviando…" : "Trocar imagem"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPick}
              disabled={uploading}
            />
          </label>
          {cropFile && (
            <MediaCropModal
              file={cropFile}
              aspectRatio={def.aspectRatio}
              outputWidth={def.outputWidth}
              outputHeight={def.outputHeight}
              maxSizeMB={3}
              mediaType="post_image"
              title={`Cortar: ${def.label}`}
              description="Ajuste o enquadramento da imagem."
              onCancel={() => setCropFile(null)}
              onConfirm={onCropConfirm}
            />
          )}
        </>
      )}
    </div>
  )
}
