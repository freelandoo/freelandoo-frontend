// A PÁGINA "ONDE ATENDEMOS".
//
// ⚠️ ELA RESPONDE A PERGUNTA QUE O ENDEREÇO NÃO RESPONDE. Contato diz onde a
// empresa ESTÁ; esta diz até onde ela VAI — e num negócio de instalação são
// perguntas diferentes, porque quem se desloca é a equipe, não o cliente.
//
// ⚠️ E ELA DIZ O QUE NÃO SABE. "Fora da ilha, depende" é uma resposta honesta;
// um mapa com raio de 200 km seria uma promessa que ninguém mediu e que a
// primeira ligação de Imperatriz desmentiria.

import { AREAS } from "../content/areas";
import { ADDRESS_LINE, WA_DEFAULT, whatsappLink } from "../content/business";
import { pageHref, type Ctx } from "../lib";
import { CtaBand, Section, SectionHead } from "../ui";

export default function AreasPage({ links }: Ctx) {
  return (
    <>
      <section className="relative pb-14 pt-32 md:pb-16 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
            Onde atendemos
          </p>
          <h1
            className="display mt-5 max-w-4xl text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
            data-reveal="up"
            data-reveal-delay="60"
          >
            A Ilha do Maranhão inteira.
          </h1>
          <p
            className="mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
            data-reveal="up"
            data-reveal-delay="120"
          >
            São Luís, São José de Ribamar, Paço do Lumiar e Raposa — os quatro
            municípios da ilha. A loja fica no Turu, e é dela que saem a visita
            técnica, a instalação e o retorno para manutenção.
          </p>
        </div>
      </section>

      <Section tone="paper">
        <div className="grid gap-px sm:grid-cols-2" style={{ background: "var(--el-paper-line)" }}>
          {AREAS.map((a, i) => (
            <a
              key={a.slug}
              href={pageHref(links, a.slug)}
              className="group flex flex-col bg-[var(--el-paper)] p-8 transition-colors hover:bg-[var(--el-paper-up)]"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <div className="flex items-baseline gap-3">
                <h2 className="display text-[1.75rem] text-[var(--el-paper-ink)] transition-colors group-hover:text-[var(--el-amber-ink)]">
                  {a.name}
                </h2>
                {a.isBase ? (
                  <span className="eyebrow bg-[var(--el-paper-ink)] px-2 py-1 text-[var(--el-paper)]">
                    Nossa base
                  </span>
                ) : (
                  <span className="eyebrow text-[var(--el-paper-dim)]">{a.uf}</span>
                )}
              </div>
              <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {a.card}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-amber-ink)]">
                Ver a página <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </Section>

      <Section tone="deep">
        <SectionHead
          align="stack"
          eyebrow="Fora da ilha"
          title="Depende do porte e da distância."
          lead="Não temos um raio fixo de atendimento, e inventar um seria promessa quebrada na primeira ligação. Projeto maior justifica deslocamento maior — vale mandar a localização e o consumo, que a resposta sai na hora."
        />

        <div className="mt-12 panel p-8" data-reveal="up">
          <p className="eyebrow text-[var(--el-sun)]">A loja</p>
          <address className="mt-4 not-italic text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
            {ADDRESS_LINE}
          </address>
        </div>
      </Section>

      <CtaBand
        title="Onde fica o seu imóvel?"
        text="Mande o endereço e uma foto da conta de luz. Se estiver dentro da ilha, a visita técnica é o passo seguinte."
        href={whatsappLink(WA_DEFAULT)}
      />
    </>
  );
}
