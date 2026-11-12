// features/meu-mundo/engine/audio/ui-sound.ts — som da interface (menu, mochila, viagem, portas).
// Chamado de dentro do clique (gesto): o contexto destrava ali mesmo. Sem arquivo aprovado = silêncio.
import { playSample, preloadSamples } from "./bank"
import { UI, type UiCue } from "./cues"
import { unlockAudio } from "./mixer"

let warmed = false

export function uiSound(cue: UiCue, gain = 1) {
  unlockAudio()
  if (!warmed) {
    warmed = true
    preloadSamples(Object.values(UI))
  }
  playSample(UI[cue], { bus: "ui", gain, vary: 0.03 })
}
