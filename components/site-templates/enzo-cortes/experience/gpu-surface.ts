/// <reference types="@webgpu/types" />

// A SUPERFÍCIE LUMINOSA do hero, em WebGPU — um aprimoramento, nunca um
// requisito.
//
// ── POR QUE ELA É BARATA, E TEM QUE SER ──────────────────────────────────
// A plataforma já pagou a conta de um shader de tela cheia (2026-09-09): o
// custo é POR PIXEL e ele divide a GPU com o compositor, então quem engasga é
// a rolagem inteira. Esta superfície obedece aos quatro freios:
//
//   1. SÓ o hero, nunca a janela — o canvas é do tamanho da seção.
//   2. TETO DE PIXELS (~700k), com resolução reduzida e esticada pelo CSS: a
//      imagem é luz difusa, sem borda dura para o olho comparar.
//   3. PAUSA fora da tela (IntersectionObserver) e com a aba escondida.
//   4. NENHUM rAF próprio: o quadro anda no `gsap.ticker`, o mesmo relógio de
//      todas as animações do site, a ~30fps.
//
// E o shader é aritmético: duas gaussianas, uma grade e uma varredura — sem
// ruído fractal, sem `sin()` por pixel.
//
// ⚠️ SHADER INVÁLIDO NÃO PODE QUEBRAR NADA: qualquer falha devolve `null` e a
// luz de CSS (que está SEMPRE montada por baixo) segue fazendo o papel.
//
// ⚠️ CRASE DENTRO DO BLOCO WGSL FECHA A TEMPLATE STRING. Não use.

import gsap from "gsap";

const WGSL = /* wgsl */ `
struct U { a: vec4f, b: vec4f };
@group(0) @binding(0) var<uniform> u: U;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  return vec4f(p[i], 0.0, 1.0);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let m = u.a.zw;
  let t = u.b.x;
  let uv = pos.xy / res;
  let asp = vec2f(res.x / res.y, 1.0);
  let d = distance(uv * asp, m * asp);
  let wide = exp(-d * d * 5.0);
  let core = exp(-d * d * 42.0);

  let cell = fract(uv * vec2f(12.0, 7.0));
  let gx = 1.0 - smoothstep(0.0, 0.012, min(cell.x, 1.0 - cell.x));
  let gy = 1.0 - smoothstep(0.0, 0.02, min(cell.y, 1.0 - cell.y));
  let grid = max(gx, gy) * wide;

  let band = uv.x * 0.8 + uv.y * 0.35 - fract(t * 0.04) * 2.2 + 0.4;
  let sweep = exp(-band * band * 60.0) * 0.06;

  let volt = vec3f(0.89, 0.725, 0.31);
  let metal = vec3f(0.68, 0.70, 0.71);
  let col = volt * (wide * 0.13 + core * 0.22 + grid * 0.18) + metal * sweep;
  let a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  return vec4f(col, a);
}
`;

export type Surface = { stop: () => void };

const MAX_PIXELS = 700_000;

export async function startSurface(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  onReady: () => void,
): Promise<Surface | null> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return null;

  let device: GPUDevice;
  let pipeline: GPURenderPipeline;
  let ctx: GPUCanvasContext;
  let buffer: GPUBuffer;
  let bind: GPUBindGroup;

  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) return null;
    device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    const c = canvas.getContext("webgpu");
    if (!c) return null;
    ctx = c;
    ctx.configure({ device, format, alphaMode: "premultiplied" });

    const shader = device.createShaderModule({ code: WGSL, label: "enzo-hero" });
    device.pushErrorScope("validation");
    pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: shader, entryPoint: "vs" },
      fragment: {
        module: shader,
        entryPoint: "fs",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    const err = await device.popErrorScope();
    if (err) {
      console.error(`[enzo-hero] pipeline inválido: ${err.message}`);
      return null;
    }
    buffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }],
    });
  } catch {
    return null;
  }

  const data = new Float32Array(8);
  const mouse = { x: 0.72, y: 0.35, tx: 0.72, ty: 0.35 };
  let visible = true;
  let last = 0;
  let firstFrame = true;
  let dead = false;

  const resize = () => {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    let w = Math.max(1, Math.round(r.width * dpr));
    let h = Math.max(1, Math.round(r.height * dpr));
    const k = Math.sqrt(Math.min(1, MAX_PIXELS / (w * h)));
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  resize();

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = (e.clientY - r.top) / r.height;
  };

  const frame = (time: number) => {
    if (!visible || dead || document.hidden) return;
    if (time - last < 1 / 30) return; // ~30fps
    last = time;
    mouse.x += (mouse.tx - mouse.x) * 0.12;
    mouse.y += (mouse.ty - mouse.y) * 0.12;
    data[0] = canvas.width;
    data[1] = canvas.height;
    data[2] = mouse.x;
    data[3] = mouse.y;
    data[4] = time;
    try {
      device.queue.writeBuffer(buffer, 0, data);
      const enc = device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.draw(3);
      pass.end();
      device.queue.submit([enc.finish()]);
      if (firstFrame) {
        firstFrame = false;
        onReady();
      }
    } catch {
      stop();
    }
  };

  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
  });
  io.observe(host);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  host.addEventListener("pointermove", onMove);
  gsap.ticker.add(frame);
  device.lost.then(() => stop());

  function stop() {
    if (dead) return;
    dead = true;
    gsap.ticker.remove(frame);
    io.disconnect();
    ro.disconnect();
    host.removeEventListener("pointermove", onMove);
    try {
      buffer.destroy();
    } catch {
      /* já destruído */
    }
  }

  return { stop };
}
