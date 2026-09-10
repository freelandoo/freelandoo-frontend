"use client"

// Primitivas de edição direta do construtor de site.
//
// A regra do módulo: em modo LEITURA, tudo aqui renderiza HTML comum — nenhum
// listener, nenhum contentEditable, nenhum custo. A edição é uma camada que só
// existe para o líder, e o visitante recebe exatamente a mesma marcação sem ela.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, Move, Trash2 } from "lucide-react"
import { SITE_OBJECT_POSITIONS, type SiteObjectPosition } from "@/types/community-site"
import {
  ResizeDots,
  domScale,
  nextFontSize,
  nextWidth,
  useBoxMove,
  usePinchResize,
  useTextBox,
} from "./site-style-context"

/**
 * Texto editável no lugar (clica e digita).
 *
 * OS DOIS MODOS DA CAIXA, e por que a edição de texto é de UM só:
 *   • um clique  — seleciona e trava o texto (modo MOVER). Arrastar o corpo
 *     muda o LUGAR, e NÃO existe cursor de digitação;
 *   • dois cliques (ou o botão do painel) — modo EDITAR: o texto vira
 *     editável, o cursor pousa onde a pessoa clicou e as bolinhas dos cantos
 *     aparecem para dimensionar.
 *
 * ⚠️ É O `contentEditable` QUE SEPARA OS DOIS, e não um limiar de arraste.
 * Enquanto ele esteve sempre ligado, o mesmo ponteiro servia digitar e mover:
 * o clique pousava o caret, o navegador começava a esticar seleção de texto e o
 * arraste tinha de brigar com ela. Travando o texto no modo mover, cada gesto
 * tem um dono e nenhum precisa desfazer o do outro.
 *
 * ⚠️ Por isso o arraste vale SÓ no modo mover: no modo editar, arrastar é como
 * se seleciona um trecho com o mouse, e mover ali tornaria isso impossível.
 *
 * ⚠️ E o arraste só existe depois da seleção. No celular o site é quase todo
 * texto: caixa arrastável ao primeiro toque roubaria a ROLAGEM da página, e a
 * pessoa arrastaria a manchete tentando descer.
 *
 * POR QUE contentEditable NÃO-CONTROLADO: um `<div contentEditable>` controlado
 * por estado React reescreve o nó a cada tecla e o cursor pula para o começo.
 * Aqui o DOM é a fonte enquanto o usuário digita, e só sincronizamos de fora
 * para dentro quando o texto que chega É DIFERENTE do que está na tela — o que
 * nunca acontece durante a digitação (o valor que volta é o que o próprio
 * elemento acabou de emitir), e acontece ao trocar de seção, desfazer ou
 * recarregar.
 */
export function InlineText({
  value,
  onChange,
  editing,
  as: Tag = "div",
  className = "",
  style,
  placeholder = "",
  multiline = false,
  maxLength,
  styleKey,
}: {
  value: string
  onChange: (next: string) => void
  editing: boolean
  as?: "div" | "span" | "h1" | "h2" | "h3" | "p" | "figcaption"
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  /**
   * Nome desta caixa DENTRO do escopo atual (o canvas abre um escopo por
   * seção). Sem ele a caixa não tem tamanho próprio — nem alça, nem entrada no
   * mapa de tamanhos. Campos que são configuração e não conteúdo (o link do
   * botão, por exemplo) ficam de fora de propósito: ninguém "redimensiona" uma
   * URL, e cada chave ocupa uma vaga do teto.
   */
  styleKey?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const [empty, setEmpty] = useState(!value)
  const box = useTextBox(styleKey)

  // Guarda o ponto de partida do arraste. Sem ele cada pointermove somaria
  // sobre o valor JÁ alterado e o texto dispararia para o teto.
  const dragRef = useRef<{
    font: number
    width: number
    parentW: number
    scale: number
  } | null>(null)

  const onResize = useCallback(
    (delta: { dx: number; dy: number }, phase: "start" | "move") => {
      const el = ref.current
      const wrap = wrapRef.current
      if (!el || !wrap) return
      if (phase === "start") {
        const parent = wrap.parentElement
        const parentW = parent ? parent.getBoundingClientRect().width : wrap.getBoundingClientRect().width
        dragRef.current = {
          // Sem tamanho escolhido ainda, o ponto de partida é o que a classe
          // do Tailwind já pinta — começar de um número fixo faria o texto
          // SALTAR no primeiro pixel de arraste.
          font: box.fontSize ?? (parseFloat(window.getComputedStyle(el).fontSize) || 16),
          width:
            box.width ??
            Math.round((wrap.getBoundingClientRect().width / (parentW || 1)) * 100),
          parentW,
          scale: domScale(wrap),
        }
        return
      }
      const d = dragRef.current
      if (!d) return
      box.setStyle({
        // ⚠️ O dedo anda em pixels de TELA e a fonte é gravada em pixels do
        // DOCUMENTO: com a prancheta ampliada, arrastar sem descontar o zoom
        // aumentaria a fonte no dobro do que a pessoa vê acontecer. A largura
        // não precisa disso — é % de um bloco medido na mesma régua escalada.
        fontSize: nextFontSize(d.font, delta.dy / d.scale),
        width: nextWidth(d.width, delta.dx, d.parentW),
      })
    },
    [box]
  )

  // ⚠️ `move`, e não `selected`: no modo editar o arraste do mouse é o gesto de
  // selecionar um trecho de texto, e mover ali tornaria isso impossível.
  const movable = box.mode === "move"
  const editableNow = box.mode === "size"

  const move = useBoxMove({
    enabled: movable,
    wrapRef,
    x: box.x,
    y: box.y,
    setStyle: box.setStyle,
  })

  const toSizeMode = useCallback(() => box.selectMode("size"), [box])

  // Onde o duplo-clique caiu, para o cursor pousar ALI e não no fim do texto.
  // Ref e não estado: isto não repinta nada, e um estado a mais faria a caixa
  // renderizar de novo no meio do gesto.
  const caretAtRef = useRef<{ x: number; y: number } | null>(null)

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      caretAtRef.current = { x: e.clientX, y: e.clientY }
      toSizeMode()
    },
    [toSizeMode]
  )

  const { onPointerDown: onMoveDown, ...moveRest } = move.handlers

  /**
   * ⚠️ A caixa é DONA do gesto, e o `stopPropagation` é o que garante isso: o
   * fundo do site desfaz a seleção no pointerdown (é assim que se solta uma
   * caixa), e sem parar aqui o mesmo toque acenderia e apagaria a seleção.
   *
   * Hoje isso não aparece porque o `focus` chega depois e reacende — mas é
   * acidente de ordem de eventos, e ele não vale para o segundo clique (a caixa
   * já está focada, e nenhum `focus` novo viria consertar).
   */
  const onBoxPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      box.select()
      onMoveDown(e)
    },
    [box, onMoveDown]
  )

  // A pizca liga o modo dimensionar junto: sem isso a caixa cresceria com as
  // bolinhas ainda escondidas e o painel de baixo continuaria oferecendo a
  // posição, que não é o que os dedos acabaram de mexer.
  usePinchResize({
    enabled: box.selected,
    wrapRef,
    fontSize: box.fontSize,
    width: box.width,
    setStyle: box.setStyle,
    onStart: toSizeMode,
  })

  /**
   * O foco segue o MODO.
   *
   * Entrando em editar, o elemento precisa ser focado na mão: ele acabou de
   * virar `contentEditable`, e o clique que ligou o modo já passou — sem isto a
   * pessoa daria dois cliques e teria de dar um terceiro para o cursor aparecer.
   *
   * ⚠️ O caret é pousado no PONTO do duplo-clique. Sem isso ele cairia no
   * começo do texto, e corrigir uma palavra no fim de uma manchete viraria uma
   * viagem de setas.
   *
   * Saindo, o `blur` é o que dispara o `onBlur`/`handleInput` e fecha a edição;
   * tirar o `contentEditable` de um elemento ainda focado deixaria o caret
   * pendurado num nó que não aceita mais texto.
   */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (editableNow) {
      const at = caretAtRef.current
      caretAtRef.current = null
      // ⚠️ Só foca quando o modo veio de um DUPLO-CLIQUE. A pizca de dois dedos
      // também liga o modo editar (para o painel passar a mostrar tamanho), e
      // focar ali subiria o TECLADO no meio de um gesto que é de dimensionar.
      if (!at) return
      if (document.activeElement !== el) el.focus({ preventScroll: true })
      try {
        const doc = document as Document & {
          caretRangeFromPoint?: (x: number, y: number) => Range | null
          caretPositionFromPoint?: (
            x: number,
            y: number
          ) => { offsetNode: Node; offset: number } | null
        }
        const range = doc.caretRangeFromPoint
          ? doc.caretRangeFromPoint(at.x, at.y)
          : (() => {
              const pos = doc.caretPositionFromPoint?.(at.x, at.y)
              if (!pos) return null
              const r = document.createRange()
              r.setStart(pos.offsetNode, pos.offset)
              r.collapse(true)
              return r
            })()
        // Só aceita um ponto DENTRO desta caixa: o duplo-clique pode ter caído
        // na borda, e um range de fora moveria o cursor para outro elemento.
        if (!range || !el.contains(range.startContainer)) return
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch {
        // Navegador sem nenhuma das duas APIs: o foco já aconteceu, e o cursor
        // fica onde o navegador escolher. Perder a precisão do caret não pode
        // custar a edição inteira.
      }
      return
    }
    if (document.activeElement === el) el.blur()
  }, [editableNow])

  // useLayoutEffect: escrever o texto antes da pintura evita o flash de campo
  // vazio no primeiro render de cada seção.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerText !== value) el.innerText = value
    setEmpty(!value)
  }, [value, editing])

  const handleInput = useCallback(() => {
    const el = ref.current
    if (!el) return
    let text = el.innerText
    if (maxLength && text.length > maxLength) {
      text = text.slice(0, maxLength)
      el.innerText = text
      // Cursor para o fim: cortar no meio deixaria o caret antes do corte.
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setEmpty(!text)
    onChange(text)
  }, [maxLength, onChange])

  // Colar texto rico traria <span style> e <img> de outro site para dentro do
  // nosso documento — colamos sempre texto puro.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, multiline ? text : text.replace(/\r?\n/g, " "))
  }, [multiline])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
      }
      // Esc devolve o foco sem "cancelar": o valor já foi propagado a cada
      // tecla, então fingir um cancelamento aqui mentiria sobre o estado.
      if (e.key === "Escape") (e.target as HTMLElement).blur()
    },
    [multiline]
  )

  // O tamanho escolhido vale nas DUAS pontas: a caixa que o líder encolheu tem
  // que sair encolhida para quem visita, senão o que ele publicou não é o que
  // ele viu. Fonte no elemento (a classe do Tailwind precisa perder para o
  // inline) e largura no invólucro, que é onde as alças se apoiam.
  const textStyle: React.CSSProperties = box.fontSize
    ? { ...style, fontSize: `${box.fontSize}px` }
    : style || {}
  // O deslocamento vira `left`/`top` de um elemento `position: relative`: a
  // caixa anda SEM levar o espaço dela junto, então o parágrafo de baixo não
  // sobe quando a manchete vai para o lado. Um `absolute` congelaria a caixa
  // num ponto da tela do computador e o site deixaria de caber no celular.
  const placed = box.x !== null || box.y !== null
  const wrapStyle: React.CSSProperties | undefined =
    box.width !== null || placed
      ? {
          display: "block",
          position: "relative",
          ...(box.width !== null ? { width: `${box.width}%`, maxWidth: "100%" } : null),
          ...(box.x !== null ? { left: `${box.x}%` } : null),
          ...(box.y !== null ? { top: `${box.y}px` } : null),
        }
      : undefined

  if (!editing) {
    // Em LEITURA o placeholder não existe. Ele é uma dica de edição ("Manchete
    // do banner"), e mostrá-lo ao visitante publicaria o rótulo do formulário
    // como se fosse o conteúdo do site. Campo vazio simplesmente não ocupa
    // espaço — quem monta a seção decide se ela aparece.
    if (!value) return null
    const read = (
      <Tag className={className} style={textStyle}>
        {value}
      </Tag>
    )
    // Só embrulha quando há largura escolhida: em leitura, nó a mais por caixa
    // é custo sem contrapartida.
    return wrapStyle ? <span style={wrapStyle}>{read}</span> : read
  }

  const editable = (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      // ⚠️ O texto NASCE TRAVADO e só o modo editar o solta. É esta linha que
      // faz "um clique move, dois cliques editam" — com ele sempre ligado, o
      // primeiro clique pousava o caret e o arraste brigava com a seleção de
      // texto que o navegador começava junto.
      contentEditable={editableNow}
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      aria-label={placeholder || undefined}
      aria-multiline={multiline || undefined}
      data-placeholder={placeholder}
      onInput={handleInput}
      onBlur={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onFocus={box.key ? box.select : undefined}
      // Âncora do painel de botões: é por ela que ele descobre o tamanho que a
      // caixa TEM agora, quando ainda está em automático.
      data-style-key={box.key || undefined}
      className={`fl-site-editable ${empty ? "fl-site-editable-empty" : ""} ${className}`}
      // O cursor anuncia o gesto que aquele estado aceita — travado, um cursor
      // de texto prometeria uma digitação que não vai acontecer.
      style={{ ...textStyle, cursor: editableNow ? "text" : movable ? "move" : "pointer" }}
    />
  )

  // Caixa sem nome (campo de configuração) não ganha invólucro nem alça.
  if (!box.key) return editable

  return (
    <span
      ref={wrapRef}
      className={`relative block ${movable ? "fl-site-box-selected" : ""} ${
        editableNow ? "fl-site-box-editing" : ""
      } ${move.dragging ? "fl-site-box-moving" : ""}`}
      style={{
        ...wrapStyle,
        // `touchAction: none` só na caixa SELECIONADA: é o que impede o
        // navegador de ler o arraste como rolagem e engolir o gesto no meio.
        // Ligado sempre, ele mataria a rolagem do construtor em cima de
        // qualquer texto — que é quase toda a página.
        ...(movable ? { touchAction: "none" } : null),
      }}
      {...moveRest}
      // Tocar em qualquer lugar da caixa seleciona: no celular a alça só
      // aparece depois da seleção, e exigir acertar o texto exato seria pedir
      // pontaria que dedo não tem.
      onPointerDown={onBoxPointerDown}
      // Dois cliques abrem o cursor de texto E as bolinhas. O gesto é o mesmo
      // no celular (dois toques) e convive com a pizca, que leva ao mesmo modo.
      onDoubleClick={onDoubleClick}
    >
      {editable}
      {box.mode === "size" && (
        <ResizeDots onResize={onResize} onCommit={() => (dragRef.current = null)} label={placeholder || "resize"} />
      )}
    </span>
  )
}

/**
 * Imagem editável: clica e escolhe o arquivo; com imagem, ainda dá para mudar o
 * enquadramento e remover.
 *
 * O enquadramento é `object-position` de uma LISTA FECHADA, não arraste livre:
 * o valor viaja até um style inline no servidor e volta, e string livre ali é
 * injeção de CSS — o backend recusaria de todo jeito.
 */
export function EditableImage({
  url,
  objectPosition,
  onChange,
  onUpload,
  editing,
  className = "",
  alt = "",
  label,
  emptyHint,
  framingLabel,
  removeLabel,
  /** Above-the-fold (primeiro slide do hero): sem lazy, para não piscar. */
  eager = false,
}: {
  url: string
  objectPosition: SiteObjectPosition
  onChange: (next: { imageUrl?: string; objectPosition?: SiteObjectPosition }) => void
  onUpload: (file: File) => Promise<string | null>
  editing: boolean
  className?: string
  alt?: string
  label: string
  emptyHint?: string
  /** Rótulos das ações sobre a imagem — traduzidos por quem monta. */
  framingLabel: string
  removeLabel: string
  eager?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [framing, setFraming] = useState(false)

  const pick = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setBusy(true)
      try {
        const uploaded = await onUpload(file)
        if (uploaded) onChange({ imageUrl: uploaded })
      } finally {
        setBusy(false)
      }
    },
    [onChange, onUpload]
  )

  // Superfície interna de alto volume (galeria, catálogo): <img loading="lazy">
  // de propósito — a política de imagem da casa reserva next/image para as
  // superfícies públicas de baixa cardinalidade, e aqui cada comunidade traz
  // as próprias mídias do R2.
  const img = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading={eager ? undefined : "lazy"}
      className="h-full w-full object-cover"
      style={{ objectPosition }}
    />
  ) : null

  if (!editing) {
    return <div className={className}>{img}</div>
  }

  return (
    <div className={`relative group ${className}`}>
      {img}

      {!url && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 bg-[#0B0B0D]/40 p-4 text-center transition hover:border-[#F2B705] hover:bg-[#0B0B0D]/60"
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#F2B705]" />
          ) : (
            <ImagePlus className="h-6 w-6 text-[#F2B705]" />
          )}
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {emptyHint || label}
          </span>
        </button>
      )}

      {url && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1 p-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            title={label}
            aria-label={label}
            onClick={() => inputRef.current?.click()}
            className="pointer-events-auto grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <button
            type="button"
            title={framingLabel}
            aria-label={framingLabel}
            aria-expanded={framing}
            onClick={() => setFraming((v) => !v)}
            className="pointer-events-auto grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
          >
            <Move className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={removeLabel}
            aria-label={removeLabel}
            onClick={() => onChange({ imageUrl: "" })}
            className="pointer-events-auto grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#ff5a44]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {framing && url && (
        <div
          className="absolute bottom-2 left-2 right-2 z-10 grid grid-cols-3 gap-1 border-2 border-[#0B0B0D] bg-[#15120E] p-1"
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {SITE_OBJECT_POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => {
                onChange({ objectPosition: pos })
                setFraming(false)
              }}
              className="border-2 border-[#0B0B0D] px-1 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em]"
              style={
                objectPosition === pos
                  ? { background: "#F2B705", color: "#0B0B0D" }
                  : { background: "#1D1810", color: "#9A938A" }
              }
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0])
          // Zerar permite reescolher O MESMO arquivo (o input não dispara
          // change quando o valor não muda).
          e.target.value = ""
        }}
      />
    </div>
  )
}

/** Botão pequeno e reto do construtor. Só aparece em modo de edição. */
export function BuilderButton({
  onClick,
  icon: Icon,
  children,
  tone = "neutral",
  title,
}: {
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  children?: React.ReactNode
  tone?: "neutral" | "accent" | "danger"
  title?: string
}) {
  const palette =
    tone === "accent"
      ? { background: "#F2B705", color: "#0B0B0D" }
      : tone === "danger"
        ? { background: "#15120E", color: "#ff5a44" }
        : { background: "#1D1810", color: "#F5F1E8" }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]"
      style={palette}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

/**
 * Debounce simples para o autosave. Guarda o valor mais recente e dispara uma
 * única vez depois da pausa — digitar um parágrafo inteiro vira UM save, não um
 * por tecla.
 */
export function useDebouncedCallback<T>(fn: (value: T) => void, delay: number) {
  const fnRef = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<T | null>(null)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingRef.current !== null) {
      const value = pendingRef.current
      pendingRef.current = null
      fnRef.current(value)
    }
  }, [])

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = value
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const pending = pendingRef.current
        pendingRef.current = null
        if (pending !== null) fnRef.current(pending)
      }, delay)
    },
    [delay]
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return { schedule, flush }
}
