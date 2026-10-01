// AS VITRINES DA HOME. Componentes de servidor: o HTML (nomes, preços, links)
// sai pronto para o buscador; o gesto mora nas peças de cliente que eles
// montam (`ProductCard`, `ProductMedia`) e nos atributos que `motion.tsx` lê.

import type { Collection } from "../content/collections"
import type { Product } from "../content/products.mock"
import { ProductCard, QuickOpenButton } from "../commerce"
import { brl, pageHref, type TemplateLinks } from "../lib"
import { SHAPE_CATS } from "../content/shapes"
import ProductMedia from "../media"
import { Nail } from "../nail"

// ─── 01 HERO / OS FORMATOS ─────────────────────────────────────────────────

/**
 * O leque de FORMATOS no herói — cada unha é uma categoria (stiletto, almond,
 * quadrada, duck, garras) e leva ao catálogo já filtrado (`?formato=`).
 *
 * ⚠️ É a ÚNICA entrada por formato do site, e por isso o nome fica SEMPRE à
 * vista (no leque antigo ele só aparecia no hover — aceitável para um produto,
 * não para uma categoria, que tem que ser lida sem procurar).
 * ⚠️ A contagem sai de `product.form`, o formato que a dona DECLAROU; o
 * desenho sorteado do placeholder nunca entra nesta conta.
 */
export function ShapeFan({ links, products }: { links: TemplateLinks; products: Product[] }) {
  const mid = (SHAPE_CATS.length - 1) / 2
  const shop = pageHref(links, "loja")
  return (
    <nav className="pk-shapes" aria-label="Formatos de unha">
      <ul className="pk-fan__deck pk-fan__deck--hero" style={{ "--mid": mid } as React.CSSProperties}>
        {SHAPE_CATS.map((c, i) => {
          const n = products.filter((p) => p.form === c.slug).length
          return (
            <li key={c.slug} className="pk-fan__item" style={{ "--i": i } as React.CSSProperties}>
              <a href={`${shop}?formato=${c.slug}`} className="pk-fan__link" data-cursor="VER" aria-label={c.label}>
                <span className="pk-shapes__name">
                  {c.label}
                  {n ? <small>{n}</small> : null}
                </span>
                <Nail shape={c.draw} tint={c.tint} className="pk-fan__nail" />
              </a>
            </li>
          )
        })}
      </ul>
      {/* No celular os cinco nomes não cabem no arco (se sobrepõem): lá as
          unhas ficam sem etiqueta e os MESMOS links aparecem aqui embaixo. */}
      <ul className="pk-shapes__list">
        {SHAPE_CATS.map((c) => (
          <li key={c.slug}>
            <a className="pk-chip" href={`${shop}?formato=${c.slug}`}>
              {c.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Hero({
  links,
  products,
  drop,
}: {
  links: TemplateLinks
  products: Product[]
  drop: Collection | null
}) {
  return (
    <section className="pk-hero" aria-labelledby="pk-hero-title">
      <div className="pk-hero__copy">
        <p className="pk-eyebrow" data-reveal="up">
          Nail art as object · Drop 001
        </p>
        <h1 id="pk-hero-title" className="pk-display pk-display--xl" data-lines>
          <span>
            <span>Pinkora</span>
          </span>
          <span>
            <span>
              cats<em>.</em>
            </span>
          </span>
        </h1>
        <p className="pk-hero__lead" data-reveal="up">
          Unhas autorais tratadas como peça de design: sets prontos, charms e encomendas desenhadas uma a uma.
        </p>
        <div className="pk-hero__cta" data-reveal="up">
          <a className="pk-btn pk-btn--hot" href={pageHref(links, drop ? drop.slug : "loja")} data-cursor="SELECT">
            {drop && drop.slug !== "new-drop" ? `Ver ${drop.name}` : "Ver o new drop"}
          </a>
          <a className="pk-btn pk-btn--line" href={pageHref(links, "loja")}>
            Todo o catálogo
          </a>
        </div>
      </div>
      <ShapeFan links={links} products={products} />
      <p className="pk-hero__scroll" aria-hidden="true">
        role · scroll
      </p>
    </section>
  )
}

// ─── 07 COLLECTION PORTALS ────────────────────────────────────────────────

export function Portal({ links, c, index }: { links: TemplateLinks; c: Collection; index: number }) {
  return (
    <a
      href={pageHref(links, c.slug)}
      className={`pk-portal pk-portal--${c.effect}`}
      data-cursor="VIEW"
      data-tilt
      data-reveal="up"
    >
      <ProductMedia
        src={c.image}
        alt=""
        variant={c.variant}
        aspect="4/5"
        shape={(["almond", "coffin", "stiletto", "square"] as const)[index % 4]}
        tint={index % 2 ? ["#a81f2e", "#ff9aa0"] : ["#ff9aa0", "#f5f6f8"]}
        kicker={c.kicker}
        composition={index % 3 === 0 ? "set" : "single"}
      />
      <span className="pk-portal__fx" aria-hidden="true" />
      <span className="pk-portal__name">{c.name}</span>
      <span className="pk-portal__kicker">{c.kicker} →</span>
    </a>
  )
}

export function CollectionPortals({ links, collections }: { links: TemplateLinks; collections: Collection[] }) {
  return (
    <section id="colecoes" className="pk-portals" aria-labelledby="pk-portals-title">
      <div className="pk-section-head">
        <p className="pk-eyebrow">03 — Coleções</p>
        <h2 id="pk-portals-title" className="pk-display pk-display--md">
          Enter a<br />
          collection
        </h2>
      </div>
      <div className="pk-portals__grid">
        {collections.map((c, i) => (
          <Portal key={c.slug} links={links} c={c} index={i} />
        ))}
      </div>
    </section>
  )
}

// ─── 08 HORIZONTAL RUNWAY ─────────────────────────────────────────────────

const RUNWAY_SHAPE = ["is-tall", "is-wide", "is-tilt", "is-tall", "is-round", "is-wide"]

export function Runway({ products, title = "New drop" }: { products: Product[]; title?: string }) {
  return (
    <section className="pk-runway pk-silver" data-runway aria-labelledby="pk-runway-title">
      <div className="pk-runway__track" data-runway-track>
        <h2 id="pk-runway-title" className="pk-runway__title pk-display pk-display--xl">
          {title}
        </h2>
        {products.map((p, i) => (
          <div key={p.id} className={`pk-runway__item ${RUNWAY_SHAPE[i % RUNWAY_SHAPE.length]}`} data-runway-item>
            <ProductCard product={p} aspect={i % 2 ? "3/4" : "4/5"} composition={i % 2 ? "single" : "set"} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 09 BEST SELLERS ──────────────────────────────────────────────────────

export function BestSellers({ links, products }: { links: TemplateLinks; products: Product[] }) {
  return (
    <section className="pk-best" aria-labelledby="pk-best-title">
      <div className="pk-section-head pk-section-head--row">
        <div>
          <p className="pk-eyebrow">04 — Mais pedidos</p>
          <h2 id="pk-best-title" className="pk-display pk-display--md">
            Best sellers
          </h2>
        </div>
        <a className="pk-link" href={pageHref(links, "loja")}>
          Todo o catálogo →
        </a>
      </div>
      <div className="pk-best__grid">
        {products.map((p, i) => (
          <div key={p.id} data-reveal="up" className={i === 0 ? "pk-best__lead" : ""}>
            <ProductCard product={p} aspect={i === 0 ? "4/5" : "3/4"} size={i === 0 ? "lg" : "md"} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 10 EDITORIAL + 11 DROP ACCESS ────────────────────────────────────────

export function Editorial({ links }: { links: TemplateLinks }) {
  return (
    <section className="pk-editorial pk-silver" aria-labelledby="pk-ed-title">
      <div className="pk-editorial__media" data-depth="0.4">
        <ProductMedia
          alt=""
          variant="editorial-white"
          aspect="3/4"
          shape="almond"
          tint={["#f5f6f8", "#d42f42"]}
          kicker="Atelier"
          label="FEITO À MÃO"
          composition="portrait"
        />
      </div>
      <div className="pk-editorial__copy">
        <p className="pk-eyebrow">05 — A marca</p>
        <h2 id="pk-ed-title" className="pk-display pk-display--md" data-reveal="clip">
          A unha como
          <br />
          suporte de arte
        </h2>
        <p data-reveal="up">
          A Pinkoracats nasce da bancada de nail art da Taiz Herrera: cada set é desenhado, pintado e finalizado à
          mão, em tiragens curtas.
        </p>
        <a className="pk-link" href={pageHref(links, "sobre")}>
          Conheça a marca →
        </a>
      </div>
    </section>
  )
}

export function DropAccess({ email }: { email: string }) {
  return (
    <section className="pk-drop" aria-labelledby="pk-drop-title">
      <p className="pk-eyebrow">06 — Drop access</p>
      <h2 id="pk-drop-title" className="pk-display pk-display--lg" data-reveal="clip">
        Next drop
      </h2>
      <p data-reveal="up">Quer saber quando o próximo set sai? Mande um oi e entre na lista do drop.</p>
      <a
        className="pk-btn pk-btn--hot"
        href={`mailto:${email}?subject=${encodeURIComponent("Quero entrar na lista do próximo drop")}`}
      >
        Entrar na lista
      </a>
    </section>
  )
}
