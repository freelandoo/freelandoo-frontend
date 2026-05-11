"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import {
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Loader2,
  Paperclip,
  UploadCloud,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useLessonMaterials,
  type LessonMaterial,
} from "@/hooks/use-lesson-materials"

interface Props {
  courseId: string
  moduleId: string
  lessonId: string
}

const ACCEPTED_HINT = ".pdf,.jpg,.jpeg,.png,.webp,.gif"
const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

function validateFile(file: File): string | null {
  if (!ALLOWED_MIMES.has(file.type.toLowerCase())) {
    return "Formato não aceito. Envie PDF, JPG, PNG, WebP ou GIF."
  }
  if (file.size > MAX_BYTES) {
    return "Arquivo maior que 25MB."
  }
  return null
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function materialIcon(material: LessonMaterial) {
  if (material.kind === "link") {
    return <LinkIcon className="h-4 w-4 text-sky-300" />
  }
  if ((material.mime || "").startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-emerald-300" />
  }
  return <FileText className="h-4 w-4 text-amber-300" />
}

export function LessonMaterialsBlock({ courseId, moduleId, lessonId }: Props) {
  const {
    materials,
    isLoading,
    error,
    uploadFile,
    createLink,
    updateMaterial,
    deleteMaterial,
    reorderMaterials,
  } = useLessonMaterials(courseId, moduleId, lessonId)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingName, setUploadingName] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkForm, setLinkForm] = useState({ title: "", link_url: "" })
  const [linkSaving, setLinkSaving] = useState(false)

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<LessonMaterial | null>(null)
  const [renameForm, setRenameForm] = useState({ title: "", link_url: "" })
  const [renameSaving, setRenameSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LessonMaterial | null>(null)
  const [deleting, setDeleting] = useState(false)

  // -------------------------------------------------------------------------
  // Upload de arquivo
  // -------------------------------------------------------------------------
  const startUpload = useCallback(
    async (file: File) => {
      const err = validateFile(file)
      if (err) {
        toast.error(err)
        return
      }
      setUploadingName(file.name)
      setProgress(0)
      try {
        await uploadFile(file, (ratio) => setProgress(ratio))
        toast.success("Material adicionado.")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha no envio")
      } finally {
        setUploadingName(null)
        setProgress(0)
      }
    },
    [uploadFile],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) void startUpload(file)
    },
    [startUpload],
  )

  const handleSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void startUpload(file)
      event.target.value = ""
    },
    [startUpload],
  )

  // -------------------------------------------------------------------------
  // Link
  // -------------------------------------------------------------------------
  const submitLink = useCallback(async () => {
    const title = linkForm.title.trim()
    const url = linkForm.link_url.trim()
    if (!title) {
      toast.error("Informe um título.")
      return
    }
    if (!url) {
      toast.error("Informe uma URL.")
      return
    }
    setLinkSaving(true)
    try {
      await createLink({ title, link_url: url })
      toast.success("Link adicionado.")
      setLinkForm({ title: "", link_url: "" })
      setLinkModalOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao adicionar link")
    } finally {
      setLinkSaving(false)
    }
  }, [linkForm, createLink])

  // -------------------------------------------------------------------------
  // Rename / editar URL (modal rápido — preserva contexto)
  // -------------------------------------------------------------------------
  const openRename = useCallback((m: LessonMaterial) => {
    setRenameTarget(m)
    setRenameForm({ title: m.title, link_url: m.link_url || "" })
  }, [])

  const submitRename = useCallback(async () => {
    if (!renameTarget) return
    const title = renameForm.title.trim()
    if (!title) {
      toast.error("Informe um título.")
      return
    }
    setRenameSaving(true)
    try {
      const patch: { title: string; link_url?: string } = { title }
      if (renameTarget.kind === "link") {
        const url = renameForm.link_url.trim()
        if (!url) {
          toast.error("Informe uma URL.")
          setRenameSaving(false)
          return
        }
        patch.link_url = url
      }
      await updateMaterial(renameTarget.id, patch)
      toast.success("Atualizado.")
      setRenameTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar")
    } finally {
      setRenameSaving(false)
    }
  }, [renameTarget, renameForm, updateMaterial])

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------
  const submitDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMaterial(deleteTarget.id)
      toast.success("Material removido.")
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, deleteMaterial])

  // -------------------------------------------------------------------------
  // Reorder por botões (mesmo padrão do section-modules)
  // -------------------------------------------------------------------------
  const moveItem = useCallback(
    async (id: string, dir: -1 | 1) => {
      const idx = materials.findIndex((m) => m.id === id)
      if (idx < 0) return
      const next = idx + dir
      if (next < 0 || next >= materials.length) return
      const order = materials.map((m) => m.id)
      ;[order[idx], order[next]] = [order[next], order[idx]]
      try {
        await reorderMaterials(order)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao reordenar")
      }
    },
    [materials, reorderMaterials],
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <section className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <Paperclip className="h-4 w-4 text-primary" />
            Materiais de apoio
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Anexe PDFs, imagens ou links que o aluno baixa/abre junto com a
            aula.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            onClick={() => setLinkModalOpen(true)}
          >
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
            Adicionar link
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadingName}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Enviar arquivo
          </Button>
        </div>
      </header>

      {/* Dropzone — fica visível sempre, para drag */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploadingName && fileInputRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-5 text-center transition ${
          isDragging
            ? "border-primary/50 bg-primary/10"
            : "border-white/12 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        {uploadingName ? (
          <>
            <UploadCloud className="h-5 w-5 animate-pulse text-sky-300" />
            <p className="text-xs font-medium text-white">
              Enviando {uploadingName}... {Math.round(progress * 100)}%
            </p>
            <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-sky-400 transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <UploadCloud
              className={`h-5 w-5 ${isDragging ? "text-primary" : "text-white/45"}`}
            />
            <p className="text-xs font-medium text-white/85">
              Arraste o arquivo aqui ou clique para selecionar
            </p>
            <p className="text-[11px] text-white/45">
              PDF, JPG, PNG, WebP ou GIF · até 25MB
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_HINT}
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {/* Estados de listagem */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] py-6 text-xs text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando materiais...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && materials.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] py-6 text-center text-xs text-white/45">
          Nenhum material adicionado ainda.
        </div>
      )}

      {!isLoading && !error && materials.length > 0 && (
        <ul className="space-y-2">
          {materials.map((m, idx) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15"
            >
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                {materialIcon(m)}
              </div>

              <div className="min-w-0 flex-1">
                <a
                  href={m.kind === "link" ? m.link_url! : m.file_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 truncate text-sm font-medium text-white hover:text-primary"
                >
                  <span className="truncate">{m.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
                <p className="mt-0.5 truncate text-[11px] text-white/45">
                  {m.kind === "link"
                    ? m.link_url
                    : `${(m.mime || "").split("/")[1]?.toUpperCase() || "arquivo"} · ${formatBytes(m.file_size_bytes)}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(m.id, -1)}
                  disabled={idx === 0}
                  className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(m.id, 1)}
                  disabled={idx === materials.length - 1}
                  className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openRename(m)}
                  className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Editar"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(m)}
                  className="rounded-md p-1.5 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-200"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal: adicionar link */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar link</DialogTitle>
            <DialogDescription className="text-white/55">
              Aponte para um recurso externo (Drive, YouTube, Notion, etc).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="link-title">Título</Label>
              <Input
                id="link-title"
                value={linkForm.title}
                onChange={(e) =>
                  setLinkForm((s) => ({ ...s, title: e.target.value }))
                }
                placeholder="Ex.: Slides da aula"
                className="border-white/10 bg-zinc-900 text-white"
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkForm.link_url}
                onChange={(e) =>
                  setLinkForm((s) => ({ ...s, link_url: e.target.value }))
                }
                placeholder="https://..."
                className="border-white/10 bg-zinc-900 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLinkModalOpen(false)}
              disabled={linkSaving}
              className="text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitLink}
              disabled={linkSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {linkSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: rename / editar URL */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Editar material</DialogTitle>
            <DialogDescription className="text-white/55">
              Atualize o título{renameTarget?.kind === "link" ? " e a URL" : ""}.
              Para trocar o arquivo, exclua e envie outro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rename-title">Título</Label>
              <Input
                id="rename-title"
                value={renameForm.title}
                onChange={(e) =>
                  setRenameForm((s) => ({ ...s, title: e.target.value }))
                }
                className="border-white/10 bg-zinc-900 text-white"
              />
            </div>
            {renameTarget?.kind === "link" && (
              <div>
                <Label htmlFor="rename-url">URL</Label>
                <Input
                  id="rename-url"
                  value={renameForm.link_url}
                  onChange={(e) =>
                    setRenameForm((s) => ({ ...s, link_url: e.target.value }))
                  }
                  className="border-white/10 bg-zinc-900 text-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameTarget(null)}
              disabled={renameSaving}
              className="text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitRename}
              disabled={renameSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {renameSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: confirmar delete */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Remover material?</DialogTitle>
            <DialogDescription className="text-white/55">
              {deleteTarget?.title} será removido desta aula. Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitDelete}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {deleting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
