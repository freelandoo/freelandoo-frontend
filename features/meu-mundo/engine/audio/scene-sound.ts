// features/meu-mundo/engine/audio/scene-sound.ts — o som de uma cena (áudio S2): a música e o
// fundo que ela pede, trocáveis (dia/noite, fase do minijogo) e soltos no dispose sem apagar o
// pedido da cena que abriu depois. Cada create*Game usa um destes.
import { releaseAmbience, setAmbience } from "./ambience"
import { releaseMusic, setMusic, type MusicLayer } from "./music"

export interface SceneSound {
  set(music: string | null, amb?: string | null): void
  dispose(): void
}

export function sceneSound(layer: MusicLayer = "scene"): SceneSound {
  let music: string | null = null
  let amb: string | null = null
  let dead = false
  return {
    set(m, a = null) {
      if (dead) return
      if (m !== music) {
        if (m) setMusic(layer, m)
        else releaseMusic(layer, music)
        music = m
      }
      if (a !== amb) {
        if (a) setAmbience(a)
        else releaseAmbience(amb)
        amb = a
      }
    },
    dispose() {
      if (dead) return
      dead = true
      releaseMusic(layer, music)
      releaseAmbience(amb)
    },
  }
}
