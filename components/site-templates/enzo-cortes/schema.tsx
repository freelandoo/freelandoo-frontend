/**
 * JSON-LD.
 *
 * É ele que faz horário, endereço, catálogo de preços e o par
 * pergunta-e-resposta serem lidos em busca local. Não é enfeite: é o produto
 * desta camada.
 *
 * ── CINCO REGRAS DURAS ───────────────────────────────────────────────────
 *
 * 1. NUNCA `aggregateRating` nem `review` fabricada. Nota inventada é a única
 *    coisa aqui que seria mentira sobre a empresa, e é o que rende
 *    PENALIZAÇÃO MANUAL. Marcar avaliação própria no site é auto-atribuição,
 *    que a documentação do Google proíbe explicitamente. Este site não tem
 *    depoimento nenhum — e não terá inventado.
 *
 * 2. `priceRange` SÓ PORQUE OS PREÇOS SÃO REAIS, e ele é CALCULADO da tabela
 *    (ver `priceRange`), nunca digitado. A regra proíbe `priceRange`
 *    CHUTADO; aqui o menor e o maior valor saem dos mesmos números que a
 *    página mostra, então o dado estruturado e o visível não podem divergir.
 *
 * 3. CAMPO VAZIO NÃO VIRA CAMPO. `prune` roda antes de serializar.
 *    Afirmação em branco é pior que omissão.
 *
 * 4. `openingHoursSpecification` só existe porque o horário foi informado em
 *    formato inequívoco (seg a sáb, 09h–19h). Horário em texto livre ficaria
 *    como texto.
 *
 * 5. `FAQPage` sem `mainEntity` NÃO é desenhado. Marcação inválida registra
 *    erro na ficha, em vez de ser ignorada.
 *
 * ── E UMA AUSÊNCIA DELIBERADA: `geo` ─────────────────────────────────────
 * A coordenada da Av. Vitória não foi informada, e São Bernardo do Campo é
 * grande o bastante para que o centro do município caia a quilômetros do
 * Alvarenga. Alfinete no lugar errado é pior que alfinete nenhum — o Google
 * geocodifica pelo endereço e pelo CEP, que aqui são precisos e conferidos.
 */

import { BUSINESS, OPENING_HOURS } from "./content/business";
import { AREA_NAMES } from "./content/areas";
import { SERVICES, type Faq, type Service } from "./content/services";

type Json = Record<string, unknown>;

/** Remove null, undefined, string vazia, array vazio e objeto vazio — recursivo. */
function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const out = value.map(prune).filter((v) => v !== undefined);
    return (out.length ? out : undefined) as unknown as T;
  }
  if (value && typeof value === "object") {
    const src = value as Json;
    const out: Json = {};
    for (const [k, v] of Object.entries(src)) {
      const p = prune(v);
      if (p !== undefined) out[k] = p;
    }
    return (Object.keys(out).length ? out : undefined) as unknown as T;
  }
  if (value === null || value === "") return undefined as unknown as T;
  return value;
}

function Ld({ data }: { data: unknown }) {
  const pruned = prune(data);
  if (!pruned) return null;
  return (
    <script
      type="application/ld+json"
      // O conteúdo é montado aqui, nunca vem de entrada de usuário.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pruned) }}
    />
  );
}

/**
 * `@id` estável da empresa. Todas as outras entidades apontam para ele em vez
 * de repetir o bloco — é assim que o buscador entende que as catorze páginas
 * falam do MESMO negócio, e não de catorze fichas soltas.
 *
 * ⚠️ `origin` NÃO TEM VALOR PADRÃO, e a ausência é proposital: com um
 * default, a chamada que esquecesse de passar a origem do cliente compilaria
 * e publicaria o `@id` apontando para outro domínio — justamente o dado com
 * que o buscador decide quem é o dono da página.
 */
export function businessId(origin: string) {
  return `${origin}/#business`;
}

/**
 * A faixa de preço, CALCULADA.
 *
 * Digitada, ela seria a primeira coisa a divergir da tabela num reajuste — e
 * divergência entre o dado estruturado e o que está na tela é exatamente o
 * que o Google trata como sinal de site não confiável.
 */
// ⚠️ FUNÇÃO, E NÃO CONSTANTE DE MÓDULO: o preço vem do cadastro
// (`content/prices.ts`) e só chega na hora de desenhar. Calculada no import,
// a faixa congelaria nos valores originais.
function priceRange(): string {
  const valores = SERVICES.map((s) => s.price);
  return `R$${Math.min(...valores)}-R$${Math.max(...valores)}`;
}

/**
 * O catálogo de serviços com PREÇO — o que este site tem e a maioria não.
 *
 * ⚠️ O SERVIÇO "A PARTIR DE" NÃO VIRA `price`. Ele recebe
 * `priceSpecification.minPrice`, que é a forma que a Schema.org tem de dizer
 * "o piso é este". Declarado como `price`, o risco de R$ 5 seria anunciado
 * como preço FECHADO — e preço anunciado a menos vira reclamação na cadeira,
 * não no site.
 */
function offerFor(s: Service) {
  const base = {
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: s.label, description: s.cardText },
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
  };
  return s.priceFrom
    ? {
        ...base,
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: s.price,
          priceCurrency: "BRL",
        },
      }
    : { ...base, price: s.price.toFixed(2) };
}

/**
 * A ficha do negócio.
 *
 * `HairSalon` e não `LocalBusiness` genérico: é o subtipo que a Schema.org
 * tem para o ramo (abaixo de `HealthAndBeautyBusiness`), e é ele que põe o
 * negócio na categoria certa do pacote local. `LocalBusiness` cru funciona,
 * mas entrega menos.
 */
export function BusinessLd({ origin }: { origin: string }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "HairSalon",
        "@id": businessId(origin),
        name: BUSINESS.name,
        description: `${BUSINESS.tagline} no ${BUSINESS.neighborhood}, ${BUSINESS.city}. ${BUSINESS.subTagline}.`,
        url: origin,
        telephone: BUSINESS.phoneE164,
        priceRange: priceRange(),
        currenciesAccepted: "BRL",
        address: {
          "@type": "PostalAddress",
          streetAddress: BUSINESS.street,
          addressLocality: BUSINESS.city,
          addressRegion: BUSINESS.state,
          postalCode: BUSINESS.postalCode,
          addressCountry: BUSINESS.country,
        },
        openingHoursSpecification: OPENING_HOURS,
        areaServed: [
          { "@type": "City", name: `${BUSINESS.city}, ${BUSINESS.state}` },
          ...AREA_NAMES.map((name) => ({ "@type": "Place", name })),
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `Serviços — ${BUSINESS.name}`,
          itemListElement: SERVICES.map(offerFor),
        },
        // Sem aggregateRating, sem review, sem geo. Ver as regras 1 e a nota
        // sobre `geo` no topo.
      }}
    />
  );
}

export function WebSiteLd({ origin }: { origin: string }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: BUSINESS.name,
        publisher: { "@id": businessId(origin) },
        inLanguage: "pt-BR",
      }}
    />
  );
}

/**
 * Um serviço, na página dele.
 *
 * ⚠️ AQUI `offers` EXISTE — e é a diferença deste site para o tema irmão do
 * Ricardo, onde ele foi deixado de fora de propósito porque não havia preço
 * informado. `offers` sem preço, ou com preço chutado, é pior que não
 * declarar oferta nenhuma; com o preço real, é o que faz o valor aparecer no
 * resultado de busca.
 */
export function ServiceLd({
  service,
  url,
  origin,
}: {
  service: Service;
  url: string;
  origin: string;
}) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: service.label,
        description: service.metaDescription,
        url,
        serviceType: service.label,
        provider: { "@id": businessId(origin) },
        areaServed: AREA_NAMES.map((name) => ({ "@type": "Place", name })),
        offers: offerFor(service),
      }}
    />
  );
}

export function FaqLd({ items }: { items: readonly Faq[] }) {
  // Regra 5: sem mainEntity, não desenha.
  if (!items.length) return null;
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }}
    />
  );
}

/**
 * A trilha.
 *
 * Menos de dois degraus não é trilha — é o nome da página, e marcar isso
 * como `BreadcrumbList` só polui a ficha.
 */
export function BreadcrumbLd({
  trail,
  origin,
}: {
  trail: { name: string; path: string }[];
  origin: string;
}) {
  if (trail.length < 2) return null;
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          item: `${origin}${t.path}`,
        })),
      }}
    />
  );
}
