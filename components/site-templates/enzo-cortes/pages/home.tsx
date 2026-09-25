// A HOME — uma sequência de cenas: abertura → roda de serviços → combinados
// → trabalhos → como funciona → onde fica → perguntas → fechamento.
//
// ⚠️ TODA INFORMAÇÃO COMERCIAL ESTÁ NO HTML DO SERVIDOR. As cenas são ilhas
// de cliente que só acrescentam gesto: preço, endereço, horário e perguntas
// existem no DOM sem JavaScript, com movimento reduzido e para o buscador.
//
// ⚠️ NENHUM PREÇO É DIGITADO AQUI. Tudo sai de `content/services.ts` (a mesma
// fonte da página de cada serviço e do JSON-LD) e de `content/business.ts`.

import { bookingCta } from "../content/business";
import { SITE_FAQ } from "../content/faq";
import { GALLERY } from "../content/gallery";
import Combos from "../experience/combos";
import FinalCta from "../experience/final-cta";
import Gallery from "../experience/gallery";
import Hero from "../experience/hero";
import Journey from "../experience/journey";
import Location from "../experience/location";
import ServicesWheel from "../experience/services-wheel";
import { type Ctx } from "../lib";
import { FaqLd } from "../schema";
import { FaqList } from "../ui";

const PASSOS = [
  {
    n: "01",
    title: "Escolha o serviço",
    text: "A tabela inteira está aqui em cima, com o valor de cada um. Nenhum preço depende de pacote, de fidelidade ou de ser a primeira vez.",
  },
  {
    n: "02",
    title: "Marque seu horário",
    text: "Marcar não é obrigatório, mas é o que evita chegar e encontrar a cadeira ocupada — no sábado isso faz bastante diferença. Escolha o dia e a hora na agenda e a cadeira fica reservada no seu nome.",
  },
  {
    n: "03",
    title: "Sente na cadeira",
    text: "Antes de a máquina ligar, o corte é combinado: altura do degradê, acabamento, o que fica em cima. Sai dali o corte que dá para manter, não só o que fica bom na primeira hora.",
  },
] as const;

export default function HomePage({ links }: Ctx) {
  const cta = bookingCta(links);

  return (
    <>
      <FaqLd items={SITE_FAQ} />

      <Hero links={links} />

      <ServicesWheel links={links} bookingHref={cta.href} bookingExternal={cta.external} />

      <Combos links={links} />

      <Gallery photos={GALLERY} />

      <Journey steps={PASSOS} bookingHref={cta.href} bookingExternal={cta.external} />

      <Location links={links} />

      {/* ── PERGUNTAS ──────────────────────────────────────────────────── */}
      <section id="perguntas" aria-labelledby="perguntas-titulo" className="relative py-20 md:py-28">
        <div className="mx-auto grid w-full max-w-[90rem] gap-10 lg:grid-cols-[0.8fr_1.2fr]" style={{ paddingInline: "var(--ec-pad)" }}>
          <div>
            <p className="eyebrow" data-reveal="up">
              Perguntas
            </p>
            <h2
              id="perguntas-titulo"
              className="display mt-4 text-[clamp(3rem,7vw,5.5rem)] text-[var(--ec-paper)]"
              data-reveal="up"
            >
              O que <span className="text-[var(--ec-volt)]">costumam</span> perguntar
            </h2>
          </div>
          <FaqList items={SITE_FAQ} />
        </div>
      </section>

      <FinalCta bookingHref={cta.href} bookingExternal={cta.external} />
    </>
  );
}
