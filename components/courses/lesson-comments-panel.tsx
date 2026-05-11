"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  useLessonComments,
  type LessonComment,
} from "@/hooks/use-lesson-comments"

interface Props {
  courseId: string
  lessonId: string
  moduleId?: string
  mode: "owner" | "student"
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return "Agora"
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function CommentItem({
  comment,
  canDelete,
  onDelete,
}: {
  comment: LessonComment
  canDelete: boolean
  onDelete: () => void
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-white/15">
      {comment.author_avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comment.author_avatar}
          alt={comment.author_name}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-white/65">
          {initials(comment.author_name) || "AL"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-white">
            {comment.author_name}
          </p>
          {comment.is_mine && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Meu
            </span>
          )}
          <span className="text-[11px] text-white/35">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
          {comment.body}
        </p>
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="h-8 rounded-md p-2 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-200"
          aria-label="Remover comentário"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  )
}

export function LessonCommentsPanel({ courseId, lessonId, moduleId, mode }: Props) {
  const {
    comments,
    isLoading,
    error,
    createComment,
    deleteComment,
  } = useLessonComments({ courseId, lessonId, moduleId, mode })
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    const text = body.trim()
    if (!text) {
      toast.error("Escreva um comentário.")
      return
    }
    setSaving(true)
    try {
      await createComment(text)
      setBody("")
      toast.success("Comentário publicado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao comentar")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteComment(id)
      toast.success("Comentário removido.")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao remover comentário",
      )
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <MessageSquare className="h-4 w-4 text-primary" />
            Comentários
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {mode === "owner"
              ? "Modere conversas dos alunos nesta aula."
              : "Converse com outros alunos sobre esta aula."}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/55">
          {comments.length} comentário{comments.length === 1 ? "" : "s"}
        </span>
      </header>

      {mode === "student" && (
        <div className="mb-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Escreva seu comentário..."
            className="border-white/10 bg-zinc-900 text-white"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/35">{body.length}/2000</span>
            <Button
              type="button"
              onClick={submit}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] py-6 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando comentários...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && comments.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.018] px-4 py-6 text-center text-sm text-white/50">
          {mode === "owner"
            ? "Nenhuma conversa ainda. Quando alunos comentarem, você acompanha e modera por aqui."
            : "Seja a primeira pessoa a comentar esta aula."}
        </div>
      )}

      {!isLoading && !error && comments.length > 0 && (
        <ul className="space-y-2.5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={mode === "owner" || comment.is_mine}
              onDelete={() => remove(comment.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
