// features/meu-mundo/engine/audio/ambience.ts — o fundo do lugar (áudio S2, 2026-11-11).
// Um laço só por vez no canal "ambience" (praça de dia/noite, a sala de cada prédio, a fase do
// minijogo), cruzado ao trocar. Os arquivos são os efeitos de 12–20 s do inventário (bank).
// Mesmo laço pedido de novo = nada muda. Sem arquivo aprovado: silêncio.

import { loadSample, playSample, type Voice } from "./bank"

let want: string | null = null
let voice: Voice | null = null
let playing: string | null = null

export function setAmbience(asset: string | null, gain = 0.55) {
  if (asset === want) return
  want = asset
  if (voice) voice.stop(1.4)
  voice = null
  playing = null
  if (!asset) return
  void loadSample(asset).then((buf) => {
    if (!buf || want !== asset) return
    voice = playSample(asset, { bus: "ambience", loop: true, gain, fadeIn: 1.8, vary: 0 })
    playing = voice ? asset : null
  })
}

/** Solta o fundo só se ainda for ESTE (a cena nova pode ter pedido antes da velha fechar). */
export function releaseAmbience(asset: string | null) {
  if (asset && want === asset) setAmbience(null)
}

export function ambienceState() {
  return { want, playing }
}
