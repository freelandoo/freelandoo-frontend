// lib/composer/renderer.ts
// Render do editor unificado: reusa EXATAMENTE o shader de cor da câmera
// (lib/camera/renderer.ts VERT/FRAG) sobre mídia IMPORTADA (imagem ou vídeo),
// com crop/zoom/pan explícitos. Saída num canvas 2D que o recorder lê (vídeo) ou
// que vira WebP (foto). Sem face/makeup (recursos exclusivos da câmera ao vivo).

import { VERT, FRAG, compile } from "@/lib/camera/renderer"
import type { FilterState } from "@/lib/camera/types"
import type { CropState } from "./types"

type Source = HTMLVideoElement | HTMLImageElement | ImageBitmap

function srcSize(src: Source): { w: number; h: number } {
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight }
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight }
  return { w: src.width, h: src.height }
}

export class ComposerRenderer {
  private out: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private glCanvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private tex: WebGLTexture
  private uloc: Record<string, WebGLUniformLocation | null> = {}
  private W = 720
  private H = 1280
  private filter: FilterState
  private crop: CropState
  private startTime = performance.now()

  constructor(output: HTMLCanvasElement, filter: FilterState, crop: CropState) {
    this.out = output
    this.filter = filter
    this.crop = crop
    const ctx = output.getContext("2d")
    if (!ctx) throw new Error("2D context indisponível")
    this.ctx = ctx

    this.glCanvas = document.createElement("canvas")
    const gl = (this.glCanvas.getContext("webgl2") ||
      this.glCanvas.getContext("webgl") ||
      this.glCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
    if (!gl) throw new Error("WebGL indisponível")
    this.gl = gl

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(program))
    }
    this.program = program
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    this.tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    for (const name of [
      "u_flipX", "u_uvScale", "u_uvOffset", "u_brightness", "u_contrast",
      "u_saturation", "u_temperature", "u_vignette", "u_grain", "u_mono",
      "u_tint", "u_tintStrength", "u_time", "u_tex",
      "u_skinSmooth", "u_faceCenter", "u_faceRadius", "u_blurStep",
    ]) {
      this.uloc[name] = gl.getUniformLocation(program, name)
    }
    gl.uniform1i(this.uloc.u_tex, 0)
    this.setSize(this.W, this.H)
  }

  setSize(w: number, h: number) {
    this.W = Math.max(2, Math.round(w))
    this.H = Math.max(2, Math.round(h))
    this.glCanvas.width = this.W
    this.glCanvas.height = this.H
    this.out.width = this.W
    this.out.height = this.H
    this.gl.viewport(0, 0, this.W, this.H)
  }

  setFilter(f: FilterState) { this.filter = f }
  setCrop(c: CropState) { this.crop = c }
  get size() { return { width: this.W, height: this.H } }
  get outputCanvas() { return this.out }

  /** Calcula a janela uv (cover-fit + zoom + pan) a partir do crop e do tamanho da fonte. */
  private uvWindow(src: Source): { sx: number; sy: number; ox: number; oy: number } {
    const { w, h } = srcSize(src)
    const sa = w / h || 1
    const ta = this.W / this.H
    // cover-fit em zoom 1
    let sx = 1, sy = 1
    if (sa > ta) sx = ta / sa
    else sy = sa / ta
    // zoom (janela menor = mais zoom)
    const z = Math.max(1, this.crop.zoom)
    sx /= z
    sy /= z
    // margem disponível p/ pan
    const mx = 1 - sx
    const my = 1 - sy
    const px = Math.max(-1, Math.min(1, this.crop.panX))
    const py = Math.max(-1, Math.min(1, this.crop.panY))
    const ox = (mx / 2) * (1 + px)
    const oy = (my / 2) * (1 + py)
    return { sx, sy, ox, oy }
  }

  /** Renderiza um frame da fonte (imagem ou vídeo) aplicando crop+cor. */
  render(src: Source) {
    const gl = this.gl
    const { w, h } = srcSize(src)
    if (!w || !h) return

    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src as TexImageSource)
    } catch {
      return // frame ainda não decodável
    }

    const { sx, sy, ox, oy } = this.uvWindow(src)
    const f = this.filter
    gl.uniform1f(this.uloc.u_flipX, 0)
    gl.uniform2f(this.uloc.u_uvScale, sx, sy)
    gl.uniform2f(this.uloc.u_uvOffset, ox, oy)
    gl.uniform1f(this.uloc.u_brightness, f.brightness)
    gl.uniform1f(this.uloc.u_contrast, f.contrast)
    gl.uniform1f(this.uloc.u_saturation, f.saturation)
    gl.uniform1f(this.uloc.u_temperature, f.temperature)
    gl.uniform1f(this.uloc.u_vignette, f.vignette)
    gl.uniform1f(this.uloc.u_grain, f.grain)
    gl.uniform1f(this.uloc.u_mono, f.mono)
    gl.uniform3f(this.uloc.u_tint, f.tint[0], f.tint[1], f.tint[2])
    gl.uniform1f(this.uloc.u_tintStrength, f.tintStrength)
    gl.uniform1f(this.uloc.u_time, (performance.now() - this.startTime) / 1000)
    // sem face/makeup no editor importado
    gl.uniform1f(this.uloc.u_skinSmooth, 0)
    gl.uniform2f(this.uloc.u_faceCenter, 0.5, 0.5)
    gl.uniform2f(this.uloc.u_faceRadius, 0.001, 0.001)
    gl.uniform1f(this.uloc.u_blurStep, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // blit no canvas 2D (onde o recorder/overlays leem)
    this.ctx.clearRect(0, 0, this.W, this.H)
    this.ctx.drawImage(this.glCanvas, 0, 0, this.W, this.H)
    // hook p/ overlays desenhados por cima (texto/PiP nos próximos slices)
    this.afterCompose?.(this.ctx, this.W, this.H)
  }

  /** Hook de compositing 2D após a cor (texto/PiP). Setado pelo MediaComposer. */
  afterCompose?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void

  dispose() {
    const gl = this.gl
    try {
      gl.deleteTexture(this.tex)
      gl.deleteProgram(this.program)
      const ext = gl.getExtension("WEBGL_lose_context")
      ext?.loseContext()
    } catch {
      /* noop */
    }
  }
}
