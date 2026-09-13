"use client";

/**
 * CAMPO TÉRMICO — fundo WebGPU.
 *
 * O que ele desenha: convecção lenta com ISOLINHAS. Isolinha é curva de
 * nível — a mesma coisa que um mapa térmico de verdade usa —, então o fundo
 * continua falando a língua da prancha em vez de ser papel de parede.
 *
 * ⚠️ Os freios NÃO moram aqui: eles estão em `@/gpu/loop`, compartilhados
 * com a chama do queimador. Escritos duas vezes, divergiriam na primeira
 * correção — e o que ficasse para trás é justamente o que ninguém mede,
 * porque o sintoma é rolagem travada e a causa parece estar em outro lugar.
 *
 * ── DEGRADAÇÃO ───────────────────────────────────────────────────────────
 * O gradiente CSS fica montado POR BAIXO do canvas, sempre. Sem WebGPU, ou
 * se o device cair no meio, a cor continua lá. A tela nunca fica preta.
 *
 * ⚠️ Comentário dentro do bloco WGSL não pode ter crase nem cifrão-chave:
 * é template string, e a crase fecha o shader no meio. O erro aparece como
 * falha de parse do TypeScript, não do shader.
 */

import { useEffect, useRef } from "react";
import { getGpu, makePipeline } from "./gpu/device";
import { runGpuLoop } from "./gpu/loop";

/**
 * Teto de pixels por quadro. Não é teto de DPR: o custo de um shader é POR
 * PIXEL, e quem paga é o monitor grande, não o celular retina.
 */
const MAX_PIXELS = 900_000;

const WGSL = `
struct U {
  res  : vec2f,
  time : f32,
  warm : f32,
};
@group(0) @binding(0) var<uniform> u : U;

@vertex
fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

// Hash sem sin(): transcendental por pixel e por oitava e a conta nao fecha
// em GPU integrada. Dave Hoskins, hash12.
fn hash12(p : vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn vnoise(p : vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let a = hash12(i);
  let b = hash12(i + vec2f(1.0, 0.0));
  let c = hash12(i + vec2f(0.0, 1.0));
  let d = hash12(i + vec2f(1.0, 1.0));
  let w = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

// Tres oitavas. A quarta entra com amplitude 0.0625 e nao sobrevive as
// isolinhas nem a vinheta: custa 4 hashes por pixel para nao aparecer.
// O fator devolve a faixa cheia 0..1 que a soma truncada perde.
fn fbm(p0 : vec2f) -> f32 {
  var p = p0;
  var s = 0.0;
  var a = 0.5;
  for (var i = 0; i < 3; i++) {
    s = s + a * vnoise(p);
    p = p * 2.02;
    a = a * 0.5;
  }
  return s * 1.1428;
}

@fragment
fn fs(@builtin(position) frag : vec4f) -> @location(0) vec4f {
  let uv  = frag.xy / u.res;
  let asp = u.res.x / max(u.res.y, 1.0);
  let q   = vec2f(uv.x * asp, uv.y);
  let t   = u.time;

  // Conveccao: o campo sobe. A deriva entra como domain warp, que e o que
  // faz a pluma encurvar em vez de escorrer reta.
  let warp = fbm(q * 1.60 + vec2f(0.0, -t * 0.035)) - 0.5;
  let f    = fbm(q * 2.40 + vec2f(warp * 0.90, -t * 0.055 + warp * 0.40));

  // Isolinhas. fwidth antialiasa a banda; sem ele a linha cintila ao andar,
  // e cintilacao num fundo e a coisa mais cansativa que existe numa pagina.
  let bands = 7.0;
  let band  = fract(f * bands);
  let dist  = min(band, 1.0 - band);
  let aa    = max(fwidth(f * bands) * 1.25, 1e-4);
  let iso   = 1.0 - smoothstep(0.0, aa, dist);

  let base = vec3f(0.118, 0.129, 0.141);
  let up   = vec3f(0.196, 0.220, 0.240);
  var col  = mix(base, up, smoothstep(0.30, 0.88, f));

  col = col + vec3f(0.15, 0.19, 0.23) * iso * 0.44;

  // Azul de chama regulada, subindo do rodape.
  let cool = smoothstep(0.0, 0.60, uv.y);
  col = col + vec3f(0.035, 0.125, 0.310) * cool * 0.26 * (0.40 + f);

  // Brasa: so no ultimo quinto e fraca. O laranja e reservado a calor;
  // espalhado, ele perde a funcao de dizer alguma coisa.
  let hot = smoothstep(0.87, 1.0, uv.y);
  col = col + vec3f(0.42, 0.17, 0.03) * hot * u.warm * (0.30 + f * 0.5);

  let v = 1.0 - smoothstep(0.48, 1.22, length((uv - 0.5) * vec2f(asp, 1.0)));
  col = col * mix(0.80, 1.0, v);

  return vec4f(col * u.warm, 1.0);
}
`;

export default function ThermalField() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let disposed = false;
    let stop: (() => void) | null = null;

    (async () => {
      const gpu = await getGpu();
      if (!gpu || disposed) return;
      const { device, format } = gpu;

      const ctx = canvas.getContext("webgpu");
      if (!ctx) return;
      ctx.configure({ device, format, alphaMode: "opaque" });

      const pipeline = await makePipeline(device, WGSL, format, "campo-termico");
      if (!pipeline || disposed) return;

      const ubo = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: ubo } }],
      });
      const data = new Float32Array(4);

      if (disposed) return;

      stop = runGpuLoop(canvas, host, MAX_PIXELS, {
        draw: (secs) => {
          // Entrada suave: o campo não aparece de estalo no primeiro quadro.
          const warm = Math.min(1, secs / 1.1);
          data[0] = canvas.width;
          data[1] = canvas.height;
          data[2] = secs;
          data[3] = warm;
          device.queue.writeBuffer(ubo, 0, data);

          const enc = device.createCommandEncoder();
          const pass = enc.beginRenderPass({
            colorAttachments: [
              {
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0.118, g: 0.129, b: 0.141, a: 1 },
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bind);
          pass.draw(3);
          pass.end();
          device.queue.submit([enc.finish()]);
        },
      });
    })();

    return () => {
      disposed = true;
      stop?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    >
      {/* Reserva: mesmas cores, pintado UMA vez. Fica montado sempre. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, #22282e 0%, #1e2124 46%, #191c1f 100%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Véu: garante contraste do texto sobre qualquer quadro do campo. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgb(30 33 36 / 0.42), rgb(30 33 36 / 0.18) 42%, rgb(30 33 36 / 0.86))",
        }}
      />
    </div>
  );
}
