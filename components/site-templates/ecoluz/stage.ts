// A RÉGUA DE ROLAGEM das cenas do tema — um laço só, reusado por todas.
//
// Cada cena narrativa (o fluxo da energia, a órbita das soluções, o pipeline)
// precisa da mesma coisa: "quanto desta seção já passou pela tela?", como um
// número de 0 a 1, a cada quadro de rolagem. Escrito três vezes, um dos três
// acabaria sem o `requestAnimationFrame`, outro sem o observador — e o custo
// apareceria só na máquina fraca.
//
// ⚠️ A CENA SÓ ESCUTA A ROLAGEM ENQUANTO ESTÁ PERTO DA TELA. O observador liga
// e desliga o ouvinte; fora dele, a cena custa ZERO por quadro. É a mesma
// disciplina que a plataforma aprendeu com os timers por card do feed: o custo
// não é o trabalho, é ACORDAR — e uma página com cinco cenas acordando a cada
// pixel de rolagem, mesmo longe delas, é a página que "vai ficando lenta".
//
// ⚠️ NADA AQUI ESCREVE ESTILO. Quem recebe o número decide o que fazer com ele
// — e a regra do tema continua valendo lá: só `transform`, `opacity` e
// variáveis CSS que alimentam essas duas coisas.

export type StageMode =
  /**
   * Para um invólucro alto com um palco `position: sticky` dentro. 0 quando o
   * topo do invólucro encosta no topo da tela, 1 quando o fundo dele encosta
   * no fundo. É a mesma conta da abertura (`opening-motion.tsx`).
   */
  | "sticky"
  /**
   * Para uma seção que simplesmente passa pela tela, sem palco preso. 0 quando
   * o topo dela chega à linha de leitura (85% da altura da janela, ou a que a
   * cena pedir); 1 quando o fundo dela chega ao mesmo ponto. É o "a linha acompanha a leitura" do pipeline.
   */
  | "pass";

/** O ponto da janela que a leitura acompanha, no modo `pass`. */
const READ_LINE = 0.85;

/**
 * Liga o laço de uma cena. Devolve a função que desliga tudo.
 *
 * `onProgress` é chamado no máximo uma vez por quadro, e só quando o número
 * mudou de fato — escrever estilo que não mudou continua invalidando o estilo
 * do elemento.
 */
export function watchStage(
  el: HTMLElement,
  onProgress: (p: number) => void,
  mode: StageMode = "sticky",
  /** Só no modo `pass`: a altura da janela (0–1) que a leitura acompanha. */
  line: number = READ_LINE,
): () => void {
  let raf = 0;
  let listening = false;
  let last = -1;

  const measure = () => {
    raf = 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    let p: number;
    if (mode === "sticky") {
      const travel = rect.height - vh;
      p = travel > 0 ? -rect.top / travel : rect.top <= 0 ? 1 : 0;
    } else {
      const at = vh * line;
      p = rect.height > 0 ? (at - rect.top) / rect.height : 0;
    }
    p = Math.min(1, Math.max(0, p));
    if (Math.abs(p - last) < 0.0005) return;
    last = p;
    onProgress(p);
  };

  const request = () => {
    if (!raf) raf = window.requestAnimationFrame(measure);
  };

  const listen = (on: boolean) => {
    if (on === listening) return;
    listening = on;
    if (on) {
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", request, { passive: true });
      request();
    } else {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    }
  };

  // ⚠️ SEM OBSERVADOR, ESCUTA SEMPRE. Degradar para "custa um pouco mais" é
  // aceitável; degradar para "a cena nunca anda" não é.
  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === "undefined") {
    listen(true);
  } else {
    // A margem generosa é o que faz a cena já estar no estado certo quando
    // entra em cena — ligar exatamente na borda mostraria um quadro atrasado.
    io = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), {
      rootMargin: "60% 0px 60% 0px",
    });
    io.observe(el);
  }

  // As fontes assentando mudam a altura das seções — e com ela o progresso.
  if (document.fonts?.ready) document.fonts.ready.then(request).catch(() => {});
  measure();

  return () => {
    io?.disconnect();
    listen(false);
    if (raf) window.cancelAnimationFrame(raf);
  };
}

/** O leitor pediu menos movimento? Lido na hora — nunca no render. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A tela é larga o bastante para um palco preso?
 *
 * ⚠️ PALCO PRESO É COISA DE TELA GRANDE. No celular, prender a seção inteira
 * enquanto a pessoa rola é a sensação de "a página travou" — e é o pedido
 * explícito do brief de movimento: sem pinning excessivo e sem milhares de
 * pixels de área invisível no telefone. Lá a mesma cena vira leitura normal.
 */
export function canPin(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches && !prefersReducedMotion();
}
