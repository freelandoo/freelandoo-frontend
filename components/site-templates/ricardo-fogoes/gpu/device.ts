/// <reference types="@webgpu/types" />

/**
 * DEVICE WebGPU COMPARTILHADO.
 *
 * A página tem dois canvas de GPU — o campo térmico do fundo e a chama do
 * queimador. Cada um pedindo o próprio adaptador criaria **dois devices**
 * para a mesma placa: duas filas, dois conjuntos de recurso, e o dobro do
 * custo de inicialização no caminho crítico.
 *
 * Aqui o adaptador é pedido UMA vez e a promessa é reaproveitada. Quem
 * chega depois pega a mesma.
 *
 * ⚠️ `low-power` de propósito: num laptop com placa dedicada, o padrão pode
 * ACORDAR a discreta — e a conta de bateria de um papel de parede não se
 * paga. Se um dia algum efeito precisar de desempenho de verdade, ele pede
 * um device próprio em vez de mudar isto para todo mundo.
 *
 * ⚠️ Devolve `null` em vez de lançar. Quem chama trata ausência de GPU como
 * caso NORMAL (Safari e Firefox vão e voltam nisso), não como erro — é o
 * que mantém o caminho de reserva de pé.
 */

export type Gpu = { device: GPUDevice; format: GPUTextureFormat };

let pending: Promise<Gpu | null> | null = null;

/**
 * Monta o pipeline e RECLAMA em voz alta quando o shader é inválido.
 *
 * ⚠️ Esta função existe por causa de um defeito real, e ela é a diferença
 * entre uma hora de investigação e cinco segundos de console.
 *
 * WGSL inválido **não lança exceção**: `createShaderModule` aceita, e
 * `createRenderPipeline` devolve um objeto inválido por erro de VALIDAÇÃO,
 * que só aparece se alguém abrir um error scope. Sem isto, o `draw` roda
 * todo quadro, não pinta nada, e o canvas fica transparente — idêntico ao
 * caso legítimo de "este navegador não tem WebGPU". O caminho quebrado é
 * exatamente o que fica "leve" sem ninguém notar.
 *
 * (O defeito que custou a investigação foi trivial: `let a` declarado duas
 * vezes no mesmo escopo, uma como ângulo e outra como alfa.)
 */
export async function makePipeline(
  device: GPUDevice,
  code: string,
  format: GPUTextureFormat,
  label: string,
): Promise<GPURenderPipeline | null> {
  const shader = device.createShaderModule({ code, label });

  const info = await shader.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === "error");
  if (errors.length) {
    for (const e of errors) {
      console.error(`[gpu:${label}] WGSL linha ${e.lineNum}: ${e.message}`);
    }
    return null;
  }

  device.pushErrorScope("validation");
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    label,
    vertex: { module: shader, entryPoint: "vs" },
    fragment: { module: shader, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const err = await device.popErrorScope();
  if (err) {
    console.error(`[gpu:${label}] pipeline inválido: ${err.message}`);
    return null;
  }
  return pipeline;
}

export function getGpu(): Promise<Gpu | null> {
  if (pending) return pending;

  pending = (async () => {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) return null;
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "low-power",
      });
      if (!adapter) return null;
      const device = await adapter.requestDevice();

      /**
       * Device perdido acontece de verdade: driver atualiza, a aba fica em
       * segundo plano tempo demais, a GPU é resetada. Sem isto, a próxima
       * chamada devolveria um device morto e os dois canvas parariam de
       * pintar em silêncio, cada um do seu jeito.
       *
       * Zerando a promessa, o próximo componente a montar tenta de novo — e
       * enquanto não tenta, o gradiente de reserva já está na tela.
       */
      device.lost.then(() => {
        pending = null;
      });

      return { device, format: navigator.gpu.getPreferredCanvasFormat() };
    } catch {
      return null;
    }
  })();

  return pending;
}
