"use client"

/**
 * O FUNDO DAS PLATAFORMAS — nebulosa e relevo em WebGPU.
 *
 * ⚠️ ELE MUDOU DE CASA (`components/games/` → `components/platform/`) quando o
 * FINANCEIRO virou plataforma também: servir dois ambientes com o nome de um é
 * nome que mente — a mesma correção que o backend fez ao renomear o
 * `GamesActivityStorage` para `PlatformActivityStorage`.
 *
 * ─── POR QUE WEBGPU CRU, SEM BIBLIOTECA ──────────────────────────────────────
 *
 * O pedido era usar WebGPU. Uma engine (three.js e afins) traria centenas de KB
 * para desenhar UM triângulo de tela cheia com um shader — e este fundo entra
 * numa página que já carrega feed, composer e mercado. O que se usa aqui é a
 * API do navegador direto: ~40 linhas de WGSL e um pipeline. Zero dependência
 * nova, zero peso no First Load das outras rotas (as páginas o importam por
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
 * ─── TRÊS VARIANTES, UM PIPELINE ─────────────────────────────────────────────
 *
 * `games` é roxo com a grade em perspectiva correndo para o horizonte;
 * `finance` é verde com uma fita de candles correndo no rodapé; `business` é
 * preto com uma malha técnica reta. O que muda são três constantes de cor e o
 * bloco do rodapé — o resto (nebulosa fbm, varredura, vinheta e os três freios
 * de bateria) é o mesmo. Cópias do arquivo divergiriam na primeira correção de
 * performance, e a correção sairia só numa das telas.
 *
 * ⚠️ E A VARIANTE `business` TEM A COR DE FORA (`tint`), porque lá quem escolhe
 * é o líder do negócio e não nós (pedido do Alex, 2026-09-09). É o mesmo par
 * (canvas, glow) que pinta a pele `.fl-business` da página, vindo da MESMA
 * função (`platformSkinVars`/`backdropTint`): duas fontes de cor fariam o fundo
 * e os painéis discordarem, que é o tipo de divergência que ninguém reporta e
 * todo mundo vê.
 *
 * ⚠️ A CAMADA DE CIFRÕES DA VARIANTE FINANCE NÃO ESTÁ NO SHADER: ela é CSS
 * (`.fl-money-veil`, em globals.css) e fica montada por CIMA do canvas, para
 * aparecer também para quem não tem WebGPU. Desenhada no shader, ela sumiria
 * justamente nos navegadores que caem no fallback — que é onde a identidade do
 * ambiente mais precisa continuar de pé.
 *
 * ─── BATERIA ─────────────────────────────────────────────────────────────────
 *
 * Um shader de tela cheia rodando para sempre é caro num laptop. Os freios,
 * em ordem de quanto economizam:
 *
 *  1. TETO DE PIXELS (~900k por quadro, ver `MAX_PIXELS`). O custo é por
 *     pixel, então quem paga a conta é o TAMANHO DA JANELA, não o aparelho —
 *     um monitor 4K são 8 milhões de pixels. O canvas renderiza abaixo da
 *     resolução da tela e o CSS estica; num fundo difuso com vinheta isso é
 *     invisível.
 *  2. HASH SEM `sin()` e FBM DE 3 OITAVAS: eram 40 transcendentais por pixel.
 *  3. `prefers-reduced-motion` desenha UM quadro e para.
 *  4. A aba escondida (`visibilitychange`) suspende o laço.
 *  5. O passo é limitado a ~30fps, indistinguível de 60 num fundo difuso.
 *
 * ⚠️ ESTE FUNDO DIVIDE A GPU COM O COMPOSITOR DA PÁGINA. Quando ele fica caro
 * demais, o sintoma não é "o fundo travou" — é a ROLAGEM engasgando, porque o
 * navegador está esperando a GPU terminar o quadro do papel de parede. Foi
 * exatamente o que aconteceu (Alex, 2026-09-09: "o games está muito pesado e
 * travando"). Ao mexer no shader, pense no custo POR PIXEL.
 */

import { useEffect, useRef, useState } from "react"

// A tipagem de WebGPU (@webgpu/types) não é dependência do projeto, e adicioná-la
// puxaria tipos globais para o build inteiro por causa de um arquivo. O contrato
// usado aqui é pequeno e está todo dentro deste módulo.

export type BackdropVariant = "games" | "finance" | "business"

/**
 * A cor de limpeza do quadro e as três da nebulosa, por ambiente. Ficam num
 * lugar só porque a MESMA base precisa valer no `clearValue` do render pass e
 * dentro do shader — divergindo, o primeiro quadro pisca numa cor e os
 * seguintes noutra.
 */
const PALETTE: Record<
  BackdropVariant,
  { clear: [number, number, number]; base: string; a: string; b: string }
> = {
  // Roxo profundo (#0a0616) com violeta e um ciano frio ao fundo.
  games: {
    clear: [0.039, 0.024, 0.086],
    base: "vec3<f32>(0.039, 0.024, 0.086)",
    a: "vec3<f32>(0.42, 0.22, 0.92)",
    b: "vec3<f32>(0.14, 0.52, 0.78)",
  },
  // Verde profundo (#05140F) com o teal da Carteira (#16B79A) e o verde-fundo
  // (#00876B) — as MESMAS cores que a pele `.fl-finance` usa nas superfícies.
  finance: {
    clear: [0.02, 0.078, 0.059],
    base: "vec3<f32>(0.020, 0.078, 0.059)",
    a: "vec3<f32>(0.086, 0.717, 0.604)",
    b: "vec3<f32>(0.000, 0.529, 0.420)",
  },
  // Preto com névoa cinza-aço. É só o PADRÃO: a comunidade de negócio manda a
  // cor escolhida pelo líder em `tint`, e esta entrada vale enquanto ela não
  // chegou (primeiro quadro, ou uma tela que monte o fundo sem passar cor).
  business: {
    clear: [0.031, 0.035, 0.043],
    base: "vec3<f32>(0.031, 0.035, 0.043)",
    a: "vec3<f32>(0.557, 0.592, 0.647)",
    b: "vec3<f32>(0.290, 0.310, 0.345)",
  },
}

/** "#08090B" → [0.031, 0.035, 0.043]. */
function norm(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  return [
    (parseInt(s.slice(0, 2), 16) || 0) / 255,
    (parseInt(s.slice(2, 4), 16) || 0) / 255,
    (parseInt(s.slice(4, 6), 16) || 0) / 255,
  ]
}

const vec = (c: [number, number, number]) =>
  `vec3<f32>(${c[0].toFixed(3)}, ${c[1].toFixed(3)}, ${c[2].toFixed(3)})`

/**
 * A paleta que este quadro vai usar: a do ambiente, ou a que veio de fora.
 *
 * A segunda cor da névoa (`b`) é derivada e não pedida: ela existe só para dar
 * profundidade à primeira, e pedir DUAS cores ao líder seria pedir que ele
 * combinasse duas coisas para resolver uma.
 */
function paletteFor(variant: BackdropVariant, tint?: { canvas: string; glow: string }) {
  if (!tint) return PALETTE[variant]
  const c = norm(tint.canvas)
  const g = norm(tint.glow)
  const b: [number, number, number] = [
    g[0] + (c[0] - g[0]) * 0.45,
    g[1] + (c[1] - g[1]) * 0.45,
    g[2] + (c[2] - g[2]) * 0.45,
  ]
  return { clear: c, base: vec(c), a: vec(g), b: vec(b) }
}

/** O rodapé de cada ambiente: a grade em fuga (games) × a fita de candles (finance). */
const FLOOR: Record<BackdropVariant, string> = {
  games: `
  // Grade em perspectiva correndo para o horizonte, no rodapé.
  let band = 0.30;
  if (uv.y > 1.0 - band) {
    let d = (uv.y - (1.0 - band)) / band;
    let z = 1.0 / max(d, 0.0015);
    let gx = fract(p.x * z * 0.30);
    let gz = fract(z * 0.22 - t * 0.30);
    // ⚠️ A SUAVIZAÇÃO ACOMPANHOU O TETO DE PIXELS: renderizando abaixo da
    // resolução da tela, cada pixel cobre mais espaço, e uma linha fina demais
    // vira sub-pixel e CINTILA ao andar. Engrossar a rampa do smoothstep na
    // mesma proporção devolve a espessura aparente e mata o serrilhado.
    let lx = smoothstep(0.038, 0.0, min(gx, 1.0 - gx));
    let lz = smoothstep(0.050, 0.0, min(gz, 1.0 - gz));
    let fade = smoothstep(0.0, 0.30, d) * (1.0 - smoothstep(0.75, 1.0, d));
    col = col + cA * (lx + lz) * fade * 0.55;
  }
`,
  // A FITA DE CANDLES: colunas de largura fixa correndo para a esquerda, cada
  // uma com altura e sinal sorteados pelo índice. Nada aqui é lido de mercado
  // nenhum, e é isso que a mantém honesta — é textura de ambiente, não cotação.
  // Um gráfico "de verdade" no papel de parede prometeria um número que
  // ninguém apurou, e a tela do Mercado está a uma aba de distância.
  finance: `
  let band = 0.34;
  if (uv.y > 1.0 - band) {
    let d  = (uv.y - (1.0 - band)) / band;          // 0 no topo da faixa, 1 no rodapé
    let x  = uv.x * 22.0 + t * 0.45;                // as colunas correm para a esquerda
    let i  = floor(x);
    let f  = fract(x);
    let h  = 0.20 + 0.66 * hash(vec2<f32>(i, 3.0)); // altura do corpo
    let up = step(0.42, hash(vec2<f32>(i, 7.0)));   // alta (cA) × baixa (cB)
    let bodyMask = step(0.22, f) * step(f, 0.78) * step(1.0 - h, d);
    let wickMask = step(0.47, f) * step(f, 0.53) * step(1.0 - h - 0.14, d);
    let fade = smoothstep(0.0, 0.22, d) * (1.0 - smoothstep(0.70, 1.0, d));
    let tone = mix(cB, cA, up);
    col = col + tone * (bodyMask * 0.42 + wickMask * 0.30) * fade;
  }
`,
  // A MALHA TÉCNICA: linhas RETAS no rodapé, derivando devagar para a esquerda.
  // Reta de propósito — a grade em fuga é a assinatura do games, e a fita de
  // candles prometeria mercado. "Meu negócio" é barbearia, padaria ou
  // marcenaria: o rodapé aqui é papel milimetrado, que não diz nada sobre o
  // ramo de ninguém.
  business: `
  let band = 0.30;
  if (uv.y > 1.0 - band) {
    let d  = (uv.y - (1.0 - band)) / band;
    let gx = fract(uv.x * 26.0 - t * 0.020);
    let gy = fract(uv.y * 26.0);
    // Mesma compensação de resolução da grade de games.
    let lx = smoothstep(0.045, 0.0, min(gx, 1.0 - gx));
    let ly = smoothstep(0.045, 0.0, min(gy, 1.0 - gy));
    let fade = smoothstep(0.0, 0.26, d) * (1.0 - smoothstep(0.72, 1.0, d));
    col = col + cA * (lx * 0.50 + ly * 0.32) * fade * 0.42;
  }
`,
}

/** O caminho de reserva (CSS) de cada ambiente. Ver globals.css. */
const FALLBACK_CLASS: Record<BackdropVariant, string> = {
  games: "fl-games-fallback",
  finance: "fl-finance-fallback",
  business: "fl-business-fallback",
}

function shaderFor(variant: BackdropVariant, pal: { base: string; a: string; b: string }) {
  return /* wgsl */ `
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

// ⚠️ SEM sin(). O hash clássico -- fract(sin(dot(p, k)) * 43758.5) -- chama uma
// transcendental, e ela é chamada QUATRO vezes por oitava, DUAS vezes por
// pixel: eram 40 sin() por pixel, ~187 milhões por quadro numa tela cheia.
// Numa GPU integrada isso é o suficiente para o scroll da página começar a
// engasgar, porque o compositor disputa a mesma GPU. Este é o hash12 de Dave
// Hoskins — só multiplicação, soma e fract, com a mesma cara de ruído.
fn hash(p : vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + vec3<f32>(dot(p3, vec3<f32>(p3.y, p3.z, p3.x) + vec3<f32>(33.33)));
  return fract((p3.x + p3.y) * p3.z);
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

// ⚠️ TRÊS OITAVAS, NÃO CINCO. A 4ª e a 5ª entram com amplitude 0.0625 e
// 0.03125 e depois passam por pow(n, 2.4) e pela vinheta — o que elas
// acrescentam é um detalhe que não sobrevive ao próprio pós-processamento,
// mas custa 8 hashes por pixel. O fator no fim devolve a faixa das cinco
// (0.96875 / 0.875), senão a névoa sairia mais escura do que era.
fn fbm(q : vec2<f32>) -> f32 {
  var p = q;
  var v = 0.0;
  var amp = 0.5;
  for (var i = 0; i < 3; i = i + 1) {
    v = v + amp * noise(p);
    p = p * 2.02;
    amp = amp * 0.5;
  }
  return v * 1.107;
}

@fragment
fn fs(@builtin(position) frag : vec4<f32>) -> @location(0) vec4<f32> {
  let res = vec2<f32>(u.w, u.h);
  let uv = frag.xy / res;
  let p = (frag.xy - 0.5 * res) / res.y;
  let t = u.time;

  let base = ${pal.base};
  let cA   = ${pal.a};
  let cB   = ${pal.b};

  let n1 = fbm(p * 2.2 + vec2<f32>(t * 0.030, -t * 0.020));
  let n2 = fbm(p * 4.0 - vec2<f32>(t * 0.015,  t * 0.025));
  var col = base + cA * pow(n1, 2.4) * 0.60 + cB * pow(n2, 3.5) * 0.22;
${FLOOR[variant]}
  // Varredura fina — o zumbido de painel, não a manchete.
  col = col * (1.0 - 0.045 * step(0.5, fract(frag.y * 0.5)));

  // Vinheta: o conteúdo vive no meio, e o meio precisa ficar mais calmo.
  col = col * smoothstep(1.25, 0.20, length(p));

  return vec4<f32>(col, 1.0);
}
`
}

export function TechBackdrop({
  variant = "games",
  tint,
}: {
  variant?: BackdropVariant
  /** Só a variante `business` usa: o par (canvas, glow) escolhido pelo líder. */
  tint?: { canvas: string; glow: string }
}) {
  // ⚠️ POR VALOR, NÃO PELO OBJETO: `tint` é um literal e nasce novo a cada
  // render do pai — nas dependências do efeito ele refaria o pipeline inteiro
  // sem que cor nenhuma tivesse mudado.
  const tintCanvas = tint?.canvas ?? null
  const tintGlow = tint?.glow ?? null
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
    // ⚠️ A cor entra no EFEITO: trocar de cor recompila o shader. Custa um
    // pipeline novo, mas isso só acontece quando o líder mexe no seletor —
    // não a cada quadro, e não a cada render.
    const pal = paletteFor(
      variant,
      tintCanvas && tintGlow ? { canvas: tintCanvas, glow: tintGlow } : undefined
    )
    const clear = pal.clear

    const start = async () => {
      try {
        // ⚠️ "low-power" pede a GPU INTEGRADA. Num laptop com placa dedicada,
        // o padrão pode acordar a discreta para desenhar um papel de parede —
        // ela esquenta, o ventilador liga e a bateria vai embora por um fundo
        // que ninguém está olhando. Se não houver integrada, o navegador
        // devolve a que existe.
        const adapter = await gpu.requestAdapter({ powerPreference: "low-power" })
        if (!adapter || dead) return
        device = await adapter.requestDevice()
        if (!device || dead) return

        const ctx = canvas.getContext("webgpu") as any
        if (!ctx) return
        const format = gpu.getPreferredCanvasFormat()
        ctx.configure({ device, format, alphaMode: "opaque" })

        // NÃO chamar de `module`: o Next proíbe atribuir a esse nome (ele é o
        // `module` do CommonJS e a regra existe para não quebrar o bundler).
        const shader = device.createShaderModule({ code: shaderFor(variant, pal) })
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

        /**
         * ⚠️ O TETO É DE PIXELS, e não um fator de DPI — e é ele que faz este
         * fundo custar o MESMO em toda tela.
         *
         * O custo de um shader de tela cheia é por PIXEL, então o preço não é
         * do dispositivo: é do tamanho da janela. Um cap de DPR (o que havia
         * aqui) protegia o celular retina e deixava passar justamente o pior
         * caso — um monitor grande, onde 1920×1080 já são 2 milhões de pixels
         * e um 4K são 8. Com o teto, cada tela renderiza no máximo ~900k e o
         * CSS estica (o canvas é `h-full w-full`): o celular continua nítido
         * porque cabe inteiro no teto, e o 4K passa a pagar o mesmo que o
         * laptop.
         *
         * Escalar é invisível AQUI porque o fundo é uma névoa desfocada com
         * vinheta — não há uma borda dura para o olho comparar. Não faça isto
         * num canvas com texto ou traço fino.
         */
        const MAX_PIXELS = 900_000
        /**
         * ⚠️ O TETO CEDE SOZINHO NUMA MÁQUINA QUE NÃO ESTÁ DANDO CONTA.
         *
         * 900k é um número escolhido no papel, e papel nenhum conhece a GPU de
         * quem abriu a página — integrada antiga, driver ruim, notebook em
         * economia de bateria, quinze abas disputando. Se o laço não sustenta
         * o passo, este fator corta o teto pela metade (até duas vezes, chão
         * de 225k) em vez de deixar a página inteira engasgando.
         *
         * Só desce, nunca sobe: um fundo que oscila de nitidez enquanto a
         * pessoa lê é pior do que um fundo permanentemente mais macio.
         */
        let budget = 1
        const resize = () => {
          const cssW = Math.max(1, canvas.clientWidth)
          const cssH = Math.max(1, canvas.clientHeight)
          const scale = Math.min(1, Math.sqrt((MAX_PIXELS * budget) / (cssW * cssH)))
          const w = Math.max(1, Math.round(cssW * scale))
          const h = Math.max(1, Math.round(cssH * scale))
          // ⚠️ OS DOIS LADOS. A checagem antiga só olhava a largura, então
          // encolher a janela SÓ na vertical não redimensionava o buffer e a
          // imagem ficava esticada até alguém mexer na largura.
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        const t0 = performance.now()
        let last = 0
        const data = new Float32Array(4)
        // Amostragem do passo real, para o teto acima saber se está caro.
        let drawn = 0
        let windowStart = 0

        const frame = (now: number) => {
          if (dead) return
          // ~30fps: num fundo difuso é indistinguível de 60 e custa metade.
          if (!reduced && now - last < 33) {
            raf = requestAnimationFrame(frame)
            return
          }
          last = now

          // A CADA 60 QUADROS, pergunta se o passo está sendo sustentado.
          // 60 quadros a 30fps são ~2s: janela grande o bastante para não
          // reagir a um engasgo isolado (uma imagem que chegou, uma aba que
          // abriu) e pequena o bastante para a pessoa não passar a visita
          // inteira no modo pesado. O corte é medido em QUADROS POR SEGUNDO
          // efetivos, não no custo do shader — o que importa não é ele estar
          // caro, é a página não estar acompanhando.
          if (!reduced) {
            drawn += 1
            if (!windowStart) windowStart = now
            else if (drawn >= 60) {
              const fps = (drawn * 1000) / (now - windowStart)
              if (fps < 20 && budget > 0.25) {
                budget = budget / 2
                resize()
              }
              drawn = 0
              windowStart = now
            }
          }
          data[0] = reduced ? 0 : (now - t0) / 1000
          data[1] = canvas.width
          data[2] = canvas.height
          device.queue.writeBuffer(uniform, 0, data)

          const enc = device.createCommandEncoder()
          const pass = enc.beginRenderPass({
            colorAttachments: [
              {
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: clear[0], g: clear[1], b: clear[2], a: 1 },
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
  }, [variant, tintCanvas, tintGlow])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 select-none">
      {/* O caminho de reserva. Fica montado por baixo: se o WebGPU subir, o
          canvas o cobre; se cair no meio do caminho, ele continua ali. */}
      <div className={`${FALLBACK_CLASS[variant]} absolute inset-0`} />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: gpuOn ? 1 : 0 }}
      />
      {/* O SÍMBOLO DE DINHEIRO do ambiente financeiro (pedido do Alex: "no fundo
          algum símbolo de dinheiro"). Por CIMA do canvas de propósito — ver o
          bloco de comentário do topo. */}
      {variant === "finance" && <div className="fl-money-veil absolute inset-0" />}
    </div>
  )
}
