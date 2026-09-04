"use client"

// Painel de tamanho do que está selecionado — a outra metade das alças.
//
// Existe porque arrastar uma bolinha de 12px é gesto de mouse. No celular, o
// líder dá zoom com dois dedos, toca na caixa e ajusta AQUI, em botões grandes;
// e no computador ele também serve a quem prefere um número exato a um arraste
// (e a quem navega por teclado, que não tem como arrastar coisa nenhuma).

import { Minus, Plus, RotateCcw, X } from "lucide-react"

export type SizeRow = {
  label: string
  /** `null` = AUTO: a caixa ainda segue o tamanho responsivo da página. */
  value: number | null
  /** Usado quando o líder aperta + estando em AUTO. */
  fallback: () => number
  step: number
  unit: string
  onChange: (next: number) => void
}

export function SiteSizeToolbar({
  title,
  rows,
  autoLabel,
  resetLabel,
  closeLabel,
  onReset,
  onClose,
}: {
  title: string
  rows: SizeRow[]
  autoLabel: string
  resetLabel: string
  closeLabel: string
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fl-sharp fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-2 py-2"
      style={{ boxShadow: "6px 6px 0 0 #0B0B0D" }}
      // O painel flutua POR CIMA do site; um toque nele não pode ser lido como
      // toque no documento e derrubar a seleção que ele acabou de editar.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        {title}
      </span>

      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] p-1">
          <span className="px-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
            {row.label}
          </span>
          <button
            type="button"
            aria-label={`${row.label} −`}
            onClick={() => row.onChange((row.value ?? row.fallback()) - row.step)}
            className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[52px] text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#F5F1E8]">
            {row.value === null ? autoLabel : `${row.value}${row.unit}`}
          </span>
          <button
            type="button"
            aria-label={`${row.label} +`}
            onClick={() => row.onChange((row.value ?? row.fallback()) + row.step)}
            className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onReset}
        title={resetLabel}
        aria-label={resetLabel}
        className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8]"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        title={closeLabel}
        aria-label={closeLabel}
        className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#ff5a44]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
