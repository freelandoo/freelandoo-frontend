// OS DADOS ESTRUTURADOS — o JSON-LD.
//
// ⚠️ ISTO É O PRODUTO, NÃO ENFEITE. É ele que faz o par pergunta-e-resposta, o
// endereço e a área atendida serem lidos em busca local — que é de onde vem o
// cliente de um negócio como este.
//
// ── AS QUATRO REGRAS DURAS ────────────────────────────────────────────────
//
// 1. NUNCA `aggregateRating`, `review` fabricada ou `priceRange` chutado. Nota
//    inventada é a única coisa aqui que seria mentira sobre a empresa, e é o
//    que rende penalização MANUAL — a que não se desfaz sozinha.
// 2. CAMPO VAZIO NÃO VIRA CAMPO (ver `prune`). Afirmação em branco é pior que
//    omissão: `"telephone": ""` diz que o negócio não tem telefone.
// 3. SEM `openingHours`. O horário de funcionamento não foi informado, e
//    convertê-lo de um palpite publicaria um horário que ninguém escreveu —
//    com a pessoa chegando na loja fechada.
// 4. SEM `geo`. A coordenada não foi informada, e meia coordenada põe um
//    alfinete no oceano. O endereço está completo com CEP, e o Google
//    geocodifica sozinho a partir dele — alfinete no lugar errado é pior que
//    alfinete nenhum.

import { AREAS } from "./content/areas";
import { ADDRESS_LINE, BUSINESS } from "./content/business";
import { SERVICES, type Service } from "./content/services";

/**
 * Remove chave vazia, recursivamente.
 *
 * O JSON-LD é montado a partir de constantes, e no dia em que uma delas ficar
 * em branco o campo sai da ficha em vez de afirmar o vazio.
 */
function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const out = value.map(prune).filter((v) => v !== undefined && v !== null && v !== "");
    return (out.length ? out : undefined) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v);
      if (cleaned !== undefined && cleaned !== null && cleaned !== "") out[k] = cleaned;
    }
    return (Object.keys(out).length ? out : undefined) as T;
  }
  return value;
}

function Ld({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // O JSON é montado por nós a partir de constantes do próprio módulo —
      // nada aqui vem de entrada de usuário.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * O `@id` do negócio.
 *
 * ⚠️ ELE SAI DA ORIGEM DESTA VISITA, e é o mesmo em TODA página do site. É
 * isso que faz o buscador ler as 14 páginas como UM negócio em vez de 14
 * fichas soltas — e é por isso que a ficha é desenhada em todas elas.
 */
const businessId = (origin: string) => `${origin}/#negocio`;

/* ───────────────────────────── O NEGÓCIO ───────────────────────────────── */

/**
 * ⚠️ O TIPO É `Electrician`, e a escolha não é cosmética: é o subtipo de
 * `LocalBusiness` que o vocabulário tem para instalação elétrica — que é
 * literalmente o que um sistema solar exige (projeto elétrico, padrão de
 * entrada, homologação). `LocalBusiness` cru perde a categoria; um subtipo
 * inventado é ignorado, e aí a ficha volta a ser genérica sem avisar.
 */
export function BusinessLd({ origin }: { origin: string }) {
  return (
    <Ld
      data={prune({
        "@context": "https://schema.org",
        "@type": "Electrician",
        "@id": businessId(origin),
        name: BUSINESS.name,
        url: origin,
        description:
          "Projetos de energia solar em São Luís e na Ilha do Maranhão: sistemas conectados à rede e off-grid com baterias, com projeto, instalação, homologação e acompanhamento.",
        telephone: BUSINESS.phoneE164,
        email: BUSINESS.email,
        founder: { "@type": "Person", name: BUSINESS.owner },
        address: {
          "@type": "PostalAddress",
          streetAddress: `${BUSINESS.street}, ${BUSINESS.complement}`,
          addressLocality: BUSINESS.city,
          addressRegion: BUSINESS.state,
          postalCode: BUSINESS.postalCode,
          addressCountry: BUSINESS.country,
        },
        sameAs: [BUSINESS.instagram],
        // A área atendida sai da MESMA lista que desenha as páginas de área.
        // Numa segunda lista, a região prometida ao buscador divergiria da que
        // o site mostra — e a divergência só apareceria numa auditoria.
        areaServed: AREAS.map((a) => ({
          "@type": "City",
          name: a.name,
          addressRegion: a.uf,
        })),
        // ⚠️ SEM PREÇO. `hasOfferCatalog` aceita `priceSpecification`, e é
        // tentador preencher — mas preço de sistema solar depende de consumo,
        // telhado e arranjo. Qualquer número aqui seria chute publicado como
        // fato, e o "a partir de" que o ramo usa é justamente o que faz a
        // pessoa se sentir enganada na proposta.
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Serviços de energia solar",
          itemListElement: SERVICES.map((s) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: s.h1,
              description: s.description,
            },
          })),
        },
      })}
    />
  );
}

export function WebSiteLd({ origin }: { origin: string }) {
  return (
    <Ld
      data={prune({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${origin}/#site`,
        url: origin,
        name: BUSINESS.name,
        inLanguage: "pt-BR",
        publisher: { "@id": businessId(origin) },
      })}
    />
  );
}

/* ──────────────────────────── MIGALHAS ─────────────────────────────────── */

/**
 * A trilha da página interna.
 *
 * ⚠️ SÓ EM PÁGINA INTERNA. Uma migalha de um item só, na home, não diz nada ao
 * buscador e aparece como trilha quebrada no resultado.
 */
export function BreadcrumbLd({
  origin,
  home,
  trail,
}: {
  origin: string;
  home: string;
  trail: { name: string; href: string }[];
}) {
  if (!trail.length) return null;
  const abs = (path: string) => (path.startsWith("http") ? path : `${origin}${path}`);

  return (
    <Ld
      data={prune({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: abs(home) },
          ...trail.map((t, i) => ({
            "@type": "ListItem",
            position: i + 2,
            name: t.name,
            item: abs(t.href),
          })),
        ],
      })}
    />
  );
}

/* ───────────────────────────── SERVIÇO ─────────────────────────────────── */

export function ServiceLd({
  origin,
  url,
  service,
}: {
  origin: string;
  url: string;
  service: Service;
}) {
  return (
    <Ld
      data={prune({
        "@context": "https://schema.org",
        "@type": "Service",
        name: service.h1,
        description: service.description,
        url,
        provider: { "@id": businessId(origin) },
        areaServed: AREAS.map((a) => ({
          "@type": "City",
          name: a.name,
          addressRegion: a.uf,
        })),
        serviceType: service.label,
      })}
    />
  );
}

/* ─────────────────────────────── FAQ ───────────────────────────────────── */

/**
 * ⚠️ `FAQPage` SEM `mainEntity` NÃO É DESENHADO. Marcação inválida registra
 * ERRO na ficha do negócio, em vez de ser simplesmente ignorada — e um erro na
 * ficha é pior que a ausência da marcação.
 *
 * ⚠️ E A LISTA É A MESMA QUE A PÁGINA MOSTRA. Marcar uma pergunta que o
 * visitante não encontra na página é exatamente o que as diretrizes chamam de
 * conteúdo oculto, e é motivo de ação manual.
 */
export function FaqLd({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <Ld
      data={prune({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      })}
    />
  );
}

/** O endereço por extenso, para quem precisar dele fora do JSON-LD. */
export { ADDRESS_LINE };
