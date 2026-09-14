"use client";

import { useId, useMemo, useState } from "react";

import { brl } from "./lib";

/**
 * A CALCULADORA — a peça que faz a pessoa parar de rolar.
 *
 * ⚠️ O NÚMERO GRANDE É O GASTO DELA, NÃO A NOSSA PROMESSA. Ele é aritmética
 * pura sobre o valor que ela mesma arrastou: conta × 12 × 10. Ninguém precisa
 * acreditar em nós para aceitá-lo — e é justamente por isso que ele convence.
 * Um "você vai economizar R$ 66.300" no mesmo lugar seria uma afirmação
 * nossa sobre o futuro dela, que é o que o resto do ramo faz e é o que faz a
 * pessoa desconfiar da página inteira.
 *
 * ⚠️ A PROJEÇÃO NÃO TEM REAJUSTE DE TARIFA, de propósito. Incluir um
 * percentual anual exigiria escolher qual — e qualquer escolha seria uma
 * premissa nossa inflando o resultado. Sem ele o número sai CONSERVADOR, e a
 * nota diz isso em voz alta: o gasto real tende a ser maior. Estimativa que
 * erra para baixo é a única que a conversa seguinte não desmente.
 *
 * ⚠️ E O TETO DE 85% É "ATÉ", NUNCA "DE". Nenhum sistema zera a conta: o
 * custo de disponibilidade, os tributos e a iluminação pública continuam
 * sendo cobrados. Escrito como valor fechado, seria a primeira promessa que o
 * site quebra — na primeira conta depois da instalação.
 */

const MIN = 150;
const MAX = 6000;
const STEP = 50;
const YEARS = 10;
/** O teto da faixa que a EcoLuz usa como referência de conversa. */
const MAX_OFFSET = 0.85;

export default function SavingsCalculator({ ctaHref }: { ctaHref: string }) {
  const [bill, setBill] = useState(650);
  const id = useId();

  const { spend, potential } = useMemo(() => {
    const total = bill * 12 * YEARS;
    return {
      spend: total,
      // Arredondado à centena: a precisão de real numa estimativa de dez anos
      // é falsa, e um número redondo comunica "ordem de grandeza", que é o que
      // ele realmente é.
      potential: Math.round((total * MAX_OFFSET) / 100) * 100,
    };
  }, [bill]);

  return (
    <div className="grid gap-px lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]" style={{ background: "var(--el-line-soft)" }}>
      {/* ── O CONTROLE ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--el-ink-up)] p-7 md:p-10">
        <label htmlFor={id} className="eyebrow text-[var(--el-sun)]">
          Sua conta de luz hoje
        </label>

        <p className="mt-5 flex items-baseline gap-2">
          <span className="display text-[1.125rem] text-[var(--el-cream-faint)]">R$</span>
          <span className="numeral text-[3.25rem] text-[var(--el-sun-hi)] md:text-[4rem]">
            {bill.toLocaleString("pt-BR")}
          </span>
          <span className="text-[0.9375rem] text-[var(--el-cream-faint)]">/mês</span>
        </p>

        <input
          id={id}
          type="range"
          className="slider mt-5"
          min={MIN}
          max={MAX}
          step={STEP}
          value={bill}
          onChange={(e) => setBill(Number(e.target.value))}
          aria-label="Valor médio da sua conta de energia por mês"
          /* ⚠️ O leitor de tela anuncia o VALOR, não o número cru: sem isto
             ele lê "650" e a pessoa não sabe se são reais, kWh ou meses. */
          aria-valuetext={`${brl(bill)} por mês`}
        />

        <div className="mt-2 flex justify-between text-[0.8125rem] text-[var(--el-cream-faint)]">
          <span>{brl(MIN)}</span>
          <span>{brl(MAX)}</span>
        </div>

        <p className="mt-7 border-t border-[var(--el-line-soft)] pt-6 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
          Arraste até o valor que mais se parece com a sua média. É esse número
          — e não o tamanho do telhado — que diz de que tamanho o sistema
          precisa ser.
        </p>
      </div>

      {/* ── O RESULTADO ────────────────────────────────────────────────── */}
      <div className="bg-[var(--el-ink-hi)] p-7 md:p-10">
        <p className="eyebrow text-[var(--el-cream-faint)]">
          O que sai da sua conta em {YEARS} anos
        </p>

        <p className="numeral mt-4 text-[2.5rem] text-[var(--el-cream)] md:text-[3.25rem]">
          {brl(spend)}
        </p>

        <p className="mt-2 text-[0.875rem] text-[var(--el-cream-faint)]">
          Sem considerar os reajustes anuais da tarifa — com eles, o valor real
          é maior.
        </p>

        <div className="mt-8 border-t border-[var(--el-line-soft)] pt-8">
          <p className="text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
            Com um sistema bem dimensionado, até <strong className="font-semibold text-[var(--el-sun-hi)]">85%</strong>{" "}
            desse valor pode deixar de sair da sua conta:
          </p>
          <p className="numeral mt-3 text-[2rem] text-[var(--el-sun)] md:text-[2.5rem]">
            {brl(potential)}
          </p>
        </div>

        <a href={ctaHref} target="_blank" rel="noopener" className="btn btn-solid mt-8 w-full">
          Quero a análise da minha conta
        </a>

        <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--el-cream-faint)]">
          Estimativa para começar a conversa. Nenhum sistema zera a conta: o
          custo de disponibilidade, os tributos e a iluminação pública seguem
          sendo cobrados. O cenário real sai da análise do seu consumo, da
          tarifa e do imóvel.
        </p>
      </div>
    </div>
  );
}
