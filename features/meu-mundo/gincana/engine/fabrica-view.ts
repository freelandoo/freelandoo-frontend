// features/meu-mundo/gincana/engine/fabrica-view.ts — Fábrica de Engrenagens em andares (2026-11-20): a bacia
// de lava de cada andar. O Alex: "a plataforma vai descendo e quando só sobram dois é engolida pelo rio de fogo;
// o rio vai subindo conforme menos pessoas lá na plataforma". O nível vem do simulador (RunWorld.floorLv: 0 =
// parada a FLOOR_LAVA m abaixo do chão; 0,55 = rente à borda quando todos menos 2 subiram; 1 = cobriu o andar e
// os 2 últimos). A bacia é um tacho de aço com cinta amarela de perigo, preso em quatro colunas até o mar de
// lava; a lava é um tampo aceso (o material que brilha) que borbulha.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { FLOOR_LAVA, type Course } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const STEEL: RGB = [0.16, 0.15, 0.15]
const STEEL_L: RGB = [0.42, 0.4, 0.38]
const RUST: RGB = [0.46, 0.24, 0.12]
const HAZ_Y: RGB = [0.95, 0.72, 0.08]
const HAZ_K: RGB = [0.06, 0.06, 0.06]
const LAVA_D: RGB = [0.75, 0.16, 0.02]
const LAVA_L: RGB = [1, 0.62, 0.12]

/** Meia largura (x) e meio comprimento (z) da bacia: o andar tem 12 × 12; sobra um vão de lava em volta. */
const BX = 16
const BZ = 14.5
/** Até onde a lava sobe quando engole o andar (acima do chão). */
const OVER = 2.6

export class FabricaLava {
  private readonly meshes: Mesh[] = []
  private readonly pools: { mesh: Mesh; y: number; lv: number }[] = []
  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    const floors = (course.floors ?? []).filter((f) => f.r > 0)
    for (const f of floors) {
      const y0 = f.y - FLOOR_LAVA - 1.2
      const top = f.y + 0.5
      const h = top - y0
      const cy = (top + y0) / 2
      // o tacho: fundo, quatro paredes, a borda clara e a cinta de perigo em listras
      st.box(BX * 2, 0.6, BZ * 2, at(f.x, y0 - 0.3, f.z), STEEL)
      for (const s of [-1, 1]) {
        st.box(0.6, h, BZ * 2 + 0.6, at(f.x + s * BX, cy, f.z), (x, y, z) => wornSteel(x + f.x, y, z + f.z))
        st.box(BX * 2 + 0.6, h, 0.6, at(f.x, cy, f.z + s * BZ), (x, y, z) => wornSteel(x + f.x, y, z + f.z))
        st.box(0.9, 0.25, BZ * 2 + 1, at(f.x + s * BX, top + 0.1, f.z), STEEL_L)
        st.box(BX * 2 + 1, 0.25, 0.9, at(f.x, top + 0.1, f.z + s * BZ), STEEL_L)
      }
      const n = 14
      for (let i = 0; i < n; i++) {
        const c = i % 2 ? HAZ_K : HAZ_Y
        const ux = -BX + ((i + 0.5) / n) * BX * 2
        const uz = -BZ + ((i + 0.5) / n) * BZ * 2
        for (const s of [-1, 1]) {
          st.box((BX * 2) / n, 0.5, 0.1, at(f.x + ux, top - 0.6, f.z + s * (BZ + 0.33)), c)
          st.box(0.1, 0.5, (BZ * 2) / n, at(f.x + s * (BX + 0.33), top - 0.6, f.z + uz), c)
        }
      }
      // colunas até o mar de lava, com a lâmpada de aviso em cima de cada canto
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const cx = f.x + sx * (BX - 1)
          const cz = f.z + sz * (BZ - 1)
          if (y0 > 0.5) {
            st.cylinder(1.1, y0 + 2, at(cx, (y0 - 2) / 2, cz), STEEL, 10)
            st.box(1.4, 0.3, 1.4, at(cx, y0 - 0.75, cz), STEEL_L)
          }
          glow.sphere(0.55, at(f.x + sx * BX, top + 0.5, f.z + sz * BZ), LAVA_L, 8)
        }
      // a lava: tampo com manchas claras (o brilho é do material)
      const lava = new SoftGeo()
      // ladrilhos de 2 m, cada um com o seu tom (a mancha clara corre em veios)
      const nx = 16
      const nz = 14
      const wx = (BX * 2 - 0.4) / nx
      const wz = (BZ * 2 - 0.4) / nz
      for (let ix = 0; ix < nx; ix++)
        for (let iz = 0; iz < nz; iz++) {
          const x = -BX + 0.2 + (ix + 0.5) * wx
          const z = -BZ + 0.2 + (iz + 0.5) * wz
          const k = Math.sin(x * 0.45 + z * 0.3 + f.z) * Math.cos(z * 0.55 - x * 0.2)
          lava.box(wx, 0.3 + (ix + iz) % 3 * 0.05, wz, at(x, 0, z), mix(LAVA_D, LAVA_L, Math.max(0, k) * 0.95))
        }
      this.pools.push({ mesh: lava.build("fabrica-lava", scene, glowMat, false), y: f.y, lv: -1 })
      this.pools[this.pools.length - 1].mesh.position.set(f.x, f.y - FLOOR_LAVA, f.z)
    }
    this.meshes.push(st.build("fabrica-static", scene, toy, true))
    this.meshes.push(glow.build("fabrica-static-glow", scene, glowMat, true))
    for (const p of this.pools) this.meshes.push(p.mesh)
  }

  /** Nível de cada andar (RunWorld.floorLv); a lava sobe suave e borbulha. */
  update(clock: number, lv: Float64Array) {
    for (let i = 0; i < this.pools.length; i++) {
      const p = this.pools[i]
      const goal = lv[i] ?? 0
      p.lv = p.lv < 0 ? goal : p.lv + (goal - p.lv) * 0.06
      const y = p.y - FLOOR_LAVA + (FLOOR_LAVA + OVER) * p.lv
      p.mesh.position.y = y + Math.sin(clock * 1.7 + i) * 0.08
    }
  }

  dispose() {
    for (const m of this.meshes) m.dispose()
  }
}

function wornSteel(x: number, y: number, z: number): RGB {
  const r = Math.sin(x * 0.9 + z * 0.37 + y * 0.5) * Math.cos(z * 0.53 - x * 0.21)
  return r > 0.7 ? mix(STEEL, RUST, 0.55) : STEEL
}
