"use client"

// Botão ÚNICO de publicar das superfícies de comunidade (comunidade comum,
// condomínio, bairro e mural da academia): um quadrado amarelo com "+" que
// mora NO HEADCARD — não é mais uma barra "Poste ou escreva aqui" no meio do
// feed. Apertar abre os tipos EMPILHADOS, um em cima do outro.
//
// O componente não conhece composer nenhum: quem monta decide quais tipos
// existem naquela superfície (a academia não tem Bee, por exemplo) e o que
// cada um abre.

import { useEffect, useRef, useState } from "react"
import { Film, Hexagon, ImagePlus, MessageSquare, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** `bee` = Curto (vídeo do feed) e `story` = Bee — nomes físicos do Bees v2. */
export type PublishKind = "post" | "bee" | "story" | "recado"

export type PublishItem = { kind: PublishKind; label: string }

/**
 * Ação EXTRA da superfície — não publica nada, só abre algo daquela página
 * (ex.: Professores e Ranking da academia, que saíram das seções soltas do
 * corpo e passaram a morar aqui). Superfície que não declara nenhuma continua
 * com o menu de publicação puro.
 */
export type PublishExtraItem = { id: string; label: string; icon: LucideIcon }

const ICON: Record<PublishKind, typeof Plus> = {
  post: ImagePlus,
  bee: Film,
  story: Hexagon,
  recado: MessageSquare,
}

/**
 * De que lado o menu cabe.
 *
 * 192px é a largura (`w-48`) e os 12px de folga pagam a sombra dura de 4px mais
 * uma margem para a borda da tela. Se o lado pedido estoura, tenta o outro; se
 * nenhum dos dois cabe (tela muito estreita), fica com o pedido e quem segura o
 * menu dentro da tela é o `max-w` do container.
 */
function resolveSide(
  el: HTMLElement | null,
  preferred: "left" | "right"
): "left" | "right" {
  if (!el || typeof window === "undefined") return preferred
  const MENU_W = 192 + 12
  const rect = el.getBoundingClientRect()
  const fitsLeftAligned = rect.left + MENU_W <= window.innerWidth
  const fitsRightAligned = rect.right - MENU_W >= 0
  if (preferred === "left" && !fitsLeftAligned && fitsRightAligned) return "right"
  if (preferred === "right" && !fitsRightAligned && fitsLeftAligned) return "left"
  return preferred
}

/**
 * A FORMA do gatilho — o menu é o mesmo nas três.
 *
 * `square` é o "+" do headcard. `block` e `bar` são as duas caras da entrada do
 * FEED: sem nenhuma publicação, um botão grande convidando a fazer a primeira;
 * com publicações, uma faixa fina no topo da lista, que não pode roubar a
 * atenção do conteúdo que já está lá.
 *
 * São variantes de UMA peça, e não botões novos, porque o que faz o menu é a
 * lista de tipos daquela superfície: um segundo componente com o mesmo menu
 * ganharia um tipo novo (ou uma permissão nova) só de um lado, em silêncio.
 */
export type PublishVariant = "square" | "bar" | "block"

export function PublishMenuButton({
  items,
  onPick,
  accent = "#F2B705",
  label,
  hint,
  blockedMessage,
  canPost = true,
  onBlocked,
  align = "left",
  extras = [],
  onPickExtra,
  variant = "square",
  text,
}: {
  items: PublishItem[]
  onPick: (kind: PublishKind) => void
  accent?: string
  /** aria-label/título do botão. */
  label: string
  /** Texto opcional ao lado do botão. */
  hint?: string
  /** Aviso mostrado por `onBlocked` quando o viewer ainda não pode publicar. */
  blockedMessage?: string
  canPost?: boolean
  onBlocked?: (message: string) => void
  align?: "left" | "right"
  /** Ações da superfície que não são publicação (abrem painéis da página). */
  extras?: PublishExtraItem[]
  onPickExtra?: (id: string) => void
  variant?: PublishVariant
  /** Rótulo DENTRO do botão (só em `bar`/`block`; o `square` é só o "+"). */
  text?: string
}) {
  const [open, setOpen] = useState(false)
  // Lado EFETIVO em que o menu abre. Começa no que a superfície pediu e é
  // recalculado a cada abertura: o botão mora na ponta do headcard, então num
  // celular estreito o menu de 192px nascia para FORA da tela e os itens
  // apareciam cortados pela metade. Medir é o único jeito de acertar nas duas
  // superfícies sem cada uma ter de adivinhar a própria posição.
  const [side, setSide] = useState<"left" | "right">(align)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  const isSquare = variant === "square"
  // A caixa do gatilho. No `square` ela abraça o botão (e o `hint` ao lado);
  // nas outras duas ela ocupa a largura do feed, que é o que faz a faixa ser
  // faixa e o convite ser convite.
  const wrapClass = isSquare ? "relative flex items-center gap-3" : "relative w-full"
  const buttonClass = isSquare
    ? "grid h-14 w-14 shrink-0 place-items-center border-2 border-[#0B0B0D] text-[#0B0B0D]"
    : variant === "bar"
      ? "flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]"
      : "flex w-full flex-col items-center justify-center gap-2 border-2 border-[#0B0B0D] px-6 py-12 text-[#0B0B0D]"

  return (
    <div ref={wrapRef} className={wrapClass}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (!canPost && extras.length === 0) {
            setOpen(false)
            if (blockedMessage) onBlocked?.(blockedMessage)
            return
          }
          // Mede ANTES de abrir, e não num efeito depois: assim o menu já
          // nasce do lado certo, sem o pulo de um quadro que apareceria se ele
          // fosse desenhado errado e corrigido em seguida.
          if (!open) setSide(resolveSide(wrapRef.current, align))
          setOpen((v) => !v)
        }}
        className={buttonClass}
        style={{ background: accent, boxShadow: variant === "bar" ? "3px 3px 0 0 #0B0B0D" : "4px 4px 0 0 #0B0B0D" }}
      >
        <Plus
          className={`transition ${open ? "rotate-45" : ""} ${
            variant === "bar" ? "h-4 w-4" : variant === "block" ? "h-10 w-10" : "h-7 w-7"
          }`}
        />
        {!isSquare && text && (
          <span
            className={
              variant === "bar"
                ? ""
                : "fl-display text-3xl leading-none"
            }
          >
            {text}
          </span>
        )}
      </button>
      {hint && (
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{hint}</span>
      )}

      {open && (canPost || extras.length > 0) && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-2 flex w-48 max-w-[calc(100vw-1.5rem)] flex-col border-2 border-[#0B0B0D] bg-[#15120E] p-2 ${side === "right" ? "right-0" : "left-0"}`}
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {items.map((it) => {
            const Icon = ICON[it.kind]
            return (
              <button
                key={it.kind}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  // Sem permissão o item continua visível e devolve o aviso de
                  // sempre — quem abriu o menu foram os extras, a permissão de
                  // publicar não mudou.
                  if (!canPost) {
                    if (blockedMessage) onBlocked?.(blockedMessage)
                    return
                  }
                  onPick(it.kind)
                }}
                className={`mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12] ${canPost ? "" : "opacity-60"}`}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} /> {it.label}
              </button>
            )
          })}

          {extras.length > 0 && items.length > 0 && <div className="my-1 border-t-2 border-[#0B0B0D]" />}

          {extras.map((ex) => {
            const Icon = ex.icon
            return (
              <button
                key={ex.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onPickExtra?.(ex.id)
                }}
                className="mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12]"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} /> {ex.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
