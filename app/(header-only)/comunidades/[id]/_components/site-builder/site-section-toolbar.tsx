"use client"

// Barra flutuante de ações de UMA seção: subir, descer, ocultar e remover.
//
// Fica ancorada no canto da seção (não numa sidebar) porque o alvo da ação é a
// seção que o líder está olhando — tirar a ação de perto do objeto obrigaria a
// escolher a seção duas vezes, uma na lista e outra na tela.

import { useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, Scaling, Trash2 } from "lucide-react"

export function SiteSectionToolbar({
  label,
  enabled,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onRemove,
  onToggleResize,
  resizing,
  labels,
}: {
  label: string
  enabled: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleEnabled: () => void
  onRemove: () => void
  /** Liga/desliga as alças de tamanho DESTA seção. */
  onToggleResize: () => void
  resizing: boolean
  labels: {
    moveUp: string
    moveDown: string
    show: string
    hide: string
    remove: string
    confirmRemove: string
    cancel: string
    resize: string
  }
}) {
  // Remoção pede confirmação DENTRO da própria barra: um modal aqui roubaria o
  // contexto da seção que está prestes a sumir, e o construtor não tem desfazer.
  const [confirming, setConfirming] = useState(false)

  const btn =
    "grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] disabled:opacity-30 hover:bg-[#241d12]"

  return (
    <div
      className="pointer-events-auto flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] p-1"
      style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
    >
      <span className="px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        {label}
      </span>

      {confirming ? (
        <>
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              onRemove()
            }}
            className="border-2 border-[#0B0B0D] bg-[#ff5a44] px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
          >
            {labels.confirmRemove}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]"
          >
            {labels.cancel}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={btn}
            disabled={!canMoveUp}
            onClick={onMoveUp}
            title={labels.moveUp}
            aria-label={labels.moveUp}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn}
            disabled={!canMoveDown}
            onClick={onMoveDown}
            title={labels.moveDown}
            aria-label={labels.moveDown}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          {/* As alças da seção não ficam sempre ligadas: elas cobrem os cantos,
              e cantos ocupados atrapalhariam a edição do texto que mora ali. */}
          <button
            type="button"
            className={btn}
            onClick={onToggleResize}
            title={labels.resize}
            aria-label={labels.resize}
            aria-pressed={resizing}
            style={resizing ? { background: "#F2B705", color: "#0B0B0D" } : undefined}
          >
            <Scaling className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={onToggleEnabled}
            title={enabled ? labels.hide : labels.show}
            aria-label={enabled ? labels.hide : labels.show}
            aria-pressed={!enabled}
          >
            {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#ff5a44] hover:bg-[#241d12]"
            onClick={() => setConfirming(true)}
            title={labels.remove}
            aria-label={labels.remove}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
