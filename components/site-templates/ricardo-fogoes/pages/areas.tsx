import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";
import Link from "next/link";

import {
  Breadcrumb,
  CallToAction,
  Head,
  Section,
  Shell,
} from "../ui";
import { Reveal, Draw } from "../motion";
import { CITIES } from "../content/cities";
import { BUSINESS } from "../content/business";
import { BreadcrumbLd } from "../schema";





/**
 * Posição de cada cidade no esquema, em coordenadas do viewBox.
 *
 * ⚠️ NÃO é um mapa, e o texto diz isso. É um ESQUEMA de distâncias — a
 * disposição é aproximada e serve para ler a relação entre as quatro, não
 * para se orientar. Desenhar um mapa a mão livre e apresentá-lo como mapa
 * seria afirmar uma geografia que ninguém conferiu.
 */
const NODES: Record<string, { x: number; y: number }> = {
  aguai: { x: 300, y: 210 },
  "sao-joao-da-boa-vista": { x: 500, y: 120 },
  "casa-branca": { x: 470, y: 320 },
  "mogi-guacu": { x: 108, y: 296 },
};

export default function AreasPage({ links }: Ctx) {
  const TRAIL = [
    { name: "Início", path: links.home },
    { name: "Onde atendemos", path: pageHref(links, PAGE.areas) },
  ];
  const base = NODES.aguai;

  return (
    <>
      <BreadcrumbLd trail={TRAIL} />

      <Section className="pt-32 md:pt-40">
        <Shell>
          <Reveal>
            <Breadcrumb trail={TRAIL} />
            <div className="mt-8">
              <Head
                level={1}
                title="Onde o atendimento chega"
                lead={`A base é ${BUSINESS.city}. As outras três cidades ficam a menos de meia hora de estrada, e o atendimento nelas é marcado com hora como em qualquer lugar.`}
              />
            </div>
          </Reveal>

          {/* esquema de distâncias */}
          <Reveal delay={0.08}>
            <figure className="mt-16">
              <Draw
                viewBox="0 0 600 420"
                className="w-full max-w-[760px]"
                span={0.7}
                role="img"
                ariaLabel="Esquema das quatro cidades atendidas e a distância aproximada de cada uma até Aguaí."
              >
                {/* linhas de cota, da base até cada cidade */}
                <g
                  stroke="var(--rf-line-mid)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                >
                  {CITIES.filter((c) => c.slug !== "aguai").map((c) => {
                    const n = NODES[c.slug];
                    return (
                      <path
                        key={c.slug}
                        d={`M${base.x} ${base.y} L${n.x} ${n.y}`}
                      />
                    );
                  })}
                </g>

                {/* a base: círculo cheio de referência */}
                <g stroke="var(--rf-flame-hi)" strokeWidth="2">
                  <circle cx={base.x} cy={base.y} r="15" />
                  <circle cx={base.x} cy={base.y} r="28" opacity="0.35" />
                  <path d={`M${base.x - 40} ${base.y} L${base.x - 22} ${base.y}`} />
                  <path d={`M${base.x + 22} ${base.y} L${base.x + 40} ${base.y}`} />
                </g>

                {/* as outras três */}
                <g stroke="var(--rf-line-hi)" strokeWidth="2">
                  {CITIES.filter((c) => c.slug !== "aguai").map((c) => {
                    const n = NODES[c.slug];
                    return <circle key={c.slug} cx={n.x} cy={n.y} r="10" />;
                  })}
                </g>
              </Draw>

              {/* rótulos em HTML: texto de SVG não quebra linha nem herda tipo */}
              <figcaption className="note mt-5">
                Esquema de distâncias aproximadas por estrada — não é um mapa.
              </figcaption>
            </figure>
          </Reveal>

          {/* a tabela de cota */}
          <ul className="mt-14">
            {CITIES.map((c, i) => (
              <li key={c.slug}>
                <Reveal delay={Math.min(i, 3) * 0.05}>
                  <Link
                    href={pageHref(links, c.slug)}
                    className="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[var(--rf-line)] py-7 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                  >
                    <div className="px-2">
                      <h2 className="d-md text-[var(--rf-chalk)]">{c.name}</h2>
                      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                        {c.intro[0]}
                      </p>
                      <p className="note mt-3">
                        {c.areas.slice(0, 4).join(" · ")}
                      </p>
                    </div>
                    <span className="note shrink-0 px-2 tabular-nums group-hover:text-[var(--rf-flame-hi)]">
                      {c.km === 0 ? "Base" : `≈ ${c.km} km`}
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal>
            <div className="prose-sheet datum mt-16">
              <h2 className="d-md text-[var(--rf-chalk)]">Fora dessas quatro cidades</h2>
              <p className="mt-5">
                Vale perguntar. A lista acima é onde o atendimento acontece com
                regularidade, e não um limite de mapa — o que decide é a
                distância e o tipo de serviço. Mande a cidade e o defeito pelo
                WhatsApp e a resposta vem direta, inclusive quando for não.
              </p>
            </div>
          </Reveal>
        </Shell>
      </Section>

      <CallToAction
        title="Sua cidade está na lista?"
        lead="Diga de onde você é e o que está acontecendo com o fogão. Se o atendimento não alcançar, a resposta é essa mesma — sem fazer você esperar por uma visita que não vem."
        waMessage="Olá, Ricardo! Queria saber se você atende na minha cidade."
      />
    </>
  );
}
