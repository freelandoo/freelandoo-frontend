// A HOME.
//
// ⚠️ A ORDEM DAS SEÇÕES É A DO BRIEF DO CLIENTE (14/09), numerada por ele de 1
// a 14, e foi seguida à risca. Ela já é a ordem da decisão de quem chega: a
// promessa → a prova → por que nós → o que serve para mim → como funciona →
// quanto dá → o que já fizemos → como pagar → quem somos → onde → o que dizem
// → as dúvidas → me reconheço → o próximo passo.
//
// ⚠️ ISTO MUDOU UMA DECISÃO ANTERIOR, e a nota velha foi apagada porque
// passou a mentir: a calculadora vinha ANTES dos serviços, com o argumento de
// que quem chega sabe da conta e não sabe da tecnologia. O argumento continua
// certo, mas deixou de precisar da posição — o PRIMEIRO botão da abertura é
// "Quero saber quanto posso economizar" e aponta para `#economia`, então a
// calculadora está a um clique do topo, independente de onde ela esteja na
// pilha.
//
// ⚠️ SEÇÃO SEM DADO NÃO APARECE. `StatsBand`, `ProjectsSection` e
// `ReviewsSection` devolvem `null` enquanto o cliente não entregar números,
// fotos e avaliações. É de propósito, e é a regra que impede a falha
// irreversível deste trabalho — ver `content/company.ts`.

import SavingsCalculator from "../calculator";
import { WA_DEFAULT, whatsappLink } from "../content/business";
import { DIFFERENTIALS, FAQ, STEPS } from "../content/site";
import {
  AboutSection,
  FinancingSection,
  LoadsSection,
  ProjectsSection,
  ReviewsSection,
  SegmentsSection,
  StatsBand,
  UnitsSection,
} from "../home-blocks";
import { type Ctx } from "../lib";
import Opening from "../opening";
import { CtaBand, FaqList, FeatureCard, Section, SectionHead } from "../ui";

/** A mensagem de quem chega pela calculadora, já com um número na cabeça. */
const WA_ANALISE =
  "Olá! Simulei no site da EcoLuz e quero uma análise personalizada da minha conta de luz.";

export default function HomePage({ links }: Ctx) {
  return (
    <>
      {/* § 1 — A abertura em três atos, sobre o vídeo arrastado pela rolagem. */}
      <Opening links={links} />

      {/* § 2 — Os números. Invisível até o cliente levantá-los. */}
      <StatsBand />

      {/* ── § 3 — POR QUE ESCOLHER A ECOLUZ ─────────────────────────────── */}
      <Section id="diferenciais" tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Por que escolher a EcoLuz"
          title="O que a gente entrega além do equipamento."
          lead="Painel e inversor qualquer um vende. O que separa um sistema que funciona de um que dá dor de cabeça é o que acontece antes e depois da entrega da caixa."
        />

        <div
          className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
          style={{ background: "var(--el-paper-line)" }}
        >
          {DIFFERENTIALS.map((d, i) => (
            <FeatureCard
              key={d.title}
              icon={d.icon}
              title={d.title}
              text={d.text}
              tone="paper"
              delay={i * 60}
            />
          ))}
        </div>
      </Section>

      {/* § 4 — Nossas soluções, recortadas por público. */}
      <SegmentsSection links={links} />

      {/* ── § 5 — COMO FUNCIONA ─────────────────────────────────────────── */}
      <Section id="como-funciona" tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Como funciona"
          title="Da primeira conversa ao acompanhamento."
          lead="Seis etapas, e você sabe em qual delas o seu projeto está. A EcoLuz não vende equipamento: entrega uma solução completa, incluindo a parte que costuma travar — a homologação."
        />

        <ol
          className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
          style={{ background: "var(--el-paper-line)" }}
        >
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

      {/* ── § 6 — SIMULAÇÃO DE ECONOMIA ─────────────────────────────────── */}
      <Section id="economia">
        <SectionHead
          eyebrow="Quanto você poderia economizar"
          title="A conta que você já paga, projetada em dez anos."
          lead="Não é uma promessa nossa: é a sua conta multiplicada pelo tempo. Arraste até o seu valor médio e veja o tamanho do número."
        />
        <div className="mt-12" data-reveal="scale">
          <SavingsCalculator ctaHref={whatsappLink(WA_ANALISE)} />
        </div>

        {/* ⚠️ A RESSALVA É PEDIDO EXPLÍCITO DO CLIENTE ("importante colocar uma
            observação de que a estimativa não substitui o dimensionamento").
            Ela fica VISÍVEL, embaixo do número grande — em letra miúda no
            rodapé ela existiria só para nos proteger, e não para informar quem
            está decidindo. */}
        <p
          className="mt-8 max-w-2xl text-[0.875rem] leading-relaxed text-[var(--el-cream-faint)]"
          data-reveal="fade"
        >
          A simulação é uma estimativa inicial e não substitui o dimensionamento
          do projeto: o resultado real depende do seu consumo mês a mês, da
          tarifa vigente, da localização e das características da unidade
          consumidora.{" "}
          <a
            href={whatsappLink(WA_ANALISE)}
            target="_blank"
            rel="noopener"
            className="text-[var(--el-sun-hi)] underline underline-offset-4"
          >
            Quero uma análise personalizada
          </a>
          .
        </p>
      </Section>

      {/* § 7 — Projetos realizados. Invisível até as fotos reais chegarem. */}
      <ProjectsSection />

      {/* § 8 — Financiamento. */}
      <FinancingSection />

      {/* § 9 — Conheça a EcoLuz. */}
      <AboutSection links={links} />

      {/* § 10 — Onde estamos + até onde atendemos. */}
      <UnitsSection links={links} />

      {/* § 11 — Avaliações. Invisível até virem as reais, do Google. */}
      <ReviewsSection />

      {/* ── § 12 — PERGUNTAS FREQUENTES ─────────────────────────────────── */}
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

      {/* § 13 — O que cabe na sua conta. */}
      <LoadsSection />

      {/* ── § 14 — CHAMADA FINAL ────────────────────────────────────────── */}
      <CtaBand
        title="Vamos transformar sua conta de energia em economia?"
        text="Fale com um especialista da EcoLuz e descubra qual solução faz sentido para o seu consumo. Mande uma foto da sua conta de luz: em geral ela já responde metade das perguntas."
        href={whatsappLink(WA_DEFAULT)}
        label="Falar com a EcoLuz"
      />
    </>
  );
}
