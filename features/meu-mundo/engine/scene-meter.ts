// features/meu-mundo/engine/scene-meter.ts — o medidor único de cena.
//
// Auditoria visual V0 (2026-11-09). Antes cada área tinha a sua sonda
// (`__mmPerf` no bairro, `__jetPerf` no Jetpack, a do interior…), cada uma com
// números diferentes. Esta devolve a FICHA DO PLANO (`MEU MUNDO 3D/planos/
// 2026-11-09-auditoria-visual-e-desempenho.md`) para qualquer cena:
// triângulos à vista · chamadas de desenho · materiais · memória de textura ·
// FPS · tempo de carga · MB baixados — e diz ONDE mediu (GPU, tela, toque),
// porque número de PC não vale como número de celular.
//
// Uso: `window.__mmScene()` no console ou no harness (Playwright
// `page.evaluate(() => __mmScene())`). `?mmscene=1` na URL liga um quadrinho
// no canto. Custo sem pedido: zero — nada roda por quadro; a leitura percorre
// as listas da cena só quando alguém chama.
//
// Instalação: o `ResolutionGovernor` (quality.ts), que toda cena do jogo cria,
// chama `markSceneStart(engine)` e registra a sonda do perfil (`quality` na ficha:
// perfil, FPS médio, p95, CPU por quadro — visual premium E7); o harness pode chamar direto.
// Com `?mmscene=1`, `window.__mmLag = ms` atrasa cada quadro (prova do automático).

import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine"
import { EngineStore } from "@babylonjs/core/Engines/engineStore"
import type { Scene } from "@babylonjs/core/scene"
import type { Material } from "@babylonjs/core/Materials/material"
import type { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture"
import type { QualityStats } from "./quality"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"

/** O pedaço da luz que o medidor lê (sem puxar o código de sombra para o pacote). */
type ShadowLight = { getShadowGenerator?: () => { getShadowMap(): { renderList: AbstractMesh[] | null } | null } | null }

/** O governador de qualidade (quality.ts) da cena: perfil, FPS médio, p95 e CPU por quadro. */
export type QualityProbe = () => QualityStats

export interface SceneSheet {
  /** Onde foi medido: "celular" (tela de toque) ou "pc", a GPU e a tela. */
  device: "celular" | "pc"
  gpu: string
  viewport: string
  dpr: number
  /** Escala de desenho aplicada (1 = resolução cheia da tela × dpr do perfil). */
  renderScale: number
  triangles: number
  drawCalls: number
  activeMeshes: number
  /** Materiais distintos nas malhas à vista. */
  materials: number
  /** Texturas distintas carregadas na GPU (a cena inteira, não só a vista). */
  textures: number
  /** Estimativa: largura × altura × bytes por pixel (1 se comprimida, 4 se RGBA), +33% com mipmaps. */
  textureMB: number
  compressedTextures: number
  fps: number
  frameMs: number
  particles: number
  heapMB: number | null
  /** Arquivos de arte (GLB, textura, decodificador) pedidos desde o início da cena. */
  downloads: number
  downloadMB: number
  /** Do início da cena até o último desses arquivos terminar de chegar. */
  loadMs: number | null
  /** Perfil e medidas da janela de 5 s do governador (E7); null na cena sem governador. */
  quality: QualityStats | null
}

const born = new WeakMap<AbstractEngine, number>()
const probes = new WeakMap<AbstractEngine, QualityProbe>()

/** O governador registra a sua leitura (uma por motor). */
export function setQualityProbe(engine: AbstractEngine, probe: QualityProbe) {
  probes.set(engine, probe)
}

/** Marca o início da cena (para tempo de carga e MB baixados) e instala `window.__mmScene`. */
export function markSceneStart(engine: AbstractEngine) {
  if (typeof performance !== "undefined") born.set(engine, performance.now())
  installSceneMeter()
}

/**
 * Chamadas de desenho por quadro, contadas pelo que está à vista: cada malha
 * ativa desenha as suas submalhas; cópias instanciadas de uma mesma malha vão
 * numa chamada só; cada sistema de partículas ativo é mais uma. (O contador do
 * Babylon não roda com o laço de render manual deste jogo.)
 */
export function countDrawCalls(scene: Scene) {
  const seen = new Set<unknown>()
  let n = 0
  for (const m of scene.getActiveMeshes().data) {
    if (!m) continue
    const src = (m as unknown as { sourceMesh?: unknown }).sourceMesh ?? m
    if (seen.has(src)) continue
    seen.add(src)
    // nó sem malha (o `__root__` de todo glTF) entra na lista e não desenha nada
    if (!m.getTotalVertices()) continue
    n += Math.max(1, m.subMeshes?.length ?? 1)
  }
  for (const ps of scene.particleSystems) if (ps.isStarted() && ps.getActiveCount() > 0) n++
  // passe de sombra (char-shadows.ts, só no high): uma chamada por pedaço de quem lança
  for (const l of scene.lights) {
    const list = (l as unknown as ShadowLight).getShadowGenerator?.()?.getShadowMap()?.renderList
    if (list) for (const m of list) if (m.isEnabled()) n += Math.max(1, m.subMeshes?.length ?? 1)
  }
  return n
}

// Formatos comprimidos de GPU têm constante GL acima de 0x8000 (S3TC 0x83F0,
// BC7 0x8E8C, ETC2 0x9274, ASTC 0x93B0); os do Babylon sem compressão são < 100.
const isCompressed = (t: InternalTexture) => t.format > 0x8000 || !!t._compression
const BYTES_BY_TYPE: Record<number, number> = { 1: 16, 2: 8 } // FLOAT, HALF_FLOAT (RGBA)

function textureMemory(scene: Scene) {
  const seen = new Set<InternalTexture>()
  let bytes = 0
  let compressed = 0
  for (const tex of scene.textures) {
    const it = tex.getInternalTexture()
    if (!it || seen.has(it) || !it.width || !it.height) continue
    seen.add(it)
    const comp = isCompressed(it)
    if (comp) compressed++
    const bpp = comp ? 1 : (BYTES_BY_TYPE[it.type] ?? 4)
    const faces = it.isCube ? 6 : 1
    const depth = Math.max(1, it.depth || 1)
    bytes += it.width * it.height * bpp * faces * depth * (it.generateMipMaps ? 1.33 : 1)
  }
  return { count: seen.size, mb: Math.round((bytes / 1048576) * 10) / 10, compressed }
}

/** As maiores texturas da cena (auditoria: de onde vem a memória). */
function textureList(scene: Scene, top: number) {
  const seen = new Set<InternalTexture>()
  const rows: { name: string; size: string; mb: number; ktx: boolean }[] = []
  for (const tex of scene.textures) {
    const it = tex.getInternalTexture()
    if (!it || seen.has(it) || !it.width || !it.height) continue
    seen.add(it)
    const comp = isCompressed(it)
    const bpp = comp ? 1 : (BYTES_BY_TYPE[it.type] ?? 4)
    const mb = (it.width * it.height * bpp * (it.isCube ? 6 : 1) * Math.max(1, it.depth || 1) * (it.generateMipMaps ? 1.33 : 1)) / 1048576
    rows.push({ name: (tex.name || it.url || tex.getClassName()).slice(-80), size: `${it.width}x${it.height}`, mb: Math.round(mb * 100) / 100, ktx: comp })
  }
  return rows.sort((a, b) => b.mb - a.mb).slice(0, top)
}

const ART = /\.(glb|gltf|ktx2|webp|png|jpe?g|wasm|bin)(\?|$)|\/meu-mundo\//i

function downloads(since: number) {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return { n: 0, mb: 0, loadMs: null }
  let n = 0
  let bytes = 0
  let end = 0
  for (const e of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    if (e.startTime < since || !ART.test(e.name)) continue
    n++
    bytes += e.encodedBodySize || e.transferSize || 0
    end = Math.max(end, e.responseEnd)
  }
  return { n, mb: Math.round((bytes / 1048576) * 100) / 100, loadMs: n ? Math.round(end - since) : null }
}

/** A cena que está sendo desenhada agora: com câmera, e a que mais tem malha à vista. */
function activeScene(): { scene: Scene; engine: AbstractEngine } | null {
  let best: { scene: Scene; engine: AbstractEngine; n: number } | null = null
  for (const engine of EngineStore.Instances) {
    for (const scene of engine.scenes) {
      if (!scene.activeCamera || scene.isDisposed) continue
      const n = scene.getActiveIndices()
      if (!best || n > best.n) best = { scene, engine, n }
    }
  }
  return best
}

export function measureScene(scene: Scene, engine: AbstractEngine): SceneSheet {
  const mats = new Set<Material>()
  for (const m of scene.getActiveMeshes().data) {
    const mat = m?.material
    if (!mat) continue
    const subs = (mat as unknown as { subMaterials?: (Material | null)[] }).subMaterials
    if (subs) for (const s of subs) { if (s) mats.add(s) }
    else mats.add(mat)
  }
  const tex = textureMemory(scene)
  let particles = 0
  for (const ps of scene.particleSystems) particles += ps.getActiveCount()
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
  const dl = downloads(born.get(engine) ?? 0)
  const gl = (engine as unknown as { getGlInfo?: () => { renderer: string } }).getGlInfo?.()
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches
  const dt = engine.getDeltaTime()
  return {
    device: touch ? "celular" : "pc",
    gpu: gl?.renderer ?? "?",
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "?",
    dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    renderScale: Math.round((1 / engine.getHardwareScalingLevel()) * 100) / 100,
    triangles: Math.round(scene.getActiveIndices() / 3),
    drawCalls: countDrawCalls(scene),
    activeMeshes: scene.getActiveMeshes().length,
    materials: mats.size,
    textures: tex.count,
    textureMB: tex.mb,
    compressedTextures: tex.compressed,
    fps: Math.round(engine.getFps()),
    frameMs: Math.round(dt * 10) / 10,
    particles,
    heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    downloads: dl.n,
    downloadMB: dl.mb,
    loadMs: dl.loadMs,
    quality: probes.get(engine)?.() ?? null,
  }
}

let installed = false

/** `window.__mmScene()` mede a cena ativa; `?mmscene=1` mostra o quadrinho. Idempotente. */
export function installSceneMeter() {
  if (installed || typeof window === "undefined") return
  installed = true
  const w = window as unknown as { __mmScene?: () => SceneSheet | null; __mmTextures?: (top?: number) => unknown }
  w.__mmTextures = (top = 20) => {
    const a = activeScene()
    return a ? textureList(a.scene, top) : null
  }
  w.__mmScene = () => {
    const a = activeScene()
    return a ? measureScene(a.scene, a.engine) : null
  }
  if (!/[?&]mmscene=1/.test(window.location.search)) return
  const box = document.createElement("div")
  box.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:99999;pointer-events:none;font:11px/1.35 monospace;color:#9ff;background:rgba(0,0,0,.65);padding:4px 6px;white-space:pre"
  box.dataset.mmScene = "1"
  document.body.appendChild(box)
  const NAME: Record<string, string> = { low: "LOW", mid: "MEDIUM", high: "HIGH" }
  setInterval(() => {
    const s = w.__mmScene?.()
    if (!s) {
      box.textContent = "sem cena"
      return
    }
    const q = s.quality
    const head = q
      ? `${NAME[q.tier]}${q.choice === "auto" ? " (auto)" : " (manual)"} ${q.state}${q.upLocked ? " ⊘↑" : ""}  esc ${q.ratio}
` +
        `${q.fpsAvg} fps méd  p95 ${q.p95Ms} ms  meta ${q.targetFps}
` +
        `cpu ${q.cpuMs} ms (p95 ${q.cpuP95Ms})  ruim ${q.bad} folga ${q.good}${q.last ? `
troca ${q.changes}: ${q.last}` : ""}
`
      : `${s.fps} fps ${s.frameMs} ms  esc ${s.renderScale}
`
    box.textContent =
      head +
      `${Math.round(s.triangles / 1000)}k tri  ${s.drawCalls} draw  ${s.materials} mat  ${s.activeMeshes} malhas
` +
      `tex ${s.textures} (${s.compressedTextures} ktx) ~${s.textureMB} MB  part ${s.particles}
` +
      `${s.downloadMB} MB em ${s.downloads} arq${s.loadMs !== null ? `  ${(s.loadMs / 1000).toFixed(1)} s` : ""}`
  }, 500)
}
