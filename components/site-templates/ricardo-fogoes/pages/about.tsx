import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";

import {
  Breadcrumb,
  CallToAction,
  Head,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { BUSINESS } from "../content/business";
import { CITIES } from "../content/cities";
import { BreadcrumbLd } from "../schema";





/**
 * ⚠️ Esta página NÃO conta história.
 *
 * Não há anos de mercado, número de clientes, certificação nem prêmio —
 * nada disso foi informado, e inventar história de origem num site local é
 * a mentira mais fácil de checar: basta o cliente perguntar na visita.
 *
 * Em vez disso ela explica o MÉTODO, que é verificável na primeira visita e
 * é o que de fato diferencia um técnico de outro.
 */
export default function SobrePage({ links }: Ctx) {
  const TRAIL = [
    { name: "Início", path: links.home },
    { name: "Sobre", path: pageHref(links, PAGE.sobre) },
  ];
  return (
    <>
      <BreadcrumbLd trail={TRAIL} />

      <Section className="pt-32 md:pt-40">
        <Shell>
          <Reveal>
            <Breadcrumb trail={TRAIL} />
            <div className="mt-8">
              <Head
                level={1}
                title="Diagnóstico antes de peça"
                lead="Quase todo fogão que chega com “não tem mais conserto” está com um defeito de três ou quatro possíveis. O trabalho começa descobrindo qual."
              />
            </div>
          </Reveal>

          <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div className="prose-sheet datum">
                <h2 className="d-md text-[var(--rf-chalk)]">Trocar peça não é diagnóstico</h2>
                <p className="mt-5">
                  Dá para trocar a vela, o termopar e a válvula de uma boca e
                  entregar o fogão funcionando. Também dá para limpar o injetor
                  e devolver o mesmo resultado — pagando por uma peça só, ou por
                  nenhuma.
                </p>
                <p>
                  A diferença entre os dois atendimentos não aparece na chama
                  acesa no fim. Aparece na conta. Por isso o defeito é
                  identificado antes, e o que precisa ser feito é dito antes de
                  começar.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="prose-sheet datum">
                <h2 className="d-md text-[var(--rf-chalk)]">A chama certa é azul</h2>
                <p className="mt-5">
                  Um queimador regulado queima azul. Quando a chama abre
                  amarela, a combustão está incompleta: ela esquenta menos,
                  demora mais e deposita fuligem no fundo da panela.
                </p>
                <p>
                  Isso é o sinal mais útil que existe num fogão, porque qualquer
                  pessoa consegue ler sem ferramenta nenhuma. Se a sua chama
                  está amarela, alguma coisa no caminho do gás ou do ar precisa
                  de atenção — e quase sempre é limpeza, não peça.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="prose-sheet datum">
                <h2 className="d-md text-[var(--rf-chalk)]">Quando a resposta é não</h2>
                <p className="mt-5">
                  Nem todo fogão vale o conserto. Corrosão que atravessou a
                  chapa não volta com pintura, e forno furado perde calor por
                  onde ele escapa.
                </p>
                <p>
                  Nesses casos a avaliação diz isso, e há fogões{" "}
                  <strong>novos e seminovos</strong> para avaliar como
                  alternativa. Ouvir “não compensa” antes é mais barato que
                  descobrir depois de pagar o serviço.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="prose-sheet datum">
                <h2 className="d-md text-[var(--rf-chalk)]">Casa e cozinha profissional</h2>
                <p className="mt-5">
                  O atendimento é multimarcas e cobre fogão de piso, cooktop e
                  forno de embutir em casa; e fogão de alta pressão, forno e
                  chapa em bar, restaurante e lanchonete.
                </p>
                <p>
                  São defeitos diferentes: a casa falha por peça, a cozinha
                  profissional falha por saturação. O que não muda é a ordem —
                  entender antes, trocar depois.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <dl className="mt-20 grid grid-cols-2 gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-4">
              <Cell label="Base">
                {BUSINESS.city}/{BUSINESS.state}
              </Cell>
              <Cell label="Cidades atendidas">
                {CITIES.length} · {CITIES.map((c) => c.name).join(", ")}
              </Cell>
              <Cell label="Atendimento">{BUSINESS.hoursShort}</Cell>
              <Cell label="Visita">{BUSINESS.scheduling}</Cell>
            </dl>
          </Reveal>
        </Shell>
      </Section>

      <CallToAction
        title="Conte o defeito"
        lead="Modelo do fogão e o que está acontecendo já são suficientes para adiantar boa parte do diagnóstico."
        waMessage="Olá, Ricardo! Vi o site e queria conversar sobre o meu fogão."
      />
    </>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--rf-sheet)] px-4 py-4">
      <dt className="note">{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-[var(--rf-chalk)]">{children}</dd>
    </div>
  );
}
