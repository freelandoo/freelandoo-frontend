"use client";

import { useEffect, useRef } from "react";

import { HOMOLOGATION } from "./content/energy";
import { STEPS } from "./content/site";
import { Icon } from "./icons";
import { prefersReducedMotion, watchStage } from "./stage";

/* ══════════════════════════════════════════════════════════════════════════
   O PIPELINE — "Como funciona", da conta à geração
   ══════════════════════════════════════════════════════════════════════════

   Substitui a grade 3×2 de cartões. Seis etapas numa LINHA só: horizontal no
   computador, vertical no celular. A linha enche conforme a leitura avança e
   cada etapa acende quando a luz chega nela — o mesmo gesto do fluxo de
   energia do topo da página, agora aplicado ao processo em vez do elétron.

   ⚠️ O MARKUP NASCE COMPLETO (linha cheia, as seis acesas). O script só apaga
   o que a leitura ainda não alcançou, e sem ele a seção é uma lista numerada
   normal, com o texto inteiro.

   ⚠️ A LINHA É `scale`, NUNCA `width`/`height`. Largura é layout; escala é
   composição — a regra do tema que mantém a rolagem lisa. */

export function EnergyPipeline() {
  const rootRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-pipe-step]"));
    const n = items.length;
    let stop: (() => void) | null = null;
    let lastLit = -2;

    const onProgress = (p: number) => {
      root.style.setProperty("--pipe", p.toFixed(4));
      // A etapa i acende quando a linha passa pela posição dela.
      const lit = Math.floor(p * (n - 1) + 0.02);
      if (lit === lastLit) return;
      lastLit = lit;
      items.forEach((it, i) => it.toggleAttribute("data-lit", i <= lit));
    };

    // ⚠️ A RÉGUA MUDA COM A ORIENTAÇÃO. Na horizontal a lista é baixa (uma
    // fileira), e medir o progresso por ela faria a linha encher em poucos
    // dedos de rolagem — mede-se então pela SEÇÃO, com a leitura perto do pé
    // da tela. Na vertical a lista é alta, e a linha acompanha o texto.
    const mq = window.matchMedia("(min-width: 1024px)");
    const start = () => {
      stop?.();
      lastLit = -2;
      stop = mq.matches ? watchStage(root, onProgress, "pass", 1.05) : watchStage(list, onProgress, "pass", 0.72);
    };

    root.setAttribute("data-live", "on");
    start();
    mq.addEventListener("change", start);
    return () => {
      mq.removeEventListener("change", start);
      stop?.();
      root.removeAttribute("data-live");
      root.style.removeProperty("--pipe");
      items.forEach((it) => it.removeAttribute("data-lit"));
    };
  }, []);

  return (
    <section ref={rootRef} id="como-funciona" className="el-pipe relative bg-[var(--el-paper)] py-20 text-[var(--el-paper-ink)] md:py-28">
      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end md:gap-12">
          <div data-reveal="up">
            <div className="rule rule-ink mb-5 w-16" data-rule />
            <p className="eyebrow mb-4 text-[var(--el-amber-ink)]">Como funciona</p>
            <h2 className="display text-[2.25rem] sm:text-[2.9rem] md:text-[3.4rem]">
              Da primeira conversa ao acompanhamento.
            </h2>
          </div>
          <p className="text-[1.0625rem] leading-relaxed text-[var(--el-paper-dim)]" data-reveal="up" data-reveal-delay="80">
            Seis etapas, e você sabe em qual delas o seu projeto está. A EcoLuz
            não vende equipamento: entrega uma solução completa, incluindo a
            parte que costuma travar — a homologação.
          </p>
        </header>

        {/* As quatro fases grandes — o que as seis etapas SÃO, de relance. */}
        <p className="el-pipe__phases eyebrow mt-12" aria-hidden="true">
          <span>Diagnóstico</span>
          <span>Engenharia</span>
          <span>Instalação</span>
          <span>Legalização</span>
          <span>Geração</span>
        </p>

        <ol ref={listRef} className="el-pipe__list mt-8">
          {/* O trilho e a luz. Decoração: a ordem das etapas está nos números. */}
          <span className="el-pipe__rail" aria-hidden="true" />
          <span className="el-pipe__fill" aria-hidden="true" />

          {STEPS.map((s) => (
            <li key={s.n} className="el-pipe__step" data-pipe-step>
              <span className="el-pipe__node" aria-hidden="true">
                <span className="numeral">{s.n}</span>
              </span>
              <div className="el-pipe__body">
                <h3 className="display text-[1.125rem] md:text-[1.1875rem]">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   A HOMOLOGAÇÃO — "Não é só instalar. Precisa ligar certo."
   ══════════════════════════════════════════════════════════════════════════

   A etapa em que mais gente trava sozinha ganha uma seção própria, porque é
   um dos diferenciais que a EcoLuz sustenta em toda obra. Seis passos, e cada
   um troca de estado em cascata — pendente → em análise → aprovado —, até o
   último virar "gerando".

   ⚠️ É UMA VISUALIZAÇÃO DO PROCESSO, NÃO O STATUS DE UM CLIENTE, e a seção
   escreve isso em voz alta, ao lado da animação. Estados que mudam sozinhos
   numa tela parecem um painel de acompanhamento — e ninguém pode sair daqui
   achando que viu a obra de alguém.

   ⚠️ A CASCATA RODA UMA VEZ, quando a seção entra em cena, e para. Não é um
   laço: são seis temporizadores de curta duração, limpos na saída. Com
   movimento reduzido (ou sem JavaScript) os seis nascem no estado final. */

const STATES = ["Pendente", "Em análise", "Aprovado"] as const;

export function HomologationFlow() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-homo-step]"));
    const timers: number[] = [];

    const set = (row: HTMLElement, state: 0 | 1 | 2 | 3) => {
      row.setAttribute("data-state", String(state));
      const label = row.querySelector<HTMLElement>("[data-homo-label]");
      if (label) label.textContent = state === 3 ? "Gerando" : STATES[state];
    };

    // Todos voltam a "pendente" antes de entrar em cena — o estado do HTML é
    // o final, para quem não tem script.
    rows.forEach((r) => set(r, 0));
    root.setAttribute("data-live", "on");

    const run = () => {
      rows.forEach((row, i) => {
        const t0 = 350 + i * 620;
        timers.push(window.setTimeout(() => set(row, 1), t0));
        timers.push(
          window.setTimeout(() => set(row, i === rows.length - 1 ? 3 : 2), t0 + 520),
        );
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      root.removeAttribute("data-live");
      rows.forEach((r) => {
        r.removeAttribute("data-state");
        const label = r.querySelector<HTMLElement>("[data-homo-label]");
        if (label) label.textContent = r === rows[rows.length - 1] ? "Gerando" : STATES[2];
      });
    };
  }, []);

  return (
    <section ref={rootRef} id="homologacao" className="el-homo relative bg-[var(--el-ink-deep)] py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="el-glow" data-parallax="8" />
      </div>

      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-12">
          <div data-reveal="up">
            <div className="rule mb-5 w-16" data-rule />
            <p className="eyebrow mb-4 text-[var(--el-sun)]">Homologação</p>
            <h2 className="display text-[2.25rem] text-[var(--el-cream)] sm:text-[2.9rem] md:text-[3.6rem]">
              Não é só instalar.
              <br />
              <span className="text-[var(--el-sun)]">Precisa ligar certo.</span>
            </h2>
          </div>
          <p className="text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]" data-reveal="up" data-reveal-delay="80">
            Entre o sistema instalado e o sistema gerando existe um processo na
            concessionária: projeto, documentação, pedido de acesso, vistoria e
            troca do medidor. A EcoLuz conduz cada passo — é a parte em que mais
            gente trava quando compra sozinha.
          </p>
        </header>

        <ol className="el-homo__list mt-12 md:mt-16">
          {HOMOLOGATION.map((h, i) => {
            const last = i === HOMOLOGATION.length - 1;
            return (
              <li key={h.label} className="el-homo__step" data-homo-step data-last={last ? "true" : undefined}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--el-sun)]">
                    <Icon name={h.icon} className="h-6 w-6" />
                  </span>
                  {/* ⚠️ O ESTADO É TEXTO, NÃO SÓ COR — a informação não pode
                      depender de enxergar verde. */}
                  <span className="el-homo__chip" data-homo-label>
                    {last ? "Gerando" : STATES[2]}
                  </span>
                </div>
                <p className="eyebrow mt-5 text-[var(--el-cream-faint)]">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-2 text-[1.1875rem] text-[var(--el-cream)]">{h.label}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--el-cream-dim)]">{h.text}</p>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-[0.8125rem] text-[var(--el-cream-faint)]">
          Visualização do processo — não representa o andamento de nenhum
          projeto real. O prazo das etapas na concessionária é dela, e por isso
          a gente informa em que etapa o seu projeto está, em vez de prometer
          uma data.
        </p>
      </div>
    </section>
  );
}
