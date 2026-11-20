// features/meu-mundo/gincana/engine/backdrop-base.ts — o que todo fundo de Domínio da Gincana divide (20/11):
// até onde vai a prova (`Z0`/`Z1`), a altura do chão da prova em cada z (`deckY`, para o fundo subir junto
// quando a prova sobe), o pseudo-aleatório e o lado. Arquivo à parte para os fundos por Domínio
// (`backdrop-<domínio>.ts`) não importarem `backdrops.ts` (que os chama).

/** Pseudo-aleatório determinístico (o cenário é igual em todo aparelho). */
export function rnd(i: number, k = 0) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Lados da prova: devolve x a `d` metros do eixo, alternando. */
export const side = (i: number, d: number) => (i % 2 ? d : -d)

/** O começo da prova (z) e até onde o cenário vai. `Z1` segue o fim da prova: o percurso dobrado (`reprise`)
 * leva a chegada a z 380–640 e o fundo parava em 300 (a 2ª metade ficava vazia). */
export const Z0 = -40
export let Z1 = 300

/** Quantas vezes a prova é mais longa que os 340 m de antes (as contagens dos fundos saem multiplicadas por isto). */
export const spanK = () => (Z1 - Z0) / 340

const STEP = 4
let prof: number[] = []

/** Peças de chão da prova, só o que o perfil precisa. */
type FloorPad = { z: number; hz: number; y: number; y2: number; k: number }

/** Chamado por `buildBackdrop` antes de montar: fim da prova e o perfil de altura do chão (a cada 4 m). */
export function setSpan(finishZ: number, pads: readonly FloorPad[]) {
  Z1 = Math.max(300, (finishZ < 5000 ? finishZ : 260) + 60)
  const nb = Math.ceil((Z1 + 80 - Z0) / STEP)
  prof = new Array(nb).fill(-Infinity)
  for (const p of pads) {
    const a = Math.max(0, Math.floor((p.z - p.hz - Z0) / STEP))
    const b = Math.min(nb - 1, Math.ceil((p.z + p.hz - Z0) / STEP))
    for (let i = a; i <= b; i++) {
      const z = Z0 + i * STEP
      const u = Math.max(0, Math.min(1, (z - (p.z - p.hz)) / (2 * p.hz || 1)))
      const y = p.k === 2 ? p.y + (p.y2 - p.y) * u : p.y
      if (y < 200) prof[i] = Math.max(prof[i], y)
    }
  }
  let last = 0
  for (let i = 0; i < nb; i++) prof[i] = prof[i] === -Infinity ? last : (last = prof[i])
}

/** Altura do chão da prova em z (0 antes da largada / sem perfil). */
export function deckY(z: number) {
  if (!prof.length) return 0
  const i = Math.max(0, Math.min(prof.length - 1, Math.round((z - Z0) / STEP)))
  return Math.max(0, prof[i])
}
