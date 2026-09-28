"use client"

// A LOJA DO PERFIL no site (mig 263) — os produtos da Loja do líder.
//
// Mesma regra da vitrine de serviços, e pelo mesmo motivo: o conteúdo NÃO
// mora no site. Os cards são os produtos reais da Loja, servidos pelo backend
// a cada leitura; um preço digitado aqui seria a segunda verdade que some do
// lugar no primeiro reajuste. Do site é só a APRESENTAÇÃO (quantos por linha,
// título e subtítulo, que vivem na casca).
//
// ⚠️ O PREÇO É O QUE O COMPRADOR PAGA (`price_cents` vem já com as taxas que a
// Loja repassa), e o clique leva à página do produto NA FREELANDOO, por
// endereço ABSOLUTO: o site também é servido no domínio do cliente, onde uma
// rota relativa `/p/...` não existe. É lá que moram frete, estoque e checkout —
// este site não tem como concluir uma compra.

import { ImageOff, ShoppingBag } from "lucide-react"
import type { ShowcaseProduct, SiteColorTheme, StoreCatalogData } from "@/types/community-site"

/** Onde a Loja mora. Absoluto de propósito — ver o cabeçalho. */
const PLATFORM_ORIGIN = "https://www.freelandoo.com.br"

const GRID: Record<StoreCatalogData["columns"], string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
}

function formatPrice(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function StoreCatalogSection({
  data,
  onChange,
  editing,
  theme,
  products,
  locale,
  labels,
}: {
  data: StoreCatalogData
  onChange: (next: StoreCatalogData) => void
  editing: boolean
  theme: SiteColorTheme
  /** Os produtos ativos da Loja. Vêm do backend, não do documento do site. */
  products: ShowcaseProduct[]
  locale: string
  labels: {
    perRow: string
    cta: string
    soldOut: string
    empty: string
    emptyHint: string
    noPhoto: string
  }
}) {
  return (
    <div>
      {editing ? (
        <div className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>
          <span>{labels.perRow}</span>
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...data, columns: n })}
              className="h-7 w-7 border-2 text-xs font-black"
              style={{
                borderColor: theme.textPrimary,
                background: data.columns === n ? theme.primary : "transparent",
                color: data.columns === n ? theme.background : theme.textPrimary,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        // Só o construtor chega aqui: em leitura quem corta a seção vazia é o
        // canvas, pela regra de `section-content.ts`.
        <div className="border-2 border-dashed p-6 text-center" style={{ borderColor: theme.textSecondary, color: theme.textSecondary }}>
          <ShoppingBag className="mx-auto mb-2 h-6 w-6" />
          <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>{labels.empty}</p>
          <p className="mt-1 text-xs">{labels.emptyHint}</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${GRID[data.columns] || GRID[3]}`}>
          {products.map((p) => {
            const href = `${PLATFORM_ORIGIN}/p/${p.provider_profile_id}/produto/${p.id_profile_product}`
            return (
              <a
                key={p.id_profile_product}
                href={editing ? undefined : href}
                target={editing ? undefined : "_blank"}
                rel="noopener"
                className="group flex flex-col border-2"
                style={{ borderColor: theme.textPrimary, background: theme.surface }}
              >
                <div className="relative aspect-square w-full overflow-hidden" style={{ background: theme.background }}>
                  {p.image_url ? (
                    // <img> e não next/image: a URL vem do cadastro, e o
                    // otimizador recusaria host fora de `remotePatterns`.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center text-[10px]" style={{ color: theme.textSecondary }}>
                      <ImageOff className="h-5 w-5" />
                      {editing ? labels.noPhoto : null}
                    </div>
                  )}
                  {!p.in_stock ? (
                    <span className="absolute left-2 top-2 border-2 px-1.5 py-0.5 text-[10px] font-black uppercase" style={{ borderColor: theme.textPrimary, background: theme.background, color: theme.textPrimary }}>
                      {labels.soldOut}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-sm font-bold" style={{ color: theme.textPrimary }}>{p.name}</p>
                  <p className="fl-display mt-1 text-xl leading-none" style={{ color: theme.primary }}>
                    {formatPrice(p.price_cents, locale)}
                  </p>
                  <span
                    className="mt-3 inline-flex items-center justify-center gap-1.5 border-2 px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.1em]"
                    style={{ borderColor: theme.textPrimary, background: theme.primary, color: theme.background }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> {labels.cta}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
