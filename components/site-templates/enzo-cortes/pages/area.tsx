/**
 * A PÁGINA DE UM BAIRRO.
 *
 * ── O QUE ESTA PÁGINA PODE E NÃO PODE AFIRMAR ────────────────────────────
 * Pode: onde a barbearia fica, que o bairro existe, que ele é da mesma
 * região, o endereço, o horário e a tabela. Tudo isso é fato conferido.
 *
 * NÃO pode: distância em minutos ou quilômetros (ninguém mediu), "atendemos
 * o bairro X" (a barbearia não se desloca — quem se desloca é o cliente), e
 * qualquer variação de "somos a melhor de X".
 *
 * ⚠️ E NENHUM PARÁGRAFO É O MESMO COM O NOME DO BAIRRO TROCADO. Página de
 * localidade "fiada" — o mesmo texto com a palavra substituída — é
 * exatamente o padrão que o sistema de conteúdo útil do Google detecta e
 * rebaixa. O efeito seria o oposto do pretendido: quatro páginas fracas
 * puxando o site inteiro para baixo, em vez de quatro portas de entrada.
 * Por isso `context` é escrito à mão em cada bairro.
 */

import { AREAS, type Area } from "../content/areas";
import { BUSINESS, bookingCta } from "../content/business";
import { SERVICES } from "../content/services";
import { PAGE, brl, pageHref, type Ctx } from "../lib";
import { BreadcrumbLd, FaqLd } from "../schema";
import {
  Breadcrumb,
  Btn,
  Container,
  FaqList,
  Note,
  Panel,
  Prose,
  Section,
  SectionHead,
} from "../ui";

export default function AreaPage({ links, area }: Ctx & { area: Area }) {
  // A mensagem é a DO BAIRRO — quando não há agendamento, é ela que diz ao
  // Enzo de onde a pessoa está falando sem que ele precise perguntar.
  const cta = bookingCta(links);
  // ⚠️ A página NÃO lista a si mesma nos vizinhos. Sem isso, cada página de
  // bairro teria um link para ela própria — que não leva a lugar nenhum e
  // ainda gasta um dos quatro lugares da lista.
  const vizinhos = AREAS.filter((a) => a.slug !== area.slug);

  const trilha = [
    { name: "Início", path: links.home },
    { name: "Onde fica", path: pageHref(links, PAGE.contato) },
    { name: area.name, path: pageHref(links, area.slug) },
  ];

  return (
    <>
      <FaqLd items={area.faq} />
      <BreadcrumbLd trail={trilha} origin={links.origin} />

      <Section className="!pt-28 md:!pt-36">
        <Container>
          <Breadcrumb trail={trilha} />

          <div className="mt-10">
            <SectionHead as="h1" align="left" eyebrow={area.eyebrow} title={area.h1} />
            <Prose body={area.intro} className="mt-8" />
          </div>
        </Container>
      </Section>

      {/* ── O BLOCO PRÓPRIO DO BAIRRO ────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-start">
            <div>
              <SectionHead align="left" title={area.context.title} />
              <Prose body={area.context.body} className="mt-8" />
            </div>

            <Panel className="p-8" data-reveal="up" data-reveal-delay="0.08">
              <h3 className="eyebrow">A tabela, resumida</h3>
              <ul className="mt-5 space-y-3">
                {SERVICES.map((s) => (
                  <li key={s.slug} className="flex items-baseline justify-between gap-3">
                    <a
                      href={pageHref(links, s.slug)}
                      className="text-[0.9375rem] text-[var(--ec-metal)] transition-colors hover:text-[var(--ec-volt)]"
                    >
                      {s.label}
                    </a>
                    <span className="leader" aria-hidden="true" />
                    <span className="tnum shrink-0 text-[0.9375rem] text-[var(--ec-volt)]">
                      {s.priceFrom ? "a partir de " : ""}
                      {brl(s.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 border-t border-[var(--ec-line-soft)] pt-6">
                <address className="not-italic text-[0.875rem] leading-relaxed text-[var(--ec-metal)]">
                  {BUSINESS.street}
                  <br />
                  {BUSINESS.neighborhood} · {BUSINESS.city}/{BUSINESS.state}
                </address>
                <Note className="mt-2">{BUSINESS.hoursHuman}</Note>
              </div>

              <div className="mt-6">
                <Btn href={cta.href} external={cta.external} className="w-full">
                  {cta.label}
                </Btn>
              </div>
            </Panel>
          </div>
        </Container>
      </Section>

      {/* ── PERGUNTAS ────────────────────────────────────────────────────── */}
      {area.faq.length ? (
        <Section>
          <Container>
            <SectionHead eyebrow="Perguntas" title={`Quem é ${area.prep}`} />
            <FaqList items={area.faq} />
          </Container>
        </Section>
      ) : null}

      {/* ── OS OUTROS BAIRROS ────────────────────────────────────────────
          É esta lista que liga as quatro páginas entre si. Sem ela cada
          bairro seria uma ilha — e é o cluster de links entre páginas
          vizinhas que o buscador lê como sinal geográfico. */}
      <Section tone="raised">
        <Container>
          <SectionHead eyebrow="Por perto" title="Outros bairros da região" />
          <ul className="mt-12 grid gap-px sm:grid-cols-3" style={{ background: "var(--ec-line-soft)" }}>
            {vizinhos.map((v, i) => (
              <li
                key={v.slug}
                style={{ background: "var(--ec-ink-up)" }}
                data-reveal="up"
                data-reveal-delay={i * 0.07}
              >
                <a href={pageHref(links, v.slug)} className="group block p-7">
                  <h3 className="text-[1.0625rem] font-semibold text-[var(--ec-paper)] transition-colors group-hover:text-[var(--ec-volt)]">
                    {v.name}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--ec-metal)]">
                    {v.cardText}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
