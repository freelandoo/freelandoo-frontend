"use client"

// Composer de RECADO — post SÓ-TEXTO (mig 209, feed_kind='recado').
//
// Decisão do Alex (2026-08-29): "toda a plataforma precisa ter opção de postar
// somente textos" e "todos os textos serão chamados de recados".
//
// Por que um componente separado do MediaComposer: o MediaComposer arrasta o
// módulo de câmera inteiro (WebCodecs, filtros, canvas) — centenas de KB para
// publicar um parágrafo. Aqui é um modal de textarea, e o publish é a MESMA
// rota do post (POST /profile/:id/portfolio) só que sem etapa de upload.
// Consequência: o recado herda de graça curtida, comentário, salvos, denúncia,
// XP e os vínculos com comunidade/academia — é post, só que de texto.

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageSquare, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { ProfileSelect, type ProfileLite } from "./ProfileSelect"

/** Teto do texto. Espelha o recado de comunidade da mig 162 (2000 chars). */
export const RECADO_MAX_CHARS = 2000

export interface RecadoComposerProps {
  open: boolean
  /** Perfil pré-selecionado (a superfície sabe quem está publicando). */
  initialProfileId?: string | null
  /** Liga o recado ao mural da comunidade, como o post faz. */
  communityId?: string | null
  /** Liga o recado ao mural da academia (mig 181). */
  academyId?: string | null
  onClose: () => void
  onPosted?: () => void
}

export function RecadoComposer({
  open,
  initialProfileId = null,
  communityId = null,
  academyId = null,
  onClose,
  onPosted,
}: RecadoComposerProps) {
  const t = useTranslations("Composer")
  const router = useRouter()
  const { user, status } = useAuth()

  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── carrega os perfis do dono (mesma fonte do MediaComposer) ────────────────
  useEffect(() => {
    if (!open || status !== "authenticated" || !user) return
    let cancelled = false
    setLoadingProfiles(true)
    fetch(`/api/profile/user/${encodeURIComponent(user.id_user)}`, {
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data) => {
        if (cancelled) return
        const list: ProfileLite[] = (Array.isArray(data?.profiles) ? data.profiles : []).filter(
          (p: ProfileLite) => p.is_active
        )
        setProfiles(list)
        setSelectedProfileId((curId) => {
          if (curId && list.some((p) => p.id_profile === curId)) return curId
          if (initialProfileId && list.some((p) => p.id_profile === initialProfileId)) return initialProfileId
          const preferred = list.find((p) => !p.is_user_account) ?? list[0]
          return preferred?.id_profile ?? null
        })
      })
      .catch(() => {
        if (!cancelled) setProfiles([])
      })
      .finally(() => {
        if (!cancelled) setLoadingProfiles(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, user?.id_user, initialProfileId])

  // Fecha no Esc, como os outros modais de papel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const publish = useCallback(async () => {
    const text = body.trim()
    if (!text || !selectedProfileId) return
    const token = getToken()
    if (!token) {
      setError(t("errors.sessionExpired", "Sessão expirada. Faça login novamente."))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // O texto vai em `description` — é de lá que o card do feed lê a legenda.
      const res = await fetch(`/api/profile/${selectedProfileId}/portfolio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          feed_kind: "recado",
          title: null,
          description: text,
          is_featured: false,
          sort_order: 0,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || t("errors.createItem", "Erro ao criar item."))

      const itemId: string | undefined = data?.id_portfolio_item ?? data?.item?.id_portfolio_item
      if (!itemId) throw new Error(t("errors.createItemResponse", "Resposta inesperada ao criar item."))

      // Vínculos com o mural de origem — não-fatais, exatamente como no post.
      if (communityId) {
        try {
          await fetch(`/api/communities/${communityId}/feed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id_portfolio_item: itemId }),
          })
        } catch {
          /* noop */
        }
      }
      if (academyId) {
        try {
          await fetch(`/api/academies/${academyId}/feed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id_portfolio_item: itemId }),
          })
        } catch {
          /* noop */
        }
      }

      setBody("")
      onPosted?.()
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.publish", "Falha ao publicar."))
    } finally {
      setSubmitting(false)
    }
  }, [body, selectedProfileId, communityId, academyId, onPosted, onClose, router, t])

  if (!open) return null

  const remaining = RECADO_MAX_CHARS - body.length

  return (
    <div
      className="fl-sharp fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-lg border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3">
          <span className="fl-display inline-flex items-center gap-2 text-lg text-[#F2B705]">
            <MessageSquare className="h-4 w-4" /> {t("mode.recado", "Novo Recado")}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("recadoClose", "Fechar")}
            className="grid h-8 w-8 place-items-center text-[#9A938A] transition hover:text-[#F5F1E8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Quem publica — recado é post, então tem autor como qualquer post. */}
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              {t("details.publishAs", "Publicar como")}
            </p>
            {loadingProfiles ? (
              <div className="flex items-center gap-2 text-xs text-[#9A938A]">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("details.loadingProfiles", "Carregando perfis…")}
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-xs text-[#9A938A]">{t("details.noProfiles", "Sem perfis elegíveis. Crie um perfil para postar.")}</p>
            ) : (
              <ProfileSelect
                userName={user?.nome || null}
                profiles={profiles}
                selectedId={selectedProfileId}
                onSelect={setSelectedProfileId}
              />
            )}
          </div>

          <div>
            <textarea
              value={body}
              rows={7}
              autoFocus
              maxLength={RECADO_MAX_CHARS}
              onChange={(e) => setBody(e.target.value.slice(0, RECADO_MAX_CHARS))}
              placeholder={t("recadoPlaceholder", "Escreva o que você quer dizer...")}
              className="w-full resize-none border-2 border-[#0B0B0D] bg-[#0b0804] px-3 py-3 text-sm leading-relaxed text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70 focus:border-[#F2B705]"
            />
            <div className="mt-1 flex items-center justify-end">
              <span className="text-[10px] tabular-nums text-[#9A938A]/70">
                {remaining} / {RECADO_MAX_CHARS}
              </span>
            </div>
          </div>

          {error && (
            <p className="border-2 border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={submitting || !body.trim() || !selectedProfileId}
            onClick={() => void publish()}
            className="flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {t("recadoPublish", "Postar recado")}
          </button>
        </div>
      </div>
    </div>
  )
}
