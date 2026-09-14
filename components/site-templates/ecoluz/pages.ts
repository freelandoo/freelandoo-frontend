// O ROTEADOR DO TEMA: endereço → página, e o que cada uma declara ao buscador.
//
// ⚠️ ESTE ARQUIVO É A FONTE ÚNICA DA LISTA DE PÁGINAS. Ele responde às TRÊS
// perguntas que precisam concordar para sempre: qual endereço existe
// (`resolveEcoluzPage`), o que o sitemap publica (`PAGE_SLUGS`) e o que o
// `<title>` diz (`pageMeta`). Em três listas separadas, a página nova entraria
// no site e ficaria fora do mapa — e o jeito de descobrir seria notar, meses
// depois, que ela nunca foi indexada.
//
// ⚠️ E ELE TEM UM ESPELHO NO BACKEND: `summarizeEcoluz` em
// `src/utils/siteTemplates.js`. É o resumo que o cliente lê ANTES de aceitar a
// troca do site dele. Uma página a mais aqui e a menos lá faz o modal prometer
// um site diferente do que vai ao ar.

import { AREAS, AREA_BY_SLUG, type Area } from "./content/areas";
import { SERVICES, SERVICE_BY_SLUG, type Service } from "./content/services";
import { PAGE } from "./lib";

export type EcoluzPage =
  | { kind: "service"; service: Service }
  | { kind: "area"; area: Area }
  | { kind: "servicos" }
  | { kind: "areas" }
  | { kind: "sobre" }
  | { kind: "contato" };

/**
 * ⚠️ A ORDEM É SERVIÇO → ÁREA → FIXA, e ela importa.
 *
 * O namespace de endereço é UM só, então a busca precisa acontecer na mesma
 * ordem em que o dedupe declara o vencedor. Invertida, um slug repetido abriria
 * uma página aqui e outra no resumo do backend — sem erro, e diferente do que
 * quem escreveu esperava. `assertNoSlugClash()` garante que o caso não exista;
 * a ordem fixa garante que, se um dia existir, ele seja consistente.
 */
export function resolveEcoluzPage(slug: string): EcoluzPage | null {
  const service = SERVICE_BY_SLUG.get(slug);
  if (service) return { kind: "service", service };

  const area = AREA_BY_SLUG.get(slug);
  if (area) return { kind: "area", area };

  if (slug === PAGE.servicos) return { kind: "servicos" };
  if (slug === PAGE.areas) return { kind: "areas" };
  if (slug === PAGE.sobre) return { kind: "sobre" };
  if (slug === PAGE.contato) return { kind: "contato" };

  return null;
}

/** O endereço de uma página já resolvida — o caminho de volta de `resolve`. */
export function pageSlug(page: EcoluzPage | null): string | null {
  if (!page) return null;
  switch (page.kind) {
    case "service":
      return page.service.slug;
    case "area":
      return page.area.slug;
    case "servicos":
      return PAGE.servicos;
    case "areas":
      return PAGE.areas;
    case "sobre":
      return PAGE.sobre;
    case "contato":
      return PAGE.contato;
  }
}

/**
 * Os endereços internos, sem a home — é o que o `app/sitemap.ts` publica no
 * domínio do cliente.
 */
export const PAGE_SLUGS: string[] = [
  ...SERVICES.map((s) => s.slug),
  ...AREAS.map((a) => a.slug),
  PAGE.servicos,
  PAGE.areas,
  PAGE.sobre,
  PAGE.contato,
];

/**
 * ⚠️ A TRAVA DO NAMESPACE, executada no IMPORT do módulo.
 *
 * Dois endereços iguais não dão erro: dão uma página que abre a outra, pela
 * ordem do array, e isso é invisível para quem escreveu. Falhando aqui, o
 * defeito aparece no `npm run build` — que é quando ainda é barato.
 */
function assertNoSlugClash(): void {
  const seen = new Set<string>();
  for (const slug of PAGE_SLUGS) {
    if (seen.has(slug)) {
      throw new Error(
        `[ecoluz] endereço repetido: "${slug}". Serviços, áreas e páginas fixas dividem UM namespace /pagina/<slug>.`,
      );
    }
    seen.add(slug);
  }
}
assertNoSlugClash();

/** O `<title>` e a descrição de cada página. */
export function pageMeta(page: EcoluzPage | null): {
  title: string;
  description: string;
} {
  if (!page) {
    return {
      title: "EcoLuz Energia Solar | Projetos on-grid e off-grid em São Luís/MA",
      description:
        "Energia solar para casas, empresas e sítios em São Luís e na Ilha do Maranhão. Sistemas conectados à rede e off-grid com baterias, com projeto, instalação e homologação.",
    };
  }

  switch (page.kind) {
    case "service":
      return { title: page.service.title, description: page.service.description };
    case "area":
      return { title: page.area.title, description: page.area.description };
    case "servicos":
      return {
        title: "Serviços de energia solar | EcoLuz",
        description:
          "Energia solar residencial, para empresas, sistemas off-grid com baterias, projeto e homologação, manutenção e ampliação em São Luís/MA.",
      };
    case "areas":
      return {
        title: "Onde a EcoLuz atende | Ilha do Maranhão",
        description:
          "Atendimento em São Luís, São José de Ribamar, Paço do Lumiar e Raposa — os quatro municípios da Ilha do Maranhão.",
      };
    case "sobre":
      return {
        title: "Sobre a EcoLuz Energia Solar",
        description:
          "Quem é a EcoLuz: projeto, instalação e acompanhamento de sistemas de energia solar em São Luís, no Maranhão.",
      };
    case "contato":
      return {
        title: "Contato | EcoLuz Energia Solar",
        description:
          "Fale com a EcoLuz pelo WhatsApp, telefone ou e-mail. A loja fica na Av. Mário Andreazza, no Turu, em São Luís/MA.",
      };
  }
}
