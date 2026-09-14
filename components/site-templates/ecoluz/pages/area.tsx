// A PÁGINA DE UMA ÁREA ATENDIDA.
//
// ⚠️ ELA EXISTE PARA BUSCA LOCAL, e é onde o recorte municipal ganha do
// estadual: "energia solar no Maranhão" disputa com o estado inteiro; "energia
// solar na Raposa" se ganha. É por isso que são quatro páginas e não um
// parágrafo dizendo "atendemos toda a ilha".
//
// ⚠️ E CADA UMA FALA DO QUE ALI É VERDADE. Texto clonado com a cidade trocada
// é o padrão que o buscador trata como conteúdo duplicado — quatro páginas
// iguais rendem menos que uma.

import { AREAS, type Area } from "../content/areas";
import { whatsappLink } from "../content/business";
import { SERVICES } from "../content/services";
import { PAGE, pageHref, type Ctx } from "../lib";
import { CtaBand, Section, SectionHead, SeeAlso } from "../ui";

export default function AreaPage({ links, area }: Ctx & { area: Area }) {
  const wa = whatsappLink(area.wa);

  // ⚠️ AS OUTRAS TRÊS, NUNCA A PRÓPRIA. Sem isto as páginas de área ficariam
  // ilhadas umas das outras — e é o vínculo entre elas que o buscador lê como
  // cluster geográfico.
  const others = AREAS.filter((a) => a.slug !== area.slug).map((a) => ({
    href: pageHref(links, a.slug),
    label: a.name,
    text: a.card,
  }));

  return (
    <>
      <section className="relative pb-16 pt-32 md:pb-20 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <nav aria-label="Você está em" className="mb-8 text-[0.8125rem] text-[var(--el-cream-faint)]" data-reveal="fade">
            <a href={links.home} className="transition-colors hover:text-[var(--el-sun-hi)]">
              Início
            </a>
            <span aria-hidden="true" className="mx-2">/</span>
            <a href={pageHref(links, PAGE.areas)} className="transition-colors hover:text-[var(--el-sun-hi)]">
              Onde atendemos
            </a>
            <span aria-hidden="true" className="mx-2">/</span>
            <span className="text-[var(--el-cream-dim)]">{area.name}</span>
          </nav>

          <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
            {area.eyebrow}
          </p>
          <h1
            className="display mt-5 max-w-4xl text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
            data-reveal="up"
            data-reveal-delay="60"
          >
            {area.h1}
          </h1>
          <div
            className="prose-el mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
            data-reveal="up"
            data-reveal-delay="120"
          >
            {area.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-9" data-reveal="up" data-reveal-delay="180">
            <a href={wa} target="_blank" rel="noopener" className="btn btn-solid">
              Falar com a EcoLuz
            </a>
          </div>
        </div>
      </section>

      {/* ── O QUE É ESPECÍFICO DALI ─────────────────────────────────────── */}
      <Section tone="paper">
        <SectionHead
          tone="paper"
          eyebrow={`Atendimento ${area.prep}`}
          title={area.focus.title}
          lead={area.focus.lead}
        />
        <div className="mt-14 grid gap-px sm:grid-cols-2" style={{ background: "var(--el-paper-line)" }}>
          {area.focus.items.map((item, i) => (
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

      {/* ── SERVIÇOS + OUTRAS ÁREAS ─────────────────────────────────────── */}
      <Section tone="deep">
        <div className="grid gap-14">
          <div>
            <p className="eyebrow mb-6 text-[var(--el-sun)]">
              O que a EcoLuz faz {area.prep}
            </p>
            <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-line-soft)" }}>
              {SERVICES.map((s, i) => (
                <a
                  key={s.slug}
                  href={pageHref(links, s.slug)}
                  className="group bg-[var(--el-ink)] p-6 transition-colors hover:bg-[var(--el-ink-up)]"
                  data-reveal="up"
                  data-reveal-delay={i * 50}
                >
                  <h3 className="display text-[1.0625rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                    {s.label}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--el-cream-faint)]">
                    {s.card}
                  </p>
                </a>
              ))}
            </div>
          </div>

          <SeeAlso title="Outras áreas atendidas" items={others} />
        </div>
      </Section>

      <CtaBand
        title={`Seu imóvel é ${area.prep}?`}
        text="Mande uma mensagem com o endereço e uma foto da conta de luz. A visita técnica é o que fecha o dimensionamento."
        href={wa}
      />
    </>
  );
}
