// lib/camera/renderer.ts
// Pipeline de render: WebGL2 (cor/LUT procedural) num canvas offscreen → blit
// num canvas 2D visível + overlays (moldura/marca/stickers). O encoder lê esse
// canvas 2D, então TUDO que aparece no preview entra no vídeo final.

import { FilterState, OverlayState, BRAND_YELLOW } from "./types"

const VERT = `
attribute vec2 a_pos;
uniform float u_flipX;
varying vec2 v_uv;
void main() {
  float ux = a_pos.x * 0.5 + 0.5;
  ux = mix(ux, 1.0 - ux, u_flipX);
  float uy = 1.0 - (a_pos.y * 0.5 + 0.5);
  v_uv = vec2(ux, uy);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_vignette;
uniform float u_grain;
uniform float u_mono;
uniform vec3 u_tint;
uniform float u_tintStrength;
uniform float u_time;

float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = v_uv * u_uvScale + u_uvOffset;
  vec3 col = texture2D(u_tex, uv).rgb;

  // temperatura (desloca R/B)
  col.r += u_temperature * 0.12;
  col.b -= u_temperature * 0.12;

  // brilho
  col += u_brightness * 0.3;

  // contraste
  col = (col - 0.5) * (1.0 + u_contrast) + 0.5;

  // saturação + mono
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.0 + u_saturation);
  col = mix(col, vec3(lum), u_mono);

  // tint (papel/sépia)
  col = mix(col, col * u_tint, u_tintStrength);

  // vinheta
  float d = distance(v_uv, vec2(0.5));
  float vig = smoothstep(0.8, 0.4, d);
  col *= mix(1.0, vig, u_vignette);

  // grão
  float g = (rand(v_uv + fract(u_time)) - 0.5) * u_grain;
  col += g;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error("Shader compile error: " + log)
  }
  return sh
}

export class CameraRenderer {
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
  private overlay: OverlayState
  private flipX = false
  private startTime = performance.now()

  constructor(output: HTMLCanvasElement, filter: FilterState, overlay: OverlayState) {
    this.out = output
    this.filter = filter
    this.overlay = overlay
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
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
  setOverlay(o: OverlayState) { this.overlay = o }
  setFlipX(flip: boolean) { this.flipX = flip }
  get size() { return { width: this.W, height: this.H } }
  get outputCanvas() { return this.out }

  /** Renderiza um frame do vídeo aplicando cor + overlays. */
  renderFrame(video: HTMLVideoElement) {
    const gl = this.gl
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    // cover fit (9:16): escala/recorta o vídeo p/ preencher o frame.
    const va = vw / vh
    const ta = this.W / this.H
    let sx = 1, sy = 1
    if (va > ta) sx = ta / va
    else sy = va / ta
    const ox = (1 - sx) / 2
    const oy = (1 - sy) / 2

    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    } catch {
      return // frame ainda não decodável
    }

    const f = this.filter
    gl.uniform1f(this.uloc.u_flipX, this.flipX ? 1 : 0)
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
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // compositing 2D
    this.ctx.clearRect(0, 0, this.W, this.H)
    this.ctx.drawImage(this.glCanvas, 0, 0, this.W, this.H)
    this.drawOverlays()
  }

  private drawOverlays() {
    const { ctx, W, H } = this
    const o = this.overlay
    // moldura
    if (o.frame === "classic") {
      const b = Math.round(Math.min(W, H) * 0.025)
      ctx.strokeStyle = "rgba(255,255,255,0.92)"
      ctx.lineWidth = b
      ctx.strokeRect(b / 2, b / 2, W - b, H - b)
    } else if (o.frame === "tabloide") {
      const b = Math.round(Math.min(W, H) * 0.05)
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, W, b)
      ctx.fillRect(0, H - b, W, b)
      ctx.fillRect(0, 0, b, H)
      ctx.fillRect(W - b, 0, b, H)
      ctx.fillStyle = BRAND_YELLOW
      ctx.font = `700 ${Math.round(b * 0.55)}px Georgia, 'Times New Roman', serif`
      ctx.textBaseline = "middle"
      ctx.textAlign = "center"
      ctx.fillText("FREELANDOO", W / 2, b / 2)
    } else if (o.frame === "polaroid") {
      const side = Math.round(Math.min(W, H) * 0.04)
      const bottom = Math.round(Math.min(W, H) * 0.16)
      ctx.fillStyle = "#fafafa"
      ctx.fillRect(0, 0, W, side)
      ctx.fillRect(0, 0, side, H)
      ctx.fillRect(W - side, 0, side, H)
      ctx.fillRect(0, H - bottom, W, bottom)
    }
    // marca d'água
    if (o.watermark) {
      const pad = Math.round(Math.min(W, H) * 0.04)
      const fs = Math.round(Math.min(W, H) * 0.045)
      ctx.font = `800 ${fs}px ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillText("freelandoo", pad + 2, H - pad + 2)
      ctx.fillStyle = BRAND_YELLOW
      ctx.fillText("freelandoo", pad, H - pad)
    }
    // stickers
    if (o.stickers.length) {
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      for (const s of o.stickers) {
        const sz = Math.round(Math.min(W, H) * s.size)
        ctx.font = `${sz}px ui-sans-serif, system-ui, sans-serif`
        ctx.fillText(s.char, s.x * W, s.y * H)
      }
    }
  }

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
