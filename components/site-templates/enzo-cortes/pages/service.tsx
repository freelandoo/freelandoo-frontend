/**
 * A PÁGINA DE UM SERVIÇO.
 *
 * ⚠️ ELA EMITE O PRÓPRIO JSON-LD (`Service` com `offers`, `FAQPage` e a
 * trilha), e não a porta do tema. A porta emite o que vale para o site
 * inteiro — a ficha do negócio e a do site; o que é DESTA página só ela sabe.
 * Emitido lá em cima, o `Service` da página de corte apareceria também na de
 * barba, e a ficha do negócio passaria a declarar catorze vezes o serviço
 * errado.
 *
 * ⚠️ O H1 DA PÁGINA É O TÍTULO DA PRIMEIRA SEÇÃO (`as="h1"`), não um h1
 * escondido em cima. Dois h1 na mesma página é o erro que faz o buscador
 * escolher o errado — e o escolhido costuma ser o genérico.
 */

import { BUSINESS, bookingCta } from "../content/business";
import { getService, saving, sumOfParts, type Service } from "../content/services";
import { ServiceGlyph } from "../deco";
import { PAGE, brl, pageHref, type Ctx } from "../lib";
import { BreadcrumbLd, FaqLd, ServiceLd } from "../schema";
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
  TitledList,
} from "../ui";

export default function ServicoPage({ links, service }: Ctx & { service: Service }) {
  // A mensagem de reserva é a DO SERVIÇO — é ela que chega escrita quando não
  // há agendamento, e é o que faz o Enzo saber o que a pessoa quer sem
  // perguntar.
  const cta = bookingCta(links, service.waMessage);
  const url = `${links.origin}${pageHref(links, service.slug)}`;
  const economia = saving(service);

  // "Veja também" é ESCOLHIDO no conteúdo, não o primeiro da lista: é ele
  // que leva a pessoa (e o buscador) aos serviços que não cabem na barra.
  const relacionados = service.related
    .map((slug) => getService(slug))
    .filter((s): s is Service => !!s);

  const trilha = [
    { name: "Início", path: links.home },
    { name: "Serviços", path: pageHref(links, PAGE.servicos) },
    { name: service.label, path: pageHref(links, service.slug) },
  ];

  return (
    <>
      <ServiceLd service={service} url={url} origin={links.origin} />
      <FaqLd items={service.faq} />
      <BreadcrumbLd trail={trilha} origin={links.origin} />

      <Section className="!pt-28 md:!pt-36">
        <Container>
          <Breadcrumb trail={trilha} />

          <div className="mt-10 grid gap-12 md:grid-cols-[1.25fr_1fr] md:items-start">
            <div>
              <SectionHead
                as="h1"
                align="left"
                eyebrow={service.eyebrow}
                title={service.h1}
              />
              <Prose body={service.intro} className="mt-8" />
            </div>

            {/* O cartão de preço fica ao lado do H1 no computador e logo
                abaixo dele no celular — é a primeira coisa que a pessoa
                procura ao abrir uma página de serviço. */}
            <Panel className="p-8" tone="deep" data-reveal="up" data-reveal-delay="0.1">
              <span className="text-[var(--ec-gold-deep)]" aria-hidden="true">
                <ServiceGlyph name={service.art} className="h-10 w-10" />
              </span>

              {service.priceFrom ? (
                <span className="mt-6 block text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--ec-cream-faint)]">
                  a partir de
                </span>
              ) : null}
              <span className="display tnum mt-1 block text-[3.5rem] leading-none text-[var(--ec-gold-hi)]">
                {brl(service.price)}
              </span>
              <span className="mt-2 block text-[0.875rem] text-[var(--ec-cream-dim)]">
                {service.label}
              </span>

              {economia > 0 ? (
                <p className="mt-5 border-t border-[var(--ec-line-soft)] pt-5 text-[0.875rem] text-[var(--ec-cream-dim)]">
                  Avulsos dariam{" "}
                  <span className="tnum text-[var(--ec-cream-faint)] line-through">
                    {brl(sumOfParts(service))}
                  </span>
                  . Economia de{" "}
                  <span className="tnum text-[var(--ec-gold)]">{brl(economia)}</span>.
                </p>
              ) : null}

              <div className="mt-7 flex flex-col gap-3">
                <Btn href={cta.href} external={cta.external}>
                  {cta.label}
                </Btn>
                <Btn href={pageHref(links, PAGE.servicos)} variant="ghost">
                  Ver a tabela
                </Btn>
              </div>

              <Note className="mt-6">
                {BUSINESS.hoursShort} · {BUSINESS.street}, {BUSINESS.neighborhood}
              </Note>
            </Panel>
          </div>
        </Container>
      </Section>

      {/* ── O QUE DÁ PARA PEDIR ──────────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <SectionHead eyebrow="Na cadeira" title={service.covers.title} align="left" />
          <Prose body={service.covers.body} className="mt-8" />
          <div className="mt-10">
            <TitledList items={service.covers.items} />
          </div>
        </Container>
      </Section>

      {/* ── PERGUNTAS ────────────────────────────────────────────────────── */}
      {service.faq.length ? (
        <Section>
          <Container>
            <SectionHead eyebrow="Perguntas" title={`Sobre ${service.label.toLowerCase()}`} />
            <FaqList items={service.faq} />
          </Container>
        </Section>
      ) : null}

      {/* ── VEJA TAMBÉM ──────────────────────────────────────────────────── */}
      {relacionados.length ? (
        <Section tone="raised">
          <Container>
            <SectionHead eyebrow="Veja também" title="Outros serviços" />
            <ul className="mt-12 grid gap-px sm:grid-cols-3" style={{ background: "var(--ec-line-soft)" }}>
              {relacionados.map((r, i) => (
                <li
                  key={r.slug}
                  style={{ background: "var(--ec-ink-up)" }}
                  data-reveal="up"
                  data-reveal-delay={i * 0.07}
                >
                  <a href={pageHref(links, r.slug)} className="group block p-7">
                    <span className="text-[var(--ec-gold-deep)] transition-colors group-hover:text-[var(--ec-gold)]" aria-hidden="true">
                      <ServiceGlyph name={r.art} className="h-8 w-8" />
                    </span>
                    <h3 className="mt-4 text-[1.0625rem] font-semibold text-[var(--ec-cream)] transition-colors group-hover:text-[var(--ec-gold-hi)]">
                      {r.label}
                    </h3>
                    <span className="display tnum mt-2 block text-[1.5rem] leading-none text-[var(--ec-gold-hi)]">
                      {r.priceFrom ? "a partir de " : ""}
                      {brl(r.price)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
