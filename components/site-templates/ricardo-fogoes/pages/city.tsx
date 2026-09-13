import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";
import Link from "next/link";

import {
  Actions,
  Breadcrumb,
  CallToAction,
  Head,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { CITIES, type City } from "../content/cities";
import { SERVICES, getService } from "../content/services";
import { BUSINESS } from "../content/business";
import { BreadcrumbLd, ServiceLd } from "../schema";

/**
 * ⚠️ Rota dinâmica NA RAIZ, e isso é deliberado.
 *
 * As cidades moram em `/aguai`, não em `/cidades/aguai`: a URL mais curta é
 * a que as pessoas colam e a que cabe num anúncio. Segmento estático vence
 * dinâmico no Next, então `/servicos`, `/sobre` e `/contato` continuam
 * respondendo pelas próprias pastas.
 *
 * `dynamicParams = false` fecha a porta: sem ele, QUALQUER caminho de um
 * nível viraria uma página de cidade em branco — e o Google indexaria
 * páginas que ninguém escreveu.
 */


/** A página de uma cidade. A resolução do endereço mora em `pages.ts`. */
export default function CidadePage({ links, city: c }: Ctx & { city: City }) {

  const trail = [
    { name: "Início", path: links.home },
    { name: "Onde atendemos", path: pageHref(links, PAGE.areas) },
    { name: c.name, path: pageHref(links, c.slug) },
  ];

  const highlight = c.highlight
    .map((h) => getService(h))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const rest = SERVICES.filter((s) => !c.highlight.includes(s.slug));
  const neighbours = CITIES.filter((o) => o.slug !== c.slug);

  return (
    <>
      <BreadcrumbLd trail={trail} />
      <ServiceLd
        name={`Conserto de fogões ${c.inName}`}
        description={c.metaDescription}
        url={`${links.origin}${pageHref(links, c.slug)}`}
        origin={links.origin}
      />

      <Section className="pt-32 md:pt-40">
        <Shell>
          <Reveal>
            <Breadcrumb trail={trail} />
            <div className="mt-8">
              <Head level={1} title={c.h1} />
            </div>
            <div className="prose-sheet datum mt-7 text-lg">
              {c.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <Actions
              waMessage={c.waMessage}
              className="mt-9 pl-[calc(var(--datum)+1rem)]"
            />

            <dl className="mt-12 grid max-w-[46rem] grid-cols-2 gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-3">
              <div className="bg-[var(--rf-sheet)] px-4 py-3.5">
                <dt className="note">Distância da base</dt>
                <dd className="mt-1 text-sm text-[var(--rf-chalk)]">
                  {c.km === 0
                    ? `${BUSINESS.city} é a base`
                    : `≈ ${c.km} km de ${BUSINESS.city}`}
                </dd>
              </div>
              <div className="bg-[var(--rf-sheet)] px-4 py-3.5">
                <dt className="note">Atendimento</dt>
                <dd className="mt-1 text-sm text-[var(--rf-chalk)]">
                  {BUSINESS.hoursShort}
                </dd>
              </div>
              <div className="bg-[var(--rf-sheet)] px-4 py-3.5">
                <dt className="note">Visita</dt>
                <dd className="mt-1 text-sm text-[var(--rf-chalk)]">
                  {BUSINESS.scheduling}
                </dd>
              </div>
            </dl>
          </Reveal>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)] !pt-16">
        <Shell>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <Head title={c.angle.title} />
              <div className="prose-sheet datum mt-7">
                {c.angle.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="d-md text-[var(--rf-chalk)]">
                Bairros e regiões de {c.name}
              </h2>
              <ul className="mt-6 border-t border-[var(--rf-line)]">
                {c.areas.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-4 border-b border-[var(--rf-line)] py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.7rem] h-px w-5 shrink-0 bg-[var(--rf-line-hi)]"
                    />
                    <span className="text-[var(--rf-chalk-dim)]">{a}</span>
                  </li>
                ))}
              </ul>
              <p className="note mt-5">
                Não achou o seu bairro? Pergunte — a lista não é fechada.
              </p>
            </Reveal>
          </div>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head
              title={`O que ${c.name} mais pede`}
              lead="Na ordem em que aparecem nas chamadas desta cidade."
            />
          </Reveal>
          <ul className="mt-12 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] md:grid-cols-3">
            {highlight.map((s, i) => (
              <li key={s.slug} className="bg-[var(--rf-sheet)]">
                <Reveal delay={i * 0.06}>
                  <Link
                    href={pageHref(links, s.slug)}
                    className="flex h-full flex-col gap-3 p-7 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                  >
                    <span className="note">{s.part}</span>
                    <h3 className="d-md text-[var(--rf-chalk)]">{s.label}</h3>
                    <p className="text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                      {s.cardText}
                    </p>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-[var(--rf-chalk-dim)]">
            Também atendidos {c.inName}:{" "}
            {rest.map((s, i) => (
              <span key={s.slug}>
                <Link
                  href={pageHref(links, s.slug)}
                  className="text-[var(--rf-chalk)] underline decoration-[var(--rf-line-mid)] underline-offset-4 transition-colors hover:decoration-[var(--rf-flame-hi)]"
                >
                  {s.label.toLowerCase()}
                </Link>
                {i < rest.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </Shell>
      </Section>

      {/* cidades vizinhas: é o link entre elas que forma o cluster local */}
      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title="Cidades vizinhas atendidas" />
          </Reveal>
          <ul className="mt-10 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-3">
            {neighbours.map((n) => (
              <li key={n.slug} className="bg-[var(--rf-sheet)]">
                <Link
                  href={pageHref(links, n.slug)}
                  className="block p-6 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                >
                  <span className="d-sm block text-[var(--rf-chalk)]">{n.name}</span>
                  <span className="note mt-2 block tabular-nums">
                    {n.km === 0 ? "Base" : `≈ ${n.km} km de Aguaí`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      <CallToAction
        title={`Atendimento ${c.inName}`}
        lead={`Descreva o defeito e o modelo do fogão. ${BUSINESS.hoursHuman}, com hora marcada.`}
        waMessage={c.waMessage}
      />
    </>
  );
}
