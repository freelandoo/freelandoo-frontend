// features/meu-mundo/engine/story-camera.ts — a GRAMÁTICA DE PLANOS da cena de história
// feita no motor (apresentação 16 · Anexo A §8). Pura conta: dado quem está em cena (A =
// o jogador, B = quem fala com ele), o tipo do plano e o andamento dentro dele (0 → 1),
// devolve onde fica a câmera, para onde olha e o quanto ela inclina.
//
// Planos de 2 a 4 s com CORTE SECO entre eles; dentro de cada um, um avanço lento (o
// "respiro" que faz o plano parecer filmado e não parado). Alternância da referência:
// longe → close de rosto → os dois → inclinado (tensão) → close de quem escuta.

import { Vector3 } from "@babylonjs/core/Maths/math.vector"

export type ShotKind = "wide" | "close" | "two" | "dutch" | "push"
export interface StoryShot {
  kind: ShotKind
  /** De quem é o plano (close, inclinado, avanço): "a" = o jogador, "b" = quem fala. */
  who?: "a" | "b"
}
/** Quem está em cena: chão (x, z) e a altura da cabeça. */
export interface StorySubject {
  x: number
  z: number
  head: number
}
export interface StoryPose {
  pos: Vector3
  target: Vector3
  /** Inclinação da câmera (rad) — só o plano inclinado. */
  roll: number
  /** Abertura vertical da lente (rad). Close = teleobjetiva: câmera longe e lente fechada. */
  fov: number
  /** Distância até quem está em foco (m), para o desfoque do fundo. */
  focus: number
}

const ease = (k: number) => 1 - (1 - k) * (1 - k)
const lerp = (x: number, y: number, k: number) => x + (y - x) * k

/**
 * Os closes são de TELEOBJETIVA: a câmera fica do lado de quem escuta, a alguns metros, e
 * a lente fecha. Assim nada do cenário entra entre a câmera e o rosto (a clareira de
 * Pedraverde tem um galho da árvore colossal descendo bem na frente do Golem), o fundo
 * fica achatado atrás de quem fala e o avanço é um zoom, não um passo para dentro do mato.
 */
export function shotPose(shot: StoryShot, a: StorySubject, b: StorySubject, k: number): StoryPose {
  const e = ease(Math.max(0, Math.min(1, k)))
  // d = de B para A (no chão); side = perpendicular a d
  let dx = a.x - b.x
  let dz = a.z - b.z
  const sep = Math.hypot(dx, dz) || 1
  dx /= sep
  dz /= sep
  const sx = -dz
  const sz = dx
  const at = (s: StorySubject, dy = 0) => new Vector3(s.x, s.head + dy, s.z)
  // um ponto atrás de A (do lado oposto a B), a `back` metros de A, deslocado de lado
  const behindA = (back: number, lat: number, y: number) => new Vector3(a.x + dx * back + sx * lat, y, a.z + dz * back + sz * lat)
  let pos: Vector3
  let target: Vector3
  let roll = 0
  let fov = 0.85
  switch (shot.kind) {
    case "wide":
      // de longe e do alto, atrás do jogador: a clareira inteira, descendo devagar
      pos = behindA(lerp(7.5, 6.5, e), 0.6, lerp(6.6, 5.6, e))
      target = new Vector3(b.x, b.head * 0.75, b.z)
      fov = 0.9
      break
    case "two":
      // os dois no quadro: de trás e de lado do jogador, ele em primeiro plano
      pos = behindA(lerp(4.6, 4.0, e), 4.2, 3.6)
      target = new Vector3(lerp(a.x, b.x, 0.62), b.head * 0.6, lerp(a.z, b.z, 0.62))
      fov = 0.72
      break
    case "close":
    case "dutch":
    case "push": {
      if (shot.who === "a") {
        // o jogador visto do lado de B, um pouco de cima (o olhar do gigante)
        const dist = lerp(2.4, 2.1, e)
        pos = new Vector3(a.x - dx * dist + sx * 0.5, a.head + 0.75, a.z - dz * dist + sz * 0.5)
        target = at(a, -0.05)
        fov = 0.62
      } else {
        // B de teleobjetiva, de onde o jogador está (um passo atrás e de lado)
        // sempre do mesmo lado (−): do outro, o galho da árvore colossal corta o rosto do Golem
        const lat = shot.kind === "dutch" ? -1.9 : shot.kind === "push" ? -1.6 : -1.3
        pos = behindA(1.5, lat, 2.1)
        target = at(b, -0.3)
        const span = Math.hypot(pos.x - b.x, pos.z - b.z)
        // a lente que põe ~1,6 m (cabeça e ombros) na altura da tela, e o avanço fecha mais
        const base = 2 * Math.atan(0.8 / span) * (shot.kind === "dutch" ? 1.15 : 1)
        fov = shot.kind === "push" ? lerp(base * 1.5, base * 0.75, e) : lerp(base * 1.08, base, e)
        roll = shot.kind === "dutch" ? 0.24 : 0
      }
      break
    }
  }
  return { pos, target, roll, fov, focus: Vector3.Distance(pos, target) }
}
