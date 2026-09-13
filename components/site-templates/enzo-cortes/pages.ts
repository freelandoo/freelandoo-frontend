// Endereço → página, e o título de cada uma.
//
// ⚠️ QUEM RESOLVE O ENDEREÇO É ESTE ARQUIVO, E NÃO A PÁGINA. A rota chama
// `resolveEnzoPage` e devolve 404 de verdade quando ela responde `null`.
// Resolvido dentro do componente, "não encontrado" sairia com status 200 — e o
// buscador indexa uma página de erro como se ela existisse.

import { AREAS, getArea, type Area } from "./content/areas";
import { SERVICES, getService, type Service } from "./content/services";
import { PAGE } from "./lib";

export type EnzoPage =
  | { kind: "servicos" }
  | { kind: "service"; service: Service }
  | { kind: "area"; area: Area }
  | { kind: "sobre" }
  | { kind: "contato" };

/**
 * ⚠️ O NAMESPACE DE ENDEREÇO É UM SÓ.
 *
 * Serviços, bairros e páginas fixas dividem `/pagina/<slug>`, porque é o único
 * prefixo que o `proxy.ts` da plataforma reescreve nas três origens sem
 * consultar nada (a regra de ZERO I/O dele). Dois slugs iguais fariam o
 * endereço abrir um deles pela ordem em que `resolveEnzoPage` pergunta — sem
 * erro nenhum, e diferente do que quem escreveu esperava.
 *
 * A conferência roda no IMPORT DO MÓDULO: um choque derruba o build, que é
 * quando ainda é barato. Página nova entra aqui junto com o `kind` dela.
 *
 * O caso real que isto pega neste site: "sobrancelha" é serviço e poderia
 * virar nome de bairro num site irmão; e "servicos" é página fixa, então um
 * serviço com slug "servicos" mataria o índice silenciosamente.
 */
function assertNoSlugClash(): string[] {
  const all = [
    ...Object.values(PAGE),
    ...SERVICES.map((s) => s.slug),
    ...AREAS.map((a) => a.slug),
  ];
  const seen = new Set<string>();
  const dup = all.filter((s) => (seen.has(s) ? true : (seen.add(s), false)));
  if (dup.length) {
    throw new Error(
      `[enzo-cortes] endereço repetido em /pagina: ${[...new Set(dup)].join(", ")}`,
    );
  }
  return all;
}

/** Todos os endereços internos do site. A home não entra: ela é a raiz. */
export const PAGE_SLUGS = assertNoSlugClash();

/** `null` é 404. A home não passa por aqui — ela é a ausência de slug. */
export function resolveEnzoPage(slug: string): EnzoPage | null {
  if (slug === PAGE.servicos) return { kind: "servicos" };
  if (slug === PAGE.sobre) return { kind: "sobre" };
  if (slug === PAGE.contato) return { kind: "contato" };

  // Serviço antes de bairro — a MESMA ordem do `assertNoSlugClash`, que é o
  // que garante que a pergunta nunca é ambígua.
  const service = getService(slug);
  if (service) return { kind: "service", service };

  const area = getArea(slug);
  if (area) return { kind: "area", area };

  return null;
}

/** Título e descrição de cada página — o que o buscador lê. */
export function pageMeta(page: EnzoPage | null): { title: string; description: string } {
  if (!page) {
    return {
      title: "Enzo Cortes — Barbearia no Jardim Pinheiros, São Bernardo do Campo",
      description:
        "Barbearia na Av. Vitória, 144 — Jd. Pinheiros, SBC. Corte R$ 40, barba R$ 25, sobrancelha R$ 15. Corte e barba R$ 60. Seg a sáb, 09h às 19h.",
    };
  }
  switch (page.kind) {
    case "service":
      return { title: page.service.metaTitle, description: page.service.metaDescription };
    case "area":
      return { title: page.area.metaTitle, description: page.area.metaDescription };
    case "servicos":
      return {
        title: "Serviços e Preços — Barbearia Enzo Cortes, SBC",
        description:
          "A tabela inteira: corte R$ 40, barba R$ 25, sobrancelha R$ 15, risco a partir de R$ 5, corte e barba R$ 60, os três por R$ 70. Jd. Pinheiros, São Bernardo.",
      };
    case "sobre":
      return {
        title: "A Barbearia — Enzo Cortes, Jd. Pinheiros | SBC",
        description:
          "Como funciona o atendimento na Enzo Cortes: o combinado antes da máquina ligar, o preço na mesa e o horário. Av. Vitória, 144, São Bernardo do Campo.",
      };
    case "contato":
      return {
        title: "Onde Fica e Como Marcar — Enzo Cortes, SBC",
        description:
          "Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo/SP. Horário de segunda a sábado, das 09h às 19h, e como combinar o seu horário.",
      };
  }
}

/** O endereço desta página dentro do site — vira canônico. */
export function pageSlug(page: EnzoPage | null): string | null {
  if (!page) return null;
  switch (page.kind) {
    case "service":
      return page.service.slug;
    case "area":
      return page.area.slug;
    default:
      return PAGE[page.kind];
  }
}

/**
 * O rótulo curto da página — trilha de navegação e "veja também".
 *
 * ⚠️ É CURTO DE PROPÓSITO (teto prático de ~30 caracteres). O H1 de uma
 * página de serviço tem meia linha; jogado numa trilha ele quebra em três
 * linhas no celular. O gancho editorial fica no H1, o nome fica aqui.
 */
export function pageLabel(page: EnzoPage | null): string {
  if (!page) return "Início";
  switch (page.kind) {
    case "service":
      return page.service.label;
    case "area":
      return page.area.name;
    case "servicos":
      return "Serviços e preços";
    case "sobre":
      return "A barbearia";
    case "contato":
      return "Onde fica";
  }
}
