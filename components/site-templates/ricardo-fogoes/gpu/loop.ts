/**
 * O LAÇO E OS CINCO FREIOS.
 *
 * A página tem dois canvas de GPU. Escritos duas vezes, os freios divergem
 * na primeira correção — e o que fica para trás é o que ninguém mede, porque
 * o sintoma é rolagem travada e a causa parece estar em qualquer outro lugar.
 *
 * Freio novo entra AQUI, e vale para os dois na mesma hora.
 *
 *   1. `prefers-reduced-motion` → desenha UM quadro e não abre laço nenhum.
 *   2. Aba escondida → suspende.
 *   3. Teto de quadros por segundo.
 *   4. Teto de PIXELS por quadro — não de DPR. O custo de um shader é por
 *      pixel, e quem paga é o monitor grande, não o celular retina. Cai pela
 *      metade quando o FPS não acompanha, no máximo duas vezes, e SÓ PARA
 *      BAIXO: efeito que oscila de nitidez enquanto a pessoa lê é pior que
 *      um efeito permanentemente mais macio.
 *   5. Fora da tela → suspende.
 */

export type GpuLoop = {
  /** Desenha um quadro. `t` em segundos desde o início. */
  draw: (t: number) => void;
  /** Tamanho do buffer mudou — reconfigure o que depender dele. */
  onResize?: (w: number, h: number) => void;
};

export function runGpuLoop(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  maxPixels: number,
  cb: GpuLoop,
  fps = 30,
): () => void {
  const FRAME_MS = 1000 / fps;
  const MIN_SCALE = 0.25;

  let disposed = false;
  let raf = 0;
  let onScreen = true;
  let visible = document.visibilityState === "visible";
  let scale = 1;
  let budget = maxPixels;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.isIntersecting;
    },
    { rootMargin: "120px" },
  );
  io.observe(host);

  const onVis = () => {
    visible = document.visibilityState === "visible";
  };
  document.addEventListener("visibilitychange", onVis);

  /**
   * ⚠️ Compara LARGURA **e** ALTURA.
   *
   * Comparando só a largura, encolher a janela na vertical deixa a imagem
   * esticada até alguém mexer na horizontal — e ninguém relaciona uma coisa
   * com a outra.
   */
  let lastW = 0;
  let lastH = 0;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const cssW = host.clientWidth || window.innerWidth;
    const cssH = host.clientHeight || window.innerHeight;
    let w = Math.max(1, Math.round(cssW * dpr * scale));
    let h = Math.max(1, Math.round(cssH * dpr * scale));
    const px = w * h;
    if (px > budget) {
      const k = Math.sqrt(budget / px);
      w = Math.max(1, Math.round(w * k));
      h = Math.max(1, Math.round(h * k));
    }
    if (w !== lastW || h !== lastH) {
      canvas.width = w;
      canvas.height = h;
      lastW = w;
      lastH = h;
      cb.onResize?.(w, h);
    }
  };

  const t0 = performance.now();
  let last = 0;
  let frames = 0;
  let windowStart = t0;
  let drops = 0;

  const step = (now: number) => {
    resize();
    cb.draw((now - t0) / 1000);
  };

  // Freio 1: um quadro e acabou.
  if (reduced) {
    step(performance.now());
    return () => {
      disposed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);

    if (!visible || !onScreen) {
      // Reinicia a janela de medição: tempo suspenso não é queda de FPS.
      windowStart = now;
      frames = 0;
      return;
    }
    if (now - last < FRAME_MS) return;
    last = now;
    step(now);

    frames++;
    const elapsed = now - windowStart;
    // Janela de 2s: grande o bastante para não reagir a um engasgo isolado.
    if (elapsed >= 2000) {
      const real = (frames * 1000) / elapsed;
      // A régua é FPS EFETIVO, não custo do shader: o que importa não é ele
      // estar caro, é a página não acompanhar.
      if (real < fps * 0.66 && drops < 2 && scale > MIN_SCALE) {
        scale = Math.max(MIN_SCALE, scale / 2);
        budget = Math.max(90_000, Math.round(budget / 2));
        drops++;
      }
      frames = 0;
      windowStart = now;
    }
  };

  raf = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}
