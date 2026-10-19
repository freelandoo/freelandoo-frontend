// features/meu-mundo/engine/collision.ts
//
// Colisão do bairro em 2D (plano XZ): o chão é plano, então ninguém sobe nem
// desce degrau — é isso que impede o personagem de ficar preso em diferença
// pequena de altura (calçada, caminho, praça são só visuais).
//
// Obstáculo = retângulo girado (casa, cerca viva, banco, tronco). O jogador é
// um círculo. A altura `h` só serve à câmera: é ela que decide se o ponto da
// câmera está DENTRO de uma casa.

export interface Box2 {
  x: number
  z: number
  hx: number
  hz: number
  rot: number
  h: number
}

/** Mesma convenção de rotação do Babylon (Matrix.RotationY, mão esquerda). */
export function rotY(x: number, z: number, rot: number) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return { x: x * c + z * s, z: -x * s + z * c }
}

function toLocal(b: Box2, px: number, pz: number) {
  const dx = px - b.x
  const dz = pz - b.z
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  return { x: dx * c - dz * s, z: dx * s + dz * c }
}

/** Empurra o círculo para fora dos obstáculos. Devolve a posição corrigida. */
export function resolveCircle(px: number, pz: number, radius: number, boxes: Box2[], passes = 2) {
  let x = px
  let z = pz
  for (let pass = 0; pass < passes; pass++) {
    let moved = false
    for (const b of boxes) {
      // Descarte barato antes da conta girada.
      const reach = Math.max(b.hx, b.hz) * 1.42 + radius
      if (Math.abs(x - b.x) > reach || Math.abs(z - b.z) > reach) continue
      const l = toLocal(b, x, z)
      const cx = Math.max(-b.hx, Math.min(b.hx, l.x))
      const cz = Math.max(-b.hz, Math.min(b.hz, l.z))
      let dx = l.x - cx
      let dz = l.z - cz
      const dist = Math.hypot(dx, dz)
      if (dist >= radius) continue
      let push: number
      if (dist > 1e-6) {
        push = radius - dist
        dx /= dist
        dz /= dist
      } else {
        // Centro dentro do retângulo: sai pelo lado mais próximo.
        const ox = b.hx - Math.abs(l.x)
        const oz = b.hz - Math.abs(l.z)
        if (ox < oz) {
          dx = Math.sign(l.x) || 1
          dz = 0
          push = ox + radius
        } else {
          dx = 0
          dz = Math.sign(l.z) || 1
          push = oz + radius
        }
      }
      const w = rotY(dx * push, dz * push, b.rot)
      x += w.x
      z += w.z
      moved = true
    }
    if (!moved) break
  }
  return { x, z }
}

/** O ponto (x, y, z) está dentro de algum obstáculo, com folga? */
export function pointBlocked(x: number, y: number, z: number, boxes: Box2[], margin: number) {
  for (const b of boxes) {
    if (y > b.h + margin) continue
    const reach = Math.max(b.hx, b.hz) * 1.42 + margin
    if (Math.abs(x - b.x) > reach || Math.abs(z - b.z) > reach) continue
    const l = toLocal(b, x, z)
    if (Math.abs(l.x) <= b.hx + margin && Math.abs(l.z) <= b.hz + margin) return true
  }
  return false
}
