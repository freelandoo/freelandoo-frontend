// AS PÁGINAS INTERNAS: produto, coleção, loja e sobre.
//
// ⚠️ A PÁGINA DO PRODUTO É MAIS CONVENCIONAL QUE A HOME, de propósito: palco
// de inspeção à esquerda, painel de compra sempre à vista à direita. Preço,
// estoque e "Adicionar ao Case" nunca ficam atrás de animação.

import AcrylicProductCase from "../case"
import { BuyBox, Price, ProductCard } from "../commerce"
import { BRAND } from "../content/brand"
import { catalogIndex, productsIn, type Catalog } from "../content/catalog"
import { PLATE_MATERIAL, type Collection } from "../content/collections"
import { containerOf, displayId, drawsCase, vtCollection, vtProduct } from "../content/display"
import type { MediaContainer, Product } from "../content/products.mock"
import { PAGE, pageHref, type Ctx } from "../lib"
import DetailLens from "../lens"
import MorphingCatalog from "../sections/catalog"
import { CollectionPlate } from "../sections/gallery"

function Crumbs({ links, trail }: Ctx & { trail: { name: string; href?: string }[] }) {
  return (
    <nav className="pk-crumbs pk-mono" aria-label="Você está em">
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

type Shot = {
  key: string
  label: string
  lid?: "closed" | "open"
  image?: string | null
  container?: MediaContainer
  composition?: "tray" | "set" | "single" | "macro" | "portrait"
}

/**
 * O PALCO DE INSPEÇÃO: caixa fechada → caixa aberta → frente → macro →
 * detalhes → editorial.
 *
 * No computador os quadros EMPILHAM com `position: sticky` — o de baixo sobe e
 * cobre o de cima. É CSS puro: nenhum pino, nenhum sequestro de rolagem. No
 * celular é uma galeria de arrastar. Com movimento reduzido, lista simples.
 *
 * Sem fotos, cada quadro é um placeholder com composição própria (a bandeja,
 * o leque, a peça, o macro) — o layout já é o da foto real.
 */
function InspectionStage({ product }: { product: Product }) {
  const gallery = product.detailImages
  // ⚠️ Foto que JÁ mostra a caixa (modo hybrid/photo/editorial): nada de caixa
  // digital por cima — o palco começa pela própria foto.
  const boxed = drawsCase(containerOf(product.image, product.media))
  const lead: Shot[] = boxed
    ? [
        { key: "closed", label: "01 / CLOSED", lid: "closed" },
        { key: "open", label: "02 / OPEN", lid: "open" },
      ]
    : [{ key: "case", label: "01 / CASE", image: product.image, container: containerOf(product.image, product.media) }]
  const shots: Shot[] = [
    ...lead,
    // a frente só entra se acrescenta algo: sem galeria, num produto em foto,
    // ela repetiria o primeiro quadro
    ...(boxed || gallery[0]
      ? [
          {
            key: "front",
            label: "03 / FRONT",
            image: gallery[0] || product.image,
            container: "photo" as MediaContainer,
            composition: "set" as const,
          },
        ]
      : []),
    {
      key: "macro",
      label: "04 / MACRO",
      image: gallery[1] || gallery[0] || product.image,
      container: "macro",
      composition: "macro",
    },
    ...gallery.slice(2).map((src, i) => ({
      key: `g${i}`,
      label: `${String(i + 5).padStart(2, "0")} / DETAIL`,
      image: src,
      container: (i === gallery.length - 3 ? "editorial" : "photo") as MediaContainer,
      composition: "single" as const,
    })),
  ]

  // a numeração segue a posição real (sem os quadros de caixa, ela começa antes)
  shots.forEach((s, i) => {
    s.label = `${String(i + 1).padStart(2, "0")} / ${s.label.split(" / ")[1]}`
  })

  return (
    <div className="pk-stage">
      {shots.map((s, i) => (
        <figure
          key={s.key}
          className={`pk-stage__shot pk-stage__shot--${s.key}`}
          style={{ "--n": i, ...(i === 0 ? { viewTransitionName: vtProduct(product.id) } : {}) } as React.CSSProperties}
          data-tilt={s.lid ? "" : undefined}
          data-reveal={i === 0 ? undefined : "fade"}
        >
          <DetailLens src={s.container ? s.image || null : null} index={i}>
            <AcrylicProductCase
              product={product}
              size="xl"
              lid={s.lid || "closed"}
              image={s.lid ? undefined : s.image ?? null}
              container={s.container}
              composition={s.composition}
              label={s.label}
              plate={i === 0}
              reflect={s.key === "open"}
              priority={i === 0}
              alt={`${product.name} — ${s.label.toLowerCase()}`}
            />
          </DetailLens>
          <figcaption className="pk-mono">{s.label}</figcaption>
        </figure>
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
        <InspectionStage product={product} />
        <div className="pk-product__info">
          <div className="pk-product__sticky">
            <Crumbs
              links={links}
              trail={[
                ...(col ? [{ name: col.name, href: pageHref(links, col.slug) }] : []),
                { name: product.name },
              ]}
            />
            <p className="pk-eyebrow pk-mono">
              {displayId(product.number)} · {col?.name || "Coleção"}
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
        <section className="pk-related" aria-labelledby="pk-related-title">
          <h2 id="pk-related-title" className="pk-display pk-display--sm">
            {related.length ? "Da mesma coleção" : "Outros sets"}
          </h2>
          <div className="pk-related__row">
            {more.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} size="sm" />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

/**
 * A COLEÇÃO: a placa da home cresce e vira este herói (View Transition entre
 * documentos — o nome compartilhado é fixo aqui porque o herói é único).
 */
export function CollectionPage({
  links,
  catalog,
  collection,
}: Ctx & { catalog: Catalog; collection: Collection }) {
  const items = productsIn(catalog, collection.slug)
  const lead = items[0] || null
  const others = catalog.collections.filter((c) => c.slug !== collection.slug).slice(0, 3)
  return (
    <>
      <header className={`pk-colhero pk-plate--${PLATE_MATERIAL[collection.effect]}`}>
        <span
          className="pk-colhero__surface pk-plate__surface"
          style={{ viewTransitionName: vtCollection(collection.slug) }}
          aria-hidden="true"
        />
        <div className="pk-colhero__copy">
          <Crumbs links={links} trail={[{ name: "Collections", href: `${links.home}#colecoes` }, { name: collection.name }]} />
          <p className="pk-eyebrow pk-mono">{collection.kicker}</p>
          <h1 className="pk-display pk-display--xl" data-reveal="clip">
            {collection.name}
          </h1>
          {collection.statement ? <p className="pk-colhero__lead">{collection.statement}</p> : null}
          <p className="pk-colhero__count pk-mono">
            {items.length} {items.length === 1 ? "set" : "sets"}
          </p>
        </div>
        {lead ? (
          <div className="pk-colhero__case" data-tilt data-lid-scrub>
            <AcrylicProductCase product={lead} size="lg" lid="live" plate priority />
          </div>
        ) : null}
      </header>
      <section className="pk-colgrid" aria-label={`Sets da coleção ${collection.name}`}>
        {items.map((p) => (
          <div key={p.id} className="pk-colgrid__cell" data-reveal="up">
            <ProductCard product={p} />
          </div>
        ))}
        {!items.length ? <p className="pk-colgrid__empty">Esta coleção ainda não tem sets à venda.</p> : null}
      </section>
      {others.length ? (
        <section className="pk-cols pk-cols--more" aria-labelledby="pk-more-title">
          <h2 id="pk-more-title" className="pk-display pk-display--sm">
            Outras coleções
          </h2>
          <ul className="pk-cols__grid">
            {others.map((c) => (
              <li key={c.slug} className="pk-cols__cell">
                <CollectionPlate
                  links={links}
                  c={c}
                  index={catalog.collections.indexOf(c)}
                  items={productsIn(catalog, c.slug)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

export function ShopPage({ links, catalog }: Ctx & { catalog: Catalog }) {
  return (
    <section className="pk-shop">
      <Crumbs links={links} trail={[{ name: "Shop" }]} />
      <p className="pk-eyebrow pk-mono">{catalog.products.length} sets</p>
      <h1 className="pk-display pk-display--xl">Shop</h1>
      <p className="pk-shop__lead">
        Todo o catálogo, caixa por caixa.
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
  const hero = catalog.products.find((p) => p.featured) || catalog.products[0] || null
  return (
    <section className="pk-about">
      <Crumbs links={links} trail={[{ name: "Sobre" }]} />
      <h1 className="pk-display pk-display--xl">
        Press-on
        <br />
        as object
      </h1>
      <div className="pk-about__grid">
        <div className="pk-about__media" data-tilt data-lid-scrub>
          {hero ? <AcrylicProductCase product={hero} size="lg" lid="live" reflect plate /> : null}
        </div>
        <div className="pk-about__copy">
          <p className="pk-about__lead">
            {BRAND.full} é a marca de press-on nails autorais de {BRAND.owner}, em {BRAND.city}/{BRAND.state}.
          </p>
          <p>
            Cada set nasce como objeto: primeiro o formato, depois a luz, por último a cor. As peças saem da bancada
            em tiragens curtas, guardadas na própria caixa acrílica — prontas para usar e bonitas o bastante para
            ficar expostas.
          </p>
          <p>
            Quer um set só seu? A coleção Custom começa por uma conversa — você manda a referência e combinamos
            formato, tamanho e acabamento antes de produzir.
          </p>
          {hero ? (
            <p className="pk-about__price pk-mono">
              {displayId(hero.number)} · {hero.name} · <Price product={hero} />
            </p>
          ) : null}
          <div className="pk-hero__cta">
            <a className="pk-btn pk-btn--ink" href={pageHref(links, custom ? custom.slug : PAGE.loja)}>
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
