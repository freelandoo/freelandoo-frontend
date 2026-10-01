// AS VITRINES DA HOME. Componentes de servidor: o HTML (nomes, preços, links)
// sai pronto para o buscador; o gesto mora nas peças de cliente que eles
// montam (`ProductCard`, `ProductMedia`) e nos atributos que `motion.tsx` lê.

import { COLLECTIONS, type Collection } from "../content/collections"
import type { Product } from "../content/products.mock"
import { ProductCard, QuickOpenButton } from "../commerce"
import { brl, pageHref, type TemplateLinks } from "../lib"
import ProductMedia from "../media"
import { Nail } from "../nail"

// ─── 01 HERO / PRODUCT STAGE ───────────────────────────────────────────────

/**
 * O palco do herói.
 *
 * ⚠️ `heroImages` é o lugar das fotos reais: se vierem, cada uma entra num
 * dos quadros, NA ORDEM, e herda moldura, profundidade e tilt. Sem elas, os
 * quadros mostram os produtos em destaque como placeholder — o palco nunca
 * fica vazio nem escreve "IMAGE HERE".
 */
export function HeroProductStage({
  products,
  heroImages = [],
}: {
  products: Product[]
  heroImages?: string[]
}) {
  const frames = [
    { cls: "pk-stage__f1", depth: "0.6", aspect: "3/4", comp: "set" as const },
    { cls: "pk-stage__f2", depth: "-0.4", aspect: "4/5", comp: "single" as const },
    { cls: "pk-stage__f3", depth: "0.9", aspect: "1/1", comp: "macro" as const },
    { cls: "pk-stage__f4", depth: "-0.8", aspect: "3/5", comp: "single" as const },
  ]
  return (
    <div className="pk-stage" aria-hidden="true">
      <div className="pk-stage__ring" data-depth="0.2" />
      <div className="pk-stage__capsule pk-stage__capsule--a" data-depth="1.2" />
      <div className="pk-stage__capsule pk-stage__capsule--b" data-depth="-1" />
      {frames.map((f, i) => {
        const p = products[i % products.length]
        return (
          <div key={f.cls} className={`pk-stage__frame ${f.cls}`} data-depth={f.depth}>
            <div className="pk-stage__tilt" data-tilt>
              <ProductMedia
                src={heroImages[i] || p.image}
                alt=""
                variant={p.variant}
                aspect={f.aspect}
                media={p.media}
                shape={p.shape}
                tint={p.tint}
                number={p.number}
                label={i === 0 ? "DROP 001" : undefined}
                composition={f.comp}
                priority={i < 2}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Hero({ links, products }: { links: TemplateLinks; products: Product[] }) {
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
          <a className="pk-btn pk-btn--hot" href={pageHref(links, "new-drop")} data-cursor="SELECT">
            Ver o new drop
          </a>
          <a className="pk-btn pk-btn--line" href={pageHref(links, "loja")}>
            Todo o catálogo
          </a>
        </div>
      </div>
      <HeroProductStage products={products} />
      <p className="pk-hero__scroll" aria-hidden="true">
        role · scroll
      </p>
    </section>
  )
}

// ─── 03 STATEMENT ─────────────────────────────────────────────────────────

export function Statement() {
  return (
    <section className="pk-statement" aria-label="Manifesto">
      <p className="pk-statement__line" data-reveal="clip">
        Not your
      </p>
      <p className="pk-statement__line pk-statement__line--hot" data-reveal="clip">
        basic nails.
      </p>
      <p className="pk-statement__note" data-reveal="up">
        Cada set é pensado como objeto: formato, acabamento e luz decididos antes da primeira camada.
      </p>
    </section>
  )
}

// ─── 04 FLOATING NAIL WALL ────────────────────────────────────────────────

const WALL = [
  { cls: "w1", depth: "0.5", aspect: "3/4", size: "md" as const },
  { cls: "w2", depth: "-0.6", aspect: "4/5", size: "lg" as const },
  { cls: "w3", depth: "1", aspect: "1/1", size: "sm" as const },
  { cls: "w4", depth: "-0.3", aspect: "3/5", size: "md" as const },
  { cls: "w5", depth: "0.8", aspect: "4/5", size: "sm" as const },
  { cls: "w6", depth: "-0.9", aspect: "3/4", size: "md" as const },
]

export function NailWall({ products }: { products: Product[] }) {
  return (
    <section className="pk-wall" aria-labelledby="pk-wall-title">
      <h2 id="pk-wall-title" className="pk-wall__title pk-display pk-display--lg" data-depth="-0.2">
        Nail
        <br />
        objects
      </h2>
      <div className="pk-wall__grid">
        {WALL.map((w, i) => {
          const p = products[i % products.length]
          return (
            <div key={w.cls} className={`pk-wall__item pk-wall__${w.cls}`} data-depth={w.depth} data-reveal="up">
              <ProductCard product={p} aspect={w.aspect} size={w.size} composition={i % 2 ? "single" : "set"} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── 05 PRODUCT TAKEOVER / SPOTLIGHT ──────────────────────────────────────

export function Spotlight({ links, product, index }: { links: TemplateLinks; product: Product; index: string }) {
  return (
    <section className="pk-spot" aria-labelledby={`pk-spot-${product.slug}`} data-card>
      <div className="pk-spot__media" data-reveal="scale">
        <div data-tilt className="pk-spot__tilt">
          <ProductMedia
            src={product.image}
            hoverSrc={product.hoverImage}
            alt={product.name}
            variant={product.variant}
            aspect="4/5"
            media={product.media}
            shape={product.shape}
            tint={product.tint}
            number={product.number}
            label="SPOTLIGHT"
            composition="macro"
          />
        </div>
      </div>
      <div className="pk-spot__copy">
        <p className="pk-eyebrow">{index} · Featured</p>
        <h2 id={`pk-spot-${product.slug}`} className="pk-display pk-display--lg" data-reveal="clip">
          {product.name}
        </h2>
        <p className="pk-spot__lead" data-reveal="up">
          {product.description}
        </p>
        <ul className="pk-spot__details" data-reveal="up">
          {product.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="pk-spot__price">{brl(product.priceCents)}</p>
        <div className="pk-spot__cta">
          <QuickOpenButton slug={product.slug} />
          <a className="pk-btn pk-btn--line" href={pageHref(links, product.slug)}>
            Página do produto
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── 06 NAIL FAN ──────────────────────────────────────────────────────────

/**
 * O leque — o elemento de assinatura. Fechado, as unhas estão empilhadas; a
 * rolagem abre o arco (uma variável CSS, `--open`, escrita pelo GSAP). Cada
 * unha é um LINK para o produto, e a do hover avança.
 *
 * Sem JS e com movimento reduzido o CSS deixa `--open: 1`: o leque aparece
 * aberto e continua clicável.
 */
export function NailFan({ links, products }: { links: TemplateLinks; products: Product[] }) {
  const mid = (products.length - 1) / 2
  return (
    <section className="pk-fan" aria-labelledby="pk-fan-title">
      <div className="pk-fan__head">
        <p className="pk-eyebrow">06 — O mostruário</p>
        <h2 id="pk-fan-title" className="pk-display pk-display--md">
          Pick a<br />
          nail
        </h2>
      </div>
      <ul className="pk-fan__deck" data-fan style={{ "--mid": mid } as React.CSSProperties}>
        {products.map((p, i) => (
          <li key={p.id} className="pk-fan__item" style={{ "--i": i } as React.CSSProperties}>
            <a href={pageHref(links, p.slug)} className="pk-fan__link" data-cursor="VIEW">
              <Nail shape={p.shape} tint={p.tint} className="pk-fan__nail" />
              <span className="pk-fan__label">
                <span>{p.number}</span> {p.name} <span>{brl(p.priceCents)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
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
        tint={index % 2 ? ["#121212", "#ff4f9a"] : ["#ff8dc2", "#f5f2ef"]}
        kicker={c.kicker}
        composition={index % 3 === 0 ? "set" : "single"}
      />
      <span className="pk-portal__fx" aria-hidden="true" />
      <span className="pk-portal__name">{c.name}</span>
      <span className="pk-portal__kicker">{c.kicker} →</span>
    </a>
  )
}

export function CollectionPortals({ links }: { links: TemplateLinks }) {
  return (
    <section id="colecoes" className="pk-portals" aria-labelledby="pk-portals-title">
      <div className="pk-section-head">
        <p className="pk-eyebrow">07 — Coleções</p>
        <h2 id="pk-portals-title" className="pk-display pk-display--md">
          Enter a<br />
          collection
        </h2>
      </div>
      <div className="pk-portals__grid">
        {COLLECTIONS.map((c, i) => (
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
    <section className="pk-runway" data-runway aria-labelledby="pk-runway-title">
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
          <p className="pk-eyebrow">09 — Mais pedidos</p>
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
    <section className="pk-editorial" aria-labelledby="pk-ed-title">
      <div className="pk-editorial__media" data-depth="0.4">
        <ProductMedia
          alt=""
          variant="editorial-white"
          aspect="3/4"
          shape="almond"
          tint={["#f5f2ef", "#ff4f9a"]}
          kicker="Atelier"
          label="FEITO À MÃO"
          composition="portrait"
        />
      </div>
      <div className="pk-editorial__copy">
        <p className="pk-eyebrow">10 — A marca</p>
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
      <p className="pk-eyebrow">11 — Drop access</p>
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
