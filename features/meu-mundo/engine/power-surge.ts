// ═══ PODER TRANSBORDANDO (Alex, 2026-11-18; refeito 2026-11-19) ═══
//
// Quem passou do teto da faixa de Poder do nível (power/power.ts powerBand/isOverpowered — o servidor
// decide e manda `ov` no jogador da sala) fica ACESO: vermelho no Vampiro (ov 1), verde na Raposa (ov 2).
//
// 1) Brasas de LUZ saindo das COSTAS (não dos pés: a 1ª versão parecia sangue pingado no chão — foto
//    do Alex de 2026-11-19). Nascem atrás do tronco em coordenadas do MUNDO e sobem: andando, a
//    nuvem fica para trás como um rastro de aura.
// 2) Contorno de luz: uma CASCA por malha do corpo — clone que divide a geometria e o esqueleto (anda
//    junto, sem custo de memória), material sem luz, cor da classe, opacidade por fresnel: some no
//    meio do corpo e acende na borda da silhueta, somada à cena (luz de verdade). Pulsa devagar.
//    (O OutlineRenderer do Babylon foi testado e não desenha nas malhas com osso deste jogo.)
//
// Mistura MULTIPLYADD nas brasas: escurece o fundo pela cor e depois soma — fica brilho de verdade
// sem lavar o vermelho para laranja sobre a areia clara do bairro (foi o problema da mistura aditiva).
//
// Um ParticleSystem por personagem marcado (ninguém marcado = nada criado). Quantidade pelo
// `particles` da qualidade (engine/quality.ts). A casca custa 1 desenho a mais por malha do corpo.

import type { Scene } from "@babylonjs/core/scene"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import type { Character } from "./player"

/** 0 = normal; 1 = Vampiro (vermelho); 2 = Raposa (verde). */
export type SurgeKind = 0 | 1 | 2

const PALETTE: Record<1 | 2, { hot: Color4; deep: Color4; dead: Color4; line: Color3 }> = {
  1: { hot: new Color4(1, 0.22, 0.16, 1), deep: new Color4(0.95, 0.02, 0.05, 0.95), dead: new Color4(0.4, 0, 0, 0), line: new Color3(1, 0.08, 0.06) },
  2: { hot: new Color4(0.55, 1, 0.45, 1), deep: new Color4(0.05, 0.95, 0.25, 0.95), dead: new Color4(0, 0.35, 0.08, 0), line: new Color3(0.2, 1, 0.3) },
}
/** Brasas por segundo andando e parado (multiplicadas pelo `particles` da qualidade). A aura não apaga parado. */
const RATE = { walk: 80, idle: 45 }
/** Acima disto (m/s) conta como andando. */
const MOVING = 0.4
/** Altura das costas (fração da altura do corpo) e quanto atrás do eixo do corpo (m). */
const BACK = { up: 0.6, behind: 0.16 }
/** Força da luz da borda (base e quanto pulsa). */
const RIM = { base: 1, pulse: 0.45 }

interface Trail {
  kind: 1 | 2
  char: Character
  ps: ParticleSystem
  at: Vector3
  last: Vector3
  speed: number
  /** Malhas acesas agora (o corpo pode ser trocado: nova roupa/classe → acende as novas). */
  meshes: readonly AbstractMesh[]
  shells: Mesh[]
}

export class PowerSurge {
  private readonly trails = new Map<string, Trail>()
  private tex: DynamicTexture | null = null
  private readonly rims = new Map<1 | 2, StandardMaterial>()
  private clock = 0

  constructor(
    private readonly scene: Scene,
    /** `particles` da qualidade (0,3 baixo · 0,6 médio · 1 alto). */
    private readonly budget: number
  ) {}

  /** Marca (ou desmarca) quem transborda. Chamado a cada atualização da sala; barato se nada mudou. */
  set(key: string, kind: number | undefined, char: Character) {
    const k = (kind === 1 || kind === 2 ? kind : 0) as SurgeKind
    const cur = this.trails.get(key)
    if (!k) return void (cur && this.drop(key))
    if (cur && cur.kind === k && cur.char === char) return
    if (cur) this.drop(key)
    this.trails.set(key, this.make(k, char))
  }

  drop(key: string) {
    const t = this.trails.get(key)
    if (!t) return
    t.ps.stop()
    t.ps.dispose(false)
    unlight(t.shells)
    this.trails.delete(key)
  }

  step(dt: number) {
    if (dt <= 0) return
    this.clock += dt
    const wave = 0.5 + 0.5 * Math.sin(this.clock * 3.2)
    for (const t of this.trails.values()) {
      const holder = t.char.holder
      const p = holder.getAbsolutePosition()
      const v = Math.hypot(p.x - t.last.x, p.z - t.last.z) / dt
      // média curta: a rede chega em degraus, a aura não pode piscar
      t.speed += (Math.min(v, 20) - t.speed) * Math.min(1, dt * 8)
      t.last.copyFrom(p)
      const f = holder.rotation.y
      // frente = (sin f, cos f) (motion.ts): as costas ficam do lado oposto
      t.at.set(p.x - Math.sin(f) * BACK.behind, p.y + t.char.height * BACK.up, p.z - Math.cos(f) * BACK.behind)
      const visible = holder.isEnabled()
      t.ps.emitRate = !visible ? 0 : (t.speed > MOVING ? RATE.walk : RATE.idle) * this.budget
      // corpo trocado (carregou o modelo de verdade, mudou a roupa) → acende as malhas novas
      const meshes = bodyOf(t.char)
      if (meshes.length !== t.meshes.length || meshes[0] !== t.meshes[0]) {
        unlight(t.shells)
        t.meshes = meshes
        t.shells = light(meshes, this.rim(t.kind))
      }
    }
    const k = RIM.base + RIM.pulse * wave
    for (const [kind, m] of this.rims) m.emissiveColor.copyFrom(PALETTE[kind].line).scaleInPlace(k)
  }

  dispose() {
    for (const key of [...this.trails.keys()]) this.drop(key)
    this.tex?.dispose()
    this.tex = null
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
    m.emissiveColor.copyFrom(PALETTE[kind].line)
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

  /** Brasa: miolo branco quente e borda macia (gerada uma vez). */
  private texture(): DynamicTexture {
    if (this.tex) return this.tex
    const size = 64
    const tex = new DynamicTexture("mm-surge-spark", { width: size, height: size }, this.scene, false)
    const ctx = tex.getContext() as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.2, "rgba(255,255,255,0.9)")
    g.addColorStop(0.5, "rgba(255,255,255,0.3)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    tex.hasAlpha = true
    tex.update()
    this.tex = tex
    return tex
  }

  private make(kind: 1 | 2, char: Character): Trail {
    const at = char.holder.getAbsolutePosition().clone()
    const ps = new ParticleSystem(`mm-surge-${kind}`, Math.max(40, Math.round(240 * this.budget)), this.scene)
    ps.particleTexture = this.texture()
    ps.blendMode = ParticleSystem.BLENDMODE_MULTIPLYADD
    ps.updateSpeed = 1 / 60
    ps.emitter = at
    // nascem numa caixa do tamanho das costas e sobem, abrindo um pouco para os lados
    ps.minEmitBox.set(-0.18, -0.22, -0.08)
    ps.maxEmitBox.set(0.18, 0.22, 0.08)
    ps.direction1.set(-0.35, 1, -0.35)
    ps.direction2.set(0.35, 1.6, 0.35)
    const c = PALETTE[kind]
    ps.color1 = c.hot
    ps.color2 = c.deep
    ps.colorDead = c.dead
    ps.minSize = 0.05
    ps.maxSize = 0.14
    ps.minLifeTime = 0.7
    ps.maxLifeTime = 1.5
    ps.minEmitPower = 0.25
    ps.maxEmitPower = 0.7
    ps.gravity.set(0, 0.6, 0)
    ps.minAngularSpeed = -2
    ps.maxAngularSpeed = 2
    ps.emitRate = 0
    ps.start()
    const meshes = bodyOf(char)
    return { kind, char, ps, at, last: at.clone(), speed: 0, meshes, shells: light(meshes, this.rim(kind)) }
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
