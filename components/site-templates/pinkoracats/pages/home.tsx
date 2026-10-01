// A HOME É CURADA, não o catálogo inteiro. A ordem é ritmo: abre grande e já
// deixa escolher o formato (herói com o leque), gira (órbita), respira
// prova (mais pedidos), conta (marca) e chama (próximo drop).
// A parede de unhas e o destaque ("spotlight") saíram em 2026-09-30; o
// manifesto ("Not your basic nails.") e a passarela ("New drop") saíram
// logo depois, também a pedido do Alex. A passarela continua na página da coleção.
// A seção de portais ("Enter a collection") também saiu (2026-10-01): as
// coleções viraram os formatos, que o leque do herói já oferece.

import { BRAND } from "../content/brand"
import { dropCollection, type Catalog } from "../content/catalog"
import type { Ctx } from "../lib"
import NailOrbit from "../sections/orbit"
import {
  BestSellers,
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
      {best.length ? <BestSellers links={links} products={best} /> : null}
      <Editorial links={links} />
      <DropAccess email={BRAND.email} />
    </>
  )
}
