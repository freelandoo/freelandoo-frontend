"use client";

import { useState } from "react";

import { MAP_CITIES } from "./content/energy";
import {
  ILHA_IN_STATE,
  ILHA_PATHS,
  ILHA_VIEWBOX,
  STATE_PATH,
  STATE_VIEWBOX,
  projectIlha,
  projectState,
} from "./content/maranhao-map";
import { pageHref, type TemplateLinks } from "./lib";

/**
 * O MARANHÃO ENERGIZADO — onde a EcoLuz está e até onde vai.
 *
 * Duas pranchas lado a lado: o estado inteiro (com a unidade de Vitória do
 * Mearim e o recorte da ilha marcado) e a Ilha do Maranhão ampliada, com os
 * quatro municípios como formas próprias. As quatro cidades da ilha ficam a
 * vinte quilômetros umas das outras — na escala do estado elas seriam um
 * ponto só, e é por isso que o recorte existe.
 *
 * ⚠️ A GEOMETRIA É DO IBGE, não desenho (`content/maranhao-map.ts`, gerado
 * por `scripts/ecoluz-map.py`). Mapa desenhado à mão erra fronteira, e
 * fronteira errada num mapa de "onde atendemos" é o tipo de erro que o
 * morador da cidade vizinha percebe na hora.
 *
 * ⚠️ AS CIDADES SÃO BOTÕES DE VERDADE, numa lista ao lado — os desenhos são
 * `aria-hidden`. Passar o cursor numa forma ou focar um botão acende a MESMA
 * cidade nos dois lugares, e o painel de detalhe (`aria-live`) diz o que é
 * aquela cidade para a EcoLuz e leva à página dela, quando existe.
 *
 * ⚠️ NENHUMA BIBLIOTECA DE MAPA. Cinco pontos e quatro formas não justificam
 * um mapa de azulejos com chave de API e script de terceiro na CSP.
 */
export default function CoverageMap({ links }: { links: TemplateLinks }) {
  const [active, setActive] = useState<string>(MAP_CITIES[0].name);
  const city = MAP_CITIES.find((c) => c.name === active) ?? MAP_CITIES[0];

  const base = MAP_CITIES.find((c) => c.base) ?? MAP_CITIES[0];
  const baseS = projectState(base.lat, base.lon);
  const baseI = projectIlha(base.lat, base.lon);
  const ilhaCities = MAP_CITIES.filter((c) => c.slug);

  return (
    <div className="el-map" data-active={city.slug ?? "outside"}>
      {/* ── O ESTADO ─────────────────────────────────────────────────────── */}
      <figure className="el-map__state" aria-hidden="true">
        <svg viewBox={STATE_VIEWBOX} focusable="false">
          <path d={STATE_PATH} className="el-map__land" />
          <rect
            x={ILHA_IN_STATE.x - 6}
            y={ILHA_IN_STATE.y - 6}
            width={ILHA_IN_STATE.w + 12}
            height={ILHA_IN_STATE.h + 12}
            className={`el-map__box${city.slug ? " is-on" : ""}`}
          />
          {MAP_CITIES.filter((c) => !c.slug).map((c) => {
            const p = projectState(c.lat, c.lon);
            return (
              <g key={c.name}>
                {/* A linha de energia da base até a outra unidade. */}
                <path d={`M${baseS.x} ${baseS.y} L${p.x} ${p.y}`} className="el-map__wire" />
                <g
                  className={`el-map__pin${active === c.name ? " is-on" : ""}`}
                  transform={`translate(${p.x} ${p.y})`}
                  onMouseEnter={() => setActive(c.name)}
                >
                  <circle r="16" className="el-map__halo" />
                  <circle r="5.5" className="el-map__dot" />
                </g>
                <text x={p.x - 14} y={p.y + 4} className="el-map__label el-map__label--end">
                  {c.name}
                </text>
              </g>
            );
          })}
          <text x={ILHA_IN_STATE.x + ILHA_IN_STATE.w + 12} y={ILHA_IN_STATE.y + 6} className="el-map__label">
            Ilha
          </text>
        </svg>
        <figcaption className="eyebrow">Maranhão</figcaption>
      </figure>

      {/* ── A ILHA, AMPLIADA ─────────────────────────────────────────────── */}
      <figure className="el-map__ilha" aria-hidden="true">
        <svg viewBox={ILHA_VIEWBOX} focusable="false">
          {Object.entries(ILHA_PATHS).map(([slug, d]) => {
            const c = ilhaCities.find((x) => x.slug === slug);
            return (
              <path
                key={slug}
                d={d}
                className={`el-map__muni${c && active === c.name ? " is-on" : ""}`}
                onMouseEnter={() => c && setActive(c.name)}
              />
            );
          })}
          {ilhaCities.map((c) => {
            const p = projectIlha(c.lat, c.lon);
            return c.base ? null : (
              <path key={`w-${c.name}`} d={`M${baseI.x} ${baseI.y} L${p.x} ${p.y}`} className="el-map__wire" />
            );
          })}
          {ilhaCities.map((c) => {
            const p = projectIlha(c.lat, c.lon);
            return (
              <g
                key={c.name}
                className={`el-map__pin${active === c.name ? " is-on" : ""}${c.base ? " is-base" : ""}`}
                transform={`translate(${p.x} ${p.y})`}
                onMouseEnter={() => setActive(c.name)}
              >
                <circle r="18" className="el-map__halo" />
                <circle r={c.base ? 7.5 : 5.5} className="el-map__dot" />
              </g>
            );
          })}
        </svg>
        <figcaption className="eyebrow">Ilha do Maranhão, ampliada</figcaption>
      </figure>

      {/* ── AS CIDADES, EM TEXTO ─────────────────────────────────────────── */}
      <div className="el-map__side">
        <ul className="el-map__list">
          {MAP_CITIES.map((c) => (
            <li key={c.name}>
              <button
                type="button"
                className="el-map__city"
                aria-pressed={active === c.name}
                onMouseEnter={() => setActive(c.name)}
                onFocus={() => setActive(c.name)}
                onClick={() => setActive(c.name)}
              >
                <span aria-hidden="true" className="el-map__bullet" />
                {c.name}
                {c.unit ? <span className="el-map__tag">Unidade</span> : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="el-map__detail" aria-live="polite">
          <p className="eyebrow text-[var(--el-sun)]">{city.base ? "Nossa base" : city.unit ? "Unidade" : "Atendimento"}</p>
          <p className="display mt-2 text-[1.5rem] text-[var(--el-cream)]">{city.name}</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">{city.note}</p>
          {city.slug ? (
            <a
              href={pageHref(links, city.slug)}
              className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)] hover:text-[var(--el-sun)]"
            >
              Energia solar em {city.name} <span aria-hidden="true">→</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
