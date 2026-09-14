// O ÍNDICE DE SERVIÇOS — a página que a barra aponta.
//
// ⚠️ ELA NÃO É UMA LISTA DE LINKS. Se fosse, o menu poderia apontar direto
// para os cinco e ela não precisaria existir. O que ela faz é o que uma lista
// não faz: separar as duas perguntas que a pessoa realmente tem — "quero
// reduzir a conta" e "quero não ficar sem energia" — antes de ela escolher.

import { WA_DEFAULT, whatsappLink } from "../content/business";
import { SERVICES } from "../content/services";
import { Icon } from "../icons";
import { pageHref, type Ctx } from "../lib";
import { CtaBand, Section, SectionHead } from "../ui";

export default function ServicosPage({ links }: Ctx) {
  return (
    <>
      <section className="relative pb-14 pt-32 md:pb-16 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
            Serviços
          </p>
          <h1
            className="display mt-5 max-w-4xl text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
            data-reveal="up"
            data-reveal-delay="60"
          >
            Tudo que envolve um sistema solar, do desenho à manutenção.
          </h1>
          <p
            className="mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
            data-reveal="up"
            data-reveal-delay="120"
          >
            Antes de escolher um serviço, vale responder uma pergunta: o que
            incomoda mais, o valor da conta ou ficar sem energia? As duas
            respostas levam a projetos diferentes.
          </p>
        </div>
      </section>

      {/* ── A BIFURCAÇÃO ────────────────────────────────────────────────── */}
      <Section tone="paper">
        <div className="grid gap-px md:grid-cols-2" style={{ background: "var(--el-paper-line)" }}>
          <article className="bg-[var(--el-paper)] p-8 md:p-10" data-reveal="up">
            <p className="eyebrow text-[var(--el-amber-ink)]">Se o problema é a conta</p>
            <h2 className="display mt-4 text-[1.75rem] text-[var(--el-paper-ink)]">
              Sistema conectado à rede
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
              Sem baterias. O que você gera de dia e não consome vira crédito na
              concessionária, e esse crédito cobre a noite. É o arranjo mais
              comum e o mais barato por energia gerada — mas ele desliga junto
              com a rede quando falta energia.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a href={pageHref(links, "energia-solar-residencial")} className="btn btn-paper !px-5 !py-3 !text-[0.6875rem]">
                Para casa
              </a>
              <a href={pageHref(links, "energia-solar-para-empresas")} className="btn btn-paper !px-5 !py-3 !text-[0.6875rem]">
                Para empresa
              </a>
            </div>
          </article>

          <article className="bg-[var(--el-paper-up)] p-8 md:p-10" data-reveal="up" data-reveal-delay="80">
            <p className="eyebrow text-[var(--el-amber-ink)]">Se o problema é ficar sem</p>
            <h2 className="display mt-4 text-[1.75rem] text-[var(--el-paper-ink)]">
              Off-grid ou híbrido
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
              Com baterias. A energia fica armazenada e o sistema continua
              alimentando o que não pode parar, mesmo com a rede fora do ar — ou
              onde rede simplesmente não existe.
            </p>
            <div className="mt-6">
              <a href={pageHref(links, "sistema-off-grid")} className="btn btn-paper !px-5 !py-3 !text-[0.6875rem]">
                Entender o off-grid
              </a>
            </div>
          </article>
        </div>
      </Section>

      {/* ── OS CINCO ────────────────────────────────────────────────────── */}
      <Section tone="deep">
        <SectionHead
          align="stack"
          eyebrow="Todos os serviços"
          title="As cinco frentes."
        />

        <div className="mt-12 grid gap-px" style={{ background: "var(--el-line-soft)" }}>
          {SERVICES.map((s, i) => (
            <a
              key={s.slug}
              href={pageHref(links, s.slug)}
              className="group grid gap-4 bg-[var(--el-ink)] p-7 transition-colors hover:bg-[var(--el-ink-up)] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8 md:p-8"
              data-reveal="up"
              data-reveal-delay={i * 50}
            >
              <span className="text-[var(--el-sun)]">
                <Icon name={s.icon} className="h-8 w-8" />
              </span>
              <div>
                <h3 className="display text-[1.375rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                  {s.label}
                </h3>
                <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
                  {s.card}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="hidden text-[var(--el-sun-hi)] transition-transform duration-200 group-hover:translate-x-1 md:block"
              >
                →
              </span>
            </a>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Não sabe por onde começar?"
        text="Mande uma foto da sua conta de luz. Em geral ela já diz qual dos cinco é o seu caso."
        href={whatsappLink(WA_DEFAULT)}
      />
    </>
  );
}
