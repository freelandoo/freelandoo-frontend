// Endereço → página, e o título de cada uma.
//
// ⚠️ QUEM RESOLVE O ENDEREÇO É ESTE ARQUIVO, E NÃO A PÁGINA. A rota chama
// `resolveRicardoPage` e devolve 404 de verdade quando ela responde `null`.
// Resolvido dentro do componente, "não encontrado" sairia com status 200 — e o
// buscador indexa uma página de erro como se ela existisse.

import { CITIES, getCity, type City } from "./content/cities"
import { SERVICES, getService, type Service } from "./content/services"
import { PAGE } from "./lib"

export type RicardoPage =
  | { kind: "servicos" }
  | { kind: "service"; service: Service }
  | { kind: "city"; city: City }
  | { kind: "areas" }
  | { kind: "contato" }
  | { kind: "sobre" }

/**
 * ⚠️ O NAMESPACE DE ENDEREÇO É UM SÓ.
 *
 * No projeto de origem cada família tinha o próprio prefixo de rota
 * (`/servicos/x` e `/x`), então um serviço e uma cidade podiam se chamar igual
 * sem consequência. Aqui todas as páginas dividem `/pagina/<slug>`, porque é o
 * único prefixo que o `proxy.ts` reescreve nas três origens sem consultar
 * nada — e dois slugs iguais fariam o endereço abrir um deles pela ordem em
 * que `resolveRicardoPage` pergunta, sem erro nenhum.
 *
 * A conferência roda no import do módulo: um choque derruba o build, que é
 * quando ainda é barato. Página nova entra aqui junto com o `kind` dela.
 */
function assertNoSlugClash(): string[] {
  const all = [
    ...Object.values(PAGE),
    ...SERVICES.map((s) => s.slug),
    ...CITIES.map((c) => c.slug),
  ]
  const seen = new Set<string>()
  const dup = all.filter((s) => (seen.has(s) ? true : (seen.add(s), false)))
  if (dup.length) {
    throw new Error(
      `[ricardo-fogoes] endereço repetido em /pagina: ${[...new Set(dup)].join(", ")}`
    )
  }
  return all
}

/** Todos os endereços internos do site. A home não entra: ela é a raiz. */
export const PAGE_SLUGS = assertNoSlugClash()

/** `null` é a home; `undefined` (retorno nulo) é 404. */
export function resolveRicardoPage(slug: string): RicardoPage | null {
  if (slug === PAGE.servicos) return { kind: "servicos" }
  if (slug === PAGE.areas) return { kind: "areas" }
  if (slug === PAGE.contato) return { kind: "contato" }
  if (slug === PAGE.sobre) return { kind: "sobre" }

  // Serviço antes de cidade — mesma ordem do `assertNoSlugClash`, que é o que
  // garante que a pergunta nunca é ambígua.
  const service = getService(slug)
  if (service) return { kind: "service", service }

  const city = getCity(slug)
  if (city) return { kind: "city", city }

  return null
}

/** Título e descrição de cada página — o que o buscador lê. */
export function pageMeta(page: RicardoPage | null): { title: string; description: string } {
  if (!page) {
    return {
      title: "Ricardo Fogões — Conserto de Fogões em Aguaí/SP",
      description:
        "Conserto, reforma, limpeza e instalação de fogões residenciais e industriais em Aguaí, São João da Boa Vista, Casa Branca e Mogi Guaçu.",
    }
  }
  switch (page.kind) {
    case "service":
      return { title: page.service.metaTitle, description: page.service.metaDescription }
    case "city":
      return { title: page.city.metaTitle, description: page.city.metaDescription }
    case "servicos":
      return {
        title: "Serviços de Conserto de Fogões em Aguaí | Ricardo Fogões",
        description:
          "Conserto, reforma, limpeza, instalação e manutenção de chapas. Fogões residenciais e industriais em Aguaí, São João da Boa Vista, Casa Branca e Mogi Guaçu.",
      }
    case "areas":
      return {
        title: "Área Atendida — Aguaí e Região | Ricardo Fogões",
        description:
          "Conserto de fogões em Aguaí, São João da Boa Vista, Casa Branca e Mogi Guaçu. Distâncias, bairros atendidos e como funciona o deslocamento.",
      }
    case "contato":
      return {
        title: "Contato — Ricardo Fogões, Aguaí/SP | (19) 99495-7125",
        description:
          "Telefone, WhatsApp, endereço e horário do Ricardo Fogões em Aguaí/SP. Atendimento de segunda a sexta, das 08h às 18h, com hora marcada.",
      }
    case "sobre":
      return {
        title: "Sobre o Ricardo Fogões — Assistência em Aguaí/SP",
        description:
          "Como o atendimento funciona: diagnóstico antes de trocar peça, regulagem de chama e o que é dito quando o conserto não compensa.",
      }
  }
}

/** O endereço desta página dentro do site — vira canônico. */
export function pageSlug(page: RicardoPage | null): string | null {
  if (!page) return null
  switch (page.kind) {
    case "service":
      return page.service.slug
    case "city":
      return page.city.slug
    default:
      return PAGE[page.kind]
  }
}
