/**
 * ONDE FICA — endereço, horário e como marcar.
 *
 * ⚠️ NÃO EXISTE FORMULÁRIO DE CONTATO NESTE SITE, e a ausência é decisão.
 * Formulário obriga a pessoa a escrever, enviar e esperar por um retorno que
 * ela não sabe quando vem — e obriga o dono a lembrar de abrir uma caixa de
 * e-mail. Numa barbearia, o canal que já está aberto é o WhatsApp: a
 * conversa fica no aparelho dele, com histórico, e a resposta chega onde ele
 * já está olhando. Um formulário aqui seria um segundo canal para a mesma
 * coisa, e o segundo canal é sempre o que alguém esquece de conferir.
 */

import { AREAS } from "../content/areas";
import { ADDRESS_LINE, BUSINESS, TEL_HREF, PHONE_IS_PLACEHOLDER, bookingCta } from "../content/business";
import { PAGE, pageHref, type Ctx } from "../lib";
import { BreadcrumbLd } from "../schema";
import { Breadcrumb, Btn, Container, Note, Panel, Section, SectionHead } from "../ui";

/**
 * O mapa.
 *
 * ⚠️ O ENDEREÇO DA CONSULTA É DERIVADO do mesmo `BUSINESS` que o resto da
 * página mostra — nunca escrito de novo aqui. Escrito duas vezes, o dia em
 * que o endereço mudasse deixaria o alfinete numa rua e o texto em outra.
 *
 * O formato `?q=…&output=embed` não exige chave de API. `loading="lazy"`
 * porque o mapa costuma ficar abaixo da dobra e um iframe carregado de
 * imediato atrasa a página inteira por algo que a pessoa talvez nem role
 * até ver.
 */
function Mapa() {
  const consulta = encodeURIComponent(
    `${BUSINESS.street}, ${BUSINESS.neighborhood}, ${BUSINESS.city} - ${BUSINESS.state}, ${BUSINESS.postalCode}`,
  );
  return (
    <div className="deco-frame overflow-hidden" data-reveal="up">
      <iframe
        title={`Mapa — ${BUSINESS.name}, ${ADDRESS_LINE}`}
        src={`https://www.google.com/maps?q=${consulta}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-[20rem] w-full border-0 md:h-[26rem]"
        style={{ filter: "grayscale(1) contrast(1.1) brightness(0.75)" }}
      />
    </div>
  );
}

export default function ContatoPage({ links }: Ctx) {
  const cta = bookingCta(links);
  const trilha = [
    { name: "Início", path: links.home },
    { name: "Onde fica", path: pageHref(links, PAGE.contato) },
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
              eyebrow="Onde fica"
              title={
                <>
                  {BUSINESS.street},{" "}
                  <span className="display-italic text-[var(--ec-volt)]">
                    {BUSINESS.neighborhood}
                  </span>
                </>
              }
              lead={`${BUSINESS.city}/${BUSINESS.state} · CEP ${BUSINESS.postalCode}. ${BUSINESS.hoursHuman}. ${BUSINESS.closedHuman}.`}
            />
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1.15fr] md:items-start">
            <div className="space-y-6">
              <Panel className="p-8" data-reveal="up">
                <h2 className="eyebrow">Marcar</h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--ec-metal)]">
                  Diga o que quer fazer e quando pretende passar. É o jeito de
                  garantir que a cadeira esteja livre quando você chegar.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Btn href={cta.href} external={cta.external}>
                    {cta.label}
                  </Btn>
                  <Btn href={TEL_HREF} variant="ghost">
                    {BUSINESS.phoneDisplay}
                  </Btn>
                </div>

                {/* ⚠️ ESTE AVISO SOME SOZINHO quando o telefone real entrar:
                    ele é condicionado à mesma constante que marca o número
                    como reservado. Escrito solto, ficaria na página depois de
                    deixar de ser verdade. */}
                {PHONE_IS_PLACEHOLDER ? (
                  <Note className="mt-5 border-t border-[var(--ec-line-soft)] pt-5">
                    O número acima ainda é um espaço reservado — o telefone real
                    entra antes de o site ir ao ar.
                  </Note>
                ) : null}
              </Panel>

              <Panel className="p-8" data-reveal="up" data-reveal-delay="0.08">
                <h2 className="eyebrow">Horário</h2>
                <dl className="mt-4 space-y-2 text-[0.9375rem]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[var(--ec-metal)]">Segunda a sábado</dt>
                    <dd className="tnum text-[var(--ec-volt)]">09h — 19h</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[var(--ec-metal)]">Domingo</dt>
                    <dd className="text-[var(--ec-metal-dim)]">Fechado</dd>
                  </div>
                </dl>
              </Panel>

              <Panel className="p-8" data-reveal="up" data-reveal-delay="0.14">
                <h2 className="eyebrow">Quem vem de perto</h2>
                <ul className="mt-4 space-y-px" style={{ background: "var(--ec-line-soft)" }}>
                  {AREAS.map((a) => (
                    <li key={a.slug} style={{ background: "var(--ec-ink-up)" }}>
                      <a
                        href={pageHref(links, a.slug)}
                        className="flex items-center justify-between px-4 py-3 text-[0.9375rem] text-[var(--ec-paper)] transition-colors hover:text-[var(--ec-volt)]"
                      >
                        <span>{a.name}</span>
                        <span className="text-[var(--ec-volt-deep)]" aria-hidden="true">
                          →
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <div className="space-y-6">
              <Mapa />
              <Panel className="p-8" data-reveal="up" data-reveal-delay="0.08">
                <h2 className="eyebrow">Endereço</h2>
                <address className="not-italic">
                  <p className="mt-4 text-[1.25rem] text-[var(--ec-paper)]">{BUSINESS.street}</p>
                  <p className="mt-1 text-[0.9375rem] text-[var(--ec-metal)]">
                    {BUSINESS.neighborhood}
                    <br />
                    {BUSINESS.city} — {BUSINESS.stateFull}
                    <br />
                    CEP {BUSINESS.postalCode}
                  </p>
                </address>
                <Note className="mt-5">
                  O Jardim Pinheiros fica na região do Alvarenga, zona sul de São
                  Bernardo do Campo.
                </Note>
              </Panel>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
