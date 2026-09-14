// A PÁGINA DE UM SERVIÇO.
//
// ⚠️ ELA É A PORTA DE ENTRADA DE QUEM VEM DE BUSCA, não uma sub-seção da home.
// Quem chega aqui por "sistema off grid maranhão" nunca viu o banner nem o
// menu: a página precisa se explicar sozinha, dizer onde a empresa fica e
// terminar oferecendo o próximo passo. É por isso que o "veja também" e a
// faixa de chamada estão em todas.

import { AREAS } from "../content/areas";
import { whatsappLink } from "../content/business";
import { SERVICE_BY_SLUG, type Service } from "../content/services";
import { PAGE, pageHref, type Ctx } from "../lib";
import { CheckList, CtaBand, FaqList, Section, SectionHead, SeeAlso } from "../ui";

export default function ServicoPage({ links, service }: Ctx & { service: Service }) {
  const wa = whatsappLink(service.wa);

  // ⚠️ OS RELACIONADOS SÃO ESCOLHIDOS no conteúdo, não "os dois seguintes da
  // lista". A barra mostra cinco destinos; é por aqui que as páginas de fora
  // do menu são alcançadas — e o que ninguém aponta, ninguém encontra.
  const related = service.related
    .map((slug) => SERVICE_BY_SLUG.get(slug))
    .filter((s): s is Service => Boolean(s))
    .map((s) => ({ href: pageHref(links, s.slug), label: s.label, text: s.card }));

  return (
    <>
      {/* ── ABERTURA ────────────────────────────────────────────────────── */}
      <section className="relative pb-16 pt-32 md:pb-20 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <nav aria-label="Você está em" className="mb-8 text-[0.8125rem] text-[var(--el-cream-faint)]" data-reveal="fade">
            <a href={links.home} className="transition-colors hover:text-[var(--el-sun-hi)]">
              Início
            </a>
            <span aria-hidden="true" className="mx-2">/</span>
            <a href={pageHref(links, PAGE.servicos)} className="transition-colors hover:text-[var(--el-sun-hi)]">
              Serviços
            </a>
            <span aria-hidden="true" className="mx-2">/</span>
            <span className="text-[var(--el-cream-dim)]">{service.label}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div>
              <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
                {service.eyebrow}
              </p>
              <h1
                className="display mt-5 text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
                data-reveal="up"
                data-reveal-delay="60"
              >
                {service.h1}
              </h1>
              <div
                className="prose-el mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
                data-reveal="up"
                data-reveal-delay="120"
              >
                {service.intro.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <div className="mt-9" data-reveal="up" data-reveal-delay="180">
                <a href={wa} target="_blank" rel="noopener" className="btn btn-solid">
                  Falar sobre isso no WhatsApp
                </a>
              </div>
            </div>

            <aside className="panel p-7" data-reveal="up" data-reveal-delay="240">
              <p className="eyebrow text-[var(--el-sun)]">{service.forWho.title}</p>
              <div className="mt-6">
                <CheckList items={service.forWho.items} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── O QUE ENTRA ─────────────────────────────────────────────────── */}
      <Section tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Na prática"
          title={service.covers.title}
          lead={service.covers.lead}
        />
        <div className="mt-14 grid gap-px sm:grid-cols-2" style={{ background: "var(--el-paper-line)" }}>
          {service.covers.items.map((item, i) => (
            <article
              key={item.title}
              className="bg-[var(--el-paper)] p-7"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <h3 className="display text-[1.125rem] text-[var(--el-paper-ink)]">{item.title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      {service.faq.length ? (
        <Section tone="deep">
          <SectionHead align="stack" eyebrow="Dúvidas" title="Sobre este serviço." />
          <div className="mt-12">
            <FaqList items={service.faq} />
          </div>
        </Section>
      ) : null}

      {/* ── ONDE + VEJA TAMBÉM ──────────────────────────────────────────── */}
      <Section>
        <div className="grid gap-14">
          <div>
            <p className="eyebrow mb-6 text-[var(--el-sun)]">Onde atendemos</p>
            <div className="flex flex-wrap gap-2.5">
              {AREAS.map((a) => (
                <a
                  key={a.slug}
                  href={pageHref(links, a.slug)}
                  className="border border-[var(--el-line)] px-4 py-2.5 text-[0.875rem] text-[var(--el-cream-dim)] transition-colors hover:border-[var(--el-sun)] hover:text-[var(--el-sun-hi)]"
                  data-reveal="fade"
                >
                  {a.name}/{a.uf}
                </a>
              ))}
            </div>
          </div>

          <SeeAlso items={related} />
        </div>
      </Section>

      <CtaBand
        title="Vamos olhar o seu caso?"
        text="Mande uma mensagem com a sua situação. A conversa já começa sabendo do que se trata — e a análise não custa nada."
        href={wa}
      />
    </>
  );
}
