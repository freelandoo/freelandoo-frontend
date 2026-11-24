// MINHA CIDADE (2026-11-24) — os tipos do ambiente.
//
// ⚠️ ESPELHO de `src/utils/cityPref.js` no backend (e do CHECK da mig 468):
// valor novo de moradia ou de aba entra nos dois lugares.

export type HousingKind = "house" | "condo"
export type CityTab = "bairro" | "condominio"

export const TAB_OF_HOUSING: Record<HousingKind, CityTab> = { house: "bairro", condo: "condominio" }

export type ResidenceStatus = "pending" | "recognized" | "unrecognized" | "contested"

/** Um bairro da pessoa: por residência ativa e/ou membresia na comunidade. */
export type CityBairro = {
  id_profile: string | null
  display_name: string | null
  avatar_url: string | null
  id_territory: number | null
  bairro_label: string | null
  municipio_label: string | null
  uf: string | null
  residence_status: ResidenceStatus | null
  is_member: boolean
  role: string | null
}

export type CityCondo = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  role: string | null
}

export type CityData = {
  preference: { housing_kind: HousingKind | null; last_tab: CityTab | null }
  bairros: CityBairro[]
  condos: CityCondo[]
}

/** O que a URL de Minha cidade carrega: `?lugar=` (a aba) e `?c=` (a comunidade). */
export function readCityUrl(): { lugar: CityTab | null; c: string | null } {
  if (typeof window === "undefined") return { lugar: null, c: null }
  const sp = new URLSearchParams(window.location.search)
  const l = sp.get("lugar")
  return { lugar: l === "bairro" || l === "condominio" ? l : null, c: sp.get("c") }
}
