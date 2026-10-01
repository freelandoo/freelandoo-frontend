// A HOME É CURADA, não o catálogo inteiro. A ordem é ritmo: abre grande
// (herói), gira (órbita), respira (manifesto), espalha (parede), foca
// (spotlight), escolhe (leque), entra (portais), atravessa (passarela),
// prova (mais pedidos), conta (marca) e chama (próximo drop).

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
  NailFan,
  NailWall,
  Runway,
  Spotlight,
  Statement,
} from "../sections/showcases"

export default function HomePage({ links, catalog }: Ctx & { catalog: Catalog }) {
  const all = catalog.products
  const featured = all.filter((p) => p.featured)
  const stage = featured.length ? featured : all.slice(0, 4)
  const orbit = [...stage, ...all.filter((p) => !stage.includes(p))].slice(0, 7)
  const wall = [...all].reverse().slice(0, 6)
  const best = all.filter((p) => p.bestSeller).slice(0, 5)
  // Na prévia o destaque era escolhido a dedo; na Loja ao vivo é o primeiro
  // destaque da Taiz.
  const spot = (!catalog.live && all.find((p) => p.slug === "chrome-kitten")) || stage[0]
  const dropCol = dropCollection(catalog)
  const dropItems = dropCol ? productsIn(catalog, dropCol.slug) : []
  const runway = dropItems.length > 2 ? dropItems : all.slice(0, 8)

  return (
    <>
      <Hero links={links} products={stage} drop={dropCol} />
      {orbit.length > 1 ? <NailOrbit products={orbit} /> : null}
      <Statement />
      {wall.length > 1 ? <NailWall products={wall} /> : null}
      {spot ? <Spotlight links={links} product={spot} index="05" /> : null}
      {all.length > 2 ? <NailFan links={links} products={all.slice(0, 9)} /> : null}
      {catalog.collections.length ? <CollectionPortals links={links} collections={catalog.collections} /> : null}
      {runway.length > 2 ? <Runway products={runway} title={dropCol?.name || "New drop"} /> : null}
      {best.length ? <BestSellers links={links} products={best} /> : null}
      <Editorial links={links} />
      <DropAccess email={BRAND.email} />
    </>
  )
}
