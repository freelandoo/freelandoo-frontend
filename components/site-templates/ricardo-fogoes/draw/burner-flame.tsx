"use client";

/**
 * A CHAMA DO QUEIMADOR — WebGPU.
 *
 * Fogo de verdade num queimador a gás não é um traço aceso: são 24 jatos
 * saindo do espalhador, cada um com altura própria, flamejando fora de fase.
 * É isso que o shader desenha, em coordenadas POLARES — que é a geometria
 * natural da peça, e o que faz um jato ser um jato em vez de uma mancha.
 *
 * ── A divisão de trabalho com o SVG ──────────────────────────────────────
 * O traço azul do SVG por baixo NÃO foi removido, e não é redundância:
 *
 *   SVG (estável)  = o cone interno, que num maçarico bem regulado é firme
 *   WebGPU (vivo)  = o envelope externo, que é o que de fato flameja
 *
 * É assim que uma chama de gás se comporta, e é também o que mantém a
 * degradação honesta: sem WebGPU (Safari e Firefox vão e voltam nisso),
 * o desenho continua aceso — só perde o movimento.
 *
 * ── Composição ───────────────────────────────────────────────────────────
 * O canvas é TRANSPARENTE, por alfa pré-multiplicado no shader. Onde não há
 * chama, alfa é zero e o pixel não existe.
 *
 * ⚠️ NÃO trocar isto por `mix-blend-mode`. A primeira versão fazia assim e
 * saiu um retângulo preto opaco por cima da foto: o parallax aplica
 * `transform` no pai, `transform` cria contexto de empilhamento, e o blend
 * fica isolado sem enxergar a página atrás.
 *
 * ── Cor ──────────────────────────────────────────────────────────────────
 * Branco-azulado na base, ciano, azul, e violeta na ponta. NENHUM laranja:
 * chama laranja num queimador é combustão incompleta, e o site inteiro é
 * construído sobre essa distinção. Pintar fogo bonito e errado aqui
 * contradiria a página ao lado.
 *
 * ⚠️ Comentário dentro do bloco WGSL não pode ter crase nem cifrão-chave:
 * é template string, e a crase fecha o shader no meio.
 */

import { useEffect, useRef } from "react";
import { getGpu, makePipeline } from "../gpu/device";
import { runGpuLoop } from "../gpu/loop";

/** A chama é o foco da tela, mas é macia: não precisa de nitidez de texto. */
const MAX_PIXELS = 420_000;

const WGSL = `
struct U {
  res  : vec2f,
  time : f32,
  warm : f32,
};
@group(0) @binding(0) var<uniform> u : U;

const TAU  : f32 = 6.28318530718;
const JETS : f32 = 24.0;

@vertex
fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

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

fn fbm(p0 : vec2f) -> f32 {
  var p = p0;
  var s = 0.0;
  var a = 0.5;
  for (var i = 0; i < 3; i++) {
    s = s + a * vnoise(p);
    p = p * 2.03;
    a = a * 0.5;
  }
  return s * 1.1428;
}

@fragment
fn fs(@builtin(position) frag : vec4f) -> @location(0) vec4f {
  let uv  = frag.xy / u.res;
  let asp = u.res.x / max(u.res.y, 1.0);

  // Corrige o aspecto para o disco continuar REDONDO numa caixa que nao e
  // quadrada. Sem isto os jatos saem ovalados e a peca deixa de parecer um
  // queimador visto de cima.
  var p = (uv - vec2f(0.5, 0.5)) * 2.0;
  p = vec2f(p.x * max(asp, 1.0), p.y / min(asp, 1.0));

  let r = length(p);
  let a = atan2(p.y, p.x);
  let t = u.time;

  // R0 e o aro do espalhador; R1 o alcance maximo do jato. Os dois batem
  // com o raio da coroa desenhada no SVG por baixo.
  let R0 = 0.42;
  let R1 = 0.80;

  // Coordenada dentro do jato: qual jato, e onde dentro dele.
  let jf = (a / TAU + 0.5) * JETS;
  let ji = floor(jf);
  let jt = fract(jf) * 2.0 - 1.0;

  // Cada jato flameja com fase propria. Sem o indice do jato entrando no
  // ruido, os 24 subiriam e desceriam JUNTOS, que le como pulsacao de
  // lampada em vez de fogo.
  let fl = fbm(vec2f(ji * 3.7, t * 1.00));
  let h  = mix(R0 + 0.15, R1, 0.42 + 0.58 * fl);

  // Progressao ao longo do jato: 0 na base, 1 na ponta.
  let prog = clamp((r - R0) / max(h - R0, 1e-4), 0.0, 1.4);

  // O jato ABRE conforme sobe.
  let w   = 0.30 + 0.58 * prog;
  let lat = exp(-(jt * jt) / (w * w) * 1.6);

  // Turbulencia rolando para FORA = a chama subindo.
  let turb = fbm(vec2f(a * 9.0, r * 13.0 - t * 2.0));

  var body = lat * (1.0 - smoothstep(0.52, 1.0, prog));
  body = body * (0.52 + 0.78 * turb);
  body = body * smoothstep(-0.06, 0.10, prog);

  // Nucleo: o cone interno, colado na base e bem mais quente.
  let core = lat * exp(-prog * 6.5) * smoothstep(-0.02, 0.06, prog);

  // Halo: o brilho difuso que um queimador aceso joga em volta.
  let hd   = (r - (R0 + 0.09)) * 4.4;
  let halo = exp(-hd * hd) * 0.26;

  let cHot  = vec3f(0.90, 0.97, 1.00);
  let cMid  = vec3f(0.56, 0.83, 1.00);
  let cBlue = vec3f(0.12, 0.43, 0.91);
  let cTip  = vec3f(0.07, 0.16, 0.52);

  var col = mix(cHot, cMid, smoothstep(0.0, 0.30, prog));
  col = mix(col, cBlue, smoothstep(0.22, 0.62, prog));
  col = mix(col, cTip,  smoothstep(0.60, 1.00, prog));

  let inten = body * 1.30 + core * 1.55;

  // ⚠️ ALFA PRE-MULTIPLICADO, e o canvas e TRANSPARENTE.
  //
  // A primeira versao pintava preto e contava com mix-blend-mode: screen
  // para o preto sumir. Nao funciona: o parallax aplica transform no pai, e
  // transform CRIA CONTEXTO DE EMPILHAMENTO — o blend fica isolado, nao
  // enxerga a pagina atras, e o resultado e um quadrado preto opaco por
  // cima da foto.
  //
  // Alfa resolve sem depender de empilhamento nenhum: onde nao ha chama,
  // alfa e zero e o pixel nao existe.
  // ⚠️ NAO chamar esta variavel de "a": ja existe um "a" oito linhas acima,
  // que e o ANGULO. Redeclarar no mesmo escopo e erro de WGSL, o pipeline
  // nasce invalido e o draw para de pintar SEM LANCAR EXCECAO — o canvas
  // fica transparente e parece que a GPU nao existe.
  let alp = clamp(inten + halo, 0.0, 1.0) * u.warm;

  // Onde so ha halo (o brilho difuso), a cor e o azul de base em vez da
  // rampa — senao a borda externa puxaria para o violeta da ponta.
  let mixk = clamp(inten / max(inten + halo, 1e-4), 0.0, 1.0);
  let rgb  = mix(cBlue, col, mixk);

  return vec4f(rgb * alp, alp);
}
`;

export default function BurnerFlame({ className = "" }: { className?: string }) {
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
      // Sem GPU o traço do SVG por baixo continua aceso. Não é erro.
      if (!gpu || disposed) return;
      const { device, format } = gpu;

      const ctx = canvas.getContext("webgpu");
      if (!ctx) return;
      ctx.configure({ device, format, alphaMode: "premultiplied" });

      const pipeline = await makePipeline(device, WGSL, format, "chama");
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
          // A chama ACENDE junto com a ignição do SVG e não de estalo no
          // primeiro quadro.
          //
          // ⚠️ ESTES DOIS NÚMEROS SÃO O ESPELHO DO CSS (`.ignite path`, em
          // globals.css): 0,48s é quando a primeira saída da coroa acende,
          // e 2,6s é o tempo que o anel leva para fechar. Encurtar só aqui
          // faz o envelope externo aparecer antes do cone interno — fogo
          // antes do bico, e nada acusa: a cena continua desenhando.
          const warm = Math.min(1, Math.max(0, (secs - 0.48) / 2.6));
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
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
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
      className={`pointer-events-none absolute inset-0 ${className}`}
    >
      {/*
        Sem `mix-blend-mode`: o canvas é transparente por construção (alfa
        pré-multiplicado no shader). Blend dependeria do contexto de
        empilhamento, e o parallax do pai já cria um — o que transformava a
        chama num retângulo preto.
      */}
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
