// features/meu-mundo/ui/hud/game-cover.ts — "tem jogo de tela cheia aberto" (mm3d-60f).
//
// Pedido do Alex: dentro das lutas o HUD do personagem some e fica só a placa
// da luta. Lutas e minijogos abrem DENTRO da camada da cena (o mesmo ponto em
// que o mundo 3D é suspenso), então o z-index não resolve sozinho: a cena
// avisa aqui e as peças da casca (HUD, card de missão) se escondem.

import { useEffect, useState } from "react"

const EVENT = "mm-game-cover"
const on = new Set<string>()

/** A cena `who` abriu (true) ou fechou (false) um jogo de tela cheia. */
export function setGameCover(who: string, covered: boolean) {
  const had = on.size > 0
  if (covered) on.add(who)
  else on.delete(who)
  if (had !== on.size > 0) window.dispatchEvent(new CustomEvent(EVENT, { detail: on.size > 0 }))
}

/** Tem luta/minijogo cobrindo a tela agora? */
export function useGameCovered() {
  const [covered, setCovered] = useState(() => on.size > 0)
  useEffect(() => {
    const f = (e: Event) => setCovered(!!(e as CustomEvent<boolean>).detail)
    window.addEventListener(EVENT, f)
    setCovered(on.size > 0)
    return () => window.removeEventListener(EVENT, f)
  }, [])
  return covered
}
