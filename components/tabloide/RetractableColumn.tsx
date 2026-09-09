"use client"

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A COLUNA RETRÁTIL — a mecânica dos números de uma superfície coletiva, hoje
 * em forma de SIDEBAR.
 *
 * Pedido do Alex (2026-09-06): os blocos que descreviam a comunidade (membros,
 * nível e XP de um lado; benchmark, destaque e ranking do outro) viraram UMA
 * coluna enfileirada — e ela "vira um sidebar: mostra só a pontinha da setinha,
 * e quando você aperta ele vem".
 *
 * Então nada disso ocupa lugar na página: o que fica no ar o tempo todo é a
 * ALÇA colada na borda direita, com a ponta da seta escapando. Quem aperta
 * recebe a coluna inteira deslizando de lado; quem veio ler o feed não paga
 * um centímetro de tela por ela.
 *
 * ⚠️ ESTA PEÇA É SÓ A MECÂNICA — a alça, a gaveta, o estado e a moldura. O QUE
 * entra na coluna é da superfície, como no `PillStack`: a comunidade empilha
 * membros, nível, XP, benchmark, destaque e ranking; outra superfície empilha o
 * que ela tiver. Escrever a mecânica de novo em cada tela é como uma delas
 * ganha (ou perde) o comportamento em silêncio.
 *
 * ⚠️ A ALÇA É NA DIREITA, e isso não é gosto: o dock do perfil
 * (`ProfileSidebar`) é `fixed left-3 top-1/2` no computador. Alça na esquerda
 * nasceria em cima dele.
 *
 * ⚠️ A GAVETA VAI POR PORTAL para o `<body>`. Ela é `fixed`, e ancestral com
 * `transform` (a página tem cards rotacionados) deixa de ser janela para
 * elemento fixo — a gaveta apareceria presa dentro de um card. O portal é o que
 * garante que ela cubra a tela em qualquer superfície que monte a peça.
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
  skinClass,
  skinVars,
  ariaLabel,
  closeLabel,
  onOpen,
  children,
}: {
  title: string
  icon?: ReactNode
  /** Cor da seta, da faixa da gaveta e do ícone do cabeçalho. */
  accent: string
  /**
   * ⚠️ A PELE DO AMBIENTE PRECISA VIR POR PROP porque esta peça se desenha por
   * PORTAL no <body>: fora da subárvore da página, ela não herda nem a classe
   * (`.fl-business`) nem as variáveis de cor que a página escreve. Sem isto, a
   * gaveta de números abriria marrom-tabloide no meio de uma plataforma preta —
   * e a alça, que fica sempre no ar na borda direita, denunciaria isso o tempo
   * todo. Quem não passa nada continua com o visual de sempre.
   */
  skinClass?: string
  skinVars?: CSSProperties
  /** O que a alça diz a quem não vê a tela (nela só cabe a seta). */
  ariaLabel?: string
  closeLabel: string
  /**
   * Disparado quando a gaveta abre — a porta para a superfície buscar só então
   * o que só a coluna mostra (a academia carrega o ranking do mês aqui). Sem
   * isso, toda visita pagaria uma requisição por uma tela que a maioria não
   * abre. Quem chama decide se busca uma vez ou toda vez.
   */
  onOpen?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const panelId = useId()

  useEffect(() => setMounted(true), [])

  // Esc fecha — a gaveta cobre a tela e teclado é a saída de quem não usa mouse.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Trava a rolagem do fundo enquanto a gaveta está aberta: sem isso o dedo que
  // rola o ranking arrasta a página inteira atrás dele.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    // Um <div> estático não vira bloco contentor de `fixed`, então a alça e a
    // gaveta continuam ancoradas na janela — ele existe só para carregar a
    // pele até dentro do portal.
    <div className={skinClass} style={skinVars}>
      {/* A ALÇA — a única coisa que fica no ar. Estreita de propósito: o que
          aparece é a ponta da seta, colada na borda. A altura (h-16) é o que
          a torna alcançável com o polegar sem virar um painel. */}
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          onOpen?.()
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel || title}
        title={ariaLabel || title}
        className={cn(
          "fixed right-0 top-1/2 z-40 flex h-16 w-8 -translate-y-1/2 items-center justify-center border-2 border-r-0 border-[#0B0B0D] bg-[#15120E] transition-transform hover:-translate-x-1",
          open && "pointer-events-none opacity-0",
        )}
        style={{ boxShadow: `-4px 4px 0 0 ${accent}` }}
      >
        <ChevronLeft className="h-5 w-5" style={{ color: accent }} aria-hidden />
      </button>

      {/* A GAVETA */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-[90] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70" />

        <aside
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "fl-sharp absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col border-l-2 border-[#0B0B0D] bg-[#0F0C08] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
          style={{ boxShadow: `-8px 0 0 0 ${accent}` }}
        >
          <header className="flex items-center gap-2 border-b-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3">
            {icon && <span style={{ color: accent }}>{icon}</span>}
            <span className="flex-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]">
              {title}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="grid h-8 w-8 place-items-center text-[#9A938A] hover:text-[#F5F1E8]"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* A coluna em si: um bloco embaixo do outro, na ordem em que a
              superfície os declarou. Só renderiza aberta — esconder por CSS
              deixaria as fotos do ranking sendo baixadas à toa. */}
          <div className="flex-1 overflow-y-auto p-4">
            {open && <div className="space-y-3">{children}</div>}
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  )
}
