// features/meu-mundo/engine/speech-bubble.ts — mm3d-32: balão de fala sobre a cabeça.
//
// Mesmo padrão da etiqueta de nome (avatars.ts makeNameTag): textura dinâmica
// num plano que sempre olha para a câmera, material sem luz, fora do pick.
// Um balão por boneco, criado só na primeira fala; fala nova redesenha a
// mesma textura (nada é criado por quadro). Some sozinho em BUBBLE_MS e
// respeita o corte por distância da etiqueta (quality.ts tagCut). Tudo é
// solto no dispose().
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Scene } from "@babylonjs/core/scene"

/** 10 s na tela (mm3d-33, pedido do Alex); fala nova da mesma pessoa troca o texto na hora. */
export const BUBBLE_MS = 10_000
const W = 512
const H = 128
/** Altura da cauda (px da textura) abaixo da caixa. */
const TAIL = 22
const RADIUS = 22

let seq = 0

export class SpeechBubble {
  private readonly mesh: Mesh
  private readonly mat: StandardMaterial
  private readonly tex: DynamicTexture
  private until = 0

  /** `y` acima da etiqueta de nome (2,1 m) para os dois não se cobrirem. */
  constructor(scene: Scene, parent: TransformNode, y = 2.62) {
    const id = ++seq
    this.tex = new DynamicTexture(`mm-bubble-${id}`, { width: W, height: H }, scene, false)
    this.tex.hasAlpha = true
    this.mat = new StandardMaterial(`mm-bubble-mat-${id}`, scene)
    this.mat.diffuseTexture = this.tex
    this.mat.emissiveColor = new Color3(1, 1, 1)
    this.mat.disableLighting = true
    this.mat.useAlphaFromDiffuseTexture = true
    this.mat.backFaceCulling = false
    this.mesh = MeshBuilder.CreatePlane(`mm-bubble-${id}`, { width: 2.4, height: 0.6 }, scene)
    this.mesh.material = this.mat
    this.mesh.billboardMode = 7
    this.mesh.parent = parent
    this.mesh.position.y = y
    this.mesh.isPickable = false
    this.mesh.setEnabled(false)
  }

  /** Redesenha com a fala nova (substitui a anterior na hora) e reinicia os 10 s. */
  say(text: string, now = performance.now()) {
    const ctx = this.tex.getContext() as unknown as CanvasRenderingContext2D
    ctx.clearRect(0, 0, W, H)
    ctx.font = "600 30px system-ui, -apple-system, Segoe UI, sans-serif"
    const lines = wrap(ctx, text.trim(), W - 48)
    // Largura da caixa acompanha o texto (fala curta = balão curto).
    const textW = Math.max(...lines.map((l) => ctx.measureText(l).width), 40)
    const bw = Math.min(W - 8, textW + 48)
    const bx = (W - bw) / 2
    const by = 4
    const bh = H - TAIL - by
    ctx.fillStyle = "rgba(20,20,24,0.86)"
    roundRect(ctx, bx, by, bw, bh, RADIUS)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(W / 2 - 14, by + bh - 1)
    ctx.lineTo(W / 2, H - 2)
    ctx.lineTo(W / 2 + 14, by + bh - 1)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    const mid = by + bh / 2
    if (lines.length === 1) ctx.fillText(lines[0], W / 2, mid, W - 40)
    else lines.forEach((l, i) => ctx.fillText(l, W / 2, mid + (i === 0 ? -18 : 18), W - 40))
    this.tex.update(true)
    this.until = now + BUBBLE_MS
  }

  /** Falando agora (ainda dentro do tempo). */
  active(now = performance.now()) {
    return now < this.until
  }

  /** Chamar no laço do boneco: some no tempo ou fora do corte de distância. */
  tick(visible: boolean, now = performance.now()) {
    const on = visible && now < this.until
    if (on !== this.mesh.isEnabled(false)) this.mesh.setEnabled(on)
  }

  dispose() {
    this.mesh.dispose()
    this.mat.dispose()
    this.tex.dispose()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Quebra em até 2 linhas; o resto vira "…" no fim da segunda. */
export function wrap(ctx: Pick<CanvasRenderingContext2D, "measureText">, text: string, max: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= max
  const out: string[] = []
  let cur = ""
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w
    if (fits(next)) cur = next
    else {
      if (cur) out.push(cur)
      cur = w
    }
  }
  if (cur) out.push(cur)
  if (!out.length) return [""]
  // Palavra maior que a linha (sem espaço): corta por caractere.
  for (let i = 0; i < out.length; i++) {
    if (fits(out[i])) continue
    let s = out[i]
    while (s.length > 1 && !fits(`${s}…`)) s = s.slice(0, -1)
    out[i] = `${s}…`
  }
  if (out.length > 2) {
    let s = out[1]
    while (s.length > 1 && !fits(`${s}…`)) s = s.slice(0, -1)
    return [out[0], `${s}…`]
  }
  return out
}
