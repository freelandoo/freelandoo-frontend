// Depois do pagamento: o holograma rosa aparece no pedestal do Coliseu, a linha sobe
// pelo corpo deixando o personagem com a cor da textura e ele "voa" para a vitrine.
// Roda sem câmera (a pessoa volta do Mercado Pago numa página nova).

import * as THREE from "three"
import { HOLO_ACCENT, HOLO_COLOR, type Hologram as HologramItem } from "./catalog"
import { Hologram } from "./hologram"
import { coverLayout } from "./pedestal-viewer"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type MaterializeStage = "hologram" | "solidifying" | "solid" | "taking"

/**
 * Monta a cena em `host` (que já mostra o Coliseu de fundo) e resolve quando o
 * personagem entrou na vitrine. Abortar desmonta a cena na hora e a promessa
 * fica pendente (quem abortou não espera mais por ela).
 */
export async function materialize(
  host: HTMLElement,
  item: HologramItem,
  opts: { reduced: boolean; onStage: (s: MaterializeStage) => void; signal?: AbortSignal },
): Promise<void> {
  const canvas = document.createElement("canvas")
  canvas.className = "cvra-mat-canvas"
  host.appendChild(canvas)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100)
  const anchor = new THREE.Group()
  scene.add(anchor)

  const layout = () => {
    const W = host.clientWidth || window.innerWidth
    const H = host.clientHeight || window.innerHeight
    renderer.setSize(W, H, false)
    coverLayout(W, H, camera, anchor)
  }
  const ro = new ResizeObserver(layout)
  ro.observe(host)
  layout()

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    ro.disconnect()
    renderer.setAnimationLoop(null)
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }
  opts.signal?.addEventListener("abort", dispose, { once: true })
  const step = async <T>(p: Promise<T>) => {
    const v = await p
    if (opts.signal?.aborted) await new Promise(() => {})
    return v
  }

  try {
    const h = new Hologram({ color: HOLO_COLOR, accent: HOLO_ACCENT, heightMeters: 1 })
    await step(h.load(item.model, item.faceFront))
    h.autoRotate = !opts.reduced
    anchor.add(h.group)
    const clock = new THREE.Clock()
    renderer.setAnimationLoop(() => {
      h.update(Math.min(clock.getDelta(), 0.1))
      renderer.render(scene, camera)
    })

    h.resetSolid()
    h.appear()
    opts.onStage("hologram")
    await step(wait(opts.reduced ? 600 : 3000))
    opts.onStage("solidifying")
    await step(h.solidify())
    opts.onStage("solid")
    navigator.vibrate?.([20, 40, 20])
    await step(wait(opts.reduced ? 600 : 1800))
    opts.onStage("taking")
    await step(h.take())
  } finally {
    dispose()
  }
}
