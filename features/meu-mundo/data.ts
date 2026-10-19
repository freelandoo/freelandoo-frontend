// features/meu-mundo/data.ts — adaptador de dados do bairro.
//
// Hoje lê o bairro DEMONSTRATIVO da área de admin. Quem decide quem pode ver é
// o SERVIDOR (auth + papel Administrator): 401 e 403 voltam como estado, e a
// tela não carrega o motor 3D sem uma resposta válida.

import type { NeighborhoodPayload } from "./types"

export type NeighborhoodResult =
  | { ok: true; payload: NeighborhoodPayload }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "network" }

export async function fetchAdminNeighborhood(
  token: string,
  signal: AbortSignal,
): Promise<NeighborhoodResult> {
  let res: Response
  try {
    res = await fetch("/api/meu-mundo/admin/neighborhood", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    })
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err
    return { ok: false, reason: "network" }
  }
  if (res.status === 401) return { ok: false, reason: "unauthenticated" }
  if (res.status === 403) return { ok: false, reason: "forbidden" }
  if (!res.ok) return { ok: false, reason: "network" }

  const body = (await res.json().catch(() => null)) as NeighborhoodPayload | null
  return isValidPayload(body) ? { ok: true, payload: body } : { ok: false, reason: "invalid" }
}

// Conferência mínima da forma: dado torto aqui vira cena quebrada lá na frente,
// e é melhor dizer "não carregou" do que desenhar um bairro pela metade.
function isValidPayload(body: NeighborhoodPayload | null): body is NeighborhoodPayload {
  const n = body?.neighborhood
  if (!n || n.layout !== "ring-20" || !Array.isArray(n.lots) || !Array.isArray(n.houses)) return false
  if (!n.spawn || !n.exit) return false
  const houseIds = new Set(n.houses.map((h) => h.id))
  return n.lots.every(
    (l) =>
      typeof l.id === "string" &&
      Number.isFinite(l.position?.x) &&
      Number.isFinite(l.position?.z) &&
      Number.isFinite(l.rotationY) &&
      houseIds.has(l.houseId),
  )
}
