// Sessão de RA da Casa Views (carregada sob demanda). Porte da RA do Astronalta.
//
// 1. Rastreamento da figura impressa (MindAR): o holograma rosa só existe enquanto a
//    câmera reconhece a arte, e fica de pé sobre ela. Nada da arte é desenhado.
// 2. Sem câmera (computador, permissão negada): prévia do holograma na tela.
//
// COLECIONAR não compra aqui: chama `onCollect` e a página abre o modal de
// pagamento por cima (a câmera segue ligada atrás).

import * as THREE from "three"
import { HOLO_ACCENT, HOLO_COLOR, MINDAR_LIB, type Hologram as HologramItem } from "./catalog"
import { Hologram } from "./hologram"

interface MindArUpdate {
  type: "updateMatrix" | "processDone"
  targetIndex?: number
  worldMatrix?: number[] | null
}

interface MindArController {
  inputWidth: number
  inputHeight: number
  worker?: Worker
  addImageTargets(url: string): Promise<{ dimensions: [number, number][] }>
  dummyRun(input: HTMLVideoElement): void
  processVideo(input: HTMLVideoElement): void
  stopProcessVideo(): void
  dispose(): void
  getProjectionMatrix(): number[]
}

interface MindArModule {
  Controller: new (opts: {
    inputWidth: number
    inputHeight: number
    maxTrack?: number
    filterMinCF?: number
    filterBeta?: number
    onUpdate?: (d: MindArUpdate) => void
  }) => MindArController
}

let libPromise: Promise<MindArModule> | null = null
function loadMindAr() {
  const href = new URL(MINDAR_LIB, location.href).href
  libPromise ??= (import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href) as Promise<MindArModule>).catch(
    (e: unknown) => {
      libPromise = null
      throw e
    },
  )
  return libPromise
}

// Holograma sai da arte: fica um pouco à frente do papel/tela.
const OUT_Z = 0.03

export interface ArSession {
  close(): void
  /** O modal de pagamento abriu/fechou por cima. */
  setBlocked(v: boolean): void
}

export interface ArOptions {
  item: HologramItem
  owned: boolean
  reduced: boolean
  onCollect: () => void
  onOwnedTap: () => void
  onClose: () => void
  /** classes das fontes da seção (a sessão é montada fora do layout) */
  fontClass?: string
}

function attachGestures(el: HTMLElement, onRotate: (r: number) => void, onScale: (f: number) => void) {
  const pts = new Map<number, { x: number; y: number }>()
  let last = 0
  const dist = () => {
    const [a, b] = [...pts.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  el.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("button, a")) return
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.size === 2) last = dist()
  })
  el.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId)
    if (!p) return
    const dx = e.clientX - p.x
    p.x = e.clientX
    p.y = e.clientY
    if (pts.size === 1) onRotate(dx * 0.012)
    else if (pts.size === 2) {
      const d = dist()
      if (last > 0) onScale(d / last)
      last = d
    }
  })
  const up = (e: PointerEvent) => {
    pts.delete(e.pointerId)
    last = pts.size === 2 ? dist() : 0
  }
  el.addEventListener("pointerup", up)
  el.addEventListener("pointercancel", up)
}

export async function openArSession(opts: ArOptions): Promise<ArSession> {
  const { item } = opts
  const root = document.createElement("div")
  root.className = `cvra ${opts.fontClass ?? ""}`
  root.innerHTML = `
    <video class="cvra-video" playsinline muted hidden></video>
    <canvas class="cvra-canvas" aria-hidden="true"></canvas>
    <div class="cvra-ui">
      <header class="cvra-top">
        <button class="cvra-icon" data-a="close" type="button" aria-label="Fechar a RA">✕</button>
        <span class="cvra-chip">RA // CASA VIEWS</span>
      </header>
      <div class="cvra-frame" aria-hidden="true" hidden><i></i><i></i><i></i><i></i></div>
      <p class="cvra-hint" aria-live="polite"></p>
      <button class="cvra-collect" data-a="collect" type="button" hidden><span>COLECIONAR</span></button>
    </div>
    <div class="cvra-loading"><i></i><span>PREPARANDO A CÂMERA…</span></div>`
  document.body.appendChild(root)
  document.documentElement.classList.add("cvra-open")

  const video = root.querySelector<HTMLVideoElement>(".cvra-video")!
  const canvas = root.querySelector<HTMLCanvasElement>(".cvra-canvas")!
  const hint = root.querySelector<HTMLElement>(".cvra-hint")!
  const loading = root.querySelector<HTMLElement>(".cvra-loading")!
  const frame = root.querySelector<HTMLElement>(".cvra-frame")!
  const collectBtn = root.querySelector<HTMLButtonElement>("[data-a=collect]")!
  const setHint = (s: string) => (hint.textContent = s)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1e6)
  const clock = new THREE.Clock()
  const anchor = new THREE.Group()
  anchor.matrixAutoUpdate = false

  let closed = false
  let blocked = false
  let mode: "loading" | "track" | "preview" = "loading"
  let found = false
  let stream: MediaStream | null = null
  let controller: MindArController | null = null
  let posts: THREE.Matrix4[] = []
  let tracked = -1
  let hologram: Hologram | null = null

  const syncUi = () => {
    const visible = mode === "preview" || found
    frame.hidden = mode !== "track" || found
    collectBtn.hidden = !visible || blocked
    collectBtn.classList.toggle("is-owned", opts.owned)
    collectBtn.querySelector("span")!.textContent = opts.owned ? "NA SUA VITRINE ✓" : "COLECIONAR"
    if (mode === "track" && !found) setHint("Aponte a câmera para a figura do lutador")
    else if (opts.owned) setHint("Este holograma já é seu. Toque para vê-lo no Coliseu.")
    else if (mode === "preview") setHint("Câmera indisponível: veja o holograma aqui. Toque em COLECIONAR para levar.")
    else setHint("Ele apareceu. Toque em COLECIONAR para levar para a sua vitrine.")
  }

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    if (mode === "track" && controller) {
      // câmera virtual com o mesmo campo de visão do vídeo (object-fit: cover)
      const proj = controller.getProjectionMatrix()
      const videoRatio = controller.inputWidth / controller.inputHeight
      const shownH = videoRatio > w / h ? h : w / videoRatio
      camera.fov = (2 * Math.atan((1 / proj[5]) * (h / shownH)) * 180) / Math.PI
      camera.near = proj[14] / (proj[10] - 1)
      camera.far = proj[14] / (proj[10] + 1)
    } else if (mode === "preview" && hologram) {
      const H = hologram.heightMeters
      camera.fov = 40
      camera.near = 0.01
      camera.far = 60
      camera.position.set(0, H * 0.55, w / h < 1 ? H * 2.9 : H * 2.2)
      camera.lookAt(0, H * 0.48, 0)
    }
    camera.updateProjectionMatrix()
  }
  window.addEventListener("resize", resize)

  const close = () => {
    if (closed) return
    closed = true
    renderer.setAnimationLoop(null)
    window.removeEventListener("resize", resize)
    if (controller) {
      controller.stopProcessVideo()
      controller.dispose()
      controller.worker?.terminate()
    }
    stream?.getTracks().forEach((t) => t.stop())
    video.srcObject = null
    renderer.dispose()
    renderer.forceContextLoss()
    root.remove()
    document.documentElement.classList.remove("cvra-open")
    opts.onClose()
  }
  root.querySelector("[data-a=close]")!.addEventListener("click", close)
  collectBtn.addEventListener("click", () => {
    if (opts.owned) {
      close()
      opts.onOwnedTap()
      return
    }
    navigator.vibrate?.(20)
    opts.onCollect()
  })

  const session: ArSession = {
    close,
    setBlocked(v) {
      blocked = v
      if (!closed) syncUi()
    },
  }

  // Holograma (modelo baixa em paralelo à câmera).
  const hologramP = (async () => {
    const h = new Hologram({ color: HOLO_COLOR, accent: HOLO_ACCENT, heightMeters: 1 })
    await h.load(item.model, item.faceFront)
    return h
  })()

  try {
    hologram = await hologramP
  } catch (e) {
    close()
    throw e
  }
  if (closed) return session
  hologram.resetSolid()
  attachGestures(
    root,
    (r) => hologram?.rotateBy(r),
    (f) => hologram?.scaleBy(f),
  )

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1)
    hologram?.update(dt)
    renderer.render(scene, camera)
  })

  // 1) rastreamento da figura
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    if (closed) {
      stream.getTracks().forEach((t) => t.stop())
      return session
    }
    video.srcObject = stream
    video.muted = true
    await video.play()
    if (!video.videoWidth) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }))
    // O MindAR lê os atributos width/height do <video> (não videoWidth) para copiar o quadro.
    video.width = video.videoWidth
    video.height = video.videoHeight
    loading.querySelector("span")!.textContent = "CARREGANDO O RASTREAMENTO…"

    const { Controller } = await loadMindAr()
    const ctl = new Controller({
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      maxTrack: 1,
      // menos tremor que o padrão, ao custo de um pouco de atraso
      filterMinCF: 0.0001,
      filterBeta: 0.001,
      onUpdate: (d) => {
        if (d.type !== "updateMatrix" || d.targetIndex == null || !hologram) return
        const i = d.targetIndex
        if (d.worldMatrix) {
          anchor.matrix.fromArray(d.worldMatrix).multiply(posts[i])
          anchor.matrixWorldNeedsUpdate = true
          if (tracked === -1) {
            hologram.appear()
            navigator.vibrate?.(25)
            found = true
            syncUi()
          }
          tracked = i
        } else if (tracked === i) {
          tracked = -1
          hologram.hide()
          found = false
          syncUi()
        }
      },
    })
    controller = ctl
    const { dimensions } = await ctl.addImageTargets(new URL(item.target, location.href).href)
    // Pose do MindAR em pixels do alvo, origem no canto inferior esquerdo, z saindo da arte:
    // o holograma fica de pé sobre a figura impressa, do mesmo tamanho dela.
    posts = dimensions.map(([w, h]) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(w / 2, h * item.artFeet, h * OUT_Z),
        new THREE.Quaternion(),
        new THREE.Vector3().setScalar(h * item.artHeight),
      ),
    )
    ctl.dummyRun(video)
    if (closed) return session

    hologram.group.position.set(0, 0, 0)
    hologram.group.rotation.set(0, 0, 0)
    hologram.setUserScale(1)
    hologram.autoRotate = false
    hologram.hide()
    anchor.add(hologram.group)
    scene.add(anchor)
    camera.position.set(0, 0, 0)
    camera.quaternion.identity()
    video.hidden = false
    loading.hidden = true
    mode = "track"
    root.dataset.mode = "track"
    resize()
    syncUi()
    ctl.processVideo(video)
    return session
  } catch {
    if (controller) {
      controller.stopProcessVideo()
      controller.dispose()
      controller.worker?.terminate()
      controller = null
    }
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    video.srcObject = null
    video.hidden = true
    if (closed) return session
  }

  // 2) prévia sem câmera
  scene.add(hologram.group)
  hologram.group.position.set(0, 0, 0)
  hologram.group.rotation.set(0, 0, 0)
  hologram.setUserScale(1)
  hologram.autoRotate = !opts.reduced
  hologram.appear()
  loading.hidden = true
  mode = "preview"
  root.dataset.mode = "preview"
  resize()
  syncUi()
  return session
}
