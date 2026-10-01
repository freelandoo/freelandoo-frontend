// A HOME É CURADA, não o catálogo. ACRYLIC VAULT — a joalheria digital:
//
//   01 The Vault → 02 Open the set   uma caixa grande, a tampa abre ao rolar
//      Shop by shape                 as categorias por formato (placas)
//   03 New drop                      a caixa entra, abre, fecha, sai
//   04 Acrylic wall                  a parede de nichos (takeover no clique)
//   05 Glass conveyor                a esteira de joalheria
//   06 Floating cases                editorial: caixas no ar, tipografia atrás
//   07 Glass stack                   a seleção em caixas empilhadas
//   08 Collection display            as coleções como placas de material
//   09 Brand statement               uma caixa, muito branco
//   10 Final drop                    a lista do próximo drop
//
// Toda seção some quando não tem produto suficiente — uma vitrine com uma
// caixa só é pior do que vitrine nenhuma.

import { BRAND } from "../content/brand"
import { dropCollection, productsIn, type Catalog } from "../content/catalog"
import type { Ctx } from "../lib"
import GlassConveyor from "../sections/conveyor"
import NewDrop from "../sections/drop"
import {
  AcrylicWall,
  BrandStatement,
  CollectionDisplay,
  FinalDrop,
  FloatingCases,
  GlassStack,
  ShapePlates,
} from "../sections/gallery"
import Vault from "../sections/vault"

export default function HomePage({ links, catalog }: Ctx & { catalog: Catalog }) {
  const all = catalog.products
  const featured = all.filter((p) => p.featured)
  const stage = featured.length ? featured : all
  const dropCol = dropCollection(catalog)
  const dropItems = dropCol ? productsIn(catalog, dropCol.slug) : []
  const drop = dropItems.length ? dropItems : stage
  const rest = (list: typeof all) => [...list, ...all.filter((p) => !list.includes(p))]
  // cada vitrine começa por um produto diferente, para a home não repetir
  // a mesma caixa em quatro lugares seguidos
  const wall = rest(all.filter((p) => !drop.slice(0, 3).includes(p)))
  const conveyor = all.length > 3 ? [...all.slice(3), ...all.slice(0, 3)] : all
  const selection = rest(all.filter((p) => p.bestSeller || p.featured)).slice(0, 5)
  const floating = [...all].reverse().slice(0, 5)

  return (
    <>
      <Vault links={links} product={stage[0] || null} drop={dropCol} />
      <ShapePlates links={links} products={all} />
      <NewDrop links={links} products={drop} title={dropCol?.name || "New drop"} />
      <AcrylicWall products={wall} />
      {conveyor.length > 2 ? <GlassConveyor links={links} products={conveyor} /> : null}
      <FloatingCases products={floating} />
      <GlassStack links={links} products={selection} />
      <CollectionDisplay links={links} collections={catalog.collections} products={all} />
      <BrandStatement product={stage[1] || stage[0] || null} />
      <FinalDrop email={BRAND.email} />
    </>
  )
}
