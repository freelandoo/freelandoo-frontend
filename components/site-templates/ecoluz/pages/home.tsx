// A HOME.
//
// A ordem das seções é a ordem da decisão de quem chega: o problema (a conta
// que já está sendo paga) → o que muda → quanto custa esperar → o que existe →
// como funciona → onde → as dúvidas.
//
// ⚠️ A CALCULADORA VEM ANTES DOS SERVIÇOS de propósito. Quem chega ainda não
// sabe se quer on-grid ou off-grid — sabe que a conta está cara. O número da
// própria conta é o que faz a pessoa continuar rolando; a escolha do serviço é
// a pergunta seguinte, não a primeira.

import SavingsCalculator from "../calculator";
import { AREAS } from "../content/areas";
import { WA_DEFAULT, whatsappLink } from "../content/business";
import { SERVICES } from "../content/services";
import { BENEFITS, FAQ, STEPS } from "../content/site";
import Hero from "../hero";
import { Icon } from "../icons";
import { PAGE, pageHref, type Ctx } from "../lib";
import { CtaBand, FaqList, FeatureCard, Section, SectionHead } from "../ui";

export default function HomePage({ links }: Ctx) {
  return (
    <>
      <Hero links={links} />

      {/* ── O QUE MUDA ──────────────────────────────────────────────────── */}
      <Section id="beneficios" tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Mais que uma conta menor"
          title="O que muda quando o sistema entra em operação."
          lead="Energia solar boa não aparece só no telhado. Ela aparece na conta, na previsibilidade e em ter alguém por perto quando alguma coisa muda."
        />

        <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-paper-line)" }}>
          {BENEFITS.map((b, i) => (
            <FeatureCard
              key={b.title}
              icon={b.icon}
              title={b.title}
              text={b.text}
              tone="paper"
              delay={i * 60}
            />
          ))}
        </div>
      </Section>

      {/* ── A CALCULADORA ───────────────────────────────────────────────── */}
      <Section id="economia">
        <SectionHead
          eyebrow="Quanto custa esperar"
          title="A conta que você já paga, projetada em dez anos."
          lead="Não é uma promessa nossa: é a sua conta multiplicada pelo tempo. Arraste até o seu valor médio e veja o tamanho do número."
        />
        <div className="mt-12" data-reveal="scale">
          <SavingsCalculator ctaHref={whatsappLink(WA_DEFAULT)} />
        </div>
      </Section>

      {/* ── OS SERVIÇOS ─────────────────────────────────────────────────── */}
      <Section id="solucoes" tone="deep">
        <SectionHead
          eyebrow="O que a EcoLuz faz"
          title="Do projeto à ampliação, com e sem bateria."
          lead="Cinco frentes, e cada uma resolve uma pergunta diferente. Se ainda não está claro qual é a sua, comece pela conversa — é de graça e é rápido."
        />

        <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-line-soft)" }}>
          {SERVICES.map((s, i) => (
            <a
              key={s.slug}
              href={pageHref(links, s.slug)}
              className="group flex flex-col bg-[var(--el-ink)] p-7 transition-colors hover:bg-[var(--el-ink-up)]"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <span className="text-[var(--el-sun)]">
                <Icon name={s.icon} className="h-7 w-7" />
              </span>
              <p className="eyebrow mt-6 text-[var(--el-cream-faint)]">{s.eyebrow}</p>
              <h3 className="display mt-2 text-[1.375rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                {s.label}
              </h3>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
                {s.card}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)]">
                Ver detalhes <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}

          {/* O sexto lugar da grade: o convite, no lugar de um card vazio. */}
          <div className="flex flex-col justify-between bg-[var(--el-ink-up)] p-7" data-reveal="up" data-reveal-delay="300">
            <p className="display text-[1.375rem] leading-snug text-[var(--el-cream)]">
              Não sabe qual é o seu caso?
            </p>
            <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
              Mande uma foto da sua conta de luz. Em geral ela já responde
              metade das perguntas.
            </p>
            <a
              href={whatsappLink(WA_DEFAULT)}
              target="_blank"
              rel="noopener"
              className="btn btn-solid mt-6"
            >
              Mandar a minha conta
            </a>
          </div>
        </div>
      </Section>

      {/* ── COMO FUNCIONA ───────────────────────────────────────────────── */}
      <Section id="como-funciona" tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Como funciona"
          title="Da primeira conversa ao acompanhamento."
          lead="Seis etapas, e você sabe em qual delas o seu projeto está. A parte que costuma travar — a homologação — é conduzida pela EcoLuz."
        />

        <ol className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-paper-line)" }}>
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="bg-[var(--el-paper)] p-7"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <span className="numeral text-[2.25rem] text-[var(--el-amber-ink)]">{s.n}</span>
              <h3 className="display mt-3 text-[1.125rem] text-[var(--el-paper-ink)]">{s.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── ONDE ────────────────────────────────────────────────────────── */}
      <Section id="areas">
        <SectionHead
          eyebrow="Onde a EcoLuz atende"
          title="Os quatro municípios da Ilha do Maranhão."
          lead="A loja fica no Turu, em São Luís. Daqui o atendimento cobre a ilha inteira — e cada lugar tem a sua particularidade técnica."
        />

        <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--el-line-soft)" }}>
          {AREAS.map((a, i) => (
            <a
              key={a.slug}
              href={pageHref(links, a.slug)}
              className="group flex flex-col bg-[var(--el-ink)] p-7 transition-colors hover:bg-[var(--el-ink-up)]"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <h3 className="display text-[1.25rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                {a.name}
              </h3>
              <p className="eyebrow mt-1.5 text-[var(--el-sun)]">
                {a.isBase ? "Nossa base" : a.uf}
              </p>
              <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
                {a.card}
              </p>
            </a>
          ))}
        </div>

        <p className="mt-8 text-[0.9375rem] text-[var(--el-cream-faint)]" data-reveal="fade">
          Projeto fora da ilha?{" "}
          <a
            href={pageHref(links, PAGE.areas)}
            className="text-[var(--el-sun-hi)] underline underline-offset-4"
          >
            Veja como funciona
          </a>
          .
        </p>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section id="duvidas" tone="paper">
        <SectionHead
          tone="paper"
          align="stack"
          eyebrow="Antes de decidir"
          title="As perguntas que todo mundo faz."
        />
        <div className="mt-12">
          <FaqList items={FAQ} tone="paper" />
        </div>
      </Section>

      <CtaBand
        title="Comece pela sua conta de luz."
        text="Mande uma foto dela no WhatsApp. A análise é gratuita e é o que transforma a conversa sobre energia solar em número."
        href={whatsappLink(WA_DEFAULT)}
      />
    </>
  );
}
