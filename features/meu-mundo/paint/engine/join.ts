// features/meu-mundo/paint/engine/join.ts — PAINT (mm3d-35): entrar numa sala.
//
// Pede a reserva ao backend (POST /center/paint, no centro e perto da porta),
// abre a porta de rede e espera a sala encher. Quem chama (center-view) dá
// só a função que faz o POST; o resto (reconexão pela mesma sala, espera,
// cancelar) fica aqui.

import { NetPort, type PaintSession } from "./net-port"
import type { PaintJoin } from "../ui/paint-view"
import type { PaintMode } from "../sim/tuning"

export function makePaintJoin(fetchSession: (mode: PaintMode, roomId: string | null) => Promise<PaintSession | null>): PaintJoin {
  return async (mode, hooks) => {
    const first = await fetchSession(mode, null)
    if (!first || hooks.signal.aborted) return null
    const port = new NetPort(first, (roomId) => fetchSession(mode, roomId), { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
    try {
      await port.ready(hooks.signal)
    } catch {
      port.dispose()
      return null
    }
    return port
  }
}
