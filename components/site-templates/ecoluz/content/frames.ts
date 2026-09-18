// O CONTRATO DA ABERTURA EM VÍDEO — o manifesto da sequência de quadros.
//
// A abertura da home são TRÊS ATOS que dividem um palco só, e o fundo desse
// palco é um vídeo que não toca: ele é ARRASTADO pela rolagem, quadro a
// quadro. Este arquivo é a única coisa que o site precisa saber sobre ele.
//
// ⚠️ NÃO É UM `<video>` COM `currentTime`, E ISSO NÃO É PREFERÊNCIA. Buscar
// posição num vídeo é assíncrono e o navegador entrega o quadro quando puder:
// no iOS o resultado é um salto a cada dois ou três dedos de rolagem, e em
// alguns Android a busca só assenta quando a rolagem PARA — ou seja, o efeito
// aparece justamente quando ninguém está mais olhando. Com imagens desenhadas
// num `<canvas>`, o quadro que a rolagem pede é o quadro que aparece, no mesmo
// quadro de tela. É também o que o cliente descreveu ("dividir um vídeo em
// frames").
//
// ⚠️ OS QUADROS MORAM EM `public/`, e isso foi CONFERIDO, não suposto: o
// `matcher` do `proxy.ts` da plataforma exclui todo caminho terminado em
// extensão (`.*\.[\w]+$`). Então `/sites/ecoluz/abertura/...` é servido como
// arquivo estático nas TRÊS origens em que este site responde — a plataforma,
// o subdomínio e o domínio próprio do cliente — sem reescrita, sem CORS e sem
// configuração nenhuma. No R2 seriam bytes de outra origem: desenhar ainda
// funcionaria, mas a conta de CORS do bucket já mordeu esta plataforma uma vez
// (2026-07-10, o upload de story que nunca subiu em produção), e não há razão
// para pagá-la de novo por um arquivo que é CONTEÚDO de um tema autoral.
//
// ⚠️ E O MANIFESTO É MÓDULO, NÃO UM JSON BUSCADO. Um `fetch` do manifesto
// custaria uma ida à rede antes do primeiro quadro poder ser pedido — no lugar
// mais visível da página. Aqui o número já vem compilado no pacote.

/** Os dois conjuntos de quadros: o largo e o estreito. */
export type FrameSet = "wide" | "narrow";

/**
 * A ABERTURA.
 *
 * ⚠️ `count: 0` É O ESTADO DESLIGADO, e é o estado de hoje — o vídeo ainda não
 * foi entregue. Com zero, o palco dos três atos continua existindo inteiro
 * (rolagem, atos que se cruzam, tipografia), só que sobre o fundo que o site
 * já tem. **Nada quebra e nada fica em branco.** Quando o vídeo chegar, rodar
 * `node scripts/ecoluz-frames.mjs <video.mp4>` gera os quadros e imprime o
 * número — trocar este `count` é a única edição de código necessária.
 */
export const OPENING = {
  /** Quantos quadros existem em disco. ZERO = a abertura roda sem vídeo. */
  count: 0 as number,

  /** A pasta dentro de `public/`, sem barra no fim. */
  dir: "/sites/ecoluz/abertura",

  /** Quantas casas tem o nome do arquivo: `0001.webp`. */
  pad: 4,

  ext: "webp",

  /**
   * ⚠️ O CELULAR PULA QUADRO, E É ASSIM QUE A CONTA FECHA. Ele já baixa o
   * conjunto estreito (imagem menor); com `narrowStep: 2` ele baixa também a
   * METADE dos quadros — o desenho continua contínuo porque quadro que falta
   * resolve no vizinho mais próximo, que a esta densidade está a um piscar de
   * distância. Sem isto, uma abertura de 150 quadros custaria à rede móvel o
   * mesmo que a página inteira.
   */
  narrowStep: 2,
};

/** Abaixo desta largura de tela, o conjunto estreito. */
export const NARROW_MAX_PX = 820;

/** O caminho de um quadro. `i` é base zero; o arquivo é base um. */
export function frameSrc(i: number, set: FrameSet): string {
  const n = String(i + 1).padStart(OPENING.pad, "0");
  return `${OPENING.dir}/${set === "narrow" ? "w900" : "w1600"}/${n}.${OPENING.ext}`;
}

/** Existe vídeo para arrastar? */
export function hasFrames(): boolean {
  return OPENING.count > 0;
}
