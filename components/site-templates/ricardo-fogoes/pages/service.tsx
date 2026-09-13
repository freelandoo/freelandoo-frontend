import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";
import Image from "next/image";
import Link from "next/link";

import {
  Actions,
  Breadcrumb,
  CallToAction,
  FaqList,
  Head,
  ScopeList,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { SERVICES, type Service } from "../content/services";
import { CITIES } from "../content/cities";
import { BreadcrumbLd, FaqLd, ServiceLd } from "../schema";



/**
 * A página de um serviço.
 *
 * ⚠️ ELA NÃO RESOLVE MAIS O ENDEREÇO. Quem traduz slug → serviço é
 * `resolveRicardoPage` (em `pages.ts`), chamado pela ROTA — que é quem sabe
 * devolver 404 de verdade. Resolvendo aqui dentro, "não encontrado" viraria
 * uma página com status 200, que o buscador indexa como se existisse.
 */
export default function ServicoPage({ links, service: s }: Ctx & { service: Service }) {

  const trail = [
    { name: "Início", path: links.home },
    { name: "Serviços", path: pageHref(links, PAGE.servicos) },
    { name: s.label, path: pageHref(links, s.slug) },
  ];

  /** Os outros cinco. Link interno é como o buscador acha e distribui peso. */
  const others = SERVICES.filter((o) => o.slug !== s.slug);

  return (
    <>
      <BreadcrumbLd trail={trail} />
      <ServiceLd
        name={s.h1}
        description={s.metaDescription}
        url={`${links.origin}${pageHref(links, s.slug)}`}
        origin={links.origin}
      />
      <FaqLd items={s.faq} />

      {/*
        A HERO DESTE SERVIÇO — a mesma foto do card da home, aqui como fundo.

        ⚠️ `relative` + `isolate`: sem contexto de empilhamento próprio, o
        véu e a foto competem com o que vier antes na página. E o recorte
        (`overflow-hidden`) mora na CAIXA DO FUNDO, nunca na <section> —
        é a mesma regra da capa da home, onde recortar o invólucro cortava
        a chama do queimador ao meio.

        ⚠️ SEM PARALLAX aqui, de propósito. Na home a foto anda e por isso
        precisa sangrar 14% em cima e embaixo; parada, ela não precisa de
        folga nenhuma. Quem puser parallax nesta caixa tem que devolver a
        sangria junto, senão a borda da foto aparece no topo ao rolar.
      */}
      <Section className="relative isolate pt-32 md:pt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          {/*
            ⚠️ A OPACIDADE É BAIXA PORQUE A ARTE TEM TEXTO DENTRO (o título
            do serviço, em amarelo, impresso no pixel). Forte, ela briga com
            o <h1> de verdade que fica por cima e a página passa a dizer o
            mesmo nome duas vezes, uma delas ilegível. Aqui ela é textura,
            não leitura.

            `priority`: este é o maior elemento da primeira dobra desta
            página, então é ele que o LCP mede. Sem isso entra na fila
            depois do resto e o número piora sem nada quebrar.
          */}
          {/*
            ⚠️ O ZOOM ANCORADO À DIREITA EXISTE PARA JOGAR O TEXTO DA ARTE
            PARA FORA DO QUADRO. Estas artes são metade título amarelo,
            metade foto — e o título diz "Restauração de fogão residencial"
            enquanto o <h1> logo em cima diz "Conserto de fogões
            residenciais". Sem o zoom, dá para LER as duas, discordando uma
            da outra, e a página fica com dois títulos.

            Aqui não serve `object-position`: a foto é mais larga que alta
            em relação a esta caixa no desktop, então o `object-cover` já
            corta na VERTICAL e a largura inteira aparece de qualquer jeito.
            Quem move o enquadramento na horizontal é a escala com origem
            na direita. No celular a caixa é estreita e o corte é horizontal
            — lá `object-right` sozinho já entrega a metade fotográfica, e
            o zoom só ampliaria pixel à toa.

            Arte NOVA sem texto embutido não precisa de nada disso: é só
            devolver `object-[70%_center]` e tirar a escala.
          */}
          <Image
            src={s.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right opacity-[0.12] md:origin-right md:scale-[1.75] md:opacity-[0.15]"
          />
          {/*
            VÉU: fechado à esquerda, onde moram o H1 e o texto de abertura;
            aberto à direita, onde a foto pode existir. O segundo gradiente
            dissolve a base na cor da página — sem ele a foto termina numa
            linha reta no meio do conteúdo.
          */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to right, rgb(30 33 36 / 0.94) 0%, rgb(30 33 36 / 0.88) 38%, rgb(30 33 36 / 0.55) 72%, rgb(30 33 36 / 0.70) 100%)",
                "linear-gradient(to bottom, rgb(30 33 36 / 0.72) 0%, rgb(30 33 36 / 0.10) 30%, rgb(30 33 36 / 0.45) 78%, rgb(30 33 36 / 1) 100%)",
              ].join(","),
            }}
          />
        </div>

        <Shell>
          <Reveal>
            <Breadcrumb trail={trail} />
            <div className="mt-8">
              <Head level={1} title={s.h1} />
            </div>
            <div className="prose-sheet datum mt-7 text-lg">
              {s.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <Actions
              waMessage={s.waMessage}
              className="mt-9 pl-[calc(var(--datum)+1rem)]"
            />
          </Reveal>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)] !pt-16">
        <Shell>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <Head title={s.problem.title} />
              <div className="prose-sheet datum mt-7">
                {s.problem.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="d-md text-[var(--rf-chalk)]">O que a visita cobre</h2>
              <ScopeList items={s.covers} />
              <p className="note mt-6">
                Peça trocada é dita antes · diagnóstico antes do orçamento
              </p>
            </Reveal>
          </div>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title="Perguntas sobre este serviço" />
            <FaqList items={s.faq} />
          </Reveal>
        </Shell>
      </Section>

      {/* onde este serviço é feito — liga serviço a cidade nos dois sentidos */}
      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title={`${s.label} nas quatro cidades`} />
          </Reveal>
          <ul className="mt-10 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-2 lg:grid-cols-4">
            {CITIES.map((c) => (
              <li key={c.slug} className="bg-[var(--rf-sheet)]">
                <Link
                  href={pageHref(links, c.slug)}
                  className="block p-6 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                >
                  <span className="d-sm block text-[var(--rf-chalk)]">{c.name}</span>
                  <span className="note mt-2 block tabular-nums">
                    {c.km === 0 ? "Base" : `≈ ${c.km} km de Aguaí`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      <Section className="border-t border-[var(--rf-line)]">
        <Shell>
          <Reveal>
            <Head title="Outros serviços" />
          </Reveal>
          <ul className="mt-10 grid gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-2 lg:grid-cols-5">
            {others.map((o) => (
              <li key={o.slug} className="bg-[var(--rf-sheet)]">
                <Link
                  href={pageHref(links, o.slug)}
                  className="block h-full p-6 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)]"
                >
                  <span className="note block">{o.part}</span>
                  <span className="d-sm mt-2 block text-[var(--rf-chalk)]">{o.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      <CallToAction
        title={s.label}
        lead={s.cardText}
        waMessage={s.waMessage}
      />
    </>
  );
}
