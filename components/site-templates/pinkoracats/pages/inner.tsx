// AS PÁGINAS INTERNAS: produto, coleção, loja e sobre.

import { BRAND } from "../content/brand"
import { catalogIndex, productsIn, type Catalog } from "../content/catalog"
import type { Collection } from "../content/collections"
import type { Product } from "../content/products.mock"
import { BuyBox, ProductCard } from "../commerce"
import { PAGE, pageHref, type Ctx } from "../lib"
import ProductMedia from "../media"
import MorphingCatalog from "../sections/catalog"
import { Portal, Runway } from "../sections/showcases"

function Crumbs({ links, trail }: Ctx & { trail: { name: string; href?: string }[] }) {
  return (
    <nav className="pk-crumbs" aria-label="Você está em">
      <a href={links.home}>Início</a>
      {trail.map((t) => (
        <span key={t.name}>
          <span aria-hidden="true"> / </span>
          {t.href ? <a href={t.href}>{t.name}</a> : <span aria-current="page">{t.name}</span>}
        </span>
      ))}
    </nav>
  )
}

/**
 * A galeria do produto: as imagens EMPILHAM com `position: sticky` — a de
 * baixo sobe e cobre a de cima conforme a rolagem. É CSS puro: nenhum pino,
 * nenhum sequestro de rolagem, e com movimento reduzido vira lista simples.
 *
 * Sem `detailImages`, os três quadros são placeholders com composições
 * diferentes (o set, a peça e o macro) — o layout já é o da foto real.
 */
function ProductGallery({ product }: { product: Product }) {
  const shots = [
    { src: product.image, label: "01 / SET", comp: "set" as const },
    { src: product.detailImages[0] || product.hoverImage, label: "02 / PEÇA", comp: "single" as const },
    { src: product.detailImages[1] || null, label: "03 / MACRO", comp: "macro" as const },
    ...product.detailImages.slice(2).map((src, i) => ({ src, label: `0${i + 4} / DETALHE`, comp: "single" as const })),
  ]
  return (
    <div className="pk-gallery">
      {shots.map((s, i) => (
        <div key={i} className="pk-gallery__shot" style={{ "--n": i } as React.CSSProperties} data-tilt>
          <ProductMedia
            src={s.src}
            alt={`${product.name} — ${s.label.toLowerCase()}`}
            variant={product.variant}
            aspect="4/5"
            media={product.media}
            shape={product.shape}
            tint={product.tint}
            number={product.number}
            label={s.label}
            composition={s.comp}
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  )
}

export function ProductPage({ links, catalog, product }: Ctx & { catalog: Catalog; product: Product }) {
  const col = catalogIndex(catalog).colBySlug.get(product.collection)
  const related = catalog.products.filter((p) => p.collection === product.collection && p.id !== product.id)
  const more = related.length ? related : catalog.products.filter((p) => p.id !== product.id).slice(0, 4)
  return (
    <>
      <article className="pk-product">
        <ProductGallery product={product} />
        <div className="pk-product__info">
          <div className="pk-product__sticky">
            <Crumbs
              links={links}
              trail={[
                ...(col ? [{ name: col.name, href: pageHref(links, col.slug) }] : []),
                { name: product.name },
              ]}
            />
            <p className="pk-eyebrow">
              {product.number} · {col?.name}
            </p>
            <h1 className="pk-display pk-display--md pk-product__title">{product.name}</h1>
            {product.tagline ? <p className="pk-product__tag">{product.tagline}</p> : null}
            <BuyBox product={product} />
            <div className="pk-product__desc">
              {product.description ? <p>{product.description}</p> : null}
              {product.details.length ? (
                <ul>
                  {product.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </article>
      {more.length ? (
      <section className="pk-related pk-silver" aria-labelledby="pk-related-title">
        <h2 id="pk-related-title" className="pk-display pk-display--sm">
          Da mesma coleção
        </h2>
        <div className="pk-related__row">
          {more.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} size="sm" composition="single" />
          ))}
        </div>
      </section>
      ) : null}
    </>
  )
}

export function CollectionPage({
  links,
  catalog,
  collection,
}: Ctx & { catalog: Catalog; collection: Collection }) {
  const items = productsIn(catalog, collection.slug)
  const i = Math.max(0, catalog.collections.findIndex((c) => c.slug === collection.slug))
  return (
    <>
      <header className={`pk-colhero pk-portal--${collection.effect}`}>
        <div className="pk-colhero__media" data-depth="0.4">
          <ProductMedia
            src={collection.image}
            alt=""
            variant={collection.variant}
            aspect="16/10"
            shape={(["almond", "coffin", "stiletto", "square"] as const)[i % 4]}
            tint={i % 2 ? ["#a81f2e", "#ff9aa0"] : ["#ff9aa0", "#f5f6f8"]}
            kicker={collection.kicker}
            composition="set"
            priority
          />
          <span className="pk-portal__fx" aria-hidden="true" />
        </div>
        <div className="pk-colhero__copy">
          <Crumbs links={links} trail={[{ name: "Coleções", href: `${links.home}#colecoes` }, { name: collection.name }]} />
          <p className="pk-eyebrow">{collection.kicker}</p>
          <h1 className="pk-display pk-display--xl" data-reveal="clip">
            {collection.name}
          </h1>
          <p className="pk-colhero__lead">{collection.statement}</p>
          <p className="pk-colhero__count">
            {items.length} {items.length === 1 ? "peça" : "peças"}
          </p>
        </div>
      </header>
      {items.length > 2 ? <Runway products={items} title={collection.name} /> : null}
      <section className="pk-colgrid" aria-label={`Peças da coleção ${collection.name}`}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </section>
      <section className="pk-portals pk-portals--more" aria-label="Outras coleções">
        <div className="pk-portals__grid">
          {catalog.collections
            .filter((c) => c.slug !== collection.slug)
            .slice(0, 3)
            .map((c) => (
              <Portal key={c.slug} links={links} c={c} index={catalog.collections.indexOf(c)} />
            ))}
        </div>
      </section>
    </>
  )
}

export function ShopPage({ links, catalog }: Ctx & { catalog: Catalog }) {
  return (
    <section className="pk-shop">
      <Crumbs links={links} trail={[{ name: "Loja" }]} />
      <h1 className="pk-display pk-display--xl">Shop</h1>
      <p className="pk-shop__lead">
        Todo o catálogo, peça por peça.
        {!catalog.live ? " As fotos definitivas estão chegando — o que você vê aqui é a composição de cada set." : ""}
      </p>
      <MorphingCatalog />
    </section>
  )
}

export function AboutPage({ links, catalog }: Ctx & { catalog: Catalog }) {
  // "Pedir um custom" só aponta para a coleção quando ela existe na Loja; sem
  // ela, o caminho é a loja inteira (um link para 404 no site da cliente é o
  // pior jeito de terminar a página de marca).
  const custom = catalogIndex(catalog).colBySlug.get("custom")
  return (
    <section className="pk-about">
      <Crumbs links={links} trail={[{ name: "Sobre" }]} />
      <h1 className="pk-display pk-display--xl">
        Nail
        <br />
        as object
      </h1>
      <div className="pk-about__grid">
        <div className="pk-about__media" data-tilt>
          <ProductMedia
            alt=""
            variant="pink-chrome"
            aspect="3/4"
            shape="stiletto"
            tint={["#ff9aa0", "#f5f6f8"]}
            kicker="Atelier"
            label={BRAND.handle}
            composition="portrait"
          />
        </div>
        <div className="pk-about__copy">
          <p className="pk-about__lead">
            {BRAND.full} é a marca de nail art autoral de {BRAND.owner}, em {BRAND.city}/{BRAND.state}.
          </p>
          <p>
            Cada set nasce como objeto: primeiro o formato, depois a luz, por último a cor. As coleções saem em
            tiragens curtas, e qualquer peça pode virar encomenda no seu tamanho.
          </p>
          <p>
            Quer um set só seu? A coleção Custom começa por uma conversa — você manda a referência e combinamos
            formato, tamanho e acabamento antes de produzir.
          </p>
          <div className="pk-hero__cta">
            <a className="pk-btn pk-btn--hot" href={pageHref(links, custom ? custom.slug : PAGE.loja)}>
              {custom ? "Pedir um custom" : "Ver a loja"}
            </a>
            <a className="pk-btn pk-btn--line" href={pageHref(links, PAGE.loja)}>
              Ver a loja
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
