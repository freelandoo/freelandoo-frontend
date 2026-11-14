// features/meu-mundo/engine/audio/ui-sound.ts — som da interface (menu, mochila, viagem, portas).
// Chamado de dentro do clique (gesto): o contexto destrava ali mesmo. Sem arquivo aprovado = silêncio.
import { playSample, preloadSamples } from "./bank"
import { UI, type UiCue } from "./cues"
import { audioContext, unlockAudio } from "./mixer"

let warmed = false

export function uiSound(cue: UiCue, gain = 1) {
  unlockAudio()
  if (!warmed) {
    warmed = true
    preloadSamples(Object.values(UI))
  }
  playSample(UI[cue], { bus: "ui", gain, vary: 0.03 })
}

/**
 * Som de interface que NÃO vem de um clique (notificação, nível, item que caiu, mensagem que chegou):
 * toca só se o áudio já foi destravado por um gesto; não marca o áudio como destravado (a música espera
 * o gesto de verdade). Sem arquivo aprovado = silêncio.
 */
export function uiCue(cue: UiCue, gain = 1) {
  // contexto suspenso agendaria o som para tocar atrasado, em rajada, quando destravar
  if (audioContext()?.state !== "running") return
  if (!warmed) {
    warmed = true
    preloadSamples(Object.values(UI))
  }
  playSample(UI[cue], { bus: "ui", gain, vary: 0.03 })
}
