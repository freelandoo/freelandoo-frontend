"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import { LOADS, LOADS_NOTE } from "./content/offer";
import { Icon } from "./icons";

/**
 * O QUE ESTÁ CONSUMINDO SUA ENERGIA? — o scanner de cargas.
 *
 * Substitui a grade de seis cartões de "O que cabe na sua conta". A seção
 * existe para a pessoa SE RECONHECER numa situação (pedido do cliente, §13 do
 * brief), e uma grade de seis cartões iguais pede que ela leia os seis. Aqui
 * ela escolhe a dela, e o painel "lê" aquela carga — o gesto de uma análise de
 * consumo, que é exatamente o primeiro passo do trabalho da EcoLuz.
 *
 * ⚠️ NENHUM NÚMERO DE CONSUMO. "Um ar-condicionado gasta X kWh" depende de
 * potência, horas de uso, eficiência e tarifa — e um número médio aqui seria
 * a primeira estimativa que a conversa seguinte desmente. O painel diz POR QUE
 * a carga pesa no dimensionamento, que é verdade para todo mundo.
 *
 * ⚠️ É UM `tablist` DE VERDADE (setas, Home, End), e os seis textos estão no
 * HTML — os de fora com `hidden`. Sem JavaScript a primeira carga aparece e as
 * outras continuam no documento para o buscador.
 */
export default function EnergyScanner() {
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = LOADS.length;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    setI(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="consumo" className="el-scan relative py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="el-glow" data-parallax="10" />
      </div>

      <div className="relative mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
        <header className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end md:gap-12">
          <div data-reveal="up">
            <div className="rule mb-5 w-16" data-rule />
            <p className="eyebrow mb-4 text-[var(--el-sun)]">Identifique o seu caso</p>
            <h2 className="display text-[2.25rem] text-[var(--el-cream)] sm:text-[2.9rem] md:text-[3.4rem]">
              O que está consumindo a sua energia?
            </h2>
          </div>
          <p className="text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]" data-reveal="up" data-reveal-delay="80">
            Quase toda conta alta tem um ou dois responsáveis. Escolha o que
            existe aí — reconhecer o seu é o primeiro passo, e é ele que define
            o tamanho do sistema.
          </p>
        </header>

        <div className="el-scan__grid mt-12 md:mt-16">
          <div role="tablist" aria-label="Cargas elétricas" aria-orientation="vertical" className="el-scan__list" onKeyDown={onKey}>
            {LOADS.map((l, k) => (
              <button
                key={l.label}
                ref={(el) => {
                  tabs.current[k] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-t${k}`}
                aria-selected={k === i}
                aria-controls={`${uid}-p${k}`}
                tabIndex={k === i ? 0 : -1}
                className="el-scan__item"
                onClick={() => setI(k)}
              >
                <span className="el-scan__item-icon">
                  <Icon name={l.icon} className="h-5 w-5" />
                </span>
                {l.label}
                <span aria-hidden="true" className="el-scan__arrow">→</span>
              </button>
            ))}
          </div>

          <div className="el-scan__screen">
            {/* A moldura do "leitor": cantos de mira e a linha que varre. É
                decoração — a leitura está no texto do painel. */}
            <span className="el-scan__corners" aria-hidden="true" />
            <span className="el-scan__beam" aria-hidden="true" key={`b${i}`} />

            {LOADS.map((l, k) => (
              <div
                key={l.label}
                role="tabpanel"
                id={`${uid}-p${k}`}
                aria-labelledby={`${uid}-t${k}`}
                hidden={k !== i}
                className="el-scan__panel"
              >
                <p className="eyebrow text-[var(--el-cream-faint)]">
                  Carga {String(k + 1).padStart(2, "0")} / {String(LOADS.length).padStart(2, "0")} · em análise
                </p>
                <span className="el-scan__big" aria-hidden="true">
                  <Icon name={l.icon} className="h-full w-full" />
                </span>
                <h3 className="display text-[1.75rem] text-[var(--el-cream)] md:text-[2.25rem]">{l.label}</h3>
                <p className="eyebrow mt-5 text-[var(--el-sun)]">Por que pesa no dimensionamento</p>
                <p className="mt-2 max-w-lg text-[1rem] leading-relaxed text-[var(--el-cream-dim)]">{l.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream)]" data-reveal="fade">
          {LOADS_NOTE}
        </p>
      </div>
    </section>
  );
}
