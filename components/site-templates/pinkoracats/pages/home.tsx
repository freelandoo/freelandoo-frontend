// A HOME É CURADA, não o catálogo inteiro. A ordem é ritmo: abre grande e já
// deixa escolher o formato (herói com o leque), gira (órbita), respira
// (manifesto), entra (portais), atravessa (passarela), prova (mais pedidos),
// conta (marca) e chama (próximo drop). A parede de unhas e o destaque
// ("spotlight") saíram em 2026-09-30, a pedido do Alex.

import { BRAND } from "../content/brand"
import { dropCollection, productsIn, type Catalog } from "../content/catalog"
import type { Ctx } from "../lib"
import NailOrbit from "../sections/orbit"
import {
  BestSellers,
  CollectionPortals,
  DropAccess,
  Editorial,
  Hero,
  Runway,
  Statement,
} from "../sections/showcases"

export default function HomePage({ links, catalog }: Ctx & { catalog: Catalog }) {
  const all = catalog.products
  const featured = all.filter((p) => p.featured)
  const stage = featured.length ? featured : all.slice(0, 4)
  const orbit = [...stage, ...all.filter((p) => !stage.includes(p))].slice(0, 7)
  const best = all.filter((p) => p.bestSeller).slice(0, 5)
  const dropCol = dropCollection(catalog)
  const dropItems = dropCol ? productsIn(catalog, dropCol.slug) : []
  const runway = dropItems.length > 2 ? dropItems : all.slice(0, 8)

  return (
    <>
      <Hero links={links} products={all} drop={dropCol} />
      {orbit.length > 1 ? <NailOrbit products={orbit} /> : null}
      <Statement />
      {catalog.collections.length ? <CollectionPortals links={links} collections={catalog.collections} /> : null}
      {runway.length > 2 ? <Runway products={runway} title={dropCol?.name || "New drop"} /> : null}
      {best.length ? <BestSellers links={links} products={best} /> : null}
      <Editorial links={links} />
      <DropAccess email={BRAND.email} />
    </>
  )
}
