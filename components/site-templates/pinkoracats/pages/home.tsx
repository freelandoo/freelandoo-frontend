// A HOME É CURADA, não o catálogo inteiro. A ordem é ritmo: abre grande e já
// deixa escolher o formato (herói com o leque), gira (órbita), respira
// entra (portais), prova (mais pedidos), conta (marca) e chama (próximo drop).
// A parede de unhas e o destaque ("spotlight") saíram em 2026-09-30; o
// manifesto ("Not your basic nails.") e a passarela ("New drop") saíram
// logo depois, também a pedido do Alex. A passarela continua na página da coleção.

import { BRAND } from "../content/brand"
import { dropCollection, type Catalog } from "../content/catalog"
import type { Ctx } from "../lib"
import NailOrbit from "../sections/orbit"
import {
  BestSellers,
  CollectionPortals,
  DropAccess,
  Editorial,
  Hero,
} from "../sections/showcases"

export default function HomePage({ links, catalog }: Ctx & { catalog: Catalog }) {
  const all = catalog.products
  const featured = all.filter((p) => p.featured)
  const stage = featured.length ? featured : all.slice(0, 4)
  const orbit = [...stage, ...all.filter((p) => !stage.includes(p))].slice(0, 7)
  const best = all.filter((p) => p.bestSeller).slice(0, 5)
  const dropCol = dropCollection(catalog)

  return (
    <>
      <Hero links={links} products={all} drop={dropCol} />
      {orbit.length > 1 ? <NailOrbit products={orbit} /> : null}
      {catalog.collections.length ? <CollectionPortals links={links} collections={catalog.collections} /> : null}
      {best.length ? <BestSellers links={links} products={best} /> : null}
      <Editorial links={links} />
      <DropAccess email={BRAND.email} />
    </>
  )
}
