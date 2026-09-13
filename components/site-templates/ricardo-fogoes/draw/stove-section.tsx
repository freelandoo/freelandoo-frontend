"use client";

/**
 * FOGÃO EM CORTE — a peça memorável do site.
 *
 * O desenho não ilustra: ele ROTEIA. Cada chamada é um sintoma que o
 * cliente digita no Google ("não acende", "apaga sozinho"), apontada na
 * peça que costuma causá-lo, e cada uma leva ao serviço que resolve.
 *
 * ── Por que a chamada é HTML e não texto dentro do SVG ───────────────────
 * Texto em SVG não quebra linha, não herda a tipografia da página, não é
 * alvo de toque confiável e escala junto com o desenho — num celular de
 * 360px viraria tipografia de 6px. Os marcadores são botões HTML
 * posicionados em PORCENTAGEM sobre a caixa do desenho: acompanham o
 * redimensionamento sem cálculo e continuam sendo elemento focável.
 *
 * ── Por que são CINCO e não seis ─────────────────────────────────────────
 * `SYMPTOMS` tem seis, mas a sexta é a CHAPA — que não existe num fogão
 * doméstico. Desenhá-la aqui seria apontar para uma peça que não está no
 * corte. Ela abre o bloco de cozinha profissional, onde é verdade.
 */

import Link from "next/link";
import { useState } from "react";
import type { TemplateLinks } from "@/types/site-template";
import { pageHref } from "../lib";
import { SYMPTOMS } from "../content/services";
import { Draw } from "../motion";

/**
 * Posição de cada marcador, em % da caixa do desenho. Índice = n - 1.
 *
 * ⚠️ As porcentagens acompanham o viewBox 720×520. Mexeu no desenho, refaz
 * a conta: marcador fora da peça que ele aponta é pior que marcador nenhum,
 * porque afirma uma coisa errada com a autoridade de um desenho técnico.
 */
const MARKS = [
  { left: "33.9%", top: "25.4%" }, // 1 vela de acendimento  (244,132)
  { left: "11.7%", top: "43.3%" }, // 2 injetor              ( 84,225)
  { left: "16.7%", top: "25.4%" }, // 3 termopar             (120,132)
  { left: "84.7%", top: "46.2%" }, // 4 registro e mangueira (610,240)
  { left: "43.1%", top: "78.5%" }, // 5 queimador do forno   (310,408)
];

/**
 * Três pesos de traço, como numa prancha de verdade:
 * L  — carcaça e contorno geral (o que segura a leitura)
 * LM — peça em corte (o que está sendo explicado)
 * LH — detalhe fino e linha de chamada
 * FL — a chama. É o único azul do desenho, e por isso ele significa.
 */
const L = "var(--rf-line)";
const LM = "var(--rf-line-mid)";
const LH = "var(--rf-line-hi)";
const FL = "var(--rf-flame-hi)";

export default function StoveSection({ links }: { links: TemplateLinks }) {
  const [active, setActive] = useState<number | null>(null);
  const parts = SYMPTOMS.slice(0, 5);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
      {/* ── o desenho ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Draw
          viewBox="0 0 720 520"
          className="w-full"
          span={0.85}
          role="img"
          ariaLabel="Corte esquemático de um fogão a gás, com as peças que mais causam defeito numeradas de 1 a 5."
        >
          {/* ── carcaça ─────────────────────────────────────────────── */}
          <g stroke={LM} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M60 196 L560 196 L560 452 L60 452" />
            <path d="M60 196 L60 452" />
            <path d="M96 452 L96 478 M524 452 L524 478" />
            {/* mesa: a laje em corte */}
            <path d="M60 196 L560 196 L560 210 L60 210 Z" strokeWidth="2" />
          </g>

          {/* a laje é o único material maciço do corte, e leva hachura */}
          <g stroke={L} strokeWidth="0.9" opacity="0.75">
            {Array.from({ length: 24 }, (_, i) => 70 + i * 20).map((x) => (
              <path key={x} d={`M${x} 210 L${x + 12} 196`} />
            ))}
          </g>

          {/* ── queimador em corte: a peça que o site inteiro discute ── */}
          <g stroke={LM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* trempe */}
            <path d="M104 150 Q180 128 256 150" strokeWidth="2.5" />
            <path d="M118 162 Q180 144 242 162" strokeWidth="1.5" />
            {/* tampa e espalhador */}
            <path d="M140 166 Q180 154 220 166 Q180 178 140 166 Z" strokeWidth="2.5" />
            <path d="M124 184 Q180 170 236 184 Q180 198 124 184 Z" strokeWidth="2.5" />
            {/* corpo, descendo para dentro da mesa */}
            <path d="M152 192 L146 210 L214 210 L208 192" />
          </g>

          {/* a chama: azul, porque regulada. É o único azul do desenho. */}
          <g stroke={FL} strokeWidth="3" strokeLinecap="round" opacity="0.92">
            <path d="M132 178 L124 166" />
            <path d="M152 174 L148 160" />
            <path d="M180 172 L180 157" />
            <path d="M208 174 L212 160" />
            <path d="M228 178 L236 166" />
          </g>

          {/* ── venturi, injetor e entrada de ar ───────────────────── */}
          <g stroke={LM} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M150 218 L96 218" />
            <path d="M150 234 L96 234" />
            <path d="M76 216 L96 216 L96 236 L76 236 Z" strokeWidth="2.5" />
            <path d="M62 226 L76 226" />
            {/* as duas setas de ar entrando no tubo */}
            <path d="M116 254 L116 238 M111 246 L116 238 L121 246" />
            <path d="M136 254 L136 238 M131 246 L136 238 L141 246" />
          </g>

          {/* ── vela e termopar ────────────────────────────────────── */}
          <g stroke={LH} strokeWidth="2" strokeLinecap="round">
            <path d="M216 196 L216 162" />
            <circle cx="216" cy="157" r="4" />
            <path d="M144 196 L144 162" />
            <circle cx="144" cy="157" r="4" />
          </g>

          {/* ── segunda boca: diz que é um fogão, não um queimador solto ── */}
          <g stroke={LM} strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <path d="M368 160 Q430 142 492 160" strokeWidth="2" />
            <path d="M396 176 Q430 166 464 176 Q430 186 396 176 Z" />
            <path d="M404 190 L400 196 M456 190 L460 196" />
          </g>
          <g stroke={FL} strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
            <path d="M408 172 L404 162" />
            <path d="M430 170 L430 158" />
            <path d="M452 172 L456 162" />
          </g>

          {/* ── forno ──────────────────────────────────────────────── */}
          <g stroke={LM} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M100 252 L524 252 L524 430 L100 430 Z" />
            {/* porta, à frente do corte, com puxador */}
            <path d="M100 252 L100 430" strokeWidth="3" />
            <path d="M112 252 L112 430" strokeWidth="1.25" opacity="0.7" />
            <path d="M78 272 L100 272" strokeWidth="3" />
            <path d="M78 266 L78 292" strokeWidth="3" />
            {/* prateleira com assadeira */}
            <path d="M124 336 L500 336" />
            <path d="M228 336 L228 320 L396 320 L396 336" strokeWidth="1.5" opacity="0.85" />
          </g>

          {/* queimador do forno + chama */}
          <g stroke={LM} strokeWidth="2.5" strokeLinecap="round">
            <path d="M130 408 L490 408" />
          </g>
          <g stroke={FL} strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
            {[168, 228, 288, 348, 408, 462].map((x) => (
              <path key={x} d={`M${x} 408 L${x} 392`} />
            ))}
          </g>

          {/* ── linha de gás, registro e mangueira ─────────────────── */}
          <g stroke={LM} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M560 240 L584 240" />
            <path d="M584 228 L616 228 L616 252 L584 252 Z" strokeWidth="2.5" />
            <path d="M600 228 L600 214" strokeWidth="2.5" />
            <path d="M616 240 Q652 240 652 278 Q652 316 620 316" />
          </g>

          {/* ── chamadas: a linha de indicação de cada peça ────────── */}
          <g stroke={LH} strokeWidth="1" opacity="0.8">
            <path d="M216 157 L244 140" />
            <path d="M76 226 L62 226 L62 232" />
            <path d="M144 157 L120 140" />
            <path d="M600 214 L610 232" />
            <path d="M310 408 L310 402" />
          </g>
        </Draw>

        {/* marcadores */}
        {parts.map((s, i) => {
          const on = active === s.n;
          return (
            <button
              key={s.n}
              type="button"
              aria-label={`Chamada ${s.n}: ${s.label}`}
              onMouseEnter={() => setActive(s.n)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.n)}
              onBlur={() => setActive(null)}
              className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center border text-[0.8125rem] font-semibold transition-colors duration-200"
              style={{
                left: MARKS[i].left,
                top: MARKS[i].top,
                fontFamily: "var(--rf-mono)",
                borderColor: on
                  ? s.heat === "hot"
                    ? "var(--rf-ember)"
                    : "var(--rf-flame-hi)"
                  : "var(--rf-line-hi)",
                background: on ? "var(--rf-sheet-hi)" : "var(--rf-sheet-up)",
                color: on
                  ? s.heat === "hot"
                    ? "var(--rf-ember)"
                    : "var(--rf-flame-hi)"
                  : "var(--rf-chalk-dim)",
              }}
            >
              {s.n}
            </button>
          );
        })}
      </div>

      {/* ── a legenda, que é a lista de sintomas ────────────────────────── */}
      <ul className="border-t border-[var(--rf-line)]">
        {parts.map((s) => {
          const on = active === s.n;
          return (
            <li key={s.n} className="border-b border-[var(--rf-line)]">
              <Link
                href={pageHref(links, s.service)}
                onMouseEnter={() => setActive(s.n)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.n)}
                onBlur={() => setActive(null)}
                className="group block py-4 transition-colors duration-200"
                style={{ background: on ? "var(--rf-sheet-up)" : undefined }}
              >
                <div className="flex items-baseline gap-3 px-3">
                  <span
                    className="note shrink-0 tabular-nums"
                    style={{
                      color: on
                        ? s.heat === "hot"
                          ? "var(--rf-ember)"
                          : "var(--rf-flame-hi)"
                        : undefined,
                    }}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="d-sm block text-[var(--rf-chalk)]">{s.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                      {s.cause}
                    </span>
                    <span className="note mt-2 block text-[var(--rf-chalk-faint)] group-hover:text-[var(--rf-chalk-dim)]">
                      {s.part}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
