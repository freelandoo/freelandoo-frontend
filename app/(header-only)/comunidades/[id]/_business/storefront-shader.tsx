/// <reference types="@webgpu/types" />
"use client"

// O LETREIRO ACESO do Business (repaginada "BALCÃO ACESO", etapa N2) — a luz
// que mexe no banner da comunidade de negócio, na cor que o DONO escolheu.
//
// ── POR QUE SÓ AQUI, E COM FREIO ─────────────────────────────────────────
// O fundo em WebGPU da plataforma já foi RETIRADO (Alex, 2026-09-09: "está
// tudo travando"): shader de tela cheia divide a GPU com o compositor e quem
// engasga é a rolagem inteira. Esta luz obedece aos mesmos quatro freios da
// superfície do site do Enzo (`enzo-cortes/experience/gpu-surface.ts`):
//
//   1. SÓ o banner (176–224 px de altura), nunca a janela.
//   2. TETO DE PIXELS (~360 mil) — resolução reduzida e esticada pelo CSS; é
//      luz difusa, sem borda para o olho comparar.
//   3. PAUSA fora da tela (IntersectionObserver) e com a aba escondida.
//   4. Sem rAF próprio: o quadro anda no `gsap.ticker` a ~30 FPS.
//
// "Reduzir movimento" desenha UM quadro e para. WebGPU onde o aparelho tem,
// WebGL2 onde não; sem nenhum dos dois, fica a luz de CSS que está SEMPRE por
// baixo — qualquer falha aqui só desliga a camada de cima.
//
// ⚠️ CRASE DENTRO DOS SHADERS FECHA A TEMPLATE STRING. Não use.

import { useEffect, useRef } from "react"
import gsap from "gsap"

const PIXEL_CAP = 360_000
const FRAME_MS = 1000 / 30

// A mesma luz nas duas línguas de shader: três fachos de vitrine que varrem
// devagar, poeira de luz subindo e um fio de néon perto da base.
const WGSL = /* wgsl */ `
struct U { a: vec4f, b: vec4f };
@group(0) @binding(0) var<uniform> u: U;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn hash(q: vec2f) -> f32 {
  var p = fract(q * vec2f(123.34, 456.21));
  p = p + dot(p, p + 45.32);
  return fract(p.x * p.y);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let t = u.a.z;
  let col0 = u.b.xyz;
  let uv = vec2f(pos.x / res.x, 1.0 - pos.y / res.y);
  let asp = res.x / res.y;
  let depth = 1.0 - uv.y;

  var beams = 0.0;
  for (var i = 0; i < 3; i = i + 1) {
    let fi = f32(i);
    let cx = 0.18 + 0.32 * fi + 0.12 * sin(t * 0.17 + fi * 2.1);
    let lean = 0.35 * sin(t * 0.11 + fi * 1.7);
    let w = 0.03 + 0.22 * depth;
    let dx = (uv.x - (cx + lean * depth)) * asp;
    beams = beams + exp(-(dx * dx) / (w * w)) * (1.0 - 0.7 * depth);
  }

  var g = vec2f(uv.x * asp * 9.0, uv.y * 6.0 - t * 0.25);
  let id = floor(g);
  let f = fract(g) - vec2f(0.5, 0.5);
  let h = hash(id);
  var dust = 0.0;
  if (h > 0.8) {
    let o = vec2f(hash(id + vec2f(3.1, 1.3)), hash(id + vec2f(7.7, 2.9))) - vec2f(0.5, 0.5);
    let r = length(f - o * 0.6);
    dust = (1.0 - smoothstep(0.0, 0.1, r)) * (0.55 + 0.45 * sin(t * 2.2 + h * 40.0));
  }

  let ly = (uv.y - 0.06) * 70.0;
  let neon = exp(-ly * ly) * (0.7 + 0.3 * sin(t * 1.4));

  let col = col0 * (beams * 0.24 + dust * 0.85 + neon * 0.6);
  let a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  return vec4f(col, a);
}
`

const VERT = /* glsl */ `#version 300 es
void main() {
  vec2 p[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(p[gl_VertexID], 0.0, 1.0);
}
`

const FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform vec4 uA;
uniform vec4 uB;
out vec4 outColor;

float hash(vec2 q) {
  vec2 p = fract(q * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 res = uA.xy;
  float t = uA.z;
  vec3 col0 = uB.xyz;
  vec2 uv = gl_FragCoord.xy / res;
  float asp = res.x / res.y;
  float depth = 1.0 - uv.y;

  float beams = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float cx = 0.18 + 0.32 * fi + 0.12 * sin(t * 0.17 + fi * 2.1);
    float lean = 0.35 * sin(t * 0.11 + fi * 1.7);
    float w = 0.03 + 0.22 * depth;
    float dx = (uv.x - (cx + lean * depth)) * asp;
    beams += exp(-(dx * dx) / (w * w)) * (1.0 - 0.7 * depth);
  }

  vec2 g = vec2(uv.x * asp * 9.0, uv.y * 6.0 - t * 0.25);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  float dust = 0.0;
  if (h > 0.8) {
    vec2 o = vec2(hash(id + vec2(3.1, 1.3)), hash(id + vec2(7.7, 2.9))) - 0.5;
    float r = length(f - o * 0.6);
    dust = (1.0 - smoothstep(0.0, 0.1, r)) * (0.55 + 0.45 * sin(t * 2.2 + h * 40.0));
  }

  float ly = (uv.y - 0.06) * 70.0;
  float neon = exp(-ly * ly) * (0.7 + 0.3 * sin(t * 1.4));

  vec3 col = col0 * (beams * 0.24 + dust * 0.85 + neon * 0.6);
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  outColor = vec4(col, a);
}
`

type Painter = { draw: (w: number, h: number, t: number, rgb: [number, number, number]) => void; dispose: () => void }

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [0.95, 0.72, 0.02]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

async function webgpuPainter(canvas: HTMLCanvasElement): Promise<Painter | null> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
  if (!gpu) return null
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "low-power" })
    if (!adapter) return null
    const device = await adapter.requestDevice()
    const ctx = canvas.getContext("webgpu")
    if (!ctx) { device.destroy(); return null }
    const format = gpu.getPreferredCanvasFormat()
    ctx.configure({ device, format, alphaMode: "premultiplied" })
    const shaderModule = device.createShaderModule({ code: WGSL })
    const pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module: shaderModule, entryPoint: "vs" },
      fragment: { module: shaderModule, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    })
    const ubo = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ubo } }],
    })
    const data = new Float32Array(8)
    return {
      draw(w, h, t, rgb) {
        data.set([w, h, t, 0, rgb[0], rgb[1], rgb[2], 1])
        device.queue.writeBuffer(ubo, 0, data)
        const enc = device.createCommandEncoder()
        const pass = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          }],
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bind)
        pass.draw(3)
        pass.end()
        device.queue.submit([enc.finish()])
      },
      dispose() {
        ubo.destroy()
        device.destroy()
      },
    }
  } catch {
    return null
  }
}

function webglPainter(canvas: HTMLCanvasElement): Painter | null {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const prog = gl.createProgram()
  if (!vs || !fs || !prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  const uA = gl.getUniformLocation(prog, "uA")
  const uB = gl.getUniformLocation(prog, "uB")
  const vao = gl.createVertexArray()
  return {
    draw(w, h, t, rgb) {
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.uniform4f(uA, w, h, t, 0)
      gl.uniform4f(uB, rgb[0], rgb[1], rgb[2], 1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteVertexArray(vao)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}

export function StorefrontShader({ accent, className = "" }: { accent: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const colorRef = useRef(hexRgb(accent))
  // A cor muda quando o dono troca a paleta: o laço lê sempre a última.
  useEffect(() => { colorRef.current = hexRgb(accent) }, [accent])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    let painter: Painter | null = null
    let disposed = false
    let visible = true
    let last = 0
    const t0 = performance.now()
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const size = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      let w = Math.max(1, Math.round(r.width * dpr))
      let h = Math.max(1, Math.round(r.height * dpr))
      const px = w * h
      if (px > PIXEL_CAP) {
        const k = Math.sqrt(PIXEL_CAP / px)
        w = Math.round(w * k)
        h = Math.round(h * k)
      }
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
    }

    const frame = () => {
      const canvas = canvasRef.current
      if (!painter || !canvas || !visible || document.hidden) return
      const now = performance.now()
      if (now - last < FRAME_MS) return
      last = now
      painter.draw(canvas.width, canvas.height, (now - t0) / 1000, colorRef.current)
    }

    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting }, { rootMargin: "80px" })
    const ro = new ResizeObserver(() => {
      size()
      const c = canvasRef.current
      if (reduced && painter && c) painter.draw(c.width, c.height, 8, colorRef.current)
    })

    ;(async () => {
      size()
      painter = (await webgpuPainter(canvas)) || null
      // Um canvas que já pegou contexto "webgpu" não aceita "webgl2": se o
      // WebGPU falhou DEPOIS de pegar o contexto, troca o canvas por um novo.
      if (!painter && !disposed) {
        const fresh = canvas.cloneNode(false) as HTMLCanvasElement
        canvas.replaceWith(fresh)
        canvasRef.current = fresh
        painter = webglPainter(fresh)
      }
      if (disposed) { painter?.dispose(); return }
      if (!painter) return
      wrap.dataset.lit = "1"
      io.observe(wrap)
      ro.observe(wrap)
      if (reduced) {
        painter.draw(canvasRef.current!.width, canvasRef.current!.height, 8, colorRef.current)
        return
      }
      gsap.ticker.add(frame)
    })()

    return () => {
      disposed = true
      gsap.ticker.remove(frame)
      io.disconnect()
      ro.disconnect()
      painter?.dispose()
    }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* A LUZ DE CSS fica SEMPRE por baixo: é ela que aparece sem GPU. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 90% at 25% 0%, ${accent}33, transparent 70%), radial-gradient(50% 80% at 80% 0%, ${accent}26, transparent 70%), linear-gradient(0deg, ${accent}22, transparent 30%)`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ mixBlendMode: "screen" }} />
    </div>
  )
}
