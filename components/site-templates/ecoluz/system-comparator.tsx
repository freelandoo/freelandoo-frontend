"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import gsap from "gsap";

import { SYSTEMS, type SystemMode } from "./content/energy";
import { IconAt, type IconName } from "./icons";
import { pageHref, type TemplateLinks } from "./lib";
import { prefersReducedMotion } from "./stage";

/**
 * COM REDE, SEM REDE OU OS DOIS — o comparador das três topologias.
 *
 * A diferença entre on-grid, off-grid e híbrido é uma diferença de DESENHO:
 * para onde vai o que sobra. Explicada numa tabela ela exige ler as três
 * colunas; desenhada, ela se entende sem ler nada — a rede está lá ou foi
 * cortada, a bateria aparece ou não. Trocar o modo REORGANIZA o diagrama: os
 * nós andam para as posições da nova topologia e as ligações se refazem.
 *
 * ⚠️ OS TRÊS TEXTOS ESTÃO NO HTML, SEMPRE. O que não é o modo da vez leva o
 * atributo `hidden` — sem JavaScript as abas não trocam, mas o conteúdo das
 * três continua no documento para o buscador, e o modo inicial (on-grid, o
 * mais comum) é o que a pessoa vê.
 *
 * ⚠️ O DIAGRAMA É `aria-hidden`. Tudo que ele diz está escrito no painel da
 * aba: a frase de uma linha é literalmente a legenda da figura.
 *
 * ⚠️ O MOVIMENTO É DO GSAP, que já desce nesta rota (ver `scroll-motion.tsx`).
 * CSS não interpola atributo de linha de SVG (`x1`, `y2`…) em todos os
 * navegadores, e reescrever as ligações como caminhos só para isso trocaria
 * uma dependência que já está paga por uma gambiarra.
 */

type NodeId = "sun" | "panel" | "home" | "grid" | "battery";
type Pos = { x: number; y: number; on: boolean };

/** Onde cada nó mora em cada topologia. `on: false` = não existe nela. */
const LAYOUT: Record<SystemMode, Record<NodeId, Pos>> = {
  on: {
    sun: { x: 74, y: 74, on: true },
    panel: { x: 206, y: 150, on: true },
    home: { x: 356, y: 224, on: true },
    grid: { x: 520, y: 224, on: true },
    battery: { x: 356, y: 330, on: false },
  },
  off: {
    sun: { x: 74, y: 74, on: true },
    panel: { x: 206, y: 150, on: true },
    home: { x: 424, y: 150, on: true },
    // A rede "fantasma" fica na MESMA linha do imóvel, à direita: é onde ela
    // estaria, e o corte (o X) cai no meio da ligação que não existe.
    grid: { x: 560, y: 150, on: false },
    battery: { x: 316, y: 290, on: true },
  },
  hybrid: {
    sun: { x: 74, y: 74, on: true },
    panel: { x: 206, y: 150, on: true },
    home: { x: 370, y: 176, on: true },
    grid: { x: 526, y: 176, on: true },
    battery: { x: 370, y: 318, on: true },
  },
};

/** As ligações possíveis, e em quais topologias cada uma existe. */
const EDGES: { id: string; from: NodeId; to: NodeId; in: SystemMode[]; volt?: boolean }[] = [
  { id: "sun-panel", from: "sun", to: "panel", in: ["on", "off", "hybrid"] },
  { id: "panel-home", from: "panel", to: "home", in: ["on", "hybrid"] },
  { id: "panel-battery", from: "panel", to: "battery", in: ["off", "hybrid"] },
  { id: "battery-home", from: "battery", to: "home", in: ["off", "hybrid"], volt: true },
  { id: "home-grid", from: "home", to: "grid", in: ["on", "hybrid"], volt: true },
];

const NODE_META: Record<NodeId, { label: string; icon: IconName }> = {
  sun: { label: "Sol", icon: "sun" },
  panel: { label: "Módulos", icon: "bolt" },
  home: { label: "Imóvel", icon: "home" },
  grid: { label: "Rede", icon: "building" },
  battery: { label: "Bateria", icon: "battery" },
};

const NODE_IDS = Object.keys(NODE_META) as NodeId[];

export default function SystemComparator({ links }: { links: TemplateLinks }) {
  const [mode, setMode] = useState<SystemMode>("on");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const first = useRef(true);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const lay = LAYOUT[mode];
    // A primeira aplicação é SEM animação: o diagrama nasce na posição certa
    // em vez de voar de (0,0) até ela na chegada da página.
    const duration = first.current || prefersReducedMotion() ? 0 : 0.75;
    first.current = false;

    const ctx = gsap.context(() => {
      NODE_IDS.forEach((id) => {
        const el = svg.querySelector(`[data-sys-node="${id}"]`);
        if (!el) return;
        const p = lay[id];
        gsap.to(el, {
          x: p.x,
          y: p.y,
          scale: p.on ? 1 : 0.6,
          opacity: p.on ? 1 : id === "grid" ? 0.22 : 0,
          duration,
          ease: "power3.inOut",
        });
      });

      EDGES.forEach((e) => {
        const el = svg.querySelector(`[data-sys-edge="${e.id}"]`);
        if (!el) return;
        const a = lay[e.from];
        const b = lay[e.to];
        const live = e.in.includes(mode);
        gsap.to(el, {
          attr: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
          opacity: live ? 1 : 0,
          duration,
          ease: "power3.inOut",
        });
      });

      // O corte da rede — só no off-grid. Fica entre o imóvel e onde a rede
      // estaria, para dizer "aqui havia uma ligação, e não há mais".
      const cut = svg.querySelector("[data-sys-cut]");
      if (cut) {
        const h = lay.home;
        const g = lay.grid;
        gsap.to(cut, {
          x: (h.x + g.x) / 2,
          y: (h.y + g.y) / 2,
          opacity: mode === "off" ? 1 : 0,
          duration,
          ease: "power3.inOut",
        });
      }
    }, svg);

    svg.setAttribute("data-mode", mode);
    return () => ctx.kill();
  }, [mode]);

  /** Setas, Home e End entre as abas — o padrão ARIA de `tablist`. */
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SYSTEMS.findIndex((s) => s.mode === mode);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % SYSTEMS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + SYSTEMS.length) % SYSTEMS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SYSTEMS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setMode(SYSTEMS[next].mode);
    tabsRef.current[next]?.focus();
  };

  const init = LAYOUT.on;

  return (
    <section id="sistemas" className="el-sys relative py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="el-glow" data-parallax="10" />
      </div>

      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header className="max-w-3xl" data-reveal="up">
          <div className="rule mb-5 w-16" data-rule />
          <p className="eyebrow mb-4 text-[var(--el-sun)]">Com rede, sem rede ou os dois</p>
          <h2 className="display text-[2.25rem] text-[var(--el-cream)] sm:text-[2.9rem] md:text-[3.4rem]">
            A pergunta é uma só: para onde vai o que sobra?
          </h2>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
            On-grid, off-grid e híbrido geram energia do mesmo jeito. O que muda
            é quem guarda o excedente — a rede, a bateria ou as duas. Troque o
            modo e veja o sistema se reorganizar.
          </p>
        </header>

        {/* ⚠️ TRÊS ÁREAS, E A ORDEM MUDA COM A TELA. No celular é abas →
            diagrama → texto: com o diagrama embaixo do texto, quem troca a aba
            não vê a reorganização, que é o ponto inteiro da peça. No computador
            o diagrama vai para a direita, ao lado dos dois. */}
        <div className="el-sys__grid mt-12 md:mt-16">
          <div className="el-sys__tabs-area">
            <div role="tablist" aria-label="Tipo de sistema" className="el-sys__tabs" onKeyDown={onKey}>
              {SYSTEMS.map((s, i) => {
                const selected = s.mode === mode;
                return (
                  <button
                    key={s.mode}
                    ref={(el) => {
                      tabsRef.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${uid}-tab-${s.mode}`}
                    aria-selected={selected}
                    aria-controls={`${uid}-panel-${s.mode}`}
                    tabIndex={selected ? 0 : -1}
                    className="el-sys__tab"
                    onClick={() => setMode(s.mode)}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="el-sys__panels">
            {SYSTEMS.map((s) => (
              <div
                key={s.mode}
                role="tabpanel"
                id={`${uid}-panel-${s.mode}`}
                aria-labelledby={`${uid}-tab-${s.mode}`}
                hidden={s.mode !== mode}
                className="el-sys__panel"
              >
                <p className="display text-[1.5rem] text-[var(--el-sun-hi)] md:text-[1.875rem]">{s.line}</p>
                <p className="mt-4 text-[1rem] leading-relaxed text-[var(--el-cream-dim)]">{s.text}</p>
                <p className="eyebrow mt-7 text-[var(--el-cream-faint)]">Costuma fazer sentido para</p>
                <ul className="mt-3 grid gap-2">
                  {s.fits.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[0.9375rem] text-[var(--el-cream)]">
                      <span aria-hidden="true" className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 bg-[rgb(var(--el-volt))]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={pageHref(links, s.page)}
                  className="mt-8 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)] transition-colors hover:text-[var(--el-sun)]"
                >
                  Entender o {s.label} <span aria-hidden="true">→</span>
                </a>
              </div>
            ))}
          </div>

          <figure className="el-sys__fig" aria-hidden="true">
            <svg ref={svgRef} viewBox="0 0 600 380" className="el-sys__svg" data-mode="on" focusable="false">
              <g className="el-sys__paper">
                {Array.from({ length: 13 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="380" />
                ))}
                {Array.from({ length: 8 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} />
                ))}
              </g>

              {/* As ligações nascem na posição do on-grid, igual aos nós: sem
                  JavaScript o diagrama é o on-grid completo. */}
              {EDGES.map((e) => {
                const a = init[e.from];
                const b = init[e.to];
                const live = e.in.includes("on");
                return (
                  <line
                    key={e.id}
                    data-sys-edge={e.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`el-sys__edge${e.volt ? " el-sys__edge--volt" : ""}`}
                    style={{ opacity: live ? 1 : 0 }}
                  />
                );
              })}

              <g data-sys-cut className="el-sys__cut" style={{ opacity: 0 }} transform="translate(438 224)">
                <path d="M-11 -11 L11 11 M11 -11 L-11 11" />
              </g>

              {NODE_IDS.map((id) => {
                const p = init[id];
                return (
                  <g
                    key={id}
                    data-sys-node={id}
                    className={`el-sys__node el-sys__node--${id}`}
                    transform={`translate(${p.x} ${p.y})${p.on ? "" : " scale(0.6)"}`}
                    style={{ opacity: p.on ? 1 : 0 }}
                  >
                    <rect x="-34" y="-34" width="68" height="68" className="el-sys__box" />
                    <IconAt name={NODE_META[id].icon} x={-15} y={-15} size={30} className="el-sys__icon" />
                    <text y="56" className="el-sys__label">
                      {NODE_META[id].label.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </figure>
        </div>
      </div>
    </section>
  );
}
