// ═══ PODER TRANSBORDANDO (Alex, 2026-11-18; refeito 2026-11-19) ═══
//
// Quem passou do teto da faixa de Poder do nível (power/power.ts powerBand/isOverpowered — o servidor
// decide e manda `ov` no jogador da sala) fica com um CONTORNO DE LUZ: vermelho no Vampiro (ov 1),
// verde na Raposa (ov 2). Só o contorno — sem partícula (Alex, 2026-11-19: a faísca no chão parecia
// sangue e as brasas nas costas foram recusadas).
//
// Uma CASCA por malha do corpo: clone que divide a geometria e o esqueleto (anda junto, sem custo de
// memória), material sem luz, cor da classe, opacidade por fresnel: some no meio do corpo e acende na
// borda da silhueta, somada à cena (luz de verdade). Pulsa devagar. Custa 1 desenho a mais por malha
// do corpo de quem está marcado. (O OutlineRenderer do Babylon foi testado e não desenha nas malhas
// com osso deste jogo.)

import type { Scene } from "@babylonjs/core/scene"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Character } from "./player"

/** 0 = normal; 1 = Vampiro (vermelho); 2 = Raposa (verde). */
export type SurgeKind = 0 | 1 | 2

const LINE: Record<1 | 2, Color3> = {
  1: new Color3(1, 0.08, 0.06),
  2: new Color3(0.2, 1, 0.3),
}
/** Força da luz da borda (base e quanto pulsa). */
const RIM = { base: 1, pulse: 0.45 }

interface Lit {
  kind: 1 | 2
  char: Character
  /** Malhas acesas agora (o corpo pode ser trocado: nova roupa/classe → acende as novas). */
  meshes: readonly AbstractMesh[]
  shells: Mesh[]
}

export class PowerSurge {
  private readonly lit = new Map<string, Lit>()
  private readonly rims = new Map<1 | 2, StandardMaterial>()
  private clock = 0

  constructor(private readonly scene: Scene) {}

  /** Marca (ou desmarca) quem transborda. Chamado a cada atualização da sala; barato se nada mudou. */
  set(key: string, kind: number | undefined, char: Character) {
    const k = (kind === 1 || kind === 2 ? kind : 0) as SurgeKind
    const cur = this.lit.get(key)
    if (!k) return void (cur && this.drop(key))
    if (cur && cur.kind === k && cur.char === char) return
    if (cur) this.drop(key)
    const meshes = bodyOf(char)
    this.lit.set(key, { kind: k, char, meshes, shells: light(meshes, this.rim(k)) })
  }

  drop(key: string) {
    const t = this.lit.get(key)
    if (!t) return
    unlight(t.shells)
    this.lit.delete(key)
  }

  step(dt: number) {
    if (dt <= 0 || !this.lit.size) return
    this.clock += dt
    for (const t of this.lit.values()) {
      // corpo trocado (carregou o modelo de verdade, mudou a roupa) → acende as malhas novas
      const meshes = bodyOf(t.char)
      if (meshes.length !== t.meshes.length || meshes[0] !== t.meshes[0]) {
        unlight(t.shells)
        t.meshes = meshes
        t.shells = light(meshes, this.rim(t.kind))
      }
    }
    const k = RIM.base + RIM.pulse * (0.5 + 0.5 * Math.sin(this.clock * 3.2))
    for (const [kind, m] of this.rims) m.emissiveColor.copyFrom(LINE[kind]).scaleInPlace(k)
  }

  dispose() {
    for (const key of [...this.lit.keys()]) this.drop(key)
    for (const m of this.rims.values()) m.dispose()
    this.rims.clear()
  }

  /** Material da casca (um por classe, criado na 1ª vez): sem luz, cor da classe, borda acesa por fresnel. */
  private rim(kind: 1 | 2): StandardMaterial {
    let m = this.rims.get(kind)
    if (m) return m
    m = new StandardMaterial(`mm-surge-rim-${kind}`, this.scene)
    m.disableLighting = true
    m.diffuseColor.set(0, 0, 0)
    m.specularColor.set(0, 0, 0)
    m.emissiveColor.copyFrom(LINE[kind])
    const f = new FresnelParameters()
    // shader (defaultFragmentAlpha): alpha += left·(1−t) + right·t, t = |n·v|^power → t≈0 na borda (left),
    // t≈1 de frente (right). Por isso o alpha base é 0: o fresnel SOMA. Power < 1 afina a borda.
    f.leftColor.set(1, 1, 1) // borda: acesa
    f.rightColor.set(0, 0, 0) // de frente: some
    f.power = 0.6
    f.bias = 0
    m.opacityFresnelParameters = f
    m.alpha = 0
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
    m.zOffset = -2
    m.backFaceCulling = true
    this.rims.set(kind, m)
    return m
  }
}

const SHELL = "mm-surge-shell"

/** Malhas do corpo que ganham casca: sem as próprias cascas e sem a malha leve de longe (LOD). */
function bodyOf(char: Character): AbstractMesh[] {
  const all = char.bodyMeshes
  const lod = new Set<AbstractMesh>()
  for (const m of all) if (m instanceof Mesh) for (const l of m.getLODLevels()) if (l.mesh) lod.add(l.mesh)
  return all.filter((m) => m.metadata !== SHELL && !lod.has(m))
}

/** Uma casca por malha do corpo: clone que divide geometria e esqueleto, no mesmo pai. */
function light(meshes: readonly AbstractMesh[], mat: StandardMaterial): Mesh[] {
  const out: Mesh[] = []
  for (const src of meshes) {
    if (!(src instanceof Mesh) || !src.geometry) continue
    const shell = src.clone(`${src.name}-surge`, src.parent, true, false)
    shell.skeleton = src.skeleton
    shell.material = mat
    // de longe o corpo vira a malha leve (LOD): a casca some na mesma distância
    const far = src.getLODLevels()[0]
    if (far) shell.addLODLevel(far.distanceOrScreenCoverage, null)
    shell.metadata = SHELL
    shell.isPickable = false
    shell.receiveShadows = false
    shell.alwaysSelectAsActiveMesh = src.alwaysSelectAsActiveMesh
    out.push(shell)
  }
  return out
}

function unlight(shells: Mesh[]) {
  for (const s of shells) if (!s.isDisposed()) s.dispose(false, false)
  shells.length = 0
}
