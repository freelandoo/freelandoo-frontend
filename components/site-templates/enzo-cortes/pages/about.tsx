/**
 * A BARBEARIA — a página "sobre".
 *
 * ⚠️ ESTA É A PÁGINA MAIS FÁCIL DE MENTIR DE UM SITE, e é por isso que ela
 * tem a regra mais dura. A forma padrão do gênero é uma biografia
 * inventada: "há mais de 10 anos", "centenas de clientes satisfeitos",
 * "paixão pela arte da barbearia desde criança". Nada disso foi informado, e
 * nada disso está aqui.
 *
 * O que a página faz em lugar disso é descrever o MÉTODO e as REGRAS DA
 * CASA — coisas que são verdade porque são o desenho do atendimento e
 * porque estão publicadas no próprio site: o preço na mesa, o combinado
 * antes da máquina ligar, o horário. É menos pomposo e é a única versão que
 * a pessoa pode conferir quando chegar.
 *
 * ⚠️ QUANDO O ENZO CONTAR A HISTÓRIA DELE — há quanto tempo corta, onde
 * aprendeu, por que abriu no Jardim Pinheiros — ela entra AQUI e em mais
 * lugar nenhum.
 */

import { ADDRESS_LINE, BUSINESS, bookingCta } from "../content/business";
import { SERVICES } from "../content/services";
import { DecoDivider, Monogram } from "../deco";
import { PAGE, brl, pageHref, type Ctx } from "../lib";
import { BreadcrumbLd } from "../schema";
import { Breadcrumb, Btn, Container, Note, Panel, Prose, Section, SectionHead } from "../ui";

const ABERTURA = [
  "A Enzo Cortes é uma barbearia de bairro no Jardim Pinheiros, em São Bernardo do Campo. O nome é do barbeiro: quem atende é o Enzo, e é com ele que se combina o corte antes de a máquina ligar.",
  "O site existe para resolver, antes de você sair de casa, as duas coisas que costumam obrigar a ligar: quanto custa e quando abre. A tabela inteira está publicada, o horário está no rodapé de toda página, e o endereço é o mesmo em todos os lugares em que aparece.",
];

const REGRAS = [
  {
    title: "O preço fica na mesa",
    text: "Os seis valores estão no site e não mudam conforme quem pergunta. Não há preço de primeira visita, pacote de fidelidade nem valor que só se descobre na hora de pagar. O único serviço com faixa é o risco, e o motivo está escrito na página dele.",
  },
  {
    title: "O corte é combinado antes",
    text: "Altura da transição, máquina ou tesoura, o que sobra em cima e o que você faz com o cabelo de manhã. É uma conversa de um minuto que evita o corte que fica bom na cadeira e impossível no dia seguinte.",
  },
  {
    title: "Combinar sai mais em conta",
    text: "Corte e barba juntos custam menos que separados, e os três menos ainda. A conta está publicada nos dois lugares em que aparece, justamente para você poder conferir.",
  },
  {
    title: "Sábado é dia cheio",
    text: "A casa abre de segunda a sábado, das 09h às 19h. No sábado o movimento concentra — mandar uma mensagem antes de sair é o que evita esperar.",
  },
];

export default function SobrePage({ links }: Ctx) {
  const cta = bookingCta(links, "Olá, Enzo! Queria marcar um horário.");
  const trilha = [
    { name: "Início", path: links.home },
    { name: "A barbearia", path: pageHref(links, PAGE.sobre) },
  ];

  return (
    <>
      <BreadcrumbLd trail={trilha} origin={links.origin} />

      <Section className="!pt-28 md:!pt-36">
        <Container>
          <Breadcrumb trail={trilha} />

          <div className="mt-10 flex flex-col items-center text-center">
            {/* ⚠️ O `data-reveal` VAI NA DIV, não no <Monogram>. TypeScript NÃO
                confere atributo JSX com hífen contra o tipo das props, então
                `data-reveal` num componente que não repassa `...rest`
                COMPILA e é descartado em silêncio — o elemento simplesmente
                nunca anima, sem erro nenhum. */}
            <div data-reveal="scale">
              <Monogram className="h-14 w-14 text-[var(--ec-gold)]" />
            </div>
            <p className="eyebrow mt-7" data-reveal="up">
              A barbearia
            </p>
            <h1
              className="display mt-5 text-[clamp(2rem,7vw,4rem)] text-[var(--ec-cream)]"
              data-reveal="up"
            >
              Uma cadeira no{" "}
              <span className="display-italic text-[var(--ec-gold-hi)]">
                {BUSINESS.neighborhood}
              </span>
            </h1>
            <DecoDivider className="mt-8 w-full max-w-[24rem]" />
          </div>

          <div className="mx-auto mt-10 max-w-[42rem]">
            <Prose body={ABERTURA} />
          </div>
        </Container>
      </Section>

      {/* ── AS REGRAS DA CASA ────────────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <SectionHead
            eyebrow="Como a casa trabalha"
            title="Quatro coisas que valem para todo mundo"
          />

          <ul
            className="mt-14 grid gap-px sm:grid-cols-2"
            style={{ background: "var(--ec-line-soft)" }}
          >
            {REGRAS.map((r, i) => (
              <li
                key={r.title}
                className="p-8"
                style={{ background: "var(--ec-ink-up)" }}
                data-reveal="up"
                data-reveal-delay={Math.min(i * 0.07, 0.24)}
              >
                <span
                  className="display-italic block text-[2rem] leading-none text-[var(--ec-gold-deep)]"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-[1.125rem] font-semibold text-[var(--ec-cream)]">
                  {r.title}
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--ec-cream-dim)]">
                  {r.text}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── A CASA EM NÚMEROS QUE SÃO VERDADE ───────────────────────────── */}
      <Section>
        <Container>
          <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:items-center">
            <div>
              <SectionHead align="left" eyebrow="O essencial" title="Endereço, horário e tabela" />
              <p
                className="mt-8 text-[1.0625rem] leading-relaxed text-[var(--ec-cream-dim)]"
                data-reveal="up"
              >
                Três informações, e elas são as mesmas em todas as páginas deste
                site — de propósito. Endereço que muda de forma conforme a página é
                o que faz o Google deixar de reconhecer que se trata do mesmo
                negócio.
              </p>
              <div className="mt-8 flex flex-wrap gap-3" data-reveal="up" data-reveal-delay="0.08">
                <Btn href={cta.href} external={cta.external}>
                  {cta.label}
                </Btn>
                <Btn href={pageHref(links, PAGE.contato)} variant="ghost">
                  Como chegar
                </Btn>
              </div>
            </div>

            <Panel className="p-8" data-reveal="up" data-reveal-delay="0.1">
              <h2 className="eyebrow">Enzo Cortes</h2>
              <address className="not-italic">
                <p className="mt-4 text-[1.125rem] text-[var(--ec-cream)]">{BUSINESS.street}</p>
                <p className="mt-1 text-[0.9375rem] text-[var(--ec-cream-dim)]">
                  {BUSINESS.neighborhood} · {BUSINESS.city}/{BUSINESS.state} ·{" "}
                  {BUSINESS.postalCode}
                </p>
              </address>

              <p className="mt-6 text-[0.9375rem] text-[var(--ec-cream-dim)]">
                {BUSINESS.hoursHuman}
                <br />
                <span className="text-[var(--ec-cream-faint)]">{BUSINESS.closedHuman}</span>
              </p>

              <ul className="mt-6 space-y-2 border-t border-[var(--ec-line-soft)] pt-6">
                {SERVICES.map((s) => (
                  <li key={s.slug} className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.875rem] text-[var(--ec-cream-dim)]">{s.label}</span>
                    <span className="leader" aria-hidden="true" />
                    <span className="tnum shrink-0 text-[0.875rem] text-[var(--ec-gold-hi)]">
                      {s.priceFrom ? "a partir de " : ""}
                      {brl(s.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <Note className="mt-6">{ADDRESS_LINE}</Note>
            </Panel>
          </div>
        </Container>
      </Section>
    </>
  );
}
