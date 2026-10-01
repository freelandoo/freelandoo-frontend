// A HOME É CURADA, não o catálogo inteiro. A ordem é ritmo: abre grande
// (herói), gira (órbita), respira (manifesto), espalha (parede), foca
// (spotlight), escolhe (leque), entra (portais), atravessa (passarela),
// prova (mais pedidos), conta (marca) e chama (próximo drop).

import { BRAND } from "../content/brand"
import { PRODUCTS, productsIn } from "../content/products.mock"
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

export default function HomePage({ links }: Ctx) {
  const featured = PRODUCTS.filter((p) => p.featured)
  const orbit = [...featured, ...PRODUCTS.filter((p) => !p.featured)].slice(0, 7)
  const wall = [...PRODUCTS].reverse().slice(0, 6)
  const best = PRODUCTS.filter((p) => p.bestSeller).slice(0, 5)
  const spot = PRODUCTS.find((p) => p.slug === "chrome-kitten") || featured[0]
  const drop = productsIn("new-drop").concat(productsIn("pink"))

  return (
    <>
      <Hero links={links} products={featured} />
      <NailOrbit products={orbit} />
      <Statement />
      <NailWall products={wall} />
      <Spotlight links={links} product={spot} index="05" />
      <NailFan links={links} products={PRODUCTS.slice(0, 9)} />
      <CollectionPortals links={links} />
      <Runway products={drop} />
      <BestSellers links={links} products={best} />
      <Editorial links={links} />
      <DropAccess email={BRAND.email} />
    </>
  )
}
