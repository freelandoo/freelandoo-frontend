"use client";

import { useEffect, useRef } from "react";

import { FLOW } from "./content/energy";
import { prefersReducedMotion, watchStage } from "./stage";

/**
 * COMO A ENERGIA ANDA — a primeira cena depois da abertura.
 *
 * A abertura diz "o sol paga a parte cara da sua conta". Esta cena MOSTRA:
 * uma linha de luz sai do sol, atravessa os módulos, o inversor, o imóvel, o
 * medidor e termina como crédito. Cada momento acende quando a leitura chega
 * nele — é o conceito do site inteiro (sol → geração → consumo → crédito)
 * desenhado uma vez, de forma que o resto da página pode só apontar para ele.
 *
 * ── A FORMA: LEITURA COM UMA FIGURA PRESA, NÃO UM PALCO PRESO ─────────────
 *
 * O texto rola normalmente e a FIGURA fica presa ao lado (no celular, no
 * topo). Nada é sequestrado: a rolagem continua sendo a da página, só que a
 * imagem acompanha. É o que permite a mesma peça servir no telefone sem
 * "a página travou" — a figura presa ocupa um terço da tela e a leitura segue
 * por baixo dela.
 *
 * ── O QUE CUSTA ───────────────────────────────────────────────────────────
 *
 * ⚠️ UM SVG DE 640×560, e não um canvas. A linha de luz é `stroke-dashoffset`
 * em cinco caminhos curtos; as células acendem por `opacity`. Nada disso é
 * uma camada do tamanho da janela (a regra do tema, paga em 2026-09-09), e o
 * laço só escuta a rolagem enquanto a seção está perto da tela
 * (`watchStage`).
 *
 * ⚠️ O FLUXO DE PARTÍCULAS SÓ ANDA COM A SEÇÃO EM CENA E SEM MOVIMENTO
 * REDUZIDO — o atributo `data-live` é o interruptor dos dois.
 *
 * ── SEM JAVASCRIPT ────────────────────────────────────────────────────────
 *
 * O markup nasce no estado FINAL: todos os nós acesos, todas as linhas
 * desenhadas, todos os seis momentos legíveis. O script só "desacende" o que
 * ainda não foi alcançado. Para o robô e para quem tem JS bloqueado, a seção
 * é um diagrama completo com seis parágrafos — nunca uma figura apagada.
 */

/** Os cinco trechos da linha, cada um ligando o nó `i` ao nó `i + 1`. */
const SEGMENTS = [
  "M124 104 L184 112",
  "M330 118 L410 118",
  "M445 162 L445 285",
  "M390 330 L262 330",
  "M230 362 L230 452",
];

/** As células dos módulos: 4 colunas × 3 linhas, num quadro inclinado. */
const CELLS = Array.from({ length: 12 }, (_, i) => ({ c: i % 4, r: Math.floor(i / 4) }));

export default function EnergyFlow() {
  const rootRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const reduced = prefersReducedMotion();
    const segs = Array.from(root.querySelectorAll<SVGPathElement>("[data-flow-seg]"));
    const nodes = Array.from(root.querySelectorAll<SVGGElement>("[data-flow-node]"));
    const steps = Array.from(list.querySelectorAll<HTMLElement>("[data-flow-step]"));
    const readout = root.querySelector<HTMLElement>("[data-flow-readout]");
    const fig = root.querySelector<SVGSVGElement>("[data-flow-svg]");

    root.setAttribute("data-live", "on");
    if (reduced) root.setAttribute("data-still", "on");

    const n = FLOW.length;
    let lastActive = -1;
    const lastFill = new Array<number>(segs.length).fill(-1);

    const onProgress = (p: number) => {
      // `f` anda de 0 a 6: a parte inteira é o momento, a fração é o caminho
      // até o próximo.
      const f = p * n;
      const active = Math.min(n - 1, Math.floor(f));

      segs.forEach((seg, k) => {
        // O trecho k se desenha na segunda metade do momento k — assim o nó
        // seguinte acende exatamente quando a linha chega nele.
        const fill = Math.min(1, Math.max(0, (f - (k + 0.5)) / 0.5));
        if (Math.abs(fill - lastFill[k]) < 0.004) return;
        lastFill[k] = fill;
        seg.style.strokeDashoffset = String(1 - fill);
        seg.parentElement?.toggleAttribute("data-full", fill >= 0.999);
      });

      if (fig) {
        // As duas variáveis que a figura lê: a luz varrendo os módulos (durante
        // o primeiro momento) e o crédito enchendo (durante o último).
        fig.style.setProperty("--sweep", Math.min(1, Math.max(0, f / 1.5)).toFixed(3));
        fig.style.setProperty("--credit", Math.min(1, Math.max(0, f - (n - 1))).toFixed(3));
      }

      if (active === lastActive) return;
      lastActive = active;

      nodes.forEach((node, i) => node.toggleAttribute("data-lit", i <= active));
      steps.forEach((step, i) => step.toggleAttribute("data-active", i === active));
      root.setAttribute("data-stage", String(active));
      if (readout) {
        readout.textContent = `${String(active + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")} · ${FLOW[active].tag}`;
      }
    };

    const stop = watchStage(list, onProgress, "pass", 0.62);

    return () => {
      stop();
      root.removeAttribute("data-live");
      root.removeAttribute("data-still");
      root.removeAttribute("data-stage");
    };
  }, []);

  return (
    <section ref={rootRef} id="energia" className="el-flow relative bg-[var(--el-ink-deep)] py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="el-glow" data-parallax="8" />
      </div>

      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header className="max-w-3xl" data-reveal="up">
          <div className="rule mb-5 w-16" data-rule />
          <p className="eyebrow mb-4 text-[var(--el-sun)]">Como a energia anda</p>
          <h2 className="display text-[2.25rem] text-[var(--el-cream)] sm:text-[2.9rem] md:text-[3.4rem]">
            Do sol à sua conta, <span className="text-[var(--el-sun)]">sem mágica.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
            Seis momentos e uma linha de luz. Role e acompanhe o caminho que a
            energia faz — da luz que cai no telhado ao crédito que aparece na
            conta.
          </p>
        </header>

        <div className="el-flow__grid mt-12 md:mt-16">
          {/* ── A FIGURA ──────────────────────────────────────────────────
              ⚠️ Ela vem ANTES do texto no DOM porque no celular ela fica
              presa no TOPO; no computador a grade a leva para a direita. A
              ordem de leitura para o leitor de tela não muda nada: ela é
              `aria-hidden` e o conteúdo inteiro está nos seis itens. */}
          <figure className="el-flow__fig" aria-hidden="true">
            <svg
              data-flow-svg
              viewBox="0 0 640 560"
              className="el-flow__svg"
              focusable="false"
              style={{ "--sweep": 1, "--credit": 1 } as React.CSSProperties}
            >
              <defs>
                <radialGradient id="elf-sun" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#fff3b8" />
                  <stop offset="0.45" stopColor="#ffc400" />
                  <stop offset="1" stopColor="#ffc400" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="elf-sweep" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#fff6c8" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <clipPath id="elf-panel-clip">
                  <path d="M196 78 H340 L318 154 H174 Z" />
                </clipPath>
              </defs>

              {/* A grade técnica da prancha — o papel milimetrado do projeto. */}
              <g className="el-flow__paper">
                {Array.from({ length: 11 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 64} y1="0" x2={i * 64} y2="560" />
                ))}
                {Array.from({ length: 10 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 64} x2="640" y2={i * 64} />
                ))}
              </g>

              {/* ── A LINHA DE ENERGIA ─────────────────────────────────────
                  Três camadas por trecho: o trilho apagado, a luz que se
                  desenha e as partículas que correm depois de desenhada. */}
              {SEGMENTS.map((d) => (
                <g key={d} className="el-flow__wire">
                  <path d={d} className="el-flow__rail" />
                  <path d={d} className="el-flow__seg" data-flow-seg pathLength={1} />
                  <path d={d} className="el-flow__spark" pathLength={1} />
                </g>
              ))}

              {/* A rede elétrica, saindo do medidor para a esquerda. */}
              <g className="el-flow__grid-line">
                <path d="M200 330 H74" />
                <path d="M60 300 L48 356 M60 300 L72 356 M50 318 H70 M46 336 H74" className="el-flow__pylon" />
              </g>

              {/* ── 0 · O SOL ──────────────────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <circle cx="92" cy="100" r="58" fill="url(#elf-sun)" className="el-flow__sun-halo" />
                <circle cx="92" cy="100" r="22" className="el-flow__sun" />
                <g className="el-flow__rays">
                  {Array.from({ length: 8 }, (_, i) => {
                    const a = (i * Math.PI) / 4;
                    return (
                      <line
                        key={i}
                        x1={92 + Math.cos(a) * 30}
                        y1={100 + Math.sin(a) * 30}
                        x2={92 + Math.cos(a) * 40}
                        y2={100 + Math.sin(a) * 40}
                      />
                    );
                  })}
                </g>
                <text x="92" y="168" className="el-flow__tag">SOL</text>
              </g>

              {/* ── 1 · OS MÓDULOS ─────────────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <path d="M196 78 H340 L318 154 H174 Z" className="el-flow__panel" />
                <g transform="translate(196 78) skewX(-16)">
                  {CELLS.map(({ c, r }, i) => (
                    <g key={i}>
                      <rect x={4 + c * 36} y={4 + r * 25} width={32} height={21} className="el-flow__cell" />
                      <rect
                        x={4 + c * 36}
                        y={4 + r * 25}
                        width={32}
                        height={21}
                        className="el-flow__cell-lit"
                        style={{ transitionDelay: `${(c + r) * 70}ms` }}
                      />
                    </g>
                  ))}
                </g>
                {/* A luz atravessando os módulos — anda com a leitura. */}
                <g clipPath="url(#elf-panel-clip)">
                  <rect x="100" y="70" width="70" height="92" fill="url(#elf-sweep)" className="el-flow__sweep" />
                </g>
                <text x="257" y="184" className="el-flow__tag">GERAÇÃO</text>
              </g>

              {/* ── 2 · O INVERSOR ─────────────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <rect x="410" y="78" width="70" height="84" className="el-flow__box" />
                <path d="M425 104 H465 M425 136 q10 -12 20 0 t20 0" className="el-flow__glyph" />
                <circle cx="468" cy="92" r="3.5" className="el-flow__led" />
                <text x="445" y="192" className="el-flow__tag">INVERSOR</text>
              </g>

              {/* ── 3 · O IMÓVEL ───────────────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <path d="M390 318 L445 280 L500 318 V376 H390 Z" className="el-flow__box" />
                <rect x="408" y="330" width="22" height="20" className="el-flow__window" />
                <rect x="460" y="330" width="22" height="20" className="el-flow__window" />
                <rect x="436" y="348" width="18" height="28" className="el-flow__door" />
                <text x="445" y="404" className="el-flow__tag">CONSUMO</text>
              </g>

              {/* ── 4 · O MEDIDOR / A REDE ─────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <circle cx="230" cy="330" r="31" className="el-flow__box" />
                <path d="M214 322 H244 M238 316 l6 6 -6 6 M246 340 H216 M222 334 l-6 6 6 6" className="el-flow__glyph" />
                <text x="230" y="286" className="el-flow__tag">REDE</text>
              </g>

              {/* ── 5 · O CRÉDITO ──────────────────────────────────────── */}
              <g data-flow-node className="el-flow__node">
                <rect x="150" y="452" width="160" height="38" className="el-flow__box" />
                <rect x="156" y="458" width="148" height="26" className="el-flow__credit" />
                <text x="230" y="520" className="el-flow__tag el-flow__tag--volt">CRÉDITO</text>
              </g>
            </svg>

            <p className="el-flow__readout eyebrow" data-flow-readout>
              {`06 / 06 · ${FLOW[FLOW.length - 1].tag}`}
            </p>
          </figure>

          {/* ── OS SEIS MOMENTOS ─────────────────────────────────────────── */}
          <ol ref={listRef} className="el-flow__steps">
            {FLOW.map((s, i) => (
              <li key={s.tag} className="el-flow__step" data-flow-step>
                <p className="flex items-baseline gap-3">
                  <span className="numeral text-[1.75rem] text-[var(--el-sun)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="eyebrow text-[var(--el-cream-faint)]">{s.tag}</span>
                </p>
                <h3 className="display mt-4 text-[1.5rem] text-[var(--el-cream)] md:text-[1.875rem]">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-[1rem] leading-relaxed text-[var(--el-cream-dim)]">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
