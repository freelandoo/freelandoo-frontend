// lib/lives/filtered-camera.ts
// Câmera ao vivo COM filtros: pega getUserMedia, passa cada frame pelo
// CameraRenderer (WebGL2, mesmos presets das Stories/Bees) e expõe o canvas
// como um MediaStreamTrack publicável no LiveKit. Se o WebGL falhar, cai de
// volta pro track cru da câmera (sem filtro) — a live nunca quebra por causa do
// filtro.

import { CameraRenderer } from "@/lib/camera/renderer"
import { getPreset, DEFAULT_PRESET_ID } from "@/lib/camera/presets"
import { NEUTRAL_OVERLAY } from "@/lib/camera/types"

export type Facing = "user" | "environment"

export class FilteredCamera {
  readonly canvas: HTMLCanvasElement
  private video: HTMLVideoElement
  private renderer: CameraRenderer | null = null
  private raf = 0
  private stream: MediaStream | null = null
  private captured: MediaStream | null = null
  private facing: Facing = "user"
  private presetId = DEFAULT_PRESET_ID
  private _hasVideo = false
  private _hasAudio = false

  constructor() {
    this.canvas = document.createElement("canvas")
    this.canvas.width = 720
    this.canvas.height = 1280
    this.video = document.createElement("video")
    this.video.muted = true
    this.video.playsInline = true
  }

  get usingFilters(): boolean {
    return this.renderer !== null
  }

  // Tenta câmera+mic; se não houver câmera, cai pra só áudio; se não houver nem
  // mic, abre sem mídia (dá pra fazer uma live só de chat/presentes). NUNCA
  // lança por falta de dispositivo — a live degrada com elegância.
  async start(facing: Facing = "user") {
    this.facing = facing
    const tryGet = async (constraints: MediaStreamConstraints) => {
      try { return await navigator.mediaDevices.getUserMedia(constraints) } catch { return null }
    }

    // 1) câmera + mic
    this.stream = await tryGet({
      video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    // 2) só mic (sem câmera)
    if (!this.stream) this.stream = await tryGet({ video: false, audio: true })
    // 3) sem mídia nenhuma — live só de chat/presentes
    if (!this.stream) this.stream = new MediaStream()

    this._hasVideo = this.stream.getVideoTracks().length > 0
    this._hasAudio = this.stream.getAudioTracks().length > 0

    if (!this._hasVideo) {
      // Sem câmera → nada de renderer/canvas; preview fica vazio.
      this.renderer = null
      this.captured = null
      return
    }

    this.video.srcObject = this.stream
    await this.video.play().catch(() => { /* autoplay ok com muted */ })

    try {
      this.renderer = new CameraRenderer(this.canvas, getPreset(this.presetId).filter, NEUTRAL_OVERLAY)
      this.renderer.setFlipX(facing === "user")
      const loop = () => {
        if (this.renderer) this.renderer.renderFrame(this.video)
        this.raf = requestAnimationFrame(loop)
      }
      this.raf = requestAnimationFrame(loop)
      this.captured = this.canvas.captureStream(30)
    } catch {
      // WebGL indisponível → segue sem filtro (track cru da câmera).
      this.renderer = null
      this.captured = null
    }
  }

  get hasVideo(): boolean { return this._hasVideo }
  get hasAudio(): boolean { return this._hasAudio }

  setPreset(id: string) {
    this.presetId = id
    this.renderer?.setFilter(getPreset(id).filter)
  }

  get presetIdValue(): string {
    return this.presetId
  }

  // Track de vídeo a publicar: canvas filtrado, ou cru no fallback.
  get videoTrack(): MediaStreamTrack | null {
    if (this.captured) return this.captured.getVideoTracks()[0] || null
    return this.stream?.getVideoTracks()[0] || null
  }

  get audioTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] || null
  }

  // MediaStream para o <video> de preview (mostra exatamente o que vai ao ar).
  get previewStream(): MediaStream | null {
    const v = this.videoTrack
    return v ? new MediaStream([v]) : null
  }

  // Troca câmera frontal ↔ traseira SEM trocar o track publicado (o canvas
  // continua o mesmo; só muda a fonte que alimenta o renderer/preview).
  async switchFacing(): Promise<Facing> {
    if (!this._hasVideo) return this.facing
    const next: Facing = this.facing === "user" ? "environment" : "user"
    const cam = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: next, width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: false,
    })
    const newVideo = cam.getVideoTracks()[0]
    if (this.stream && newVideo) {
      const oldVideo = this.stream.getVideoTracks()[0]
      if (oldVideo) { this.stream.removeTrack(oldVideo); oldVideo.stop() }
      this.stream.addTrack(newVideo)
      this.video.srcObject = this.stream
      await this.video.play().catch(() => {})
    }
    this.renderer?.setFlipX(next === "user")
    this.facing = next
    return next
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    try { this.renderer?.dispose() } catch { /* ignore */ }
    this.renderer = null
    this.captured?.getTracks().forEach((t) => t.stop())
    this.captured = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.video.srcObject = null
  }
}
