import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";
import Link from "next/link";

import {
  Breadcrumb,
  CallToAction,
  Head,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { SERVICES } from "../content/services";
import { BreadcrumbLd } from "../schema";





/**
 * Página-pilar.
 *
 * Ela existe para receber o link de todas as páginas de serviço e devolvê-lo
 * — é a arquitetura de pilar e apoio que sustenta autoridade tópica em busca
 * local. Um punhado de páginas bem ligadas rende mais que cinquenta posts
 * soltos.
 */
export default function ServicosPage({ links }: Ctx) {
  const TRAIL = [
    { name: "Início", path: links.home },
    { name: "Serviços", path: pageHref(links, PAGE.servicos) },
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
                title="Serviços"
                lead="Seis frentes de trabalho, residencial e industrial. Cada uma tem página própria, com o que costuma estar por trás do defeito e o que a visita cobre."
              />
            </div>
          </Reveal>

          <ul className="mt-14">
            {SERVICES.map((s, i) => (
              <li key={s.slug}>
                <Reveal delay={Math.min(i, 3) * 0.05}>
                  <Link
                    href={pageHref(links, s.slug)}
                    className="group grid gap-4 border-b border-[var(--rf-line)] py-8 transition-colors duration-200 hover:bg-[var(--rf-sheet-up)] md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10"
                  >
                    <div className="px-2">
                      <h2 className="d-md text-[var(--rf-chalk)]">{s.h1}</h2>
                      <span className="note mt-2 block">{s.part}</span>
                    </div>
                    <div className="px-2">
                      <p className="max-w-[60ch] leading-relaxed text-[var(--rf-chalk-dim)]">
                        {s.cardText}
                      </p>
                      <span className="mt-3 block text-sm text-[var(--rf-flame-hi)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                        Abrir o serviço
                      </span>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Shell>
      </Section>

      <CallToAction
        title="Não sabe qual é o caso?"
        lead="Descreva o que está acontecendo e o modelo do fogão. Dá para identificar boa parte dos defeitos pela descrição, antes mesmo da visita."
        waMessage="Olá, Ricardo! Não sei qual serviço preciso. Pode me ajudar a identificar?"
      />
    </>
  );
}
