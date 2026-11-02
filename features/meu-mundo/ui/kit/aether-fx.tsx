/// <reference types="@webgpu/types" />
"use client"

// features/meu-mundo/ui/kit/aether-fx.tsx — mm3d-59: a LUZ DE ÉTER (efeito GPU delimitado).
//
// Base neutra extraída da estratégia do letreiro do Business
// (_business/storefront-shader.tsx), com a arte própria do jogo: anéis
// concêntricos de éter, filetes que giram e centelhas. Usado UMA vez por
// camada de apresentação (a celebração de nível) — nunca um canvas por card.
//
// Freios (os mesmos do Business, mais perda de dispositivo):
//   1. só a área da peça (nunca a janela inteira por padrão) e TETO DE PIXELS;
//   2. ~30 FPS no gsap.ticker (sem rAF próprio);
//   3. pausa com a aba escondida ou fora da tela; para e solta tudo ao desmontar;
//   4. WebGPU → WebGL2 → CSS: a luz de CSS está SEMPRE por baixo, então
//      qualquer falha (sem GPU, dispositivo/contexto perdido, shader que não
//      compila) só desliga a camada de cima — o conteúdo nunca depende disto.
// "Reduzir movimento": um quadro parado.
//
// ⚠️ CRASE DENTRO DOS SHADERS FECHA A TEMPLATE STRING. Não use.

import { useEffect, useRef } from "react"
import gsap from "gsap"

const FRAME_MS = 1000 / 30

const WGSL = /* wgsl */ `
struct U { a: vec4f, b: vec4f };
@group(0) @binding(0) var<uniform> u: U;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  return vec4f(p[i], 0.0, 1.0);
}
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let t = u.a.z;
  let burst = u.a.w;
  let uv = (pos.xy - 0.5 * res) / res.y;
  let r = length(uv);
  let ang = atan2(uv.y, uv.x);
  let ring1 = exp(-pow((r - fract(t * 0.45) * 1.4) * 9.0, 2.0)) * (1.0 - fract(t * 0.45));
  let ring2 = exp(-pow((r - fract(t * 0.45 + 0.5) * 1.4) * 9.0, 2.0)) * (1.0 - fract(t * 0.45 + 0.5));
  let wisp = pow(0.5 + 0.5 * sin(ang * 5.0 + t * 1.6 - r * 9.0), 6.0) * exp(-r * 2.2);
  let col = vec2f(floor(uv.x * 40.0), 0.0);
  let h = hash(col);
  let sy = fract(-t * (0.25 + h * 0.5) + h * 7.0) * 2.0 - 1.0;
  let spark = (1.0 - smoothstep(0.0, 0.012, abs(fract(uv.x * 40.0) - 0.5) / 40.0)) * exp(-pow((uv.y - sy) * 30.0, 2.0)) * step(0.7, h);
  let gold = vec3f(1.0, 0.78, 0.18);
  let aether = vec3f(0.25, 0.9, 0.82);
  let violet = vec3f(0.63, 0.36, 1.0);
  var c = gold * (ring1 + ring2) * 0.9 + aether * wisp * 0.8 + mix(aether, violet, h) * spark * 1.2;
  c = c * (0.55 + 0.45 * burst);
  let a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
  return vec4f(c, a);
}
`

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 2 ? 3.0 : -1.0, gl_VertexID == 0 ? -3.0 : 1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision mediump float;
uniform vec4 uA;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 res = uA.xy;
  float t = uA.z;
  float burst = uA.w;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float f1 = fract(t * 0.45);
  float f2 = fract(t * 0.45 + 0.5);
  float ring1 = exp(-pow((r - f1 * 1.4) * 9.0, 2.0)) * (1.0 - f1);
  float ring2 = exp(-pow((r - f2 * 1.4) * 9.0, 2.0)) * (1.0 - f2);
  float wisp = pow(0.5 + 0.5 * sin(ang * 5.0 + t * 1.6 - r * 9.0), 6.0) * exp(-r * 2.2);
  float h = hash(vec2(floor(uv.x * 40.0), 0.0));
  float sy = fract(-t * (0.25 + h * 0.5) + h * 7.0) * 2.0 - 1.0;
  float spark = (1.0 - smoothstep(0.0, 0.012, abs(fract(uv.x * 40.0) - 0.5) / 40.0)) * exp(-pow((uv.y - sy) * 30.0, 2.0)) * step(0.7, h);
  vec3 gold = vec3(1.0, 0.78, 0.18);
  vec3 aether = vec3(0.25, 0.9, 0.82);
  vec3 violet = vec3(0.63, 0.36, 1.0);
  vec3 c = gold * (ring1 + ring2) * 0.9 + aether * wisp * 0.8 + mix(aether, violet, h) * spark * 1.2;
  c *= 0.55 + 0.45 * burst;
  outColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
}
`

type Painter = { kind: "webgpu" | "webgl2"; draw: (w: number, h: number, t: number, burst: number) => void; dispose: () => void }

async function webgpuPainter(canvas: HTMLCanvasElement, onLost: () => void): Promise<Painter | null> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
  if (!gpu) return null
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "low-power" })
    if (!adapter) return null
    const device = await adapter.requestDevice()
    let alive = true
    void device.lost.then(() => {
      if (alive) onLost()
    })
    const ctx = canvas.getContext("webgpu")
    if (!ctx) {
      device.destroy()
      return null
    }
    const format = gpu.getPreferredCanvasFormat()
    ctx.configure({ device, format, alphaMode: "premultiplied" })
    const mod = device.createShaderModule({ code: WGSL })
    const pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module: mod, entryPoint: "vs" },
      fragment: { module: mod, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    })
    const ubo = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }] })
    const data = new Float32Array(8)
    return {
      kind: "webgpu",
      draw(w, h, t, burst) {
        data.set([w, h, t, burst, 0, 0, 0, 0])
        device.queue.writeBuffer(ubo, 0, data)
        const enc = device.createCommandEncoder()
        const pass = enc.beginRenderPass({
          colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bind)
        pass.draw(3)
        pass.end()
        device.queue.submit([enc.finish()])
      },
      dispose() {
        alive = false
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
  const vao = gl.createVertexArray()
  return {
    kind: "webgl2",
    draw(w, h, t, burst) {
      if (gl.isContextLost()) return
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.uniform4f(uA, w, h, t, burst)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      if (!gl.isContextLost()) {
        gl.deleteProgram(prog)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        gl.deleteVertexArray(vao)
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}

/**
 * A luz de éter numa área (posicione o pai). `burst` 0–1 = intensidade.
 * `pixelCap` limita a resolução (qualidade baixa = menos).
 */
export function AetherFx({ burst = 1, pixelCap = 300_000, className = "" }: { burst?: number; pixelCap?: number; className?: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const burstRef = useRef(burst)
  useEffect(() => {
    burstRef.current = burst
  }, [burst])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas0 = canvasRef.current
    if (!wrap || !canvas0) return
    let painter: Painter | null = null
    let disposed = false
    let visible = true
    let last = 0
    const t0 = performance.now()
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const size = () => {
      const c = canvasRef.current
      if (!c) return
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      let w = Math.max(1, Math.round(r.width * dpr))
      let h = Math.max(1, Math.round(r.height * dpr))
      if (w * h > pixelCap) {
        const k = Math.sqrt(pixelCap / (w * h))
        w = Math.round(w * k)
        h = Math.round(h * k)
      }
      if (c.width !== w) c.width = w
      if (c.height !== h) c.height = h
    }
    /** GPU caiu (dispositivo/contexto perdido): solta e fica só a luz de CSS. */
    const drop = () => {
      gsap.ticker.remove(frame)
      painter?.dispose()
      painter = null
      delete wrap.dataset.lit
    }
    const frame = () => {
      const c = canvasRef.current
      if (!painter || !c || !visible || document.hidden) return
      const now = performance.now()
      if (now - last < FRAME_MS) return
      last = now
      painter.draw(c.width, c.height, (now - t0) / 1000, burstRef.current)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
    })
    const ro = new ResizeObserver(() => size())
    const onCtxLost = (e: Event) => {
      e.preventDefault()
      drop()
    }

    ;(async () => {
      size()
      painter = await webgpuPainter(canvas0, drop)
      if (!painter && !disposed) {
        // canvas que já pegou "webgpu" não aceita "webgl2": troca por um novo
        const fresh = canvas0.cloneNode(false) as HTMLCanvasElement
        canvas0.replaceWith(fresh)
        canvasRef.current = fresh
        fresh.addEventListener("webglcontextlost", onCtxLost)
        painter = webglPainter(fresh)
      }
      if (disposed) {
        painter?.dispose()
        return
      }
      if (!painter) return
      wrap.dataset.lit = painter.kind
      io.observe(wrap)
      ro.observe(wrap)
      if (reduced) {
        const c = canvasRef.current!
        painter.draw(c.width, c.height, 1.2, burstRef.current)
        return
      }
      gsap.ticker.add(frame)
    })()

    return () => {
      disposed = true
      gsap.ticker.remove(frame)
      io.disconnect()
      ro.disconnect()
      canvasRef.current?.removeEventListener("webglcontextlost", onCtxLost)
      painter?.dispose()
      painter = null
    }
  }, [pixelCap])

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* a luz de CSS fica SEMPRE por baixo (é ela que aparece sem GPU) */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(45% 45% at 50% 50%, rgba(63,230,210,0.28), transparent 70%), radial-gradient(70% 60% at 50% 55%, rgba(242,183,5,0.22), transparent 72%)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ mixBlendMode: "screen" }} />
    </div>
  )
}
