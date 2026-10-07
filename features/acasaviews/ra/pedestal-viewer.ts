// Personagem no pedestal do Coliseu: imagem de fundo (object-fit: cover) com o
// modelo sólido girando em cima do pedestal. Arrastar gira (com inércia); parado
// por um tempo, volta a girar sozinho.
//
// O canvas é transparente por cima da imagem; posição e escala do modelo saem do
// recorte "cover" da imagem, então os pés ficam no pedestal em qualquer proporção
// de tela. Porte da câmara branca do Astronalta.

import * as THREE from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { COLISEU } from "./catalog"
import { loadModel } from "./model"

const FOV = 24

function contactShadow() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:
      "varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(0.05, 0.0, 0.02, a * a * 0.6); }",
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2), mat)
  m.position.y = 0.002
  return m
}

/** Câmera e âncora (pés) a partir do recorte "cover" do Coliseu. Usado também pela materialização. */
export function coverLayout(W: number, H: number, camera: THREE.PerspectiveCamera, anchor: THREE.Object3D) {
  const s = Math.max(W / COLISEU.w, H / COLISEU.h)
  const feetX = (W - COLISEU.w * s) / 2 + COLISEU.feetX * s
  const feetY = (H - COLISEU.h * s) / 2 + COLISEU.feetY * s
  const figurePx = COLISEU.figure * s
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const dist = H / (figurePx * 2 * tan)
  camera.aspect = W / H
  camera.position.set(0, 0, dist)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  anchor.position.set((feetX - W / 2) / figurePx, -(feetY - H / 2) / figurePx, 0)
}

export class PedestalViewer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
  private pivot = new THREE.Group()
  private spin = new THREE.Group()
  private clock = new THREE.Clock()
  private velocity = 0
  private idle = 4
  private enter = 0
  private dragging = false
  private lastX = 0
  private ro: ResizeObserver
  private disposed = false

  constructor(
    private canvas: HTMLCanvasElement,
    private reduced: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    const key = new THREE.DirectionalLight(0xffffff, 1.5)
    key.position.set(1.5, 3, 2.5)
    // o neon do Coliseu banha o personagem por trás e por baixo
    const rim = new THREE.DirectionalLight(0xff007a, 2.6)
    rim.position.set(-2, 1.5, -2)
    const bounce = new THREE.DirectionalLight(0xff2b91, 0.8)
    bounce.position.set(0.5, -1, 1.5)
    this.scene.add(key, rim, bounce)

    this.pivot.add(this.spin, contactShadow())
    this.scene.add(this.pivot)

    this.bindDrag()
    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(canvas)
    this.layout()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  async show(modelUrl: string, faceFront: number) {
    const model = await loadModel(modelUrl)
    if (this.disposed) return
    this.spin.clear()
    this.spin.add(model.clone())
    this.spin.rotation.y = faceFront
    this.enter = this.reduced ? 1 : 0
    this.idle = 4
  }

  private bindDrag() {
    const c = this.canvas
    c.addEventListener("pointerdown", (e) => {
      this.dragging = true
      this.lastX = e.clientX
      this.velocity = 0
      c.setPointerCapture(e.pointerId)
    })
    c.addEventListener("pointermove", (e) => {
      if (!this.dragging) return
      const dx = e.clientX - this.lastX
      this.lastX = e.clientX
      const r = dx * 0.012
      this.spin.rotation.y += r
      this.velocity = r * 60
      this.idle = 0
    })
    const up = () => (this.dragging = false)
    c.addEventListener("pointerup", up)
    c.addEventListener("pointercancel", up)
  }

  private layout() {
    const W = this.canvas.clientWidth || window.innerWidth
    const H = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(W, H, false)
    coverLayout(W, H, this.camera, this.pivot)
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1)
    if (!this.dragging) {
      this.idle += dt
      this.velocity *= Math.exp(-dt * 3)
      const auto = this.idle > 2.5 && !this.reduced ? 0.5 : 0
      this.spin.rotation.y += (this.velocity + auto * Math.min(1, (this.idle - 2.5) / 1.5)) * dt
    }
    if (this.enter < 1) {
      this.enter = Math.min(1, this.enter + dt / 0.9)
      const e = 1 - Math.pow(1 - this.enter, 3)
      this.spin.scale.setScalar(0.6 + 0.4 * e)
      this.spin.position.y = (1 - e) * 0.35
      this.spin.rotation.y += (1 - e) * dt * 9
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.ro.disconnect()
    this.renderer.setAnimationLoop(null)
    this.scene.environment?.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
