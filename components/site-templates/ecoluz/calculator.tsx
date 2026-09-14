"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

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
 *
 * ── O MOVIMENTO: A SEÇÃO CARREGA ──────────────────────────────────────────
 *
 * Uma variável só governa tudo: `--el-charge`, de 0 a 1, derivada da posição
 * do controle e escrita no elemento desta peça. O CSS lê ela e faz o resto —
 * halo, grade, fios e o brilho do numeral. Espalhada como classe por estado
 * ("baixo", "médio", "alto") a mesma coisa viraria três degraus visíveis; como
 * número contínuo, a seção acompanha o dedo.
 *
 * ⚠️ TUDO QUE A CARGA MOVE É `opacity`, COR OU SOMBRA — nada de layout. É o
 * que permite isso acontecer a cada quadro de arraste sem engasgar a rolagem.
 *
 * ⚠️ PARADA, A SEÇÃO NÃO CUSTA NADA. Não há `requestAnimationFrame` de fundo
 * nem temporizador: a carga é estado derivado do controle, e a varredura de
 * luz só existe enquanto `data-charging` está ligado — que é enquanto a pessoa
 * está mexendo, mais 700ms.
 */

const MIN = 150;
const MAX = 6000;
const STEP = 50;
const YEARS = 10;
/** O teto da faixa que a EcoLuz usa como referência de conversa. */
const MAX_OFFSET = 0.85;

/** Quanto tempo a varredura continua depois do último toque no controle. */
const SETTLE_MS = 700;

/**
 * O CONTADOR.
 *
 * ⚠️ ELE ESCREVE NO DOM, NÃO EM ESTADO DO REACT. São dois números mudando a
 * 60 quadros por segundo; por `setState` cada quadro remontaria a peça
 * inteira — e durante um arraste isso se soma ao próprio arraste. O site
 * original fazia assim (`el.textContent`), e era a escolha certa.
 *
 * ⚠️ O VALOR DE VERDADE SAI NO HTML DO SERVIDOR e este gancho o sobrescreve
 * depois. É o que garante que sem JavaScript — e para o robô, que não executa
 * script — a página mostre o número, e não um zero.
 *
 * ⚠️ `useLayoutEffect` E NÃO `useEffect`: ele roda ANTES da primeira pintura.
 * Num efeito comum a pessoa veria o valor final por um quadro, ele cairia
 * para zero e só então contaria — o que parece defeito, não animação.
 *
 * ⚠️ `format` PRECISA SER ESTÁVEL — uma função de módulo, como o `brl`. Numa
 * arrow escrita no JSX ela nasceria nova a cada render, o efeito reiniciaria
 * junto e a contagem nunca terminaria: o número ficaria tremendo no lugar.
 */
function useOdometer(target: number, format: (n: number) => string, animate: boolean, duration: number) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const raf = useRef(0);
  // `null` = ainda não assumimos o controle do texto (o que está na tela é o
  // que o servidor escreveu).
  const current = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    window.cancelAnimationFrame(raf.current);

    const from = current.current;

    if (from === null || !animate || from === target) {
      current.current = target;
      el.textContent = format(target);
      return;
    }

    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // Saída cúbica: rápido no começo e assentando no fim, que é o que faz o
      // número parecer "chegar" em vez de escorregar.
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (target - from) * eased);
      current.current = value;
      el.textContent = format(value);
      if (p < 1) raf.current = window.requestAnimationFrame(step);
    };

    raf.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf.current);
  }, [target, animate, duration, format]);

  return ref;
}

export default function SavingsCalculator({ ctaHref }: { ctaHref: string }) {
  const [bill, setBill] = useState(650);
  // `motion` só liga depois de montado, porque `matchMedia` não existe no
  // servidor — e ler o `window` durante o render tornaria a peça impura.
  const [motion, setMotion] = useState(false);
  // `armed` é "a seção já foi vista": é o que dispara a contagem a partir do
  // zero. Contar antes disso gastaria o efeito fora da tela.
  const [armed, setArmed] = useState(false);
  const [charging, setCharging] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const settle = useRef(0);
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

  /** A carga, de 0 a 1. É ela que o CSS lê. */
  const charge = Math.min(1, Math.max(0, (bill - MIN) / (MAX - MIN)));

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMotion(true);
  }, []);

  // A seção entrou na tela → a contagem começa.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || armed) return;

    // Sem suporte, arma na hora: degradar para "o número aparece", nunca para
    // "o número fica em zero para sempre".
    if (typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onBill = useCallback(
    (value: number) => {
      setBill(value);
      // Quem mexeu no controle obviamente está vendo a peça — vale como
      // gatilho, e cobre o caso raro do observador não disparar.
      setArmed(true);
      if (!motion) return;
      setCharging(true);
      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => setCharging(false), SETTLE_MS);
    },
    [motion],
  );

  // ⚠️ `animate` DEPENDE DE `armed`. Antes de a seção ser vista o alvo é zero
  // e ele é escrito DIRETO; ligado o gatilho, o alvo vira o valor de verdade e
  // aí sim há contagem. Sem essa separação o número desceria do valor real até
  // zero na entrada, que é o contrário do gesto.
  const animate = motion && armed;
  const hold = motion && !armed;

  const spendRef = useOdometer(hold ? 0 : spend, brl, animate, 620);
  const potentialRef = useOdometer(hold ? 0 : potential, brl, animate, 620);

  return (
    <div
      ref={rootRef}
      className="el-sim grid gap-px lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]"
      data-charging={charging ? "true" : undefined}
      style={{ "--el-charge": charge.toFixed(3) } as React.CSSProperties}
    >
      {/* ── O CONTROLE ─────────────────────────────────────────────────── */}
      <div className="el-sim__in relative overflow-hidden bg-[var(--el-ink-up)] p-7 md:p-10">
        {/* A grade técnica local, que acende com a carga. É a mesma gramática
            do fundo do site, só que DENTRO da seção — a camada do tamanho da
            janela continua pintada uma vez e nunca animada. */}
        <span className="el-sim__grid" aria-hidden="true" />

        <div className="relative">
          <label htmlFor={id} className="eyebrow text-[var(--el-sun)]">
            Sua conta de luz hoje
          </label>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="display text-[1.125rem] text-[var(--el-cream-faint)]">R$</span>
            {/* ⚠️ ESTE NÚMERO NÃO É CONTADO: ele é o valor do controle que a
                pessoa está arrastando. Animado, ele ficaria atrás do polegar —
                e atraso em resposta direta lê como campo quebrado, não como
                animação. Quem conta são os DERIVADOS, ao lado. */}
            <span className="el-sim__bill numeral text-[3.25rem] text-[var(--el-sun-hi)] md:text-[4rem]">
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
            onChange={(e) => onBill(Number(e.target.value))}
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
      </div>

      {/* ── O RESULTADO ────────────────────────────────────────────────── */}
      <div className="el-sim__out relative overflow-hidden bg-[var(--el-ink-hi)] p-7 md:p-10">
        {/* O halo que cresce com a carga e a varredura que atravessa o painel
            enquanto o controle está sendo movido. Os dois são decoração: ficam
            fora da árvore de acessibilidade e não recebem toque. */}
        <span className="el-sim__halo" aria-hidden="true" />
        <span className="el-sim__sweep" aria-hidden="true" />

        <div className="relative">
          <p className="eyebrow text-[var(--el-cream-faint)]">
            O que sai da sua conta em {YEARS} anos
          </p>

          <p className="numeral mt-4 text-[2.5rem] text-[var(--el-cream)] md:text-[3.25rem]">
            <span ref={spendRef}>{brl(spend)}</span>
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
            <p className="el-sim__prize numeral mt-3 text-[2rem] text-[var(--el-sun)] md:text-[2.5rem]">
              <span ref={potentialRef}>{brl(potential)}</span>
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
    </div>
  );
}
