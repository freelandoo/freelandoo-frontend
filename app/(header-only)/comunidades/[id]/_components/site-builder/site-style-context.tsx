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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import {
  SITE_SIZES,
  clampSize,
  type SiteSectionLayout,
  type SiteTextStyle,
} from "@/types/community-site"

/** O que está selecionado agora. Um só por vez — duas seleções, duas alças. */
export type SiteSelection =
  | { type: "text"; key: string }
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
      const current = stylesRef.current[key] || { fontSize: null, width: null }
      const merged: SiteTextStyle = { ...current, ...patch }
      const next = { ...stylesRef.current }
      // Caixa que voltou para AUTO sai do mapa em vez de virar uma entrada de
      // dois nulos: o backend a descartaria de qualquer jeito, e mantê-la aqui
      // faria o teto de entradas ser gasto com nada.
      if (merged.fontSize === null && merged.width === null) delete next[key]
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
  const selected = !!key && ctx.selection?.type === "text" && ctx.selection.key === key

  return {
    key,
    editing: ctx.editing,
    fontSize: style?.fontSize ?? null,
    width: style?.width ?? null,
    selected,
    select: useCallback(() => {
      if (key) ctx.select({ type: "text", key })
    }, [ctx, key]),
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
        minHeight: clampSize(d.h + delta.dy, SITE_SIZES.HEIGHT_MIN, SITE_SIZES.HEIGHT_MAX),
        maxWidth: clampSize(d.w + delta.dx * 2, SITE_SIZES.MAXW_MIN, SITE_SIZES.MAXW_MAX),
      })
    },
    [layout.minHeight, layout.maxWidth, onChange]
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
