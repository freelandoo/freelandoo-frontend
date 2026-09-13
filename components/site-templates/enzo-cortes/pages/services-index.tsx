/**
 * O ÍNDICE DE SERVIÇOS — a tabela inteira, numa página só.
 *
 * É a página que a barra aponta e para onde o banner manda. Ela existe
 * separada da home por um motivo prático: é este endereço que se manda no
 * WhatsApp quando alguém pergunta "quanto é?", e mandar a home faria a
 * pessoa rolar até achar.
 */

import { BUSINESS, bookingCta } from "../content/business";
import { SERVICES, saving, sumOfParts } from "../content/services";
import { ServiceGlyph } from "../deco";
import { PAGE, brl, pageHref, type Ctx } from "../lib";
import PriceMenu from "../price-menu";
import { BreadcrumbLd } from "../schema";
import { Breadcrumb, Btn, Container, Note, Section, SectionHead } from "../ui";

export default function ServicosPage({ links }: Ctx) {
  const cta = bookingCta(links, "Olá, Enzo! Vi a tabela no site e queria marcar.");
  const trilha = [
    { name: "Início", path: links.home },
    { name: "Serviços e preços", path: pageHref(links, PAGE.servicos) },
  ];

  return (
    <>
      <BreadcrumbLd trail={trilha} origin={links.origin} />

      <Section className="!pt-28 md:!pt-36">
        <Container>
          <Breadcrumb trail={trilha} />
          <div className="mt-10">
            <SectionHead
              as="h1"
              eyebrow="Serviços e preços"
              title={
                <>
                  Tudo o que a casa faz,{" "}
                  <span className="display-italic text-[var(--ec-gold-hi)]">com valor</span>
                </>
              }
              lead={`Seis serviços, quatro avulsos e dois combinados. Nenhum valor depende de pacote, fidelidade ou de ser a primeira vez. ${BUSINESS.hoursHuman}.`}
            />
          </div>
          <PriceMenu links={links} className="mt-14" />
        </Container>
      </Section>

      {/* ── UM CARD POR SERVIÇO ──────────────────────────────────────────
          A mesma lista do cardápio, em outra forma: ali ela é para comparar
          preço, aqui é para entender o que cada um é. Os dois blocos saem
          da MESMA fonte (`SERVICES`), então não há como um ficar para trás
          do outro. */}
      <Section tone="raised">
        <Container wide>
          <SectionHead eyebrow="Um a um" title="O que cada serviço é" />

          <ul
            className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
            style={{ background: "var(--ec-line-soft)" }}
          >
            {SERVICES.map((s, i) => {
              const economia = saving(s);
              return (
                <li
                  key={s.slug}
                  style={{ background: "var(--ec-ink-up)" }}
                  data-reveal="up"
                  data-reveal-delay={Math.min(i * 0.06, 0.3)}
                >
                  <a href={pageHref(links, s.slug)} className="group flex h-full flex-col p-8">
                    <span
                      className="text-[var(--ec-gold-deep)] transition-colors group-hover:text-[var(--ec-gold)]"
                      aria-hidden="true"
                    >
                      <ServiceGlyph name={s.art} className="h-9 w-9" />
                    </span>

                    <h3 className="display mt-5 text-[1.375rem] text-[var(--ec-cream)] transition-colors group-hover:text-[var(--ec-gold-hi)]">
                      {s.label}
                    </h3>

                    <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--ec-cream-dim)]">
                      {s.cardText}
                    </p>

                    <div className="mt-6 border-t border-[var(--ec-line-soft)] pt-5">
                      {s.priceFrom ? (
                        <span className="block text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--ec-cream-faint)]">
                          a partir de
                        </span>
                      ) : null}
                      <span className="display tnum block text-[2rem] leading-none text-[var(--ec-gold-hi)]">
                        {brl(s.price)}
                      </span>
                      {economia > 0 ? (
                        <span className="mt-2 block text-[0.8125rem] text-[var(--ec-gold)]">
                          {brl(sumOfParts(s))} avulsos — economiza {brl(economia)}
                        </span>
                      ) : null}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-3" data-reveal="up">
            <Btn href={cta.href} external={cta.external}>
              {cta.label}
            </Btn>
            <Btn href={pageHref(links, PAGE.contato)} variant="ghost">
              Onde fica
            </Btn>
          </div>

          <Note className="mx-auto mt-8 max-w-[40rem] text-center">
            Valores de {BUSINESS.pricesAsOf}. {BUSINESS.hoursHuman}. {BUSINESS.closedHuman}.
          </Note>
        </Container>
      </Section>
    </>
  );
}
