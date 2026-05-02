"use client"

import { useEffect, useState } from "react"
import { MACHINES, type MachineId } from "./tokens"

export type CatalogCategory = {
  id_category: number
  desc_category: string
  is_active: boolean
}

export type CatalogMachine = {
  id_machine: number
  /** Slug do backend; pode ser uma máquina seed (MachineId) ou um slug custom criado via admin. */
  slug: MachineId | string
  name: string
  display_order: number
  color_from: string | null
  color_to: string | null
  color_glow: string | null
  color_ring: string | null
  color_accent: string | null
  color_text: string | null
  description: string | null
  icon_name: string | null
  is_active: boolean
  categories: CatalogCategory[]
}

type State = {
  loading: boolean
  error: string | null
  machines: CatalogMachine[]
}

/**
 * Build CatalogMachine entries from the static MACHINES seed so the app always
 * has a usable list even when the backend is unreachable.
 */
function buildSeedCatalog(): CatalogMachine[] {
  return MACHINES.map((m, i) => ({
    id_machine: -(i + 1), // negative IDs to distinguish from real DB IDs
    slug: m.id,
    name: m.name,
    display_order: i,
    color_from: m.colors.from,
    color_to: m.colors.to,
    color_glow: m.colors.glow,
    color_ring: m.colors.ring,
    color_accent: m.colors.accent,
    color_text: m.colors.text,
    description: null,
    icon_name: null,
    is_active: true,
    categories: m.resultCards.map((rc, ci) => ({
      id_category: -(i * 100 + ci + 1),
      desc_category: rc.title,
      is_active: true,
    })),
  }))
}

const SEED_CATALOG = buildSeedCatalog()

let cached: CatalogMachine[] | null = null
let inflight: Promise<CatalogMachine[]> | null = null

async function fetchCatalog(): Promise<CatalogMachine[]> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = fetch("/api/machines", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const body = await r.json()
      const list: CatalogMachine[] = Array.isArray(body?.machines) ? body.machines : []
      if (list.length === 0) throw new Error("empty response")
      cached = list
      return list
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/**
 * Returns the authoritative list of machines + their categories from the
 * backend. Falls back to the static `MACHINES` seed during initial render and
 * when the API is unreachable so public UI never breaks.
 */
export function useMachinesCatalog(): State {
  const [state, setState] = useState<State>(() => ({
    loading: !cached,
    error: null,
    machines: cached ?? SEED_CATALOG,
  }))

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then((list) => {
        if (cancelled) return
        setState({ loading: false, error: null, machines: list })
      })
      .catch((e) => {
        if (cancelled) return
        // Fall back to seed — never leave machines empty
        setState({
          loading: false,
          error: e instanceof Error ? e.message : "Erro ao carregar máquinas",
          machines: SEED_CATALOG,
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/** Find a machine theme by slug from the static seed (SSR-safe). */
export function findSeedMachine(slug: string | null | undefined) {
  if (!slug) return null
  return MACHINES.find((m) => m.id === (slug as MachineId)) ?? null
}
