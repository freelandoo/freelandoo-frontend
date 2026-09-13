/**
 * A HOME.
 *
 * ── A ORDEM DAS SEÇÕES É A ORDEM DAS PERGUNTAS ───────────────────────────
 * 1. banner ........... é perto de mim? quanto custa? (os três preços)
 * 2. cardápio ......... a tabela inteira, e a porta para cada serviço
 * 3. combinados ....... a conta que faz a pessoa gastar mais e sair ganhando
 * 4. como funciona .... e agora, o que eu faço?
 * 5. onde fica ........ como chego aí?
 * 6. perguntas ........ o resto
 *
 * ⚠️ NÃO EXISTE UMA GRADE DE SERVIÇOS SEPARADA DO CARDÁPIO, e a ausência é
 * decisão: seriam duas listas dos mesmos seis serviços na mesma página, e no
 * dia em que alguém acrescentasse o sétimo numa e esquecesse da outra, a
 * página passaria a se contradizer. O cardápio JÁ é a lista — cada linha
 * dele é o link para a página do serviço.
 */

import { BUSINESS, bookingCta } from "../content/business";
import { AREAS } from "../content/areas";
import { SITE_FAQ } from "../content/faq";
import { SERVICES, saving, sumOfParts } from "../content/services";
import { DecoDivider, ServiceGlyph } from "../deco";
import Hero from "../hero";
import { PAGE, brl, pageHref, type Ctx } from "../lib";
import PriceMenu from "../price-menu";
import { Btn, Container, FaqList, Note, Panel, Section, SectionHead } from "../ui";

/** Os três passos. Texto genérico de propósito — descrevem o que o SITE
 *  oferece (escolher, marcar, ir lá), não uma política de atendimento que
 *  ninguém informou.
 *
 *  ⚠️ VIROU FUNÇÃO DE `links` porque o PASSO 2 É O BOTÃO. Como constante, ele
 *  mandava "chame no WhatsApp" enquanto o CTA ao lado dizia "Agendar" — a
 *  mesma página dando duas instruções diferentes para o mesmo gesto. Quem
 *  decide é o MESMO campo do botão (`links.booking`), então os dois não têm
 *  como discordar. */
function passosFor(temAgendamento: boolean) {
  return [
  {
    n: "01",
    title: "Escolha o serviço",
    text: "A tabela inteira está aqui em cima, com o valor de cada um e o que dá para pedir. Nenhum preço depende de pacote ou de ser a primeira vez.",
  },
  temAgendamento
    ? {
        n: "02",
        title: "Marque o horário",
        text: "Escolha o dia e a hora na agenda e pronto: a cadeira fica reservada no seu nome. Dá para pagar na hora ou no balcão, no dia — no sábado isso faz diferença.",
      }
    : {
    n: "02",
    title: "Chame no WhatsApp",
    text: "Diga o que você quer fazer e quando pretende passar. É o jeito de garantir que a cadeira esteja livre quando você chegar — no sábado isso faz diferença.",
  },
  {
    n: "03",
    title: "Sente na cadeira",
    text: "O corte é combinado antes de a máquina ligar: altura da transição, acabamento, o que fica em cima. Sai dali o corte que dá para manter, não só o que fica bom na primeira hora.",
  },
  ];
}

export default function HomePage({ links }: Ctx) {
  const cta = bookingCta(links, "Olá, Enzo! Queria marcar um horário.");
  const passos = passosFor(!!links.booking);
  const combinados = SERVICES.filter((s) => s.sumOf?.length);

  return (
    <>
      <Hero links={links} />

      {/* ── A TABELA ─────────────────────────────────────────────────────── */}
      <Section id="precos" tone="raised">
        <Container>
          <SectionHead
            eyebrow="A tabela"
            title={
              <>
                O preço, <span className="display-italic text-[var(--ec-gold-hi)]">na mesa</span>
              </>
            }
            lead="Sem “consulte valores”. O que está aqui é o que se paga — e cada linha abre a página do serviço, com o que dá para pedir em cada um."
          />
          <PriceMenu links={links} className="mt-14" />
        </Container>
      </Section>

      {/* ── OS COMBINADOS ────────────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHead
            eyebrow="Combinado"
            title="Dois ou três de uma vez sai mais em conta"
            lead="E não é só o preço: feitos no mesmo atendimento, os acabamentos conversam entre si — a costeleta liga o degradê do cabelo ao comprimento da barba."
          />

          <div className="mx-auto mt-14 grid max-w-[52rem] gap-6 md:grid-cols-2">
            {combinados.map((c, i) => (
              <Panel
                key={c.slug}
                className="flex flex-col p-8"
                data-reveal="up"
                data-reveal-delay={i * 0.08}
              >
                <span className="text-[var(--ec-gold-deep)]" aria-hidden="true">
                  <ServiceGlyph name={c.art} className="h-9 w-9" />
                </span>
                <h3 className="display mt-5 text-[1.5rem] text-[var(--ec-cream)]">{c.label}</h3>
                <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--ec-cream-dim)]">
                  {c.cardText}
                </p>

                <div className="mt-6 flex items-end justify-between border-t border-[var(--ec-line-soft)] pt-5">
                  <div>
                    <span className="block text-[0.75rem] text-[var(--ec-cream-faint)] line-through">
                      {brl(sumOfParts(c))} avulsos
                    </span>
                    <span className="display tnum block text-[2.25rem] leading-none text-[var(--ec-gold-hi)]">
                      {brl(c.price)}
                    </span>
                  </div>
                  <a
                    href={pageHref(links, c.slug)}
                    className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--ec-gold)] hover:text-[var(--ec-gold-hi)]"
                  >
                    Detalhes →
                  </a>
                </div>
                <p className="mt-3 text-[0.8125rem] text-[var(--ec-gold)]">
                  Economia de {brl(saving(c))}.
                </p>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <SectionHead eyebrow="Como funciona" title="Três passos, sem mistério" />

          <ol className="mx-auto mt-14 grid max-w-[60rem] gap-px sm:grid-cols-3" style={{ background: "var(--ec-line-soft)" }}>
            {passos.map((p, i) => (
              <li
                key={p.n}
                className="p-8"
                style={{ background: "var(--ec-ink-up)" }}
                data-reveal="up"
                data-reveal-delay={i * 0.08}
              >
                <span
                  className="display-italic block text-[2.5rem] leading-none text-[var(--ec-gold-deep)]"
                  aria-hidden="true"
                >
                  {p.n}
                </span>
                <h3 className="mt-4 text-[1.0625rem] font-semibold text-[var(--ec-cream)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--ec-cream-dim)]">
                  {p.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex justify-center" data-reveal="up">
            <Btn href={cta.href} external={cta.external}>
              {cta.label}
            </Btn>
          </div>
        </Container>
      </Section>

      {/* ── ONDE FICA ────────────────────────────────────────────────────── */}
      <Section id="onde">
        <Container>
          <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-start">
            <div>
              <p className="eyebrow" data-reveal="up">
                Onde fica
              </p>
              <h2
                className="display mt-5 text-[clamp(1.875rem,5vw,3rem)] text-[var(--ec-cream)]"
                data-reveal="up"
              >
                {BUSINESS.neighborhood},{" "}
                <span className="display-italic text-[var(--ec-gold-hi)]">
                  {BUSINESS.city}
                </span>
              </h2>
              <DecoDivider className="mt-7 justify-start" />

              <address className="not-italic" data-reveal="up" data-reveal-delay="0.06">
                <p className="mt-7 text-[1.25rem] text-[var(--ec-cream)]">{BUSINESS.street}</p>
                <p className="mt-1 text-[0.9375rem] text-[var(--ec-cream-dim)]">
                  {BUSINESS.neighborhood} · {BUSINESS.city}/{BUSINESS.state} ·{" "}
                  {BUSINESS.postalCode}
                </p>
              </address>

              <p
                className="mt-6 text-[0.9375rem] text-[var(--ec-cream-dim)]"
                data-reveal="up"
                data-reveal-delay="0.1"
              >
                {BUSINESS.hoursHuman}.{" "}
                <span className="text-[var(--ec-cream-faint)]">{BUSINESS.closedHuman}.</span>
              </p>

              <div className="mt-8 flex flex-wrap gap-3" data-reveal="up" data-reveal-delay="0.14">
                <Btn href={pageHref(links, PAGE.contato)} variant="ghost">
                  Como chegar
                </Btn>
              </div>
            </div>

            <Panel className="p-8" data-reveal="up" data-reveal-delay="0.1">
              <h3 className="eyebrow">De onde vem a clientela</h3>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--ec-cream-dim)]">
                O Jardim Pinheiros fica na região do Alvarenga, na zona sul de São
                Bernardo — a mesma de bairros como Jardim Represa e Batistini. Cada
                um tem a página dele:
              </p>
              <ul className="mt-6 space-y-px" style={{ background: "var(--ec-line-soft)" }}>
                {AREAS.map((a) => (
                  <li key={a.slug} style={{ background: "var(--ec-ink-up)" }}>
                    <a
                      href={pageHref(links, a.slug)}
                      className="flex items-center justify-between px-4 py-3 text-[0.9375rem] text-[var(--ec-cream)] transition-colors hover:text-[var(--ec-gold-hi)]"
                    >
                      <span>{a.name}</span>
                      <span className="text-[var(--ec-gold-deep)]" aria-hidden="true">
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <Note className="mt-5">
                A barbearia não se desloca — estas páginas são para quem vem de perto
                e quer saber onde é.
              </Note>
            </Panel>
          </div>
        </Container>
      </Section>

      {/* ── PERGUNTAS ────────────────────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <SectionHead eyebrow="Perguntas" title="O que costumam perguntar" />
          <FaqList items={SITE_FAQ} />
        </Container>
      </Section>
    </>
  );
}
