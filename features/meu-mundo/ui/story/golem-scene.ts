// features/meu-mundo/ui/story/golem-scene.ts — a CENA PILOTO da apresentação 16: a primeira
// chegada ao Golem de Pedra em Pedraverde (lore v2 C5, cap. 8). As falas são as mesmas
// vozes do Golem (`qn_golem_*`); a lembrança conta, em duas frases, o que o Arquivo de
// Pedraverde já diz. Gramática (Anexo A §8): longe → close → os dois → lembrança →
// inclinado (tensão) → close de quem escuta → avanço no rosto com o grito → preto.
//
// Só na PRIMEIRA chegada neste aparelho (`seenGolemScene`); depois, as vozes sobrepostas
// de sempre (GolemVoices). ~21 s; "Pular" a qualquer momento.

import { GOLEM_CLOSE, GOLEM_LINES, GOLEM_NAME_KEY } from "../../god-voice"
import type { StoryBeat } from "./story-scene"

const GOLEM = { key: GOLEM_NAME_KEY, fb: "Golem de Pedra" }

export const GOLEM_STORY: StoryBeat[] = [
  { shot: { kind: "wide" }, ms: 2600 },
  { shot: { kind: "close", who: "b" }, ms: 3000, line: { key: GOLEM_LINES[0], fb: "Somos cento e oitenta.", who: GOLEM } },
  { shot: { kind: "two" }, ms: 3200, line: { key: GOLEM_LINES[3], fb: "Quem é? Quem é? Ele tá sem arma.", who: GOLEM } },
  { shot: null, memory: "pedraverde", ms: 3200, line: { key: "storyGolemMem1", fb: "Uma vila de Raposas que não quis escolher lado." } },
  { shot: null, memory: "pedraverde", ms: 3600, line: { key: "storyGolemMem2", fb: "Na última noite, os adultos pediram a Kragor para virar muralha." } },
  { shot: { kind: "dutch", who: "b" }, ms: 2800, line: { key: GOLEM_LINES[1], fb: "Mariana, dorme.", who: GOLEM } },
  { shot: { kind: "close", who: "a" }, ms: 2400, line: { key: GOLEM_LINES[2], fb: "Ninguém entra.", who: GOLEM } },
  { shot: { kind: "push", who: "b" }, ms: 2200, line: { key: GOLEM_CLOSE, fb: "FECHA.", who: GOLEM }, shout: true },
]

const SEEN_KEY = "mm-story-golem"
export function seenGolemScene(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1"
  } catch {
    return false
  }
}
export function markGolemScene() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1")
  } catch {
    /* sem armazenamento: a cena volta na próxima chegada, e o Pular resolve */
  }
}
