"use client";

/**
 * MOTION — a camada inteira mora aqui.
 *
 * Três gestos, e só três:
 *
 *   reveal   — o conteúdo sobe 14px quando entra. Resposta ao scroll da
 *              pessoa, não animação de vitrine.
 *   parallax — camadas da prancha andam em velocidades diferentes.
 *   draw     — o traço técnico se desenha.
 *
 * ⚠️ ESTE É O PONTO DE TROCA. Quando o site de referência chegar, o
 * vocabulário de motion dele entra AQUI — as páginas só consomem
 * <Reveal>, useParallax e <Draw>, e não sabem como o gesto é feito.
 * Trocar a implementação não toca em nenhuma página.
 *
 * ── UM listener, UM rAF ──────────────────────────────────────────────────
 * O parallax tem um laço só para o site inteiro, com todas as camadas
 * registradas nele. Um listener de scroll por componente é como uma página
 * com dez camadas vira dez leituras de layout por quadro — e o sintoma é a
 * rolagem travada, que ninguém relaciona com o efeito.
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ────────────────────────────── freio global ───────────────────────────── */

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ──────────────────────────────── parallax ─────────────────────────────── */

type Layer = { el: HTMLElement; speed: number };

const layers = new Set<Layer>();
let running = false;
let frame = 0;

function tick() {
  frame = 0;
  const vh = window.innerHeight;
  for (const l of layers) {
    const r = l.el.getBoundingClientRect();
    // Progresso relativo ao centro da janela: a camada não salta quando
    // entra, porque o deslocamento é zero exatamente no meio da tela.
    const center = r.top + r.height / 2;
    const p = (center - vh / 2) / vh;
    // `speed` é FRAÇÃO DA ALTURA DA JANELA, não pixels.
    // Em pixels fixos o mesmo número daria um efeito forte no celular e
    // imperceptível num monitor grande — e a correção seria um número por
    // breakpoint. Em fração da janela, o deslocamento é proporcional ao que
    // a pessoa vê, em qualquer tela.
    l.el.style.transform = `translate3d(0, ${(p * l.speed * vh).toFixed(2)}px, 0)`;
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(tick);
}

function start() {
  if (running) return;
  running = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}

function stop() {
  if (!running || layers.size) return;
  running = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/**
 * Registra um elemento como camada de parallax.
 *
 * `speed` é a fração da altura da janela deslocada ao longo de toda a
 * travessia. Negativo = anda contra o scroll (parece mais longe); positivo =
 * anda a favor (parece mais perto). Acima de ~0.18 começa a enjoar, e acima
 * de 0.25 a camada descola visivelmente do resto.
 *
 * ⚠️ A camada precisa de FOLGA além da caixa que ela preenche, senão o
 * deslocamento expõe a borda. Uma foto de fundo com `speed 0.10` numa seção
 * de 700px precisa de ~±14% de sangria em cima e embaixo.
 */
export function useParallax<T extends HTMLElement>(speed: number) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced() || speed === 0) return;
    // `will-change` só enquanto a camada existe: permanente, ele mantém uma
    // camada de composição viva de graça pelo resto da sessão.
    el.style.willChange = "transform";
    const layer: Layer = { el, speed };
    layers.add(layer);
    start();
    schedule();
    return () => {
      layers.delete(layer);
      el.style.willChange = "";
      el.style.transform = "";
      stop();
    };
  }, [speed]);
  return ref;
}

/* ───────────────────────────────── reveal ──────────────────────────────── */

/**
 * Observer único, compartilhado. Cada elemento é desobservado assim que
 * entra: reveal não volta atrás, e manter a observação viva paga o custo
 * de interseção pelo resto da página.
 */
let revealIo: IntersectionObserver | null = null;

function revealObserver(): IntersectionObserver {
  if (!revealIo) {
    revealIo = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
  }
  return revealIo;
}

/**
 * Hook, e não componente polimórfico.
 *
 * Uma tag qualquer (`li`, `article`, `figure`) precisa do reveal, e um
 * componente com prop `as` acabaria num cast de ref — remendo que esconde
 * erro de tipo de verdade no dia em que a tag mudar. Com o hook, quem
 * desenha a tag é a própria página, e o tipo do ref é o certo por
 * construção.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      el.classList.add("is-in");
      return;
    }
    const io = revealObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return ref;
}

/** Atalho para o caso comum: uma div que sobe. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  /** Segundos. Escalonar no máximo 3 ou 4 irmãos — além disso vira espera. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`rise ${className}`}
      style={{ ...style, "--delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────── draw ───────────────────────────────── */

/**
 * Desenha o traço.
 *
 * ⚠️ O comprimento é MEDIDO (getTotalLength), nunca chutado. Um dasharray
 * fixo grande "funciona" no traço curto e deixa o traço longo entrando pela
 * metade — e isso não aparece em revisão nenhuma, só no desenho torto.
 *
 * Cada caminho recebe um atraso proporcional à ordem, então o desenho é
 * construído na ordem em que um desenhista o faria: contorno, depois
 * detalhe, depois cota.
 */
export function Draw({
  children,
  className = "",
  viewBox,
  span = 0.9,
  delay = 0,
  role,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  viewBox: string;
  /**
   * Tempo TOTAL, em segundos, entre o primeiro traço começar e o último.
   *
   * ⚠️ É tempo total e não atraso por traço, e a diferença já custou uma
   * revisão: com atraso fixo, acrescentar detalhe ao desenho empurra o fim
   * para longe sem ninguém perceber. Com 80 caminhos a 0,045s cada, o último
   * só começava aos 3,6s — o forno inteiro ficava invisível para quem rolava
   * na velocidade normal, e o desenho parecia truncado em vez de lento.
   *
   * Distribuindo por tempo total, detalhe novo aperta o escalonamento em vez
   * de alongar a espera.
   */
  span?: number;
  delay?: number;
  /** Desenho que CARREGA informação recebe papel e nome; o resto é decorativo. */
  role?: "img";
  ariaLabel?: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const nodes = Array.from(
      svg.querySelectorAll<SVGGeometryElement>("path, line, circle, polyline, rect"),
    );
    const step = nodes.length > 1 ? span / (nodes.length - 1) : 0;
    nodes.forEach((n, i) => {
      let len = 0;
      try {
        len = n.getTotalLength();
      } catch {
        // <rect>/<circle> sem suporte a getTotalLength em navegador antigo:
        // o fallback do CSS (--len padrão) ainda desenha, só sem precisão.
      }
      if (len > 0) n.style.setProperty("--len", String(Math.ceil(len)));
      n.style.setProperty("--delay", `${(delay + i * step).toFixed(3)}s`);
    });

    if (prefersReduced()) {
      svg.classList.add("is-drawn");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          svg.classList.add("is-drawn");
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(svg);
    return () => io.disconnect();
  }, [span, delay]);

  return (
    <svg
      ref={ref}
      className={`draw ${className}`}
      viewBox={viewBox}
      fill="none"
      role={role}
      aria-label={ariaLabel}
      aria-hidden={role ? undefined : "true"}
    >
      {children}
    </svg>
  );
}
