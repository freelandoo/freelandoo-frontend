/**
 * O BANNER.
 *
 * ── O QUE ELE RESOLVE NOS PRIMEIROS DOIS SEGUNDOS ────────────────────────
 * Quem chega aqui veio de uma busca por barbearia e tem três perguntas, nesta
 * ordem: é perto de mim? quanto custa? como marco? O banner responde as três
 * antes de qualquer rolagem — bairro e cidade no rótulo, os três preços
 * principais no tríptico, e o botão de WhatsApp à vista.
 *
 * A tentação do ramo é o contrário: uma foto grande, o nome enorme e "agende
 * seu horário". Isso responde zero das três, e a pessoa rola ou sai.
 *
 * ── SEM FOTO, POR HONESTIDADE ────────────────────────────────────────────
 * Não existe foto da barbearia do Enzo. Uma foto de banco de imagens aqui
 * mostraria OUTRA barbearia — e é o primeiro quadro do site, exatamente onde
 * a promessa visual é feita. O peso vem do corpo do tipo e do raio déco.
 *
 * ⚠️ QUANDO HOUVER FOTO REAL, o lugar dela é atrás do bloco de texto, com
 * `<img>` (nunca `next/image`: a URL vem de fora e o otimizador RECUSA host
 * fora de `remotePatterns` com erro de runtime, derrubando a página do
 * cliente por causa de onde a imagem está hospedada). O gradiente do fundo
 * já é escuro o bastante para o texto continuar legível por cima.
 */

import { BUSINESS, whatsappLink } from "./content/business";
import { getService } from "./content/services";
import { DecoSunburst, Monogram } from "./deco";
import { brl, pageHref, type TemplateLinks } from "./lib";
import { PAGE } from "./lib";
import { Btn, Container } from "./ui";

/**
 * Os três preços do tríptico.
 *
 * ⚠️ SÃO LIDOS DA TABELA, nunca digitados aqui. Escritos à mão, o banner
 * seria a primeira coisa a mentir depois de um reajuste — e é a única parte
 * do site que a pessoa lê com certeza.
 */
const HEADLINE = ["corte-de-cabelo", "barba", "sobrancelha"] as const;

export default function Hero({ links }: { links: TemplateLinks }) {
  const destaques = HEADLINE.map((slug) => getService(slug)).filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  return (
    <section className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      {/* O raio déco. Fica atrás de tudo e é decorativo — por isso não entra
          na ordem de leitura nem no contraste do texto. */}
      <DecoSunburst className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] w-full opacity-70" />

      <Container className="relative">
        <div className="mx-auto max-w-[48rem] text-center">
          <div className="mb-8 flex justify-center" data-reveal="scale">
            <Monogram className="h-16 w-16 text-[var(--ec-gold)]" />
          </div>

          <p className="eyebrow" data-reveal="up">
            {BUSINESS.tagline} · {BUSINESS.neighborhood}, {BUSINESS.city}
          </p>

          <h1
            className="display mt-6 text-[clamp(3rem,13vw,6.5rem)] text-[var(--ec-cream)]"
            data-reveal="up"
            data-reveal-delay="0.06"
          >
            Enzo <span className="display-italic text-[var(--ec-gold-hi)]">Cortes</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-[var(--ec-cream-dim)]"
            data-reveal="up"
            data-reveal-delay="0.12"
          >
            {BUSINESS.subTagline}. Preço na mesa, sem pacote e sem fidelidade —
            está tudo publicado aqui embaixo.
          </p>

          {/* O TRÍPTICO: a resposta à segunda pergunta, ainda sem rolar. */}
          <ul
            className="mx-auto mt-12 grid max-w-[34rem] grid-cols-3 gap-px"
            style={{ background: "var(--ec-line-soft)" }}
            data-reveal="up"
            data-reveal-delay="0.18"
          >
            {destaques.map((s) => (
              <li key={s.slug} className="px-2 py-5" style={{ background: "var(--ec-ink)" }}>
                <span className="display tnum block text-[clamp(1.5rem,6vw,2.25rem)] leading-none text-[var(--ec-gold-hi)]">
                  {brl(s.price)}
                </span>
                <span className="mt-2 block text-[0.75rem] uppercase tracking-[0.2em] text-[var(--ec-cream-faint)]">
                  {s.label}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            data-reveal="up"
            data-reveal-delay="0.24"
          >
            <Btn
              href={whatsappLink("Olá, Enzo! Vi o site e queria marcar um horário.")}
              external
            >
              Marcar no WhatsApp
            </Btn>
            <Btn href={pageHref(links, PAGE.servicos)} variant="ghost">
              Ver a tabela inteira
            </Btn>
          </div>

          <p
            className="mt-8 text-[0.8125rem] leading-relaxed text-[var(--ec-cream-faint)]"
            data-reveal="fade"
            data-reveal-delay="0.3"
          >
            {BUSINESS.street} — {BUSINESS.neighborhood}, {BUSINESS.city}/{BUSINESS.state}
            <span className="mx-2 text-[var(--ec-gold-deep)]">·</span>
            {BUSINESS.hoursShort}
          </p>
        </div>
      </Container>
    </section>
  );
}
