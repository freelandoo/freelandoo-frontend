/**
 * O CARDÁPIO DE PREÇOS — a peça central do site.
 *
 * ── POR QUE ELE É O CENTRO, E NÃO UM RODAPÉ ──────────────────────────────
 * A pergunta que decide uma barbearia é "quanto custa", e a maioria dos
 * sites do ramo responde "consulte" ou não responde. Quem procura não liga
 * para perguntar: abre o próximo resultado. Com a tabela publicada e
 * legível, este site responde antes de ser perguntado — e é a única coisa
 * aqui que nenhum concorrente pode copiar sem também publicar os preços
 * dele.
 *
 * ── O DESENHO ────────────────────────────────────────────────────────────
 * Cardápio de restaurante: nome à esquerda, preço à direita, pontilhado
 * ligando os dois. A convenção não é nostalgia — é o que faz o olho
 * percorrer a linha inteira em vez de pular direto para a coluna de números
 * e perder de vista a que serviço ela pertence.
 *
 * ⚠️ CADA LINHA É UM LINK PARA A PÁGINA DO SERVIÇO. Sem isso o cardápio
 * seria um beco: a pessoa lê "corte R$ 40" e não tem para onde ir saber o
 * que está incluído. E são esses links que fazem as seis páginas de serviço
 * serem ALCANÇÁVEIS — página que ninguém aponta é página que nem o visitante
 * nem o buscador encontram.
 */

import { brl, pageHref, type TemplateLinks } from "./lib";
import { BUSINESS } from "./content/business";
import { SERVICES, saving, sumOfParts, type Service } from "./content/services";
import { ServiceGlyph } from "./deco";
import { Note } from "./ui";

function Row({ service, links }: { service: Service; links: TemplateLinks }) {
  const economia = saving(service);
  return (
    <li data-reveal="up">
      <a
        href={pageHref(links, service.slug)}
        className="group flex items-baseline gap-0 py-5 transition-colors duration-200"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-3">
          <span
            className="shrink-0 self-center text-[var(--ec-volt-deep)] transition-colors duration-200 group-hover:text-[var(--ec-volt)]"
            aria-hidden="true"
          >
            <ServiceGlyph name={service.art} className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-medium text-[var(--ec-paper)] transition-colors duration-200 group-hover:text-[var(--ec-volt)]">
              {service.label}
            </span>
            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--ec-metal-dim)]">
              {service.cardText}
            </span>
          </span>
        </span>

        {/* O pontilhado. `aria-hidden` porque é ligação visual: lido em voz
            alta seria ruído entre o nome e o preço. */}
        <span className="leader hidden sm:block" aria-hidden="true" />

        <span className="shrink-0 pl-4 text-right">
          {service.priceFrom ? (
            <span className="mb-0.5 block text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--ec-metal-dim)]">
              a partir de
            </span>
          ) : null}
          <span className="display tnum block text-[1.75rem] leading-none text-[var(--ec-volt)]">
            {brl(service.price)}
          </span>
          {economia > 0 ? (
            <span className="mt-1 block text-[0.75rem] text-[var(--ec-volt)]">
              economiza {brl(economia)}
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}

function Group({
  title,
  services,
  links,
}: {
  title: string;
  services: Service[];
  links: TemplateLinks;
}) {
  if (!services.length) return null;
  return (
    <div className="px-6 py-2 md:px-10">
      <h3 className="eyebrow border-b border-[var(--ec-line-soft)] pb-3 pt-6">{title}</h3>
      <ul className="divide-y divide-[var(--ec-line-soft)]">
        {services.map((s) => (
          <Row key={s.slug} service={s} links={links} />
        ))}
      </ul>
    </div>
  );
}

export default function PriceMenu({
  links,
  className = "",
}: {
  links: TemplateLinks;
  className?: string;
}) {
  // ⚠️ A separação sai de `sumOf`, não de uma segunda lista escrita à mão.
  // Combinado é, por definição, o serviço que é feito de outros — e é o
  // mesmo campo que calcula a economia. Com duas listas, acrescentar um
  // combinado e esquecer de uma delas poria o serviço no grupo errado ou em
  // nenhum, sem erro nenhum.
  const avulsos = SERVICES.filter((s) => !s.sumOf?.length);
  const combinados = SERVICES.filter((s) => s.sumOf?.length);

  return (
    <div className={className}>
      <div
        className="deco-frame mx-auto max-w-[46rem]"
        style={{ background: "var(--ec-ink-deep)" }}
      >
        <Group title="Avulso" services={avulsos} links={links} />
        <Group title="Combinado" services={combinados} links={links} />

        <div className="border-t border-[var(--ec-line-soft)] px-6 py-6 md:px-10">
          <Note>
            {/* A conta do combinado sai calculada dos preços, nunca digitada:
                escrita à mão, um reajuste deixaria a frase anunciando uma
                economia que a soma não confirma — e o cliente refaz essa
                conta de cabeça, na cadeira. */}
            {combinados.map((c) => `${c.label}: ${brl(sumOfParts(c))} avulsos → ${brl(c.price)}`).join(" · ")}
            . Valores de {BUSINESS.pricesAsOf}, sem pacote nem fidelidade.
          </Note>
        </div>
      </div>
    </div>
  );
}
