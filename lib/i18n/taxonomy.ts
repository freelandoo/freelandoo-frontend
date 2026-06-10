"use client"

// Tradução da taxonomia da vitrine (F6.i18n Onda 1).
// Enxames (tb_machine.name), profissões (tb_category.desc_category), categorias
// de produto (tb_product_category.name) e labels/opções de subfiltro só existem
// em pt no banco/schema. A tradução é resolvida no CLIENTE por mapas nos
// dicionários en/es (namespaces Tax*), keyed por slug derivado do nome pt — o
// mesmo algoritmo unaccent→kebab das migs 011/085, então nomes repetidos entre
// enxames (Web Designer, DJ…) caem na mesma chave de propósito.
// pt-BR NÃO precisa das chaves Tax*: o fallback é o próprio nome pt da API.
// Nomes criados via admin sem tradução também caem no fallback pt — nada quebra.

import { useCallback, useMemo } from "react"
import { useI18n } from "@/components/i18n/I18nProvider"

/** unaccent → lower → não-alfanum vira "-" → trim (espelha profession_slug). */
export function taxonomySlug(name: string | null | undefined): string {
  if (!name) return ""
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function stripEnxamePrefix(name: string | null | undefined): string {
  return (name || "").replace(/^Enxame de\s+/i, "")
}

export interface TaxonomyT {
  /** Nome curto do enxame ("Marketing"). slug = tb_machine.slug. */
  enxame: (slug: string | null | undefined, namePt: string | null | undefined) => string
  /** Nome completo ("Enxame de Marketing" / "Marketing Swarm"). */
  enxameFull: (slug: string | null | undefined, namePt: string | null | undefined) => string
  /** Profissão (tb_category.desc_category). */
  profession: (namePt: string | null | undefined) => string
  /** Categoria de produto; usa o slug do payload quando existir. */
  productCategory: (slug: string | null | undefined, namePt: string | null | undefined) => string
  /** Label de campo de subfiltro (lib/product-attributes). */
  attrLabel: (labelPt: string) => string
  /** Opção de chip de subfiltro (o VALOR enviado segue sendo o pt). */
  attrOption: (optionPt: string) => string
  /** Nome de cor da paleta canônica (display only). */
  colorName: (namePt: string) => string
}

export function useTaxonomy(): TaxonomyT {
  const { t } = useI18n()

  const enxame = useCallback<TaxonomyT["enxame"]>(
    (slug, namePt) => {
      const short = stripEnxamePrefix(namePt)
      return t("TaxEnxame", slug || taxonomySlug(short), short)
    },
    [t]
  )

  const enxameFull = useCallback<TaxonomyT["enxameFull"]>(
    (slug, namePt) => {
      const key = slug || taxonomySlug(stripEnxamePrefix(namePt))
      const translated = t("TaxEnxame", key, "")
      // Sem tradução (pt ou enxame custom de admin) → nome original intacto.
      if (!translated) return namePt || ""
      const pattern = t("TaxEnxame", "_full", "Enxame de {name}")
      return pattern.replace("{name}", translated)
    },
    [t]
  )

  const profession = useCallback<TaxonomyT["profession"]>(
    (namePt) => t("TaxProfession", taxonomySlug(namePt), namePt || ""),
    [t]
  )

  const productCategory = useCallback<TaxonomyT["productCategory"]>(
    (slug, namePt) => t("TaxProductCategory", slug || taxonomySlug(namePt), namePt || ""),
    [t]
  )

  const attrLabel = useCallback<TaxonomyT["attrLabel"]>(
    (labelPt) => t("TaxAttr", taxonomySlug(labelPt), labelPt),
    [t]
  )

  const attrOption = useCallback<TaxonomyT["attrOption"]>(
    (optionPt) => t("TaxAttrOpt", taxonomySlug(optionPt), optionPt),
    [t]
  )

  const colorName = useCallback<TaxonomyT["colorName"]>(
    (namePt) => t("TaxColor", taxonomySlug(namePt), namePt),
    [t]
  )

  return useMemo(
    () => ({ enxame, enxameFull, profession, productCategory, attrLabel, attrOption, colorName }),
    [enxame, enxameFull, profession, productCategory, attrLabel, attrOption, colorName]
  )
}
