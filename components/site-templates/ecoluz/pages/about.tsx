// A PÁGINA "A ECOLUZ".
//
// ⚠️ ELA NÃO INVENTA HISTÓRIA. Não há ano de fundação, número de clientes,
// quantidade de projetos entregues nem equipe descrita — nada disso foi
// informado, e é exatamente o tipo de número que o ramo enche de zero. O que
// a página afirma é o que dá para sustentar: quem é o dono, onde fica a loja,
// como a empresa trabalha e o que ela não faz.
//
// ⚠️ "O QUE A ECOLUZ NÃO FAZ" É A SEÇÃO MAIS VALIOSA DAQUI. Um site que diz o
// que não promete é o único que dá alguma razão para acreditar no que promete
// — e num ramo cheio de "economize 95%", essa é a diferença que a pessoa sente
// sem saber nomear.

import { ADDRESS_LINE, BUSINESS, WA_DEFAULT, whatsappLink } from "../content/business";
import { STEPS } from "../content/site";
import { Monogram } from "../icons";
import { PAGE, pageHref, type Ctx } from "../lib";
import { CheckList, CtaBand, Section, SectionHead } from "../ui";

export default function SobrePage({ links }: Ctx) {
  return (
    <>
      <section className="relative pb-16 pt-32 md:pb-20 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div>
              <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
                A EcoLuz
              </p>
              <h1
                className="display mt-5 text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
                data-reveal="up"
                data-reveal-delay="60"
              >
                Energia solar explicada antes de ser vendida.
              </h1>
              <div
                className="prose-el mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
                data-reveal="up"
                data-reveal-delay="120"
              >
                <p>
                  A EcoLuz é uma empresa de energia solar de São Luís, com loja
                  no Turu. Ela projeta, instala e homologa sistemas para casas,
                  comércios, empresas e propriedades rurais na Ilha do Maranhão
                  — tanto os conectados à rede quanto os off-grid, com baterias.
                </p>
                <p>
                  A diferença que a empresa tenta fazer está menos no
                  equipamento e mais na conversa: sistema solar é um
                  investimento alto, feito uma vez, sobre o telhado da própria
                  casa. Quem decide isso merece entender o que está comprando,
                  incluindo o que o sistema não vai fazer.
                </p>
                <p>
                  Por isso a análise começa sempre pela conta de luz, e a
                  proposta mostra o cenário antes da assinatura — não depois.
                </p>
              </div>
            </div>

            <aside className="panel p-8" data-reveal="up" data-reveal-delay="180">
              <Monogram className="h-12 w-12 text-[var(--el-sun)]" />
              <dl className="mt-7 grid gap-5 text-[0.9375rem]">
                <div>
                  <dt className="eyebrow text-[var(--el-cream-faint)]">Responsável</dt>
                  <dd className="mt-1.5 text-[var(--el-cream)]">{BUSINESS.owner}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-[var(--el-cream-faint)]">Onde fica</dt>
                  <dd className="mt-1.5 leading-relaxed text-[var(--el-cream-dim)]">
                    {ADDRESS_LINE}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-[var(--el-cream-faint)]">Atende</dt>
                  <dd className="mt-1.5 leading-relaxed text-[var(--el-cream-dim)]">
                    São Luís, São José de Ribamar, Paço do Lumiar e Raposa.
                  </dd>
                </div>
              </dl>
              <a
                href={pageHref(links, PAGE.contato)}
                className="mt-7 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)] transition-colors hover:text-[var(--el-sun)]"
              >
                Ver contato <span aria-hidden="true">→</span>
              </a>
            </aside>
          </div>
        </div>
      </section>

      {/* ── COMO TRABALHAMOS ────────────────────────────────────────────── */}
      <Section tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Como trabalhamos"
          title="Seis etapas, e você sabe em qual está."
          lead="O ponto que mais trava um projeto de energia solar não é a instalação: é a homologação. Ela fica conosco."
        />
        <ol className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-paper-line)" }}>
          {STEPS.map((s, i) => (
            <li key={s.n} className="bg-[var(--el-paper)] p-7" data-reveal="up" data-reveal-delay={i * 60}>
              <span className="numeral text-[2.25rem] text-[var(--el-amber-ink)]">{s.n}</span>
              <h3 className="display mt-3 text-[1.125rem] text-[var(--el-paper-ink)]">{s.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── O QUE NÃO PROMETEMOS ────────────────────────────────────────── */}
      <Section tone="deep">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div data-reveal="up">
            <p className="eyebrow text-[var(--el-sun)]">Honestidade</p>
            <h2 className="display mt-5 text-[2rem] text-[var(--el-cream)] md:text-[2.5rem]">
              O que a EcoLuz não promete.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
              Num ramo cheio de porcentagem redonda e retorno garantido, dizer o
              que não se sustenta é o que dá valor ao que se sustenta.
            </p>
          </div>

          <div className="panel p-8">
            <CheckList
              items={[
                "Conta de luz zerada. O custo de disponibilidade, os tributos e a iluminação pública continuam sendo cobrados, sempre.",
                "Preço por telefone, antes de ver a conta. Qualquer número dito assim é chute, e chute nessa conversa é sempre para baixo.",
                "Prazo de homologação. A etapa é da concessionária; o que está na nossa mão é entregar a documentação certa na primeira vez.",
                "Retorno garantido em X anos. O retorno depende de consumo, tarifa e forma de pagamento — a análise mostra o cenário, não uma promessa.",
                "Sistema conectado à rede funcionando na queda de energia. Ele desliga junto, por exigência de segurança. Para isso existe o híbrido.",
              ]}
            />
          </div>
        </div>
      </Section>

      <CtaBand
        title="Quer conversar sem compromisso?"
        text="Mande uma mensagem. Se a energia solar não fizer sentido para o seu caso, a gente diz isso também."
        href={whatsappLink(WA_DEFAULT)}
      />
    </>
  );
}
