// lib/camera/renderer.ts
// Pipeline de render: WebGL2 (cor/LUT procedural) num canvas offscreen → blit
// num canvas 2D visível + overlays (moldura/marca/stickers). O encoder lê esse
// canvas 2D, então TUDO que aparece no preview entra no vídeo final.

import { FilterState, OverlayState, BRAND_YELLOW } from "./types"
import { MakeupState, NEUTRAL_MAKEUP } from "./types"
import type { FaceLite, P } from "./face-tracker"
import { drawAccessory, type FaceGeomPx } from "./face-accessories"
import { drawMakeup } from "./face-makeup"

export const VERT = `
attribute vec2 a_pos;
uniform float u_flipX;
uniform float u_rot; // 0,1,2,3 = 0/90/180/270 graus
varying vec2 v_uv;
void main() {
  float ux = a_pos.x * 0.5 + 0.5;
  ux = mix(ux, 1.0 - ux, u_flipX);
  float uy = 1.0 - (a_pos.y * 0.5 + 0.5);
  vec2 base = vec2(ux, uy);
  vec2 uv;
  if (u_rot < 0.5) uv = base;
  else if (u_rot < 1.5) uv = vec2(base.y, 1.0 - base.x);
  else if (u_rot < 2.5) uv = vec2(1.0 - base.x, 1.0 - base.y);
  else uv = vec2(1.0 - base.y, base.x);
  v_uv = uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

export const FRAG = `
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
uniform float u_skinSmooth;
uniform vec2 u_faceCenter;
uniform vec2 u_faceRadius;
uniform float u_blurStep;

float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

void accum(inout vec3 sum, inout float wsum, vec2 uv, vec2 off, vec3 center) {
  vec3 s = texture2D(u_tex, uv + off * u_blurStep).rgb;
  float diff = dot(s - center, s - center);
  float w = exp(-diff * 32.0); // bilateral: preserva bordas
  sum += s * w;
  wsum += w;
}

void main() {
  vec2 uv = v_uv * u_uvScale + u_uvOffset;
  vec3 col = texture2D(u_tex, uv).rgb;

  // suavização de pele (bilateral) mascarada na elipse do rosto
  if (u_skinSmooth > 0.0) {
    vec2 fd = (v_uv - u_faceCenter) / max(u_faceRadius, vec2(0.001));
    float faceMask = 1.0 - smoothstep(0.7, 1.0, length(fd));
    if (faceMask > 0.0) {
      vec3 sum = col; float wsum = 1.0;
      accum(sum, wsum, uv, vec2( 1.0, 0.0), col);
      accum(sum, wsum, uv, vec2(-1.0, 0.0), col);
      accum(sum, wsum, uv, vec2( 0.0, 1.0), col);
      accum(sum, wsum, uv, vec2( 0.0,-1.0), col);
      accum(sum, wsum, uv, vec2( 1.0, 1.0), col);
      accum(sum, wsum, uv, vec2(-1.0, 1.0), col);
      accum(sum, wsum, uv, vec2( 1.0,-1.0), col);
      accum(sum, wsum, uv, vec2(-1.0,-1.0), col);
      vec3 blurred = sum / wsum;
      col = mix(col, blurred, faceMask * u_skinSmooth);
    }
  }

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

export function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
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
  private rotation = 0 // 0..3 (×90°)
  private startTime = performance.now()
  private face: FaceLite | null = null
  private makeup: MakeupState = NEUTRAL_MAKEUP
  private fgAspect = 4 / 5 // proporção do cartão da frente (largura:altura)
  private fgFill = 1 // fração da largura do canvas (1 = largura cheia → só margem vertical)
  private fgBox = { x: 0, y: 0, w: 720, h: 1280 } // onde o foreground é desenhado (px)
  private crop = { x: 0, y: 0, w: 1, h: 1 } // recorte central do frame (normalizado)

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
      "u_flipX", "u_rot", "u_uvScale", "u_uvOffset", "u_brightness", "u_contrast",
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
  setOverlay(o: OverlayState) { this.overlay = o }
  setFlipX(flip: boolean) { this.flipX = flip }
  setRotation(r: number) { this.rotation = ((Math.round(r) % 4) + 4) % 4 }
  setFace(f: FaceLite | null) { this.face = f }
  setMakeup(m: MakeupState) { this.makeup = m }

  /** Ponto do vídeo (normalizado) → normalizado no espaço de SAÍDA, aplicando o
   *  mesmo flip + rotação do shader (mantém acessórios grudados ao rosto). */
  private toOutputNorm(px: number, py: number): { x: number; y: number } {
    const sx = this.flipX ? 1 - px : px
    const sy = py
    switch (this.rotation) {
      case 1: return { x: 1 - sy, y: sx }
      case 2: return { x: 1 - sx, y: 1 - sy }
      case 3: return { x: sy, y: 1 - sx }
      default: return { x: sx, y: sy }
    }
  }

  /** Mapeia um ponto do vídeo (normalizado) p/ px do canvas de saída, aplicando
   *  flip+rotação e o MESMO recorte 4:5 + caixa do foreground (acessórios
   *  acompanham o zoom do cartão). */
  private mapPoint(p: P): { x: number; y: number } {
    const o = this.toOutputNorm(p.x, p.y)
    const c = this.crop
    const cu = (o.x - c.x) / c.w
    const cv = (o.y - c.y) / c.h
    const b = this.fgBox
    return { x: b.x + cu * b.w, y: b.y + cv * b.h }
  }
  get size() { return { width: this.W, height: this.H } }
  get outputCanvas() { return this.out }

  /** Renderiza um frame do vídeo aplicando cor + overlays. */
  renderFrame(video: HTMLVideoElement) {
    const gl = this.gl
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    // Foreground = "contain": mostra o frame INTEIRO da câmera (FOV completo,
    // sem zoom). Muitos navegadores in-app entregam o stream em paisagem, então
    // sobra espaço em cima/embaixo no quadro retrato. Em vez de barras pretas
    // (parecia "deitado") ou de cortar tudo no "cover" (ficava com muito zoom),
    // preenchemos o fundo com a própria imagem ampliada e desfocada (estilo IG).
    // dims efetivas após rotação (90°/270° trocam largura ↔ altura)
    const rot = this.rotation
    const odd = rot === 1 || rot === 3
    const efw = odd ? vh : vw
    const efh = odd ? vw : vh

    // glCanvas na resolução do frame (cap em 1280 no maior lado) — preserva
    // nitidez ao recortar/ampliar o foreground.
    const cap = 1280
    const dn = Math.min(1, cap / Math.max(efw, efh))
    const glw = Math.max(2, Math.round(efw * dn))
    const glh = Math.max(2, Math.round(efh * dn))
    if (this.glCanvas.width !== glw || this.glCanvas.height !== glh) {
      this.glCanvas.width = glw
      this.glCanvas.height = glh
    }
    gl.viewport(0, 0, glw, glh)

    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    } catch {
      return // frame ainda não decodável
    }

    const f = this.filter
    gl.uniform1f(this.uloc.u_flipX, this.flipX ? 1 : 0)
    gl.uniform1f(this.uloc.u_rot, rot)
    gl.uniform2f(this.uloc.u_uvScale, 1, 1)
    gl.uniform2f(this.uloc.u_uvOffset, 0, 0)
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

    // suavização de pele: elipse do rosto no espaço do vídeo renderizado.
    let skin = 0
    if (this.makeup.skinSmooth > 0 && this.face) {
      skin = this.makeup.skinSmooth
      const toVideo = (p: P) => ({ x: this.flipX ? 1 - p.x : p.x, y: p.y })
      const eyeMid = toVideo({
        x: (this.face.leftEye.x + this.face.rightEye.x) / 2,
        y: (this.face.leftEye.y + this.face.rightEye.y) / 2,
      } as P)
      const chin = toVideo(this.face.chin)
      const lc = toVideo(this.face.leftCheek)
      const rc = toVideo(this.face.rightCheek)
      const cx = (lc.x + rc.x) / 2
      const cy = (eyeMid.y + chin.y) / 2
      const rx = Math.abs(rc.x - lc.x) * 0.62
      const ry = Math.abs(chin.y - eyeMid.y) * 0.95
      gl.uniform2f(this.uloc.u_faceCenter, cx, cy)
      gl.uniform2f(this.uloc.u_faceRadius, Math.max(rx, 0.02), Math.max(ry, 0.02))
      gl.uniform1f(this.uloc.u_blurStep, 0.0035)
    }
    gl.uniform1f(this.uloc.u_skinSmooth, skin)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // compositing 2D — fundo desfocado + cartão 4:5 (com zoom) por cima
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.W, this.H)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, this.W, this.H)

    // fundo: a mesma imagem ampliada p/ cobrir a tela, desfocada e escurecida.
    const coverScale = Math.max(this.W / efw, this.H / efh)
    const bw = Math.round(efw * coverScale)
    const bh = Math.round(efh * coverScale)
    const bx = Math.round((this.W - bw) / 2)
    const by = Math.round((this.H - bh) / 2)
    ctx.save()
    ctx.filter = "blur(18px)" // navegador sem suporte ignora → fundo nítido (ok)
    ctx.drawImage(this.glCanvas, bx, by, bw, bh)
    ctx.restore()
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.fillRect(0, 0, this.W, this.H)

    // foreground: cartão ~4:5 (não pega a tela toda), com recorte central + zoom
    const boxW = Math.round(this.W * this.fgFill)
    const boxH = Math.round(boxW / this.fgAspect)
    const boxX = Math.round((this.W - boxW) / 2)
    const boxY = Math.round((this.H - boxH) / 2)
    this.fgBox = { x: boxX, y: boxY, w: boxW, h: boxH }

    // recorte central do frame no aspecto do cartão (gera o zoom da frente)
    const efAspect = efw / efh
    let cfx: number, cfy: number
    if (efAspect > this.fgAspect) { cfx = this.fgAspect / efAspect; cfy = 1 }
    else { cfx = 1; cfy = efAspect / this.fgAspect }
    this.crop = { x: (1 - cfx) / 2, y: (1 - cfy) / 2, w: cfx, h: cfy }

    ctx.drawImage(
      this.glCanvas,
      this.crop.x * glw, this.crop.y * glh, this.crop.w * glw, this.crop.h * glh,
      boxX, boxY, boxW, boxH
    )
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
    // maquiagem (batom/blush) — colada na pele, abaixo de acessórios/stickers
    if (this.face && (this.makeup.lipstick > 0 || this.makeup.blush > 0)) {
      const f = this.face
      const faceWidth = Math.hypot(
        this.mapPoint(f.leftCheek).x - this.mapPoint(f.rightCheek).x,
        this.mapPoint(f.leftCheek).y - this.mapPoint(f.rightCheek).y
      )
      drawMakeup(ctx, this.makeup, (i) => this.mapPoint(f.all[i]), faceWidth)
    }

    // acessório de rosto (face tracking) — desenhado antes dos stickers
    if (o.accessory !== "none" && this.face) {
      const f = this.face
      const geom: FaceGeomPx = {
        leftEye: this.mapPoint(f.leftEye),
        rightEye: this.mapPoint(f.rightEye),
        forehead: this.mapPoint(f.forehead),
        chin: this.mapPoint(f.chin),
        leftCheek: this.mapPoint(f.leftCheek),
        rightCheek: this.mapPoint(f.rightCheek),
        noseTip: this.mapPoint(f.noseTip),
      }
      drawAccessory(ctx, o.accessory, geom)
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
