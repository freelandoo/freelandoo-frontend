// features/meu-mundo/paint/engine/join.ts — PAINT (mm3d-35): entrar numa sala.
//
// Pede a reserva ao backend (POST /center/paint, no centro e perto da porta),
// abre a porta de rede e espera a sala encher. Quem chama (center-view) dá
// só a função que faz o POST; o resto (reconexão pela mesma sala, espera,
// cancelar) fica aqui.

import { NetPort, type PaintSession } from "./net-port"
import type { PaintJoin } from "../ui/paint-view"
import type { PaintMode } from "../sim/tuning"

/** mm3d-76: `map` = o voto de quem entra; `onRoom` dá à tela da espera como trocar o voto. */
export function makePaintJoin(fetchSession: (mode: PaintMode, roomId: string | null, map: string) => Promise<PaintSession | null>): PaintJoin {
  return async (mode, hooks) => {
    let vote = hooks.map
    const first = await fetchSession(mode, null, vote)
    if (!first || hooks.signal.aborted) return null
    const port = new NetPort(first, (roomId) => fetchSession(mode, roomId, vote), { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
    hooks.onRoom?.({
      vote: (map) => {
        vote = map
        port.vote(map)
      },
    })
    try {
      await port.ready(hooks.signal)
    } catch {
      port.dispose()
      return null
    }
    return port
  }
}
