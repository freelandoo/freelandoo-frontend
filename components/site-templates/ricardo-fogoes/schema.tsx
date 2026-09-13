/**
 * JSON-LD.
 *
 * É ele que faz horário, área atendida e o par pergunta-e-resposta serem
 * lidos em busca local. Não é enfeite: é o produto desta camada.
 *
 * ── QUATRO REGRAS DURAS ──────────────────────────────────────────────────
 *
 * 1. NUNCA `aggregateRating`, `review` fabricada ou `priceRange` chutado.
 *    Nota inventada é a única coisa aqui que seria mentira sobre a empresa,
 *    e é o que rende PENALIZAÇÃO MANUAL. O Ricardo tem 3 avaliações no
 *    Google; marcar review próprio no site dele é auto-atribuição, que a
 *    documentação do Google proíbe explicitamente. O depoimento aparece
 *    como TEXTO na página e não é marcado.
 *
 * 2. CAMPO VAZIO NÃO VIRA CAMPO. `prune` roda antes de serializar.
 *    Afirmação em branco é pior que omissão.
 *
 * 3. `openingHoursSpecification` só existe porque o horário foi informado
 *    em formato inequívoco. Horário em texto livre fica como texto.
 *
 * 4. `FAQPage` sem `mainEntity` NÃO é desenhado. Marcação inválida registra
 *    erro na ficha, em vez de ser ignorada.
 */

import { BUSINESS, OPENING_HOURS } from "./content/business";
import { CITY_NAMES } from "./content/cities";
import type { Faq } from "./content/services";

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
 * `@id` estável da empresa. Todas as outras entidades apontam para ele,
 * em vez de repetir o bloco — é assim que o buscador entende que as
 * páginas falam do MESMO negócio.
 *
 * ⚠️ `origin` é a do cliente. Fixar a nossa faria o site dele declarar
 * que mora em outro domínio.
 */
/**
 * ⚠️ `origin` PERDEU O VALOR PADRÃO, e isso é proposital: com um default, a
 * chamada que esquecesse de passar a origem do cliente compilaria e publicaria
 * o `@id` do negócio dele apontando para outro domínio.
 */
export function businessId(origin: string) {
  return `${origin}/#business`;
}

export function BusinessLd({ origin }: { origin: string }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": businessId(origin),
        name: BUSINESS.name,
        description: `${BUSINESS.tagline} — ${BUSINESS.subTagline}.`,
        url: origin,
        telephone: BUSINESS.phoneE164,
        address: {
          "@type": "PostalAddress",
          streetAddress: BUSINESS.street,
          addressLocality: BUSINESS.city,
          addressRegion: BUSINESS.state,
          postalCode: BUSINESS.postalCode,
          addressCountry: BUSINESS.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: BUSINESS.geo.lat,
          longitude: BUSINESS.geo.lng,
        },
        openingHoursSpecification: OPENING_HOURS,
        areaServed: CITY_NAMES.map((name) => ({ "@type": "City", name })),
        paymentAccepted: [...BUSINESS.payments].join(", "),
        // Sem aggregateRating, sem review, sem priceRange. Ver regra 1.
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
 * Serviço.
 *
 * ⚠️ Sem `offers` de propósito: não há preço informado, e `offers` sem
 * preço ou com preço chutado é pior que não declarar oferta nenhuma.
 */
export function ServiceLd({
  name,
  description,
  url,
  origin,
}: {
  name: string;
  description: string;
  url: string;
  origin: string;
}) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        description,
        url,
        serviceType: name,
        provider: { "@id": businessId(origin) },
        areaServed: CITY_NAMES.map((n) => ({ "@type": "City", name: n })),
      }}
    />
  );
}

export function FaqLd({ items }: { items: Faq[] }) {
  // Regra 4: sem mainEntity, não desenha.
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

export function BreadcrumbLd({
  trail,
  origin,
}: {
  trail: { name: string; path: string }[];
  origin?: string;
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
