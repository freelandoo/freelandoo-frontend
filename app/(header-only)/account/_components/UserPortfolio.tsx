"use client"

import React, { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import {
  ImagePlus,
  Loader2,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  POST_IMAGE_MAX_SIZE_BYTES,
  validateImageFile,
} from "@/lib/media/media-validation"

type Media = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video"
  thumbnail_url?: string | null
}

type Item = {
  id_portfolio_item: string
  title: string
  description?: string | null
  created_at?: string
  media?: Media[]
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function UserPortfolio() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/me/portfolio", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar portfólio")
      // PortfolioController.listPublic costuma devolver { items: [...] } ou um array.
      setItems(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar portfólio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(itemId: string) {
    const t = token()
    if (!t) return
    if (!confirm("Remover este post do seu portfólio? Ele sairá do feed.")) return
    try {
      const res = await fetch(`/api/me/portfolio/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao remover item")
      }
      setItems((prev) => prev?.filter((i) => i.id_portfolio_item !== itemId) ?? null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover")
    }
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <ImagePlus className="h-4 w-4 text-primary" />
            Meu Portfólio
          </h2>
          <p className="mt-1 max-w-xl text-xs text-white/50">
            Publique imagens no seu portfólio principal. Elas aparecem no feed,
            mas não entram na vitrine nem nos rankings.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ImagePlus className="mr-1.5 h-4 w-4" />
          Publicar
        </Button>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && !items ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando portfólio…
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <Sparkles className="h-6 w-6 text-white/30" />
          <p className="text-sm text-white/60">Nada publicado ainda.</p>
          <p className="max-w-sm text-xs text-white/40">
            Clique em <strong className="text-white/70">Publicar</strong> para
            postar a primeira imagem da sua conta — ela aparece no feed.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((it) => {
            const cover = it.media?.[0]
            return (
              <li
                key={it.id_portfolio_item}
                className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/40"
              >
                <div className="relative aspect-square w-full bg-zinc-900">
                  {cover?.media_url ? (
                    cover.media_type === "video" ? (
                      <video
                        src={cover.media_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={cover.media_url}
                        alt={it.title || ""}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/25">
                      <ImagePlus className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5">
                  <p className="line-clamp-2 text-[11px] font-medium text-white">{it.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(it.id_portfolio_item)}
                  aria-label="Remover"
                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 opacity-0 transition group-hover:opacity-100 hover:border-red-400/40 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <CreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(item) => {
          setItems((prev) => (prev ? [item, ...prev] : [item]))
          void load()
        }}
      />
    </article>
  )
}

function CreateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: Item) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTitle("")
      setDescription("")
      setFile(null)
      setPreview(null)
      setError(null)
    }
  }, [open])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const v = validateImageFile(f, POST_IMAGE_MAX_SIZE_BYTES)
    if (!v.ok) {
      setError(v.error || "Imagem inválida")
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function handleSubmit() {
    const t = token()
    if (!t) return
    if (!title.trim()) {
      setError("Dê um título à publicação")
      return
    }
    if (!file) {
      setError("Selecione uma imagem")
      return
    }
    setUploading(true)
    setError(null)
    try {
      // 1) Cria o item de portfólio
      const createRes = await fetch("/api/me/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || "Erro ao criar item")
      const item: Item = createData.item || createData

      // 2) Faz upload da imagem
      const fd = new FormData()
      fd.append("file", file)
      fd.append("media_type", "image")
      const uploadRes = await fetch(`/api/me/portfolio/${item.id_portfolio_item}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || "Erro no upload")

      onCreated({
        ...item,
        media: [{
          id_portfolio_media: uploadData.id_portfolio_media || "tmp",
          media_url: uploadData.media_url,
          media_type: "image",
        }],
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Publicar no portfólio</DialogTitle>
          <DialogDescription>
            A imagem aparece no seu portfólio principal e no feed. Não entra na
            vitrine nem nos rankings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="up-title">Título</Label>
            <Input
              id="up-title"
              placeholder="Ex.: Trabalho de hoje"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="up-desc">Descrição (opcional)</Label>
            <textarea
              id="up-desc"
              placeholder="Conte algo sobre essa publicação…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="up-file">Imagem</Label>
            <Input
              id="up-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFileChange}
            />
            {preview && (
              <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="h-48 w-full object-cover" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Publicando…
              </>
            ) : (
              "Publicar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UserPortfolio
