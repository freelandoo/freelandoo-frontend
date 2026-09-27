"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * O modal de CARDS do tamanho da foto — PEÇA ÚNICA do "Meus perfis" (headcard
 * do perfil) e do "Meus pets" / "Meus carros" (headcard da comunidade).
 *
 * Pedido do Alex (2026-09-27): o "+" da foto do pet "precisa ter o mesmo
 * comportamento do mais do perfil principal" — mesmo modal, header com o nome
 * da coleção, um card por item com foto e nome, e o card branco com o "+" para
 * adicionar outro. Escrito duas vezes, um dos dois ganharia um ajuste de layout
 * que o outro nunca veria.
 *
 * ⚠️ VAI POR PORTAL: o gatilho mora dentro da coluna da foto, e ancestral com
 * `transform` (a foto rotacionada) deixa de ser a janela para um `fixed`.
 */

export type SwitcherCard = {
  id: string
  name: string
  avatar_url: string | null
  /** Sem lixeira neste card (o perfil que é a conta não se apaga). */
  undeletable?: boolean
}

/** Textos da exclusão — vêm traduzidos de quem monta o modal. */
export type SwitcherDeleteCopy = {
  /** aria/title da lixeira; `{name}` é trocado pelo nome do card. */
  trashLabel: string
  title: string
  /** `{name}` é trocado pelo nome do card. */
  body: string
  disclaimer: string
  acceptLabel: string
  confirmLabel: string
  cancelLabel: string
}

/** Moldura da foto do headcard: papel creme, contorno de tinta e sombra dura,
 *  na proporção 2/3 do headcard — estes cards SÃO a foto de cada item. */
const CARD_FRAME =
  "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-4 border-[#F1EDE2] ring-2 ring-[#0B0B0D] shadow-[5px_5px_0_0_#F2B705]"

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

export function CardSwitcherModal({
  open,
  onClose,
  eyebrow,
  title,
  hint,
  closeLabel,
  items,
  currentId,
  loading,
  error,
  retryLabel,
  onRetry,
  onPick,
  createLabel,
  onCreate,
  creating = false,
  unnamedLabel,
  onDelete,
  deleteCopy,
}: {
  open: boolean
  onClose: () => void
  eyebrow: string
  title: string
  hint: string
  closeLabel: string
  items: SwitcherCard[] | null
  currentId?: string | null
  loading: boolean
  /** Texto do erro de carregamento (null = sem erro). */
  error: string | null
  retryLabel: string
  onRetry: () => void
  onPick: (item: SwitcherCard) => void
  createLabel: string
  onCreate: () => void
  creating?: boolean
  unnamedLabel: string
  /**
   * Lixeira em cada card (pedido do Alex, 2026-09-27). Ausente = sem lixeira.
   * Devolve o erro a mostrar, ou null quando excluiu.
   */
  onDelete?: (item: SwitcherCard) => Promise<string | null>
  deleteCopy?: SwitcherDeleteCopy
}) {
  // O portal só existe no cliente.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // A confirmação de exclusão: o card alvo, o aceite e o estado da chamada.
  const [confirming, setConfirming] = useState<SwitcherCard | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const closeConfirm = () => {
    if (deleting) return
    setConfirming(null)
    setAccepted(false)
    setDeleteError(null)
  }

  const runDelete = async () => {
    if (!confirming || !onDelete || !accepted || deleting) return
    setDeleting(true)
    setDeleteError(null)
    const err = await onDelete(confirming)
    setDeleting(false)
    if (err) {
      setDeleteError(err)
      return
    }
    setConfirming(null)
    setAccepted(false)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      // Esc fecha primeiro a confirmação, depois o modal.
      if (confirming) {
        if (!deleting) {
          setConfirming(null)
          setAccepted(false)
          setDeleteError(null)
        }
        return
      }
      onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose, confirming, deleting])

  if (!open || !mounted) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B0B0D]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#0B0B0D]">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6B6457]">{eyebrow}</p>
            <h2 className="fl-display text-2xl leading-none text-[#0B0B0D]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0B0B0D] transition hover:bg-[#F2B705]"
          >
            {closeLabel}
          </button>
        </div>
        <p className="mb-4 text-sm font-semibold text-[#5b554b]">{hint}</p>

        {loading && items === null ? (
          <div className="flex items-center justify-center py-10 text-[#5b554b]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error && items === null ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-bold text-[#8a1f1f]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0B0B0D]"
            >
              {retryLabel}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(items || []).map((item) => {
              const isCurrent = currentId ? String(item.id) === String(currentId) : false
              const canTrash = !!onDelete && !!deleteCopy && !item.undeletable
              return (
                <div key={item.id} className="relative">
                {/* A lixeira é IRMÃ do card, não filha: botão dentro de botão
                    não existe em HTML, e o clique nela não pode abrir o item. */}
                {canTrash && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(item)
                      setAccepted(false)
                      setDeleteError(null)
                    }}
                    aria-label={deleteCopy.trashLabel.replace("{name}", item.name)}
                    title={deleteCopy.trashLabel.replace("{name}", item.name)}
                    className="absolute -right-1 -top-1 z-10 inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#8a1f1f] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#8a1f1f] hover:text-[#F1EDE2]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  aria-current={isCurrent ? "true" : undefined}
                  className="group flex w-full flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={cn(
                      CARD_FRAME,
                      "-rotate-3 bg-[#F2B705]/15 transition-transform duration-200 group-hover:rotate-0",
                      isCurrent && "ring-4 ring-[#F2B705]",
                    )}
                  >
                    {item.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatar_url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-[#0B0B0D]">{initials(item.name)}</span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-bold leading-tight text-[#0B0B0D]">
                    {item.name || unnamedLabel}
                  </span>
                </button>
                </div>
              )
            })}

            {/* Adicionar mais um: card branco com o "+" preto, do tamanho da
                foto — ele É um lugar vazio esperando a foto do item novo. */}
            <button
              type="button"
              onClick={onCreate}
              disabled={creating}
              className="group flex flex-col items-center gap-1.5 text-center disabled:opacity-60"
            >
              <span
                className={cn(
                  CARD_FRAME,
                  "-rotate-3 border-dashed bg-white transition-transform duration-200 group-hover:rotate-0",
                )}
              >
                {creating ? (
                  <Loader2 className="h-7 w-7 animate-spin text-[#0B0B0D]" />
                ) : (
                  <Plus className="h-8 w-8 text-[#0B0B0D]" strokeWidth={3} />
                )}
              </span>
              <span className="text-[11px] font-bold leading-tight text-[#0B0B0D]">{createLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* CONFIRMAÇÃO DE EXCLUSÃO: por cima do modal, com o aceite explícito de
          que não tem volta e de que a plataforma não responde pelo que se
          perde — o botão só acende depois da caixa marcada. */}
      {confirming && deleteCopy && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B0B0D]/85 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label={deleteCopy.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirm()
          }}
        >
          <div className="w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#8a1f1f]">
            <div className="mb-3 flex items-center gap-2 text-[#8a1f1f]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="fl-display text-2xl leading-none">{deleteCopy.title}</h3>
            </div>
            <p className="mb-3 text-sm font-semibold text-[#0B0B0D]">
              {deleteCopy.body.replace("{name}", confirming.name || unnamedLabel)}
            </p>
            <p className="mb-4 border-2 border-[#8a1f1f] bg-[#8a1f1f]/10 p-3 text-xs font-semibold leading-snug text-[#5b1414]">
              {deleteCopy.disclaimer}
            </p>
            <label className="mb-4 flex cursor-pointer items-start gap-2 text-xs font-bold text-[#0B0B0D]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={deleting}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#8a1f1f]"
              />
              <span>{deleteCopy.acceptLabel}</span>
            </label>
            {deleteError && <p className="mb-3 text-xs font-bold text-[#8a1f1f]">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deleting}
                className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0B0B0D] hover:bg-[#F2B705] disabled:opacity-60"
              >
                {deleteCopy.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => void runDelete()}
                disabled={!accepted || deleting}
                className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#8a1f1f] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#F1EDE2] disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleteCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(overlay, document.body)
}
