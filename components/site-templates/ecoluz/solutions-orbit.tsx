"use client";

import { useCallback, useEffect, useRef } from "react";

import { WA_DEFAULT, whatsappLink } from "./content/business";
import { SEGMENTS } from "./content/offer";
import { Icon } from "./icons";
import { pageHref, type TemplateLinks } from "./lib";
import { canPin, prefersReducedMotion, watchStage } from "./stage";

/**
 * AS QUATRO FRENTES, EM ÓRBITA — substitui a grade 2×2 de "Nossas soluções".
 *
 * No computador a seção vira um palco: um núcleo de luz no centro e os quatro
 * cartões numa órbita elíptica em volta dele. A rolagem gira a órbita, e o
 * cartão da vez vem para a frente enquanto os outros continuam visíveis no
 * espaço, recuados e apagados. É a leitura "quatro públicos, uma empresa no
 * meio" desenhada em vez de listada.
 *
 * ── AS TRÊS FORMAS, E QUEM DECIDE ─────────────────────────────────────────
 *
 *   sem JavaScript / movimento reduzido → a GRADE, como sempre foi
 *   celular (< 1024px)                  → DESLIZAR para o lado, com snap
 *   computador com movimento             → a ÓRBITA, com o palco preso
 *
 * ⚠️ O PALCO PRESO SÓ EXISTE NA TELA GRANDE (`canPin`). No celular, prender a
 * seção enquanto o dedo rola é a sensação de "a página travou" — e lá o gesto
 * natural para quatro cartões é deslizar, que não precisa de script nenhum.
 *
 * ⚠️ E O MARKUP É O MESMO NOS TRÊS. A órbita só escreve `transform` e
 * `opacity` em cartões que já estão no HTML — o robô lê os quatro com texto e
 * link, e quem tem JS bloqueado vê a grade.
 *
 * ── ACESSIBILIDADE ────────────────────────────────────────────────────────
 *
 * ⚠️ UM CARTÃO QUE ESTÁ ATRÁS DA ÓRBITA CONTINUA SENDO UM LINK TABULÁVEL, e
 * receber foco numa coisa que não se vê é o pior jeito de navegar por teclado.
 * Por isso o foco GIRA a órbita: ao chegar num cartão, a página rola até a
 * posição em que ele está na frente. Os pontinhos de navegação fazem o mesmo.
 */

/** O quanto da rolagem do palco fica parado nas pontas — o respiro de entrada e saída. */
const HOLD = 0.08;

export default function SolutionsOrbit({ links }: { links: TemplateLinks }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // ⚠️ `pinned` mora num ref e não em estado: ele é lido dentro de ouvintes de
  // foco e de clique, e virar estado re-renderizaria os quatro cartões a cada
  // troca de tamanho de janela sem mudar um pixel do markup.
  const pinnedRef = useRef(false);

  const n = SEGMENTS.length;

  /** Rola a página até o cartão `i` estar na frente. Só faz sentido com o palco preso. */
  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track || !pinnedRef.current) return;
      const rect = track.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = HOLD + (i / (n - 1)) * (1 - HOLD * 2);
      const top = window.scrollY + rect.top + p * travel;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [n],
  );

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-orbit-card]"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-orbit-dot]"));
    const readout = root.querySelector<HTMLElement>("[data-orbit-readout]");
    let stop: (() => void) | null = null;
    let lastActive = -1;

    const layout = (p: number) => {
      // Respiro nas pontas: o primeiro cartão fica na frente por um trecho
      // antes de a órbita começar a girar, e o último idem antes de soltar.
      const q = Math.min(1, Math.max(0, (p - HOLD) / (1 - HOLD * 2)));
      const r = q * (n - 1);
      const w = track.clientWidth;
      const rx = Math.min(w * 0.36, 470);
      const rz = 460;

      cards.forEach((card, i) => {
        const d = i - r;
        const theta = d * 0.95;
        const x = Math.sin(theta) * rx;
        const z = (Math.cos(theta) - 1) * rz;
        const ry = (-theta * 180) / Math.PI * 0.5;
        const away = Math.min(1, Math.abs(d));
        // ⚠️ O CARTÃO SÓ DESBOTA QUANDO JÁ ESTÁ INDO PARA TRÁS. Os vizinhos
        // imediatos ficam OPACOS e são apagados pela sombra interna
        // (`--away`): com a opacidade do elemento abaixo de 1, o cartão
        // vira vidro e o texto do que está atrás dele aparece através — dois
        // parágrafos um por cima do outro.
        const opacity = Math.min(1, Math.max(0, 1 - (Math.abs(d) - 1.15) * 1.6));
        card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
        card.style.opacity = opacity.toFixed(3);
        card.style.setProperty("--away", away.toFixed(3));
        card.style.zIndex = String(10 - Math.round(Math.abs(d) * 2));
        // Só o que está perto da frente recebe clique — os de trás estão
        // visíveis como contexto, não como alvo.
        card.style.pointerEvents = Math.abs(d) < 0.5 ? "auto" : "none";
      });

      const active = Math.min(n - 1, Math.max(0, Math.round(r)));
      if (active !== lastActive) {
        lastActive = active;
        cards.forEach((c, i) => c.toggleAttribute("data-front", i === active));
        dots.forEach((d, i) => d.setAttribute("aria-current", i === active ? "true" : "false"));
        if (readout) readout.textContent = `${String(active + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      }
    };

    const clear = () => {
      for (const c of cards) {
        c.style.transform = "";
        c.style.opacity = "";
        c.style.zIndex = "";
        c.style.pointerEvents = "";
        c.style.removeProperty("--away");
        c.removeAttribute("data-front");
      }
      lastActive = -1;
    };

    // ⚠️ A DECISÃO É REFEITA QUANDO A JANELA MUDA DE FAIXA. Girar o celular
    // para o lado ou redimensionar a janela do computador atravessa o limite
    // de 1024px — e sem isto a órbita ficaria ligada num telefone, ou a grade
    // presa num monitor.
    const mq = window.matchMedia("(min-width: 1024px)");
    const decide = () => {
      const pin = canPin();
      if (pin === pinnedRef.current && (stop || !pin)) return;
      pinnedRef.current = pin;
      stop?.();
      stop = null;
      clear();
      if (pin) {
        root.setAttribute("data-orbit", "on");
        stop = watchStage(track, layout, "sticky");
      } else {
        root.removeAttribute("data-orbit");
      }
    };

    decide();
    mq.addEventListener("change", decide);

    return () => {
      mq.removeEventListener("change", decide);
      stop?.();
      clear();
      root.removeAttribute("data-orbit");
    };
  }, [n]);

  return (
    <section ref={rootRef} id="solucoes" className="el-orbit relative bg-[var(--el-ink-deep)] pt-20 md:pt-28">
      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header
          className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end md:gap-12"
        >
          <div data-reveal="up">
            <div className="rule mb-5 w-16" data-rule />
            <p className="eyebrow mb-4 text-[var(--el-sun)]">Nossas soluções</p>
            <h2 className="display text-[2.25rem] text-[var(--el-cream)] sm:text-[2.9rem] md:text-[3.4rem]">
              Quatro frentes, e cada uma resolve um problema diferente.
            </h2>
          </div>
          <p
            className="text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
            data-reveal="up"
            data-reveal-delay="80"
          >
            O recorte aqui é por quem pergunta, não por tecnologia: casa,
            comércio, campo ou um consumo grande o bastante para ser linha de
            orçamento. A escolha entre com bateria e sem vem depois, na análise.
          </p>
        </header>
      </div>

      <div ref={trackRef} className="el-orbit__track">
        <div className="el-orbit__stage">
          {/* O núcleo: a EcoLuz no meio das quatro frentes. Só existe com a
              órbita ligada — na grade e no deslizar ele seria um enfeite solto. */}
          <div className="el-orbit__core" aria-hidden="true">
            <span className="el-orbit__core-glow" />
            <svg viewBox="-200 -80 400 160" className="el-orbit__path" focusable="false">
              <ellipse cx="0" cy="0" rx="196" ry="70" />
            </svg>
            <span className="el-orbit__core-sun" />
          </div>

          <ul className="el-orbit__ring" aria-label="Soluções da EcoLuz">
            {SEGMENTS.map((seg, i) => {
              // ⚠️ O DESTINO SAI DO CONTEÚDO, NÃO DE UM `if` AQUI — ver a nota em
              // `content/offer.ts`: rural e maior porte vão para a conversa até
              // ganharem página.
              const href = seg.page ? pageHref(links, seg.page) : whatsappLink(seg.wa ?? WA_DEFAULT);
              const external = !seg.page;
              return (
                <li key={seg.label} className="el-orbit__slot">
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener" } : {})}
                    className="el-orbit__card group"
                    data-orbit-card
                    onFocus={() => goTo(i)}
                  >
                    <span className="el-orbit__shade" aria-hidden="true" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <span className="numeral text-[2.75rem] text-[var(--el-sun)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <CellGlyph rows={seg.scale} />
                      </div>
                      <p className="mt-6 flex items-center gap-2.5 text-[var(--el-sun)]">
                        <Icon name={seg.icon} className="h-6 w-6" />
                        <span className="eyebrow text-[var(--el-cream-faint)]">Frente {i + 1}</span>
                      </p>
                      <h3 className="display mt-3 text-[1.75rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                        {seg.label}
                      </h3>
                      <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">{seg.text}</p>
                      <ul className="mt-5 grid gap-2 border-t border-[var(--el-line-soft)] pt-5">
                        {seg.points.map((pt) => (
                          <li key={pt} className="flex gap-2.5 text-[0.875rem] text-[var(--el-cream)]">
                            <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-[var(--el-sun)]" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)]">
                        {seg.page ? "Ver detalhes" : "Falar sobre esse caso"} <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>

          {/* A navegação da órbita: o número da vez e os pontinhos. */}
          <div className="el-orbit__hud">
            <p className="eyebrow text-[var(--el-sun)]" data-orbit-readout aria-hidden="true">
              01 / {String(n).padStart(2, "0")}
            </p>
            <div className="flex gap-2">
              {SEGMENTS.map((seg, i) => (
                <button
                  key={seg.label}
                  type="button"
                  className="el-orbit__dot"
                  data-orbit-dot
                  aria-current={i === 0 ? "true" : "false"}
                  aria-label={`Mostrar ${seg.label}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A pista do deslizar, só no celular — sem ela, quatro cartões lado a
          lado parecem um só cartão cortado. */}
      <p className="el-orbit__swipe eyebrow" aria-hidden="true">
        Deslize para ver as quatro <span>→</span>
      </p>
    </section>
  );
}

/**
 * O desenho da escala: fileiras de células de módulo, de uma (a casa) a quatro
 * (o projeto grande). É o MESMO motivo das células do fluxo de energia, logo
 * acima na página — o vocabulário visual se repete de propósito.
 */
function CellGlyph({ rows }: { rows: 1 | 2 | 3 | 4 }) {
  return (
    <svg viewBox="0 0 88 60" className="el-orbit__glyph" aria-hidden="true" focusable="false">
      <g transform="skewX(-16) translate(14 0)">
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * 18}
              y={46 - r * 15}
              width={15}
              height={12}
              className={r < rows ? "el-orbit__glyph-on" : "el-orbit__glyph-off"}
            />
          )),
        )}
      </g>
    </svg>
  );
}
