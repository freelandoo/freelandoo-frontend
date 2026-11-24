"use client"

// features/meu-mundo/ui/kit/item-detail.tsx — 24/11/2026 (pedido do Alex): TODA carta com thumb é só a arte.
//
// `ItemTile`: a carta da lista — a arte inteira, o selo da classe (e estrelas/quantidade) pequenos no canto e o
// nome numa faixa EMBAIXO da arte. Nada de texto, número ou bloco de atributos por cima da arte.
// `ItemDetailLayout`: o padrão do inspetor do Refinamento — arte grande de um lado, dados do outro, nada por cima
// da arte; no celular empilha (arte em cima, dados embaixo) e só a coluna de dados rola.
// `ItemDetailModal`: o mesmo layout num modal por cima (portal no body: o carrossel e a moldura do painel usam
// transform, e um `fixed` dentro deles ficaria preso). Escape fecha só ele (pilha do AetherModal).

import { useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ItemImage, type ItemCategory } from "./item-image"
import { AE, RANK, type Rank, type Rarity } from "./aether-tokens"
import { RankSeal } from "./rank-seal"
import { AetherModal } from "./aether-modal"
import { SteamFrame } from "./steam/steam-frame"
import { archivo, teko } from "../status/evo-skin"

type Tr = (key: string, fallback: string) => string

export interface ItemArt {
  src?: string | null
  category: ItemCategory
  /** Classe visível (E…Divina): o selo do canto. */
  rank?: Rank
  /** Raridade antiga (só pinta o desenho de reserva quando não há `rank`). */
  rarity?: Rank | Rarity
  /** Ainda não tem: a arte apagada. */
  dim?: boolean
}

/** A arte com o selo da classe e o canto de baixo (estrelas): o lado esquerdo do detalhe e o miolo da carta. */
function ArtPane({ art, alt, t, corner, badge, whole = false }: { art: ItemArt; alt: string; t: Tr; corner?: ReactNode; badge?: ReactNode; whole?: boolean }) {
  return (
    <span className="absolute inset-0 block overflow-hidden" style={{ background: AE.well }}>
      <span className="absolute inset-0 block" style={{ opacity: art.dim ? 0.38 : 1, filter: art.dim ? "grayscale(1)" : undefined }}>
        <ItemImage src={art.src} category={art.category} rarity={art.rank ?? art.rarity} alt={alt} fill fit={art.src && !whole ? "cover" : "contain"} />
      </span>
      {/* a arte do item já traz o selo da classe desenhado; sem arte (desenho de reserva), o selo vai no canto */}
      {art.rank && !art.src && <span className="absolute left-1.5 top-1.5" style={{ background: "rgba(8,10,14,0.72)" }}><RankSeal rank={art.rank} t={t} size="sm" /></span>}
      {badge && (
        <span className={`${archivo.className} absolute right-1.5 top-1.5 px-1.5 py-1 text-[11px] font-bold leading-none tabular-nums`} style={{ background: "rgba(12,15,20,0.86)", color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
          {badge}
        </span>
      )}
      {corner && <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5" style={{ background: "rgba(8,10,14,0.72)" }}>{corner}</span>}
    </span>
  )
}

/**
 * A carta da lista: arte + nome curto embaixo (+ uma linha curta opcional, também fora da arte).
 * `onOpen` = abre o detalhe (sem `onOpen` é só a imagem, como na coluna da arte do detalhe).
 */
export function ItemTile({ art, name, sub, t, corner, badge, selected = false, onOpen, openLabel }: {
  art: ItemArt
  name: string
  /** Uma linha curta na faixa do nome (ex.: "Nv 12"); nunca por cima da arte. */
  sub?: string
  t: Tr
  /** Canto de baixo da arte (estrelas). */
  corner?: ReactNode
  /** Canto de cima à direita (×N, preço curto). */
  badge?: ReactNode
  selected?: boolean
  onOpen?: () => void
  openLabel?: string
}) {
  const edge = selected ? AE.gold : art.rank ? RANK[art.rank].color : AE.brassLine
  const body = (
    <>
      <span className="relative block min-h-0 flex-1">
        <ArtPane art={art} alt="" t={t} corner={corner} badge={badge} />
      </span>
      <span className="grid shrink-0 gap-0.5 px-2.5 py-2 text-left" style={{ background: AE.steel, borderTop: `1px solid ${edge}` }}>
        <span className="flex items-start justify-between gap-1.5">
          <span className={`${teko.className} line-clamp-2 text-[20px] font-semibold uppercase leading-[0.95]`} style={{ color: AE.text }}>{name}</span>
          {art.rank && art.src && <RankSeal rank={art.rank} t={t} size="sm" />}
        </span>
        {sub && <span className={`${teko.className} text-[17px] leading-none tabular-nums`} style={{ color: AE.goldSoft }}>{sub}</span>}
      </span>
    </>
  )
  const style = { background: AE.well, boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${edge}` }
  if (!onOpen) return <div className="relative flex h-full w-full flex-col overflow-hidden" style={style}>{body}</div>
  return (
    <button type="button" data-mm-card-open="" onClick={onOpen} aria-label={openLabel || name}
      className="relative flex h-full w-full flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A1F]" style={style}>
      {body}
    </button>
  )
}

/**
 * O detalhe: arte grande à esquerda, dados à direita (moldura própria, rolagem só nela). No celular, a arte
 * fica em cima (altura fixa) e os dados embaixo. `title` = o título da coluna de dados (nome ou ação).
 */
export function ItemDetailLayout({ art, name, t, title, corner, children }: {
  art: ItemArt
  name: string
  t: Tr
  title?: string
  corner?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-stretch">
      <div className="relative h-[30dvh] min-h-[180px] w-full sm:h-[min(540px,calc(100dvh-280px))]" role="img" aria-label={name}>
        <ArtPane art={art} alt={name} t={t} corner={corner} whole />
      </div>
      {/* o brilho que corre na moldura sai pela lateral: corta só no eixo x */}
      <div className="min-w-0" style={{ overflowX: "clip" }}>
        <SteamFrame tone="gold" className="h-full w-full" innerClassName="flex max-h-[calc(70dvh-200px)] min-h-[200px] flex-col gap-3 overflow-y-auto overscroll-contain p-4 sm:h-[min(540px,calc(100dvh-280px))] sm:max-h-none">
          {title && <h4 className={`${teko.className} text-[24px] font-semibold uppercase leading-tight`} style={{ color: AE.goldSoft }}>{title}</h4>}
          {children}
        </SteamFrame>
      </div>
    </div>
  )
}

/** O detalhe num modal por cima de tudo (portal). */
export function ItemDetailModal({ art, name, t, title, corner, eyebrow, onClose, children }: {
  art: ItemArt
  name: string
  t: Tr
  title?: string
  corner?: ReactNode
  eyebrow?: string
  onClose: () => void
  children: ReactNode
}) {
  if (typeof document === "undefined") return null
  return createPortal(
    // o React propaga eventos pelo portal até a carta: clique e teclas não podem chegar ao carrossel de trás
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <AetherModal title={name} eyebrow={eyebrow} onClose={onClose} width={900} z={95}>
        <ItemDetailLayout art={art} name={name} t={t} title={title} corner={corner}>{children}</ItemDetailLayout>
      </AetherModal>
    </div>,
    document.body,
  )
}

/** Carta + modal: a carta abre o detalhe ao tocar. */
export function ItemCardWithDetail({ art, name, sub, t, corner, badge, eyebrow, title, openLabel, children }: {
  art: ItemArt
  name: string
  sub?: string
  t: Tr
  corner?: ReactNode
  badge?: ReactNode
  eyebrow?: string
  title?: string
  openLabel?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <ItemTile art={art} name={name} sub={sub} t={t} corner={corner} badge={badge} onOpen={() => setOpen(true)}
        openLabel={openLabel || t("itemOpenDetail", "Ver {name}").replace("{name}", name)} />
      {open && <ItemDetailModal art={art} name={name} t={t} title={title} corner={corner} eyebrow={eyebrow} onClose={() => setOpen(false)}>{children}</ItemDetailModal>}
    </>
  )
}
