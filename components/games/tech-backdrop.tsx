"use client"

/**
 * O FUNDO DA PLATAFORMA DE GAMES — nebulosa e grade em WebGPU.
 *
 * ─── POR QUE WEBGPU CRU, SEM BIBLIOTECA ──────────────────────────────────────
 *
 * O pedido era usar WebGPU. Uma engine (three.js e afins) traria centenas de KB
 * para desenhar UM triângulo de tela cheia com um shader — e este fundo entra
 * numa página que já carrega feed, composer e estante. O que se usa aqui é a
 * API do navegador direto: ~40 linhas de WGSL e um pipeline. Zero dependência
 * nova, zero peso no First Load das outras rotas (a página o importa por
 * `dynamic`).
 *
 * ─── WEBGPU NÃO EXISTE EM TODO LUGAR, E ISSO NÃO É DETALHE ───────────────────
 *
 * Safari e Firefox ainda vão e voltam no suporte, e no celular a lista é
 * menor ainda. Um fundo que só aparece no Chrome faria a plataforma parecer
 * quebrada para metade das pessoas — então o fallback NÃO é um plano B
 * envergonhado: é CSS puro com as MESMAS cores (gradientes + grade), e quem
 * cair nele vê o mesmo ambiente, sem o movimento orgânico.
 *
 * O caminho de reserva também é o que vale quando a criação do device falha
 * (driver bloqueado, GPU em lista negra, aba sem contexto): tudo dentro de
 * try/catch, e qualquer tropeço cai no CSS em vez de deixar a tela preta.
 *
 * ─── BATERIA ─────────────────────────────────────────────────────────────────
 *
 * Um shader de tela cheia rodando para sempre é caro num laptop. Três freios:
 * `prefers-reduced-motion` desenha UM quadro e para; a aba escondida
 * (`visibilitychange`) suspende o laço; e o passo é limitado a ~30fps, que num
 * fundo difuso é indistinguível de 60 e custa metade.
 */

import { useEffect, useRef, useState } from "react"

// A tipagem de WebGPU (@webgpu/types) não é dependência do projeto, e adicioná-la
// puxaria tipos globais para o build inteiro por causa de um arquivo. O contrato
// usado aqui é pequeno e está todo dentro deste módulo.

const SHADER = /* wgsl */ `
struct U {
  time : f32,
  w    : f32,
  h    : f32,
  pad  : f32,
};
@group(0) @binding(0) var<uniform> u : U;

@vertex
fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4<f32> {
  // Triângulo único que cobre a tela — mais barato que dois triângulos de quad.
  var pts = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  return vec4<f32>(pts[i], 0.0, 1.0);
}

fn hash(p : vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn noise(p : vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let a = hash(i);
  let b = hash(i + vec2<f32>(1.0, 0.0));
  let c = hash(i + vec2<f32>(0.0, 1.0));
  let d = hash(i + vec2<f32>(1.0, 1.0));
  let s = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}

fn fbm(q : vec2<f32>) -> f32 {
  var p = q;
  var v = 0.0;
  var amp = 0.5;
  for (var i = 0; i < 5; i = i + 1) {
    v = v + amp * noise(p);
    p = p * 2.02;
    amp = amp * 0.5;
  }
  return v;
}

@fragment
fn fs(@builtin(position) frag : vec4<f32>) -> @location(0) vec4<f32> {
  let res = vec2<f32>(u.w, u.h);
  let uv = frag.xy / res;
  let p = (frag.xy - 0.5 * res) / res.y;
  let t = u.time;

  let base   = vec3<f32>(0.039, 0.024, 0.086);
  let violet = vec3<f32>(0.42, 0.22, 0.92);
  let cyan   = vec3<f32>(0.14, 0.52, 0.78);

  let n1 = fbm(p * 2.2 + vec2<f32>(t * 0.030, -t * 0.020));
  let n2 = fbm(p * 4.0 - vec2<f32>(t * 0.015,  t * 0.025));
  var col = base + violet * pow(n1, 2.4) * 0.60 + cyan * pow(n2, 3.5) * 0.22;

  // Grade em perspectiva correndo para o horizonte, no rodapé.
  let band = 0.30;
  if (uv.y > 1.0 - band) {
    let d = (uv.y - (1.0 - band)) / band;
    let z = 1.0 / max(d, 0.0015);
    let gx = fract(p.x * z * 0.30);
    let gz = fract(z * 0.22 - t * 0.30);
    let lx = smoothstep(0.025, 0.0, min(gx, 1.0 - gx));
    let lz = smoothstep(0.035, 0.0, min(gz, 1.0 - gz));
    let fade = smoothstep(0.0, 0.30, d) * (1.0 - smoothstep(0.75, 1.0, d));
    col = col + violet * (lx + lz) * fade * 0.55;
  }

  // Varredura fina — o zumbido de painel, não a manchete.
  col = col * (1.0 - 0.045 * step(0.5, fract(frag.y * 0.5)));

  // Vinheta: o conteúdo vive no meio, e o meio precisa ficar mais calmo.
  col = col * smoothstep(1.25, 0.20, length(p));

  return vec4<f32>(col, 1.0);
}
`

export function TechBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Começa no fallback e só desliga quando o WebGPU realmente subiu: assim uma
  // falha no meio do caminho nunca deixa a tela sem fundo nenhum.
  const [gpuOn, setGpuOn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const gpu = (navigator as any).gpu
    if (!canvas || !gpu) return

    let device: any = null
    let raf = 0
    let dead = false
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let cleanupExtra: (() => void) | null = null

    const start = async () => {
      try {
        const adapter = await gpu.requestAdapter()
        if (!adapter || dead) return
        device = await adapter.requestDevice()
        if (!device || dead) return

        const ctx = canvas.getContext("webgpu") as any
        if (!ctx) return
        const format = gpu.getPreferredCanvasFormat()
        ctx.configure({ device, format, alphaMode: "opaque" })

        // NÃO chamar de `module`: o Next proíbe atribuir a esse nome (ele é o
        // `module` do CommonJS e a regra existe para não quebrar o bundler).
        const shader = device.createShaderModule({ code: SHADER })
        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: { module: shader, entryPoint: "vs" },
          fragment: { module: shader, entryPoint: "fs", targets: [{ format }] },
          primitive: { topology: "triangle-list" },
        })

        const uniform = device.createBuffer({
          size: 16,
          usage: 0x40 /* UNIFORM */ | 0x8 /* COPY_DST */,
        })
        const bind = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniform } }],
        })

        // Cap de 1.5 no devicePixelRatio: um shader de tela cheia a 3x num
        // celular retina custa nove vezes mais pixels para um fundo difuso que
        // ninguém encosta o nariz.
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        const resize = () => {
          const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
          const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
          if (canvas.width !== w) canvas.width = w
          if (canvas.height !== h) canvas.height = h
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        const t0 = performance.now()
        let last = 0
        const data = new Float32Array(4)

        const frame = (now: number) => {
          if (dead) return
          // ~30fps: num fundo difuso é indistinguível de 60 e custa metade.
          if (!reduced && now - last < 33) {
            raf = requestAnimationFrame(frame)
            return
          }
          last = now
          data[0] = reduced ? 0 : (now - t0) / 1000
          data[1] = canvas.width
          data[2] = canvas.height
          device.queue.writeBuffer(uniform, 0, data)

          const enc = device.createCommandEncoder()
          const pass = enc.beginRenderPass({
            colorAttachments: [
              {
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0.039, g: 0.024, b: 0.086, a: 1 },
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          })
          pass.setPipeline(pipeline)
          pass.setBindGroup(0, bind)
          pass.draw(3)
          pass.end()
          device.queue.submit([enc.finish()])

          // Movimento parado: um quadro basta, e o laço morre aqui.
          if (!reduced) raf = requestAnimationFrame(frame)
        }

        const onVisibility = () => {
          if (dead || reduced) return
          cancelAnimationFrame(raf)
          if (!document.hidden) raf = requestAnimationFrame(frame)
        }
        document.addEventListener("visibilitychange", onVisibility)

        setGpuOn(true)
        raf = requestAnimationFrame(frame)

        cleanupExtra = () => {
          ro.disconnect()
          document.removeEventListener("visibilitychange", onVisibility)
        }
      } catch {
        // Driver bloqueado, GPU recusada, contexto perdido: fica o fallback.
        setGpuOn(false)
      }
    }

    start()

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      cleanupExtra?.()
      try {
        device?.destroy?.()
      } catch {
        /* device já morto */
      }
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 select-none">
      {/* O caminho de reserva. Fica montado por baixo: se o WebGPU subir, o
          canvas o cobre; se cair no meio do caminho, ele continua ali. */}
      <div className="fl-games-fallback absolute inset-0" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: gpuOn ? 1 : 0 }}
      />
    </div>
  )
}
