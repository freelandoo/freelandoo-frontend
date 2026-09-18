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
 * ⚠️ `count: 0` CONTINUA SENDO O ESTADO DESLIGADO, e é bom que continue: com
 * zero o palco dos três atos existe inteiro (rolagem, atos que se cruzam,
 * tipografia), só que sobre o fundo que o tema já pinta. **Nada quebra e nada
 * fica em branco.** Foi assim que a abertura viveu até o vídeo chegar, e é
 * para lá que ela volta se um dia os quadros forem removidos do `public/`.
 *
 * ⚠️ OS DOIS NÚMEROS ABAIXO SÃO ESCRITOS PELO SCRIPT, NÃO À MÃO.
 * `node scripts/ecoluz-frames.mjs <video.mp4>` extrai os quadros, conta o que
 * ficou em disco e grava `count` e `seconds` aqui. Editar um deles sem
 * reextrair é criar uma segunda verdade sobre o mesmo vídeo.
 */
export const OPENING = {
  /** Quantos quadros existem em disco. ZERO = a abertura roda sem vídeo. */
  count: 120 as number,

  /**
   * A DURAÇÃO DO VÍDEO, em segundos — a régua das deixas (`ACT_CUES`).
   *
   * ⚠️ SEM ELA, "o texto troca aos 3,25s" NÃO TEM COMO VIRAR POSIÇÃO DE
   * ROLAGEM. E ela é MEDIDA, não estimada: sai do próprio vídeo que gerou os
   * quadros. Trocar o vídeo por um de outra duração e deixar este número
   * parado desloca TODAS as deixas de uma vez — o texto passa a trocar no
   * lugar errado da imagem, sem erro nenhum aparecer.
   */
  seconds: 17.25 as number,

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

/* ══ AS DEIXAS — o texto troca quando a IMAGEM troca ═══════════════════════
   A abertura é um plano contínuo: o sol, a Terra, o mergulho na atmosfera, o
   bairro ao entardecer e o telhado com os painéis. Os três atos de texto não
   são três telas soltas — cada um pertence a um pedaço daquele plano.

   ⚠️ POR ISSO A DIVISÃO NÃO É EM TERÇOS IGUAIS, que foi como isto nasceu.
   Terço igual é uma régua sobre a ROLAGEM; o que importa aqui é a régua do
   VÍDEO. Com terços, mexer na altura do palco ou trocar o vídeo já desencaixa
   o texto da imagem — e o desencaixe não dá erro, só fica errado.

   ⚠️ E AS DEIXAS SÃO EM SEGUNDOS, NÃO EM PORCENTAGEM DE ROLAGEM. É a única
   unidade que o cliente e quem edita o vídeo falam ("aos 3,25s o planeta está
   inteiro na tela"). A conversão para rolagem é uma divisão por
   `OPENING.seconds` e mora em um lugar só, logo abaixo. */

/**
 * EM QUE SEGUNDO DO VÍDEO CADA ATO ASSUME O PALCO.
 *
 * Hoje: o ato 1 vive no espaço (sol e Terra) e entrega AOS 7,07s, no quadro em
 * que a Terra começa a se desmanchar no mergulho — foi o Alex quem escolheu
 * este segundo. O ato 2 atravessa a atmosfera, as nuvens e o litoral e chega ao
 * bairro. O ato 3 nasce aos 12,4s, quando o técnico entra em quadro no telhado
 * — que é exatamente do que ele fala.
 *
 * ⚠️ A LISTA PRECISA TER UM NÚMERO POR ATO do `opening.tsx`, começar em 0,
 * subir sempre e caber dentro de `OPENING.seconds`. Fora disso o motor
 * DESCARTA as deixas e reparte a rolagem em partes iguais — que é o
 * comportamento antigo, e por isso a falha é feia mas nunca quebra a home.
 * Ato novo lá em cima = deixa nova aqui.
 */
export const ACT_CUES: number[] = [0, 7.07, 12.4];

/**
 * Quanto tempo de VÍDEO dura a travessia de um ato para o outro.
 *
 * ⚠️ EM SEGUNDOS DE VÍDEO, E NÃO EM FRAÇÃO DO ATO, porque os atos têm
 * durações diferentes: como fração, a mesma "travessia" duraria mais no ato
 * longo e menos no curto, e a abertura perderia o compasso.
 */
export const CUE_FADE_SECONDS = 0.55;

/** A janela de rolagem de um ato. Frações de 0 a 1. */
export type ActWindow = {
  /** Onde ele assume. */
  start: number;
  /** Onde ele entrega. */
  end: number;
  /** A travessia, medida dentro da janela DELE (0 a 0,42). */
  fade: number;
};

/** Um instante do vídeo como fração da rolagem da abertura. */
export function atSecond(t: number): number {
  const total = OPENING.seconds;
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, t / total));
}

/** As deixas conferidas. Devolve `null` quando não servem para `total` atos. */
function usableCues(total: number): number[] | null {
  if (!(OPENING.seconds > 0)) return null;
  if (ACT_CUES.length !== total) return null;
  if (ACT_CUES[0] !== 0) return null;
  for (let i = 1; i < ACT_CUES.length; i += 1) {
    const t = ACT_CUES[i];
    if (!Number.isFinite(t) || t <= ACT_CUES[i - 1] || t >= OPENING.seconds) return null;
  }
  return ACT_CUES;
}

/**
 * AS JANELAS DE CADA ATO — a única conta que traduz segundo em rolagem.
 *
 * ⚠️ ELA MORA AQUI, E NÃO NO MOTOR, porque o motor é um laço que roda sessenta
 * vezes por segundo: o que não muda com a rolagem não tem por que ser
 * recalculado nela. E porque a decisão editorial (quando o texto troca) e a
 * mecânica (como ele atravessa) não deveriam morar no mesmo arquivo.
 */
export function actWindows(total: number): ActWindow[] {
  if (total < 1) return [];

  const cues = usableCues(total);
  const cuts: number[] = [];
  if (cues) {
    for (const t of cues) cuts.push(atSecond(t));
    cuts.push(1);
  } else {
    // O repartir igual de antes — a rede de segurança, não o caminho normal.
    for (let i = 0; i <= total; i += 1) cuts.push(i / total);
  }

  const fadeSpan = OPENING.seconds > 0 ? CUE_FADE_SECONDS / OPENING.seconds : 0;

  const out: ActWindow[] = [];
  for (let i = 0; i < total; i += 1) {
    const start = cuts[i];
    const end = cuts[i + 1];
    const width = end - start;
    // ⚠️ O TETO DE 0,42 É O QUE IMPEDE AS DUAS TRAVESSIAS DE SE ENCONTRAREM.
    // Num ato curto, uma travessia longa começaria a apagar antes de a entrada
    // ter terminado — e o ato nunca chegaria a ficar inteiro na tela.
    const fade = width > 0 ? Math.min(0.42, fadeSpan / width) : 0;
    out.push({ start, end, fade });
  }
  return out;
}
