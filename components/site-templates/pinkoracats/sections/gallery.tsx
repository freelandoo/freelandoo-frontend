// AS VITRINES DE SERVIDOR DA HOME. O HTML (nomes, preços, links) sai pronto
// para o buscador; o gesto mora nas peças de cliente que elas montam
// (`TakeoverLink`, `VtLink`, `Price`) e nos atributos que `motion.tsx` lê.
//
// REGRA DA CASA: OUTRAS LOJAS TÊM PRODUCT CARDS; A PINKORACATS TEM VITRINES.
// Nenhuma seção aqui é "grade de cards" — cada produto é uma caixa exposta.

import AcrylicProductCase from "../case"
import { Price, TakeoverLink } from "../commerce"
import { PLATE_MATERIAL, type Collection } from "../content/collections"
import { displayId, vtCollection } from "../content/display"
import type { Product } from "../content/products.mock"
import { SHAPE_CATS } from "../content/shapes"
import { pageHref, type TemplateLinks } from "../lib"
import { Nail } from "../nail"
import { VtLink } from "../vt"

// ─── 04 ACRYLIC WALL ───────────────────────────────────────────────────────

/**
 * A PAREDE DE NICHOS — galeria branca com estrutura de prata.
 *
 * ⚠️ NÃO É GRADE: cada posição tem papel próprio (grande, pequena, duas
 * empilhadas, uma avançada, uma quase de perfil, uma cortada pela borda). A
 * ordem do HTML continua sendo a ordem de leitura, então teclado e leitor de
 * tela percorrem a parede como lista.
 *
 * Clique numa caixa = TAKEOVER (ela sai do nicho e vira o quick view). O
 * elemento continua sendo um link para a página do produto.
 */
const NICHE = ["hero", "tall", "small", "small-b", "forward", "profile", "cut"] as const

export function AcrylicWall({ products }: { products: Product[] }) {
  const items = products.slice(0, NICHE.length)
  if (items.length < 3) return null
  return (
    <section className="pk-wall" aria-labelledby="pk-wall-title">
      <div className="pk-section-head">
        <p className="pk-eyebrow pk-mono">04 — Exhibition</p>
        <h2 id="pk-wall-title" className="pk-display pk-display--md">
          The acrylic
          <br />
          wall
        </h2>
      </div>
      <ul className="pk-wall__grid">
        {items.map((p, i) => (
          <li key={p.id} className={`pk-niche pk-niche--${NICHE[i]}`} data-reveal="up">
            <TakeoverLink product={p} className="pk-niche__link">
              <span className="pk-niche__box" data-tilt data-pickup data-depth={i % 2 ? "0.06" : "0"}>
                <AcrylicProductCase product={p} size={i === 0 ? "lg" : i === 2 || i === 3 ? "sm" : "md"} />
              </span>
              <span className="pk-niche__info">
                <span className="pk-mono">{displayId(p.number)}</span>
                <span className="pk-niche__name">{p.name}</span>
                <Price product={p} className="pk-niche__price" />
                <span className="pk-niche__cta">View set →</span>
              </span>
            </TakeoverLink>
            <span className="pk-niche__shelf" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── SHOP BY SHAPE ─────────────────────────────────────────────────────────

/**
 * As CATEGORIAS POR FORMATO como placas de prata escovada (era o leque do
 * herói). Levam ao catálogo já filtrado (`?formato=`).
 *
 * ⚠️ A contagem sai de `product.form`, o formato que a dona DECLAROU ("•
 * Formato …" na descrição) — o desenho sorteado do placeholder nunca entra.
 */
export function ShapePlates({ links, products }: { links: TemplateLinks; products: Product[] }) {
  const shop = pageHref(links, "loja")
  return (
    <nav className="pk-shapes" aria-label="Comprar por formato">
      <p className="pk-eyebrow pk-mono">Shop by shape</p>
      <ul className="pk-shapes__row">
        {SHAPE_CATS.map((c) => {
          const n = products.filter((p) => p.form === c.slug).length
          return (
            <li key={c.slug}>
              <a href={`${shop}?formato=${c.slug}`} className="pk-shape pk-mat-brushed" data-cursor="VIEW">
                <Nail shape={c.draw} tint={c.tint} className="pk-shape__nail" />
                <span className="pk-shape__name">{c.label}</span>
                <span className="pk-mono pk-shape__count">{n ? `${n} ${n === 1 ? "set" : "sets"}` : "—"}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ─── 06 FLOATING CASES (editorial) ─────────────────────────────────────────

/** Três a cinco caixas em profundidades diferentes; a tipografia gigante passa por trás. */
export function FloatingCases({ products }: { products: Product[] }) {
  const items = products.slice(0, 5)
  if (items.length < 3) return null
  return (
    <section className="pk-float" aria-labelledby="pk-float-title">
      <p className="pk-float__type" data-depth="-0.5" aria-hidden="true">
        Press-on
        <br />
        as object
      </p>
      <h2 id="pk-float-title" className="sr-only">
        Press-on como objeto
      </h2>
      <ul className="pk-float__cases">
        {items.map((p, i) => (
          <li key={p.id} className={`pk-float__case pk-float__case--${i}`} data-depth={String(0.15 + i * 0.12)}>
            <TakeoverLink product={p} className="pk-float__link">
              <AcrylicProductCase product={p} size={i === 1 ? "lg" : "sm"} lid={i === 1 ? "ajar" : "closed"} />
              <span className="sr-only">
                {p.name} — <Price product={p} />
              </span>
            </TakeoverLink>
          </li>
        ))}
      </ul>
      <p className="pk-float__note" data-reveal="up">
        Cada set é pensado como peça de exposição: formato, acabamento e luz decididos antes da primeira camada.
      </p>
    </section>
  )
}

// ─── 07 GLASS STACK ────────────────────────────────────────────────────────

/**
 * A PILHA DE VIDRO — caixas transparentes empilhadas. Ao rolar, a de cima
 * desliza e revela a próxima.
 *
 * ⚠️ É `position: sticky` puro: nenhum pino, nenhum sequestro de rolagem, e
 * com movimento reduzido vira lista simples.
 *
 * ⚠️ O TÍTULO NÃO DIZ "MAIS VENDIDOS": no catálogo ao vivo não existe dado de
 * venda que sustente isso (o destaque é escolha da Taiz). Prova social
 * inventada é o que este site não faz.
 */
export function GlassStack({ links, products }: { links: TemplateLinks; products: Product[] }) {
  const items = products.slice(0, 5)
  if (items.length < 2) return null
  return (
    <section className="pk-stack" aria-labelledby="pk-stack-title">
      <div className="pk-section-head pk-section-head--row">
        <div>
          <p className="pk-eyebrow pk-mono">07 — The selection</p>
          <h2 id="pk-stack-title" className="pk-display pk-display--md">
            Glass stack
          </h2>
        </div>
        <a className="pk-link" href={pageHref(links, "loja")}>
          Todo o catálogo →
        </a>
      </div>
      <ol className="pk-stack__list">
        {items.map((p, i) => (
          <li key={p.id} className="pk-stack__item" style={{ "--i": i } as React.CSSProperties}>
            <TakeoverLink product={p} className="pk-stack__case">
              <AcrylicProductCase product={p} size="lg" lid={i === 0 ? "ajar" : "closed"} />
            </TakeoverLink>
            <div className="pk-stack__info">
              <span className="pk-mono">
                {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} · {displayId(p.number)}
              </span>
              <h3 className="pk-stack__name">{p.name}</h3>
              {p.tagline ? <p>{p.tagline}</p> : null}
              <Price product={p} className="pk-stack__price" />
              <a className="pk-btn pk-btn--ink" href={pageHref(links, p.slug)}>
                Ver o set
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─── 08 COLLECTION DISPLAY SYSTEM ──────────────────────────────────────────

/**
 * As COLEÇÕES como placas de material — cromado polido, prata escovada,
 * acetinada, espelho, acrílico fumê. A UI continua branca/preta/prata; o que
 * muda é o material e a luz.
 *
 * Clique: a PRÓPRIA placa cresce e vira o herói da coleção (View Transition
 * entre páginas, `VtLink`).
 */
export function CollectionDisplay({
  links,
  collections,
  products,
}: {
  links: TemplateLinks
  collections: Collection[]
  products: Product[]
}) {
  if (!collections.length) return null
  return (
    <section id="colecoes" className="pk-cols" aria-labelledby="pk-cols-title">
      <div className="pk-section-head">
        <p className="pk-eyebrow pk-mono">08 — Collections</p>
        <h2 id="pk-cols-title" className="pk-display pk-display--md">
          Display
          <br />
          modules
        </h2>
      </div>
      <ul className="pk-cols__grid">
        {collections.map((c, i) => {
          const items = products.filter((p) => p.collection === c.slug)
          return (
            <li key={c.slug} className={`pk-cols__cell ${i === 0 ? "pk-cols__cell--lead" : ""}`} data-reveal="up">
              <CollectionPlate links={links} c={c} index={i} items={items} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Uma placa de coleção — a peça única da home e das páginas de coleção. */
export function CollectionPlate({
  links,
  c,
  index,
  items,
}: {
  links: TemplateLinks
  c: Collection
  index: number
  items: Product[]
}) {
  const lead = items[0] || null
  return (
    <VtLink
      href={pageHref(links, c.slug)}
      name={vtCollection(c.slug)}
      className={`pk-plate pk-plate--${PLATE_MATERIAL[c.effect]}`}
      cursor="ENTER"
    >
      <span className="pk-plate__surface" data-vt-source aria-hidden="true" />
      <span className="pk-mono pk-plate__id">COLLECTION / {String(index + 1).padStart(2, "0")}</span>
      <span className="pk-plate__name">{c.name}</span>
      <span className="pk-plate__kicker">{c.kicker}</span>
      {lead ? (
        <span className="pk-plate__case" aria-hidden="true">
          <AcrylicProductCase product={lead} size="xs" />
        </span>
      ) : null}
      <span className="pk-mono pk-plate__count">
        {items.length} {items.length === 1 ? "set" : "sets"} →
      </span>
    </VtLink>
  )
}

// ─── 09 BRAND STATEMENT ────────────────────────────────────────────────────

/** Muito branco, tipografia preta e UMA caixa sobre o piso espelhado. */
export function BrandStatement({ product }: { product: Product | null }) {
  return (
    <section className="pk-statement" aria-labelledby="pk-statement-title">
      <h2 id="pk-statement-title" className="pk-statement__line" data-reveal="clip">
        Nail art.
        <br />
        <em>Worth displaying.</em>
      </h2>
      {product ? (
        <div className="pk-statement__case" data-lid-scrub data-tilt>
          <AcrylicProductCase product={product} size="lg" lid="live" reflect />
        </div>
      ) : null}
      <p className="pk-statement__note" data-reveal="up">
        Cada press-on sai da bancada da Taiz Herrera pintada, finalizada e guardada na própria caixa — pronta para
        ser usada, e bonita o bastante para ficar exposta.
      </p>
    </section>
  )
}

// ─── 10 FINAL DROP ─────────────────────────────────────────────────────────

export function FinalDrop({ email }: { email: string }) {
  return (
    <section className="pk-final pk-mat-soft" aria-labelledby="pk-final-title">
      <div className="pk-final__case" aria-hidden="true">
        <AcrylicProductCase product={null} size="sm" lid="open" />
      </div>
      <p className="pk-eyebrow pk-mono">10 — Next drop</p>
      <h2 id="pk-final-title" className="pk-display pk-display--lg" data-reveal="clip">
        Reserve
        <br />
        the next case
      </h2>
      <p data-reveal="up">Os sets saem em tiragem curta. Entre na lista e saiba primeiro quando a próxima caixa abre.</p>
      <a
        className="pk-btn pk-btn--ink"
        href={`mailto:${email}?subject=${encodeURIComponent("Quero entrar na lista do próximo drop")}`}
      >
        Entrar na lista
      </a>
    </section>
  )
}
