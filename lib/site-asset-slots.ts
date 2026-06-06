export interface SiteAssetSlot {
  key: string
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  label: string
}

/**
 * Slots conhecidos das home. O backend valida qualquer key `home_(buyer|seller)_*`,
 * então slots adicionais (slice 4) podem ser declarados inline via `slotConfig` no
 * <EditableImage> sem precisar listar aqui.
 */
export const SITE_ASSET_SLOTS: Record<string, SiteAssetSlot> = {
  home_buyer_hero: {
    key: "home_buyer_hero",
    aspectRatio: 16 / 5,
    outputWidth: 1600,
    outputHeight: 500,
    label: "Banner — home do comprador",
  },
  home_seller_hero: {
    key: "home_seller_hero",
    aspectRatio: 16 / 5,
    outputWidth: 1600,
    outputHeight: 500,
    label: "Banner — home do vendedor",
  },
}

/** Resolve a definição de um slot, com fallback inline pros slots não catalogados. */
export function slotDef(key: string, fallback?: Partial<SiteAssetSlot>): SiteAssetSlot {
  return (
    SITE_ASSET_SLOTS[key] || {
      key,
      aspectRatio: fallback?.aspectRatio ?? 1,
      outputWidth: fallback?.outputWidth ?? 1000,
      outputHeight: fallback?.outputHeight ?? 1000,
      label: fallback?.label ?? "Imagem",
    }
  )
}
