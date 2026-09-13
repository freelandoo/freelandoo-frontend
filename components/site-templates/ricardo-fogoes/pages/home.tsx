import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";
import Image from "next/image";
import Link from "next/link";

import Hero from "../hero";
import StoveSection from "../draw/stove-section";
import {
  Actions,
  CallToAction,
  FaqList,
  Head,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { BUSINESS } from "../content/business";
import { CITIES } from "../content/cities";
import { SERVICES, SYMPTOMS } from "../content/services";
import { FaqLd } from "../schema";



/**
 * FAQ da home: as três perguntas gerais do negócio.
 *
 * ⚠️ NÃO repete nenhuma pergunta das páginas de serviço. FAQPage duplicado
 * entre páginas do mesmo site é marcação concorrendo consigo mesma — o
 * Google escolhe uma e ignora as outras, sem dizer qual.
 */
const HOME_FAQ = [
  {
    q: "Quais cidades o Ricardo Fogões atende?",
    a: "Aguaí, onde fica a base, mais São João da Boa Vista, Casa Branca e Mogi Guaçu. O atendimento é marcado com hora, de segunda a sexta, das 08h às 18h.",
  },
  {
    q: "Atende fogão residencial e industrial?",
    a: "Os dois. Fogões de piso, cooktops e fornos de embutir em casa; fogões de alta pressão e chapas em bar, restaurante e lanchonete.",
  },
  {
    q: "Como funciona o orçamento?",
    a: "O diagnóstico vem antes de qualquer troca de peça. Na visita o defeito é identificado e o que precisa ser feito é dito antes de começar — inclusive quando a conta não compensa e trocar o equipamento faz mais sentido.",
  },
];

export default function HomePage({ links }: Ctx) {
  const chapa = SYMPTOMS[5];

  return (
    <>
      <FaqLd items={HOME_FAQ} />

      <Hero />

      {/* ── o desenho que roteia ───────────────────────────────────────── */}
      {/*
        ⚠️ `relative z-10` não é enfeite: o queimador do hero é mais alto
        que o bloco de texto dele e INVADE o topo desta seção de propósito
        (é o que impede a chama de sair cortada na borda). Sem contexto de
        empilhamento próprio, o desenho — que é posicionado — pintaria por
        CIMA do título daqui. A seção não tem fundo, então o fogo continua
        aparecendo por trás; só o texto passa na frente.
      */}
      <Section id="defeitos" className="relative z-10">
        <Shell>
          <Reveal>
            <Head
              title="Onde o fogão costuma falhar"
              lead="Cinco peças respondem pela maioria das chamadas. Ache o que está acontecendo no seu e veja o que resolve."
            />
          </Reveal>
          <div className="mt-14">
            <StoveSection links={links} />
          </div>
        </Shell>
      </Section>

      {/* ── serviços ───────────────────────────────────────────────────── */}
      <Section id="servicos" className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head
              title="O que é feito"
              lead="Seis frentes, residencial e industrial. Cada uma tem a página dela, com o que cobre e o que costuma estar por trás do defeito."
            />
          </Reveal>

          <ul className="mt-14 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <li key={s.slug} className="bg-[var(--rf-sheet)]">
                <Reveal delay={Math.min(i, 3) * 0.06}>
                  <Link
                    href={pageHref(links, s.slug)}
                    className="group flex h-full flex-col transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                  >
                    {/*
                      A FOTO É 16:9 PORQUE A FONTE É 16:9 (1672x941).
                      Pedir outra proporção aqui faria o `object-cover`
                      comer as bordas do enquadramento que alguém escolheu.

                      `sizes` é o que impede o navegador de baixar a versão
                      de 1024px para um card de 439: sem ele o `next/image`
                      assume 100vw e serve o maior arquivo em todo layout —
                      seis vezes, na primeira dobra depois da capa.

                      As três larguras são os três estados da grade abaixo
                      (1 coluna, 2 em sm, 3 em lg). Mexeu nas colunas da
                      `<ul>`? Estas contas mudam junto.
                    */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--rf-sheet-up)]">
                      <Image
                        src={s.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-7">
                    <span className="note">{s.part}</span>
                    <h3 className="d-md text-[var(--rf-chalk)]">{s.label}</h3>
                    <p className="text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                      {s.cardText}
                    </p>
                    <span className="mt-auto pt-5 text-sm text-[var(--rf-flame-hi)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                      Ver o serviço
                    </span>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      {/* ── cozinha profissional: onde a chapa é verdade ───────────────── */}
      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
            <Reveal>
              <Head
                title="Cozinha que trabalha o dia inteiro"
                lead="Em bar, restaurante e lanchonete o equipamento raramente para de uma vez. Ele perde rendimento devagar, e a cozinha se acostuma."
              />
              <div className="prose-sheet datum mt-8">
                <p>
                  A água demora mais para ferver, a chapa não recupera
                  temperatura entre um pedido e outro, e ninguém marca o dia em
                  que começou. Quando alguém liga, o equipamento já está
                  trabalhando abaixo do que consegue há semanas.
                </p>
                <p>
                  Boa parte disso é <strong>obstrução e regulagem</strong>, não
                  peça quebrada.
                </p>
              </div>
              <Actions
                waMessage="Olá, Ricardo! Tenho um equipamento de cozinha profissional precisando de atendimento."
                className="mt-9 pl-[calc(var(--datum)+1rem)]"
                compact
              />
            </Reveal>

            <Reveal delay={0.08}>
              <div
                className="border border-[var(--rf-line)] p-8"
                style={{ background: "var(--rf-sheet-up)" }}
              >
                <span
                  className="note"
                  style={{ color: "var(--rf-ember)" }}
                >
                  Sintoma {String(chapa.n).padStart(2, "0")}
                </span>
                <h3 className="d-md mt-3 text-[var(--rf-chalk)]">{chapa.label}</h3>
                <p className="mt-4 leading-relaxed text-[var(--rf-chalk-dim)]">
                  {chapa.cause}
                </p>

                {/* corte da chapa: a fileira de queimadores e o ponto frio */}
                <svg
                  viewBox="0 0 420 150"
                  fill="none"
                  className="mt-8 w-full"
                  aria-hidden="true"
                >
                  <g
                    stroke="var(--rf-line-mid)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M30 46 L390 46 L390 60 L30 60 Z" />
                    <path d="M44 104 L376 104" />
                    <path d="M40 126 L40 104 M380 126 L380 104" />
                  </g>
                  {/* queimadores: o terceiro está obstruído e abre a faixa fria */}
                  {[70, 130, 190, 250, 310, 360].map((x, i) => (
                    <g key={x}>
                      <path
                        d={`M${x} 104 L${x} 78`}
                        stroke={
                          i === 2
                            ? "var(--rf-line)"
                            : "var(--rf-flame-hi)"
                        }
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity={i === 2 ? 0.55 : 0.9}
                      />
                    </g>
                  ))}
                  <path
                    d="M166 34 L214 34"
                    stroke="var(--rf-ember)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <text
                    x="152"
                    y="24"
                    fill="var(--rf-ember)"
                    fontSize="11"
                    letterSpacing="1.2"
                    style={{ fontFamily: "var(--rf-mono)" }}
                  >
                    FAIXA FRIA
                  </text>
                </svg>

                <p className="mt-6 text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                  Um queimador obstruído no meio da fileira já abre uma faixa
                  fria. Como a chapa é maciça, ela espalha calor o suficiente
                  para disfarçar — o que se percebe é o tempo de preparo subindo.
                </p>
                <Link
                  href={pageHref(links, "manutencao-de-chapas")}
                  className="mt-6 inline-block text-sm text-[var(--rf-flame-hi)] hover:underline"
                >
                  Ver manutenção de chapas
                </Link>
              </div>
            </Reveal>
          </div>
        </Shell>
      </Section>

      {/* ── como funciona: aqui a numeração é sequência de verdade ─────── */}
      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title="Como o atendimento acontece" />
          </Reveal>
          <ol className="mt-12 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] md:grid-cols-4">
            {[
              {
                t: "Você descreve",
                d: "Pelo WhatsApp ou por telefone, com o modelo e o que está acontecendo. Foto ajuda e adianta o diagnóstico.",
              },
              {
                t: "A visita é marcada",
                d: "Com hora, dentro de segunda a sexta, das 08h às 18h. Em Aguaí o encaixe é mais curto.",
              },
              {
                t: "O defeito é identificado",
                d: "O diagnóstico vem antes de trocar peça — inclusive quando o conserto não compensa.",
              },
              {
                t: "O serviço é feito",
                d: "Com teste na frente do cliente: chama regulada, forno esquentando, conexões conferidas.",
              },
            ].map((step, i) => (
              <li key={step.t} className="bg-[var(--rf-sheet)] p-7">
                <Reveal delay={Math.min(i, 3) * 0.06}>
                  <span className="note tabular-nums">
                    Passo {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="d-sm mt-3 text-[var(--rf-chalk)]">{step.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                    {step.d}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Shell>
      </Section>

      {/* ── cobertura: a linha de cota carrega distância de verdade ────── */}
      <Section id="cobertura" className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head
              title="Onde o atendimento chega"
              lead="Quatro cidades. Aguaí é a base — as distâncias abaixo são por estrada, a partir dela."
            />
          </Reveal>
          <ul className="mt-12">
            {CITIES.map((c, i) => (
              <li key={c.slug}>
                <Reveal delay={Math.min(i, 3) * 0.05}>
                  <Link
                    href={pageHref(links, c.slug)}
                    className="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[var(--rf-line)] py-6 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                  >
                    <div className="px-2">
                      <h3 className="d-md text-[var(--rf-chalk)]">{c.name}</h3>
                      <p className="mt-1 text-sm text-[var(--rf-chalk-dim)]">
                        {c.highlight
                          .map(
                            (h) =>
                              SERVICES.find((s) => s.slug === h)?.label ?? "",
                          )
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="note shrink-0 px-2 tabular-nums text-[var(--rf-chalk-faint)] group-hover:text-[var(--rf-flame-hi)]">
                      {c.km === 0 ? "Base" : `≈ ${c.km} km`}
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      {/* ── o que dizem: uma frase real, sem marcação inventada ────────── */}
      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <figure className="datum relative max-w-[46rem]">
              <span className="tick" aria-hidden="true" />
              <blockquote className="d-lg text-[var(--rf-chalk)]">
                “Muito rápido, prestativo e pontual.”
              </blockquote>
              <figcaption className="note mt-6">
                Avaliação no Google · 3 avaliações no perfil
              </figcaption>
            </figure>
          </Reveal>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title="Perguntas frequentes" />
            <FaqList items={HOME_FAQ} />
          </Reveal>
        </Shell>
      </Section>

      <CallToAction
        title="Conte o que está acontecendo"
        lead={`Descreva o defeito e o modelo do fogão. ${BUSINESS.hoursHuman}, com hora marcada.`}
        waMessage="Olá, Ricardo! Vi o site e preciso de atendimento no meu fogão."
      />
    </>
  );
}
