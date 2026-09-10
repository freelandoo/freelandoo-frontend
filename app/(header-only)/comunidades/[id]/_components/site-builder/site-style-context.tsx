"use client"

// Tamanhos manuais do construtor: as alças que deixam o líder encolher e
// esticar uma seção ou uma caixa de texto direto na página.
//
// POR QUE CONTEXTO, e não props: o tamanho de uma caixa é identificado pelo
// CAMINHO dela (`sec:<id>.hero.<slideId>.headline`), e o caminho só é conhecido
// por inteiro no canvas — que sabe o id da seção — enquanto quem desenha a
// caixa é a seção, que só conhece o pedaço final. Passar o prefixo por prop
// obrigaria as seis seções a repassá-lo para dentro de cada item; o contexto
// entrega o prefixo por ESCOPO e cada caixa declara só o nome dela.
//
// Em LEITURA nada disto existe: o provider entrega `editing: false`, nenhuma
// alça é montada e nenhum listener é registrado — a mesma regra do resto do
// módulo.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  SITE_SIZES,
  clampSize,
  type SiteSectionLayout,
  type SiteTextStyle,
} from "@/types/community-site"

/**
 * O que está selecionado agora. Um só por vez — duas seleções, duas alças.
 *
 * A caixa de texto tem MODO, e é ele que separa os dois gestos que o líder faz
 * sobre a mesma caixa: `move` (arrastar para o lugar) e `size` (as bolinhas dos
 * cantos). Sem o modo, arrastar o corpo e arrastar o canto disputariam o mesmo
 * ponteiro e a caixa mudaria de tamanho quando a pessoa só queria movê-la.
 *
 * A SEÇÃO não tem modo: ela é empilhada, não deslocada (ver o normalizador do
 * backend), então para ela só existe dimensionar.
 */
export type SiteBoxMode = "move" | "size"

export type SiteSelection =
  | { type: "text"; key: string; mode: SiteBoxMode }
  | { type: "section"; id: string }
  | null

type SiteStyleValue = {
  editing: boolean
  /** Prefixo do caminho no ponto da árvore em que estamos. */
  scope: string
  /**
   * Tamanho da seção em que estamos, ou null fora de uma.
   *
   * Anda pelo contexto e não por prop pela mesma razão do prefixo: quem desenha
   * a coluna de conteúdo é a casca (e o hero, que tem a própria), lá no fundo
   * da árvore — passar por prop obrigaria as seis seções a repassar um dado que
   * não é delas.
   */
  sectionLayout: SiteSectionLayout | null
  styles: Record<string, SiteTextStyle>
  setTextStyle: (key: string, patch: Partial<SiteTextStyle>) => void
  selection: SiteSelection
  select: (next: SiteSelection) => void
}

const EMPTY_STYLES: Record<string, SiteTextStyle> = {}

/** Caixa que nunca foi tocada: tudo em AUTO. */
export const EMPTY_BOX: SiteTextStyle = { fontSize: null, width: null, x: null, y: null }

/** Seção que nunca foi redimensionada: tudo em AUTO. */
export const EMPTY_LAYOUT: SiteSectionLayout = { minHeight: null, maxWidth: null, padY: null }

function isAutoBox(box: SiteTextStyle): boolean {
  return box.fontSize === null && box.width === null && box.x === null && box.y === null
}

const SiteStyleContext = createContext<SiteStyleValue>({
  editing: false,
  scope: "",
  sectionLayout: null,
  styles: EMPTY_STYLES,
  setTextStyle: () => {},
  selection: null,
  select: () => {},
})

export function SiteStyleProvider({
  editing,
  styles,
  onChangeStyles,
  selection,
  onSelect,
  children,
}: {
  editing: boolean
  styles: Record<string, SiteTextStyle> | undefined
  onChangeStyles: (next: Record<string, SiteTextStyle>) => void
  selection: SiteSelection
  onSelect: (next: SiteSelection) => void
  children: React.ReactNode
}) {
  // O mapa mais novo num ref: durante um arraste chegam dezenas de patches, e
  // cada um precisa enxergar o resultado do anterior. Ler do estado capturado
  // no closure gravaria sempre por cima do valor de antes do arraste.
  const stylesRef = useRef(styles || EMPTY_STYLES)
  useEffect(() => {
    stylesRef.current = styles || EMPTY_STYLES
  }, [styles])

  const setTextStyle = useCallback(
    (key: string, patch: Partial<SiteTextStyle>) => {
      // Spread, pela mesma razão do painel: entrada gravada antes da posição
      // existir chega com dois campos, e `undefined` não bate com o `=== null`
      // que decide se a caixa voltou ao automático.
      const current: SiteTextStyle = { ...EMPTY_BOX, ...(stylesRef.current[key] || {}) }
      const merged: SiteTextStyle = { ...current, ...patch }
      const next = { ...stylesRef.current }
      // Caixa que voltou para AUTO sai do mapa em vez de virar uma entrada de
      // quatro nulos: o backend a descartaria de qualquer jeito, e mantê-la
      // aqui faria o teto de entradas ser gasto com nada.
      // ⚠️ A comparação é com `null`, nunca por valor falsy: deslocamento ZERO
      // é o líder pedindo a caixa de volta ao lugar, e tratá-lo como ausência
      // devolveria o deslocamento antigo no próximo carregamento.
      if (isAutoBox(merged)) delete next[key]
      else next[key] = merged
      stylesRef.current = next
      onChangeStyles(next)
    },
    [onChangeStyles]
  )

  const value = useMemo<SiteStyleValue>(
    () => ({
      editing,
      scope: "",
      sectionLayout: null,
      styles: styles || EMPTY_STYLES,
      setTextStyle,
      selection,
      select: onSelect,
    }),
    [editing, styles, setTextStyle, selection, onSelect]
  )

  return <SiteStyleContext.Provider value={value}>{children}</SiteStyleContext.Provider>
}

/** Empurra prefixo e tamanho para baixo (o canvas abre um escopo por seção). */
export function SiteStyleScope({
  scope,
  layout = null,
  children,
}: {
  scope: string
  layout?: SiteSectionLayout | null
  children: React.ReactNode
}) {
  const parent = useContext(SiteStyleContext)
  const value = useMemo<SiteStyleValue>(
    () => ({
      ...parent,
      scope: parent.scope ? `${parent.scope}.${scope}` : scope,
      sectionLayout: layout,
    }),
    [parent, scope, layout]
  )
  return <SiteStyleContext.Provider value={value}>{children}</SiteStyleContext.Provider>
}

/** Tamanho escolhido para a seção atual (null = nunca redimensionada). */
export function useSectionLayout(): SiteSectionLayout | null {
  return useContext(SiteStyleContext).sectionLayout
}

export function useSiteStyle() {
  return useContext(SiteStyleContext)
}

/** Tudo que uma caixa de texto precisa saber sobre o próprio tamanho. */
export function useTextBox(localKey: string | undefined) {
  const ctx = useContext(SiteStyleContext)
  const key = !localKey ? "" : ctx.scope ? `${ctx.scope}.${localKey}` : localKey
  const style = key ? ctx.styles[key] : undefined
  const mine = !!key && ctx.selection?.type === "text" && ctx.selection.key === key
  const mode: SiteBoxMode | null =
    mine && ctx.selection?.type === "text" ? ctx.selection.mode : null

  const select = useCallback(
    (next: SiteBoxMode) => {
      if (key) ctx.select({ type: "text", key, mode: next })
    },
    [ctx, key]
  )

  return {
    key,
    editing: ctx.editing,
    fontSize: style?.fontSize ?? null,
    width: style?.width ?? null,
    x: style?.x ?? null,
    y: style?.y ?? null,
    selected: mine,
    mode,
    /**
     * Primeiro toque: a caixa entra em MOVER. Tocar de novo numa caixa que já
     * está selecionada NÃO a devolve para mover — senão o segundo clique
     * desfaria o modo de dimensionar que o duplo-clique acabou de ligar.
     */
    select: useCallback(() => {
      if (!mine) select("move")
    }, [mine, select]),
    selectMode: select,
    setStyle: useCallback(
      (patch: Partial<SiteTextStyle>) => {
        if (key) ctx.setTextStyle(key, patch)
      },
      [ctx, key]
    ),
  }
}

type Corner = "nw" | "ne" | "sw" | "se"
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"]

const CORNER_POS: Record<Corner, string> = {
  nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
  ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
}

/**
 * As bolinhas dos cantos.
 *
 * Arrastar PARA FORA do centro aumenta, para dentro diminui — por isso cada
 * canto carrega o próprio sinal em vez de todos somarem o deslocamento cru
 * (num canto esquerdo, arrastar para a direita ENCOLHE).
 *
 * Pointer events, e não mouse: a mesma alça serve dedo, caneta e mouse. O
 * `setPointerCapture` é o que mantém o arraste vivo quando o dedo sai de cima
 * da bolinha, que é o caso comum num alvo de 12px.
 */
export function ResizeDots({
  onResize,
  onCommit,
  label,
  tone = "#F2B705",
}: {
  /** dx/dy já com o sinal do canto: positivo = "para fora", ou seja, maior. */
  onResize: (delta: { dx: number; dy: number }, phase: "start" | "move") => void
  onCommit: () => void
  label: string
  tone?: string
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const begin = useCallback(
    (e: React.PointerEvent, corner: Corner) => {
      // Sem isto o pointerdown na bolinha cai no contentEditable de baixo e o
      // arraste vira seleção de texto.
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      startRef.current = { x: e.clientX, y: e.clientY }
      onResize({ dx: 0, dy: 0 }, "start")
      void corner
    },
    [onResize]
  )

  return (
    <>
      {CORNERS.map((corner) => {
        const signX = corner === "ne" || corner === "se" ? 1 : -1
        const signY = corner === "sw" || corner === "se" ? 1 : -1
        return (
          <span
            key={corner}
            data-dot
            role="slider"
            aria-label={label}
            aria-valuenow={0}
            tabIndex={-1}
            onPointerDown={(e) => begin(e, corner)}
            onPointerMove={(e) => {
              const start = startRef.current
              if (!start) return
              e.preventDefault()
              onResize(
                { dx: (e.clientX - start.x) * signX, dy: (e.clientY - start.y) * signY },
                "move"
              )
            }}
            onPointerUp={(e) => {
              if (!startRef.current) return
              startRef.current = null
              ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
              onCommit()
            }}
            onPointerCancel={() => {
              startRef.current = null
              onCommit()
            }}
            className={`absolute z-30 block h-3 w-3 border-2 border-[#0B0B0D] ${CORNER_POS[corner]}`}
            // `touchAction: none` é o que impede o navegador de tratar o
            // arraste como rolagem e engolir o gesto no meio.
            style={{ background: tone, touchAction: "none", pointerEvents: "auto" }}
          />
        )
      })}
    </>
  )
}

/** Passo do arraste: pixels de dedo por ponto de fonte. Calibrado na mão. */
export const FONT_PER_PIXEL = 0.22

export function nextFontSize(base: number, dy: number) {
  return clampSize(base + dy * FONT_PER_PIXEL, SITE_SIZES.FONT_MIN, SITE_SIZES.FONT_MAX)
}

export function nextWidth(base: number, dx: number, containerWidth: number) {
  const delta = containerWidth > 0 ? (dx / containerWidth) * 100 : 0
  return clampSize(base + delta, SITE_SIZES.WIDTH_MIN, SITE_SIZES.WIDTH_MAX)
}

export function nextX(base: number, dx: number, containerWidth: number) {
  const delta = containerWidth > 0 ? (dx / containerWidth) * 100 : 0
  return clampSize(base + delta, SITE_SIZES.X_MIN, SITE_SIZES.X_MAX)
}

export function nextY(base: number, dy: number) {
  return clampSize(base + dy, SITE_SIZES.Y_MIN, SITE_SIZES.Y_MAX)
}

/**
 * Quanto a prancheta esta ampliada AGORA.
 *
 * ⚠️ A prancheta do construtor tem zoom proprio (`transform: scale`), e e por
 * isso que este numero precisa existir: `clientX` e `getBoundingClientRect()`
 * vem em pixels de TELA, ja escalados, enquanto a fonte e o deslocamento
 * vertical sao gravados em pixels do DOCUMENTO. Com zoom em 200%, arrastar dois
 * centimetros valeria o dobro do que a pessoa ve acontecer.
 *
 * Sai da razao entre a caixa medida (escalada) e o layout dela (`offsetWidth`,
 * que ignora `transform`) — assim nenhum componente precisa receber o zoom por
 * prop de quatro niveis acima.
 *
 * O eixo X nao passa por aqui: ele e gravado em PORCENTAGEM do bloco, e o bloco
 * e medido na mesma regua escalada do dedo — o zoom se cancela sozinho.
 */
export function domScale(el: HTMLElement | null): number {
  if (!el) return 1
  const layout = el.offsetWidth
  if (!layout) return 1
  const ratio = el.getBoundingClientRect().width / layout
  return Number.isFinite(ratio) && ratio > 0.05 ? ratio : 1
}

/** Folga em pixels antes de um toque parado virar arraste. */
const DRAG_THRESHOLD = 4

/**
 * Arrastar o CORPO da caixa para mudar o lugar dela.
 *
 * ⚠️ So vale para a caixa JA SELECIONADA, e isso nao e detalhe: no celular o
 * site e quase todo texto, e uma caixa arrastavel ao primeiro toque roubaria a
 * rolagem da pagina — a pessoa tentaria descer e ficaria arrastando a manchete.
 * O primeiro toque seleciona (e o navegador rola normalmente); a partir dele a
 * caixa responde ao arraste.
 *
 * ⚠️ O arraste so comeca depois de `DRAG_THRESHOLD` pixels. Sem essa folga um
 * clique com a mao tremida viraria um deslocamento de um pixel e a caixa nunca
 * mais estaria "no lugar" — e e ela que preserva o clique simples, que continua
 * servindo para pousar o cursor e digitar.
 */
export function useBoxMove({
  enabled,
  wrapRef,
  x,
  y,
  setStyle,
}: {
  enabled: boolean
  wrapRef: React.RefObject<HTMLElement | null>
  x: number | null
  y: number | null
  setStyle: (patch: Partial<SiteTextStyle>) => void
}) {
  const [dragging, setDragging] = useState(false)
  const stateRef = useRef<{
    px: number
    py: number
    x: number
    y: number
    parentW: number
    scale: number
    live: boolean
    pointerId: number
  } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      // Alca de canto e botoes do construtor tem dono: deixa-los borbulhar ate
      // aqui faria redimensionar e mover ao mesmo tempo.
      if ((e.target as HTMLElement).closest("[data-dot],button,a,input")) return
      const wrap = wrapRef.current
      if (!wrap) return
      const parent = wrap.parentElement
      const parentRect = parent ? parent.getBoundingClientRect() : null
      stateRef.current = {
        px: e.clientX,
        py: e.clientY,
        x: x ?? 0,
        y: y ?? 0,
        parentW: (parentRect ? parentRect.width : wrap.getBoundingClientRect().width) || 1,
        scale: domScale(wrap),
        live: false,
        pointerId: e.pointerId,
      }
    },
    [enabled, wrapRef, x, y]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = stateRef.current
      if (!st || st.pointerId !== e.pointerId) return
      const dx = e.clientX - st.px
      const dy = e.clientY - st.py
      if (!st.live) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        st.live = true
        setDragging(true)
        // O ponteiro sai de cima da caixa a toda hora durante um arraste; sem a
        // captura o gesto morreria no meio, com a caixa a meio caminho.
        try {
          const host = e.currentTarget as HTMLElement
          host.setPointerCapture(e.pointerId)
        } catch {
          // Ponteiro que ja sumiu (dedo levantado no mesmo quadro): o arraste
          // segue pelos eventos que ainda chegam e o commit fecha do mesmo
          // jeito. Falhar aqui nao pode derrubar o gesto.
        }
        // O pointerdown ja pousou o cursor dentro do texto e o navegador comecou
        // a esticar uma selecao. Deixa-la de pe pintaria a manchete inteira de
        // azul enquanto a pessoa arrasta.
        const sel = window.getSelection()
        if (sel) sel.removeAllRanges()
      }
      e.preventDefault()
      setStyle({ x: nextX(st.x, dx, st.parentW), y: nextY(st.y, dy / st.scale) })
    },
    [setStyle]
  )

  const finish = useCallback((e: React.PointerEvent) => {
    const st = stateRef.current
    if (!st) return
    stateRef.current = null
    if (!st.live) return
    setDragging(false)
    try {
      const host = e.currentTarget as HTMLElement
      host.releasePointerCapture(st.pointerId)
    } catch {
      // Idem: a captura pode ja ter sido devolvida pelo proprio navegador.
    }
  }, [])

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}

/**
 * Pizca de dois dedos SOBRE a caixa: aumenta e diminui ela.
 *
 * ⚠️ A prancheta inteira ja responde a pizca com zoom (o construtor registra o
 * dela no viewport). Quem decide de quem e o gesto e a CAIXA, aqui, parando a
 * propagacao — assim existe um lugar so tomando essa decisao, em vez de o
 * construtor ter de adivinhar o que esta debaixo dos dedos.
 *
 * ⚠️ Listener NATIVO com `passive: false`: o React registra `touchmove` como
 * passivo, e em listener passivo o `preventDefault` e ignorado — o navegador
 * daria o zoom dele por cima e a pagina inteira sairia do lugar.
 */
export function usePinchResize({
  enabled,
  wrapRef,
  fontSize,
  width,
  setStyle,
  onStart,
}: {
  enabled: boolean
  wrapRef: React.RefObject<HTMLElement | null>
  fontSize: number | null
  width: number | null
  setStyle: (patch: Partial<SiteTextStyle>) => void
  onStart: () => void
}) {
  // O gesto e montado uma vez e vive varios quadros; sem o espelho ele leria
  // para sempre o tamanho que a caixa tinha quando o componente nasceu.
  const liveRef = useRef({ fontSize, width, setStyle, onStart, enabled })
  useEffect(() => {
    liveRef.current = { fontSize, width, setStyle, onStart, enabled }
  }, [fontSize, width, setStyle, onStart, enabled])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let start: { dist: number; font: number; width: number } | null = null

    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      )

    const onTouchStart = (e: TouchEvent) => {
      if (!liveRef.current.enabled || e.touches.length !== 2) return
      e.stopPropagation()
      const node = wrapRef.current
      const text = (node ? node.querySelector<HTMLElement>("[data-style-key]") : null) || node
      start = {
        dist: distance(e.touches),
        // Em AUTO o ponto de partida e o que a folha de estilo ja pinta:
        // comecar de um numero fixo faria o texto SALTAR no primeiro milimetro.
        font:
          liveRef.current.fontSize ??
          (text ? parseFloat(window.getComputedStyle(text).fontSize) || 16 : 16),
        width: liveRef.current.width ?? 100,
      }
      liveRef.current.onStart()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return
      e.preventDefault()
      e.stopPropagation()
      const ratio = distance(e.touches) / (start.dist || 1)
      liveRef.current.setStyle({
        fontSize: clampSize(start.font * ratio, SITE_SIZES.FONT_MIN, SITE_SIZES.FONT_MAX),
        width: clampSize(start.width * ratio, SITE_SIZES.WIDTH_MIN, SITE_SIZES.WIDTH_MAX),
      })
    }

    const onTouchEnd = () => {
      start = null
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    el.addEventListener("touchcancel", onTouchEnd)
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [wrapRef])
}

/** Largura padrão da coluna de conteúdo (`max-w-6xl` = 72rem). */
export const SITE_CONTENT_MAX_WIDTH = 1152

/**
 * Alças da SEÇÃO: arrastar para baixo estica a altura, para os lados alarga a
 * coluna de conteúdo.
 *
 * A largura anda em DOBRO do dedo porque a coluna é centralizada — mexer só um
 * lado moveria a borda oposta na direção contrária, e a seção pareceria fugir
 * do cursor.
 */
export function SectionResizeDots({
  layout,
  onChange,
  label,
}: {
  layout: SiteSectionLayout
  onChange: (next: SiteSectionLayout) => void
  label: string
}) {
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const dragRef = useRef<{ h: number; w: number } | null>(null)

  const onResize = useCallback(
    (delta: { dx: number; dy: number }, phase: "start" | "move") => {
      const host = anchorRef.current?.parentElement
      if (!host) return
      if (phase === "start") {
        const rect = host.getBoundingClientRect()
        dragRef.current = {
          h: layout.minHeight ?? Math.round(rect.height),
          w: layout.maxWidth ?? Math.min(SITE_CONTENT_MAX_WIDTH, Math.round(rect.width)),
        }
        return
      }
      const d = dragRef.current
      if (!d) return
      onChange({
        ...layout,
        minHeight: clampSize(d.h + delta.dy, SITE_SIZES.HEIGHT_MIN, SITE_SIZES.HEIGHT_MAX),
        maxWidth: clampSize(d.w + delta.dx * 2, SITE_SIZES.MAXW_MIN, SITE_SIZES.MAXW_MAX),
      })
    },
    [layout, onChange]
  )

  return (
    <span ref={anchorRef} className="pointer-events-none absolute inset-0 z-30">
      <ResizeDots
        onResize={onResize}
        onCommit={() => (dragRef.current = null)}
        label={label}
        tone="#5AC8FA"
      />
    </span>
  )
}

/**
 * A LINHA QUE DIVIDE DUAS SEÇÕES vira alça de altura.
 *
 * É uma faixa fina no rodapé da seção, com o cursor de redimensionar vertical.
 * Ela existe porque as bolinhas dos cantos moram atrás de um botão da barra
 * (é preciso ligar o modo tamanho antes), e apertar o respiro de uma seção é a
 * coisa mais frequente que se faz num site montado — tinha de estar a um
 * arraste, no lugar onde o olho já está: a divisa entre uma seção e a seguinte.
 *
 * ⚠️ O RESPIRO CEDE ANTES DA ALTURA, e é isso que faz "diminuir" funcionar.
 * `minHeight` sozinho SÓ CRESCE: com o `py-16 md:py-24` do CSS de pé, pedir uma
 * altura menor que o conteúdo não mudava um pixel e a alça parecia quebrada.
 * Então a conta é: o quanto sobra além do conteúdo vira respiro (até o teto), e
 * `minHeight` só entra quando a pessoa pede MAIS do que o conteúdo ocupa.
 *
 * ⚠️ A altura do conteúdo é medida UMA VEZ, no começo do arraste. Medida a cada
 * quadro, ela mudaria junto com o respiro que estamos aplicando e o gesto
 * entraria em realimentação — a seção fugiria do cursor.
 */
export function SectionHeightHandle({
  layout,
  onChange,
  label,
  tone = "#5AC8FA",
}: {
  layout: SiteSectionLayout
  onChange: (next: SiteSectionLayout) => void
  label: string
  tone?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ y: number; height: number; content: number; scale: number } | null>(
    null
  )
  const [dragging, setDragging] = useState(false)

  const begin = useCallback(
    (e: React.PointerEvent) => {
      const host = ref.current?.parentElement
      if (!host) return
      e.preventDefault()
      e.stopPropagation()
      const el = e.currentTarget as HTMLElement
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // Ponteiro que já sumiu: o arraste segue pelos eventos que chegarem.
      }
      const scale = domScale(host)
      const height = host.getBoundingClientRect().height / scale
      const pad = layout.padY ?? readPadY(host)
      dragRef.current = {
        y: e.clientY,
        height,
        // Altura do conteúdo SEM o respiro: é o piso real de encolhimento.
        content: Math.max(0, height - pad * 2),
        scale,
      }
      setDragging(true)
    },
    [layout.padY]
  )

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const target = d.height + (e.clientY - d.y) / d.scale
      const pad = clampSize((target - d.content) / 2, SITE_SIZES.PADY_MIN, SITE_SIZES.PADY_MAX)
      const natural = d.content + pad * 2
      onChange({
        ...layout,
        padY: pad,
        // Só grava altura quando a pessoa pede MAIS do que o conteúdo com o
        // respiro no teto — abaixo disso `minHeight` não teria efeito nenhum e
        // guardá-lo deixaria um número morto no documento.
        minHeight:
          target > natural + 1
            ? clampSize(target, SITE_SIZES.HEIGHT_MIN, SITE_SIZES.HEIGHT_MAX)
            : null,
      })
    },
    [layout, onChange]
  )

  const finish = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
  }, [])

  return (
    <div
      ref={ref}
      role="separator"
      aria-label={label}
      title={label}
      onPointerDown={begin}
      onPointerMove={onMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      className="absolute inset-x-0 bottom-0 z-20 flex h-3 cursor-ns-resize items-end justify-center"
      // `touchAction: none` impede o navegador de ler o arraste como rolagem.
      style={{ touchAction: "none" }}
    >
      <div
        className="h-1 w-full transition-opacity"
        style={{ background: tone, opacity: dragging ? 1 : 0 }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-1.5 w-16 -translate-x-1/2"
        style={{ background: tone, opacity: dragging ? 1 : 0.35 }}
      />
    </div>
  )
}

/** Respiro que o CSS está pintando agora — o ponto de partida em AUTO. */
function readPadY(el: HTMLElement): number {
  const v = parseFloat(window.getComputedStyle(el).paddingTop)
  return Number.isFinite(v) ? v : 0
}

/**
 * Tamanho que a caixa TEM na tela agora, para o painel de botões saber de onde
 * partir quando ela ainda está em AUTO. Lê o DOM de propósito: o número que
 * interessa é o que a classe do Tailwind pinta neste breakpoint, e ele não
 * existe em lugar nenhum do estado.
 */
export function measuredFontSize(key: string, fallback = 16): number {
  if (typeof document === "undefined") return fallback
  const el = document.querySelector<HTMLElement>(`[data-style-key="${CSS.escape(key)}"]`)
  if (!el) return fallback
  const size = parseFloat(window.getComputedStyle(el).fontSize)
  return Number.isFinite(size) ? Math.round(size) : fallback
}

/** Idem para a seção: altura atual em pixels. */
export function measuredSectionHeight(id: string, fallback = 320): number {
  if (typeof document === "undefined") return fallback
  const el = document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`)
  if (!el) return fallback
  return Math.round(el.getBoundingClientRect().height) || fallback
}

/** E o respiro que o CSS pinta agora, para o painel partir do valor real. */
export function measuredSectionPadY(id: string, fallback = 96): number {
  if (typeof document === "undefined") return fallback
  const el = document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`)
  // O respiro mora na CASCA da seção, não na moldura que carrega o id.
  const inner = el?.querySelector<HTMLElement>("section") || el
  if (!inner) return fallback
  return Math.round(readPadY(inner)) || fallback
}
