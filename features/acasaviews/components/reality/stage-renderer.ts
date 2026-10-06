/// <reference types="@webgpu/types" />
/**
 * Renderizador do palco 3D da Casa Views (globo wireframe + anéis orbitais +
 * partículas). Carregado por import() DEPOIS da página aparecer — nada aqui
 * pesa no primeiro desenho.
 *
 * Degraus: WebGPU → WebGL2 → (quem chama mantém o SVG estático). A MESMA
 * geometria e a MESMA conta de vértice servem os dois backends; só a cola de
 * API muda. Sem biblioteca: são ~1.300 vértices de linha, e Three.js cobraria
 * centenas de KB para desenhar isso.
 *
 * Custo: lista de linhas, um draw call, sem textura, sem profundidade. O que
 * se move é a matriz (CPU, 2 mat4 por quadro) e o ângulo das partículas (no
 * vértice). Quem decide QUANDO desenhar é o chamador (pausa fora da tela).
 */

export type StageColors = {
  white: [number, number, number]
  pink: [number, number, number]
  yellow: [number, number, number]
}

export type StageFrame = {
  time: number // segundos
  yaw: number // rad, rotação do conjunto
  pitch: number // rad
  aspect: number
}

export interface StageRenderer {
  kind: "webgpu" | "webgl2"
  resize(width: number, height: number): void
  draw(frame: StageFrame): void
  dispose(): void
}

/* ── geometria ─────────────────────────────────────────────────────────── */
// por vértice: x y z | r g b a | spin  → 8 floats
const STRIDE = 8

function buildGeometry(c: StageColors, dense: boolean): Float32Array<ArrayBuffer> {
  const out: number[] = []
  const seg = (a: number[], b: number[], col: number[], alpha: number, spin = 0) => {
    out.push(a[0], a[1], a[2], col[0], col[1], col[2], alpha, spin)
    out.push(b[0], b[1], b[2], col[0], col[1], col[2], alpha, spin)
  }
  const R = 1
  const steps = dense ? 64 : 40

  // meridianos
  const meridians = dense ? 14 : 10
  for (let m = 0; m < meridians; m++) {
    const lon = (m / meridians) * Math.PI
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2
      const a1 = ((i + 1) / steps) * Math.PI * 2
      const p = (a: number) => [R * Math.cos(a) * Math.cos(lon), R * Math.sin(a), R * Math.cos(a) * Math.sin(lon)]
      seg(p(a0), p(a1), c.white, 0.22)
    }
  }
  // paralelos
  const parallels = dense ? 9 : 7
  for (let k = 1; k < parallels; k++) {
    const lat = -Math.PI / 2 + (k / parallels) * Math.PI
    const r = R * Math.cos(lat)
    const y = R * Math.sin(lat)
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2
      const a1 = ((i + 1) / steps) * Math.PI * 2
      seg([r * Math.cos(a0), y, r * Math.sin(a0)], [r * Math.cos(a1), y, r * Math.sin(a1)], c.white, 0.18)
    }
  }

  // anéis orbitais inclinados (giram junto com o conjunto)
  const ring = (radius: number, tiltX: number, tiltZ: number, col: number[], alpha: number) => {
    const cx = Math.cos(tiltX), sx = Math.sin(tiltX)
    const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ)
    const p = (a: number) => {
      let x = radius * Math.cos(a), y = 0, z = radius * Math.sin(a)
      // rot X
      const y1 = y * cx - z * sx, z1 = y * sx + z * cx
      y = y1; z = z1
      // rot Z
      const x2 = x * cz - y * sz, y2 = x * sz + y * cz
      x = x2; y = y2
      return [x, y, z]
    }
    const n = 96
    for (let i = 0; i < n; i++) seg(p((i / n) * Math.PI * 2), p(((i + 1) / n) * Math.PI * 2), col, alpha)
  }
  ring(1.42, 1.18, 0.32, c.pink, 0.95)
  ring(1.62, -0.42, -0.6, c.white, 0.35)
  ring(1.24, 0.15, 1.1, c.yellow, 0.75)

  // anel equatorial com partículas que ORBITAM (spin ≠ 0 → gira no vértice)
  const eq = 1.85
  const n = 128
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2
    seg([eq * Math.cos(a0), 0, eq * Math.sin(a0)], [eq * Math.cos(a1), 0, eq * Math.sin(a1)], c.white, 0.16)
  }
  const particles = dense ? 26 : 14
  for (let i = 0; i < particles; i++) {
    const a = (i / particles) * Math.PI * 2 + (i % 3) * 0.13
    const rr = eq + ((i * 37) % 7) * 0.035 - 0.1
    const yy = (((i * 53) % 9) - 4) * 0.02
    const x = rr * Math.cos(a), z = rr * Math.sin(a)
    const s = i % 5 === 0 ? 0.05 : 0.028
    const col = i % 5 === 0 ? c.pink : c.white
    const spin = 0.35 + (i % 4) * 0.06
    seg([x - s, yy, z], [x + s, yy, z], col, 1, spin)
    seg([x, yy - s, z], [x, yy + s, z], col, 1, spin)
  }

  // núcleo: cubo de vidro em wireframe
  const k = 0.42
  const v = [
    [-k, -k, -k], [k, -k, -k], [k, k, -k], [-k, k, -k],
    [-k, -k, k], [k, -k, k], [k, k, k], [-k, k, k],
  ]
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  for (const [a, b] of edges) seg(v[a], v[b], c.pink, 0.9, -0.22)

  return new Float32Array(out)
}

/* ── matrizes (coluna-maior) ───────────────────────────────────────────── */
function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}
function perspective(fovy: number, aspect: number, near: number, far: number, zeroToOne: boolean) {
  const f = 1 / Math.tan(fovy / 2)
  const o = new Float32Array(16)
  o[0] = f / aspect
  o[5] = f
  o[11] = -1
  if (zeroToOne) {
    o[10] = far / (near - far)
    o[14] = (far * near) / (near - far)
  } else {
    o[10] = (far + near) / (near - far)
    o[14] = (2 * far * near) / (near - far)
  }
  return o
}
function rotY(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}
function rotX(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
}
function translateZ(z: number) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1])
}

function matrices(f: StageFrame, zeroToOne: boolean) {
  const model = mul(rotX(f.pitch), rotY(f.yaw))
  const proj = perspective(0.62, f.aspect, 0.1, 20, zeroToOne)
  const viewProj = mul(proj, translateZ(-5.6))
  return { model, viewProj }
}

/* ── shaders ───────────────────────────────────────────────────────────── */
// ⚠️ Template literal: crase dentro do shader fecha a string.
const WGSL = /* wgsl */ `
struct U { model: mat4x4<f32>, viewProj: mat4x4<f32>, time: vec4<f32> };
@group(0) @binding(0) var<uniform> u: U;
struct VOut { @builtin(position) p: vec4<f32>, @location(0) c: vec4<f32> };
@vertex fn vs(@location(0) pos: vec3<f32>, @location(1) col: vec4<f32>, @location(2) spin: f32) -> VOut {
  let a = u.time.x * spin;
  let cs = cos(a);
  let sn = sin(a);
  let q = vec3<f32>(pos.x * cs - pos.z * sn, pos.y, pos.x * sn + pos.z * cs);
  let w = u.model * vec4<f32>(q, 1.0);
  let depth = clamp((w.z + 1.9) / 3.8, 0.0, 1.0);
  var o: VOut;
  o.p = u.viewProj * w;
  o.c = vec4<f32>(col.rgb, col.a * mix(0.18, 1.0, depth));
  return o;
}
@fragment fn fs(i: VOut) -> @location(0) vec4<f32> {
  return vec4<f32>(i.c.rgb * i.c.a, i.c.a);
}
`

const GLSL_VS = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec4 col;
layout(location=2) in float spin;
uniform mat4 model;
uniform mat4 viewProj;
uniform float time;
out vec4 vCol;
void main() {
  float a = time * spin;
  float cs = cos(a);
  float sn = sin(a);
  vec3 q = vec3(pos.x * cs - pos.z * sn, pos.y, pos.x * sn + pos.z * cs);
  vec4 w = model * vec4(q, 1.0);
  float depth = clamp((w.z + 1.9) / 3.8, 0.0, 1.0);
  vCol = vec4(col.rgb, col.a * mix(0.18, 1.0, depth));
  gl_Position = viewProj * w;
}`
const GLSL_FS = `#version 300 es
precision mediump float;
in vec4 vCol;
out vec4 frag;
void main() { frag = vec4(vCol.rgb * vCol.a, vCol.a); }`

/* ── WebGPU ────────────────────────────────────────────────────────────── */
async function createWebGPU(canvas: HTMLCanvasElement, geo: Float32Array<ArrayBuffer>): Promise<StageRenderer | null> {
  if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) return null
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" })
    if (!adapter) return null
    const device = await adapter.requestDevice()
    const ctx = canvas.getContext("webgpu")
    if (!ctx) {
      device.destroy()
      return null
    }
    const format = navigator.gpu.getPreferredCanvasFormat()
    ctx.configure({ device, format, alphaMode: "premultiplied" })

    const vbuf = device.createBuffer({ size: geo.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(vbuf, 0, geo)
    const ubuf = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    const shader = device.createShaderModule({ code: WGSL })
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shader,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: STRIDE * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x4" },
              { shaderLocation: 2, offset: 28, format: "float32" },
            ],
          },
        ],
      },
      fragment: {
        module: shader,
        entryPoint: "fs",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "line-list" },
    })
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubuf } }] })
    const count = geo.length / STRIDE
    const uni = new Float32Array(36)
    let lost = false
    device.lost.then(() => {
      lost = true
    })

    return {
      kind: "webgpu",
      resize(w, h) {
        canvas.width = w
        canvas.height = h
      },
      draw(f) {
        if (lost || canvas.width === 0) return
        const { model, viewProj } = matrices(f, true)
        uni.set(model, 0)
        uni.set(viewProj, 16)
        uni[32] = f.time
        device.queue.writeBuffer(ubuf, 0, uni)
        const enc = device.createCommandEncoder()
        const pass = enc.beginRenderPass({
          colorAttachments: [
            { view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } },
          ],
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bind)
        pass.setVertexBuffer(0, vbuf)
        pass.draw(count)
        pass.end()
        device.queue.submit([enc.finish()])
      },
      dispose() {
        try {
          ctx.unconfigure()
        } catch {}
        vbuf.destroy()
        ubuf.destroy()
        device.destroy()
      },
    }
  } catch {
    return null
  }
}

/* ── WebGL2 ────────────────────────────────────────────────────────────── */
function createWebGL2(canvas: HTMLCanvasElement, geo: Float32Array<ArrayBuffer>): StageRenderer | null {
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true, powerPreference: "low-power" })
  } catch {
    gl = null
  }
  if (!gl) return null
  const g = gl
  const sh = (type: number, src: string) => {
    const s = g.createShader(type)!
    g.shaderSource(s, src)
    g.compileShader(s)
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      g.deleteShader(s)
      return null
    }
    return s
  }
  const vs = sh(g.VERTEX_SHADER, GLSL_VS)
  const fs = sh(g.FRAGMENT_SHADER, GLSL_FS)
  if (!vs || !fs) return null
  const prog = g.createProgram()!
  g.attachShader(prog, vs)
  g.attachShader(prog, fs)
  g.linkProgram(prog)
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null

  const vao = g.createVertexArray()
  const vbuf = g.createBuffer()
  g.bindVertexArray(vao)
  g.bindBuffer(g.ARRAY_BUFFER, vbuf)
  g.bufferData(g.ARRAY_BUFFER, geo, g.STATIC_DRAW)
  g.enableVertexAttribArray(0)
  g.vertexAttribPointer(0, 3, g.FLOAT, false, STRIDE * 4, 0)
  g.enableVertexAttribArray(1)
  g.vertexAttribPointer(1, 4, g.FLOAT, false, STRIDE * 4, 12)
  g.enableVertexAttribArray(2)
  g.vertexAttribPointer(2, 1, g.FLOAT, false, STRIDE * 4, 28)
  g.bindVertexArray(null)

  const uModel = g.getUniformLocation(prog, "model")
  const uVP = g.getUniformLocation(prog, "viewProj")
  const uTime = g.getUniformLocation(prog, "time")
  const count = geo.length / STRIDE

  return {
    kind: "webgl2",
    resize(w, h) {
      canvas.width = w
      canvas.height = h
      g.viewport(0, 0, w, h)
    },
    draw(f) {
      if (g.isContextLost()) return
      const { model, viewProj } = matrices(f, false)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.enable(g.BLEND)
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA)
      g.useProgram(prog)
      g.uniformMatrix4fv(uModel, false, model)
      g.uniformMatrix4fv(uVP, false, viewProj)
      g.uniform1f(uTime, f.time)
      g.bindVertexArray(vao)
      g.drawArrays(g.LINES, 0, count)
      g.bindVertexArray(null)
    },
    dispose() {
      g.deleteBuffer(vbuf)
      g.deleteVertexArray(vao)
      g.deleteProgram(prog)
      g.deleteShader(vs)
      g.deleteShader(fs)
      g.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}

export async function createStageRenderer(
  canvas: HTMLCanvasElement,
  colors: StageColors,
  opts: { dense: boolean; preferWebGPU: boolean },
): Promise<{ renderer: StageRenderer; canvas: HTMLCanvasElement } | null> {
  const geo = buildGeometry(colors, opts.dense)
  let target = canvas
  if (opts.preferWebGPU && typeof navigator !== "undefined" && "gpu" in navigator) {
    const gpu = await createWebGPU(target, geo)
    if (gpu) return { renderer: gpu, canvas: target }
    // Um canvas que já entregou contexto "webgpu" recusa "webgl2" para sempre.
    // Como não dá para saber em que passo o WebGPU caiu, troca-se o canvas.
    const fresh = target.cloneNode(false) as HTMLCanvasElement
    target.replaceWith(fresh)
    target = fresh
  }
  const gl = createWebGL2(target, geo)
  return gl ? { renderer: gl, canvas: target } : null
}
