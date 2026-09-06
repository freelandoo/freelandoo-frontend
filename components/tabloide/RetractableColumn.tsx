"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A COLUNA RETRÁTIL — a mecânica dos números de uma superfície coletiva.
 *
 * Pedido do Alex (2026-09-06): os blocos que descreviam a comunidade (membros,
 * nível, XP de um lado; benchmark, destaque e ranking do outro) deixaram de ser
 * duas ilhas — viram UMA coluna enfileirada, e a coluna abre e fecha num toque,
 * no celular e no computador. "Em todas as comunidades... academia, negócios,
 * tudo dessa forma, retrátil."
 *
 * Antes eram dois lugares: uma fita de três KPIs largando o feed para baixo e
 * uma barra lateral que, no celular, virava um rodapé de três caixas que quase
 * ninguém rolava até o fim. Empilhados atrás de um botão, os números continuam
 * a um toque de distância e a página começa direto no conteúdo.
 *
 * ⚠️ ESTA PEÇA É SÓ A MECÂNICA — a barra, o estado e a moldura. O QUE entra na
 * coluna é da superfície, como no `PillStack`: a comunidade empilha membros,
 * nível, XP, benchmark, destaque e ranking; outra superfície empilha o que ela
 * tiver. Escrever a mecânica de novo em cada tela é como uma delas ganha (ou
 * perde) o comportamento em silêncio.
 *
 * Por que ela NÃO mora no `kit.tsx`: o kit é importado por SERVER components e
 * por isso não pode ter hook. Aqui há estado, então o arquivo é client — mesmo
 * degrau do `PageBackLink`.
 *
 * A cor vem por prop (`accent`) porque a comunidade deixa o líder escolher a
 * dela; quem não tem paleta editável passa o dourado da casa.
 */
export function RetractableColumn({
  title,
  icon,
  accent,
  ariaLabel,
  defaultOpen = false,
  className,
  children,
}: {
  title: string
  icon?: ReactNode
  /** Cor da sombra dura e do ícone. */
  accent: string
  /** O que o botão diz a quem não vê a tela (o rótulo visível é o título). */
  ariaLabel?: string
  /**
   * Nasce FECHADA de propósito: o pedido foi "você aperta e ela aparece". A
   * prop existe para a superfície que quiser o contrário — não para virar o
   * padrão por descuido.
   */
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className={cn("relative z-10", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel || title}
        className="flex w-full items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: `6px 6px 0 0 ${accent}` }}
      >
        {icon && <span style={{ color: accent }}>{icon}</span>}
        <span className="flex-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]">
          {title}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: accent }}
          aria-hidden
        />
      </button>

      {/* A coluna em si: um bloco embaixo do outro, na ordem em que a
          superfície os declarou. Renderiza só quando aberta — esconder por CSS
          deixaria o conteúdo (e as imagens dele) sendo baixado à toa. */}
      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          {children}
        </div>
      )}
    </section>
  )
}
