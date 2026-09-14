// Os ENDEREÇOS do tema `ecoluz`.
//
// ⚠️ NENHUM CAMINHO É ESCRITO À MÃO NAS PÁGINAS. O MESMO site responde em três
// origens — `freelandoo.com.br/c/<slug>`, o subdomínio e o domínio próprio do
// cliente. Um `/servicos/x` literal acerta em UMA e dá 404 nas outras duas.
//
// ⚠️ TODA PÁGINA INTERNA VIVE SOB `/pagina/<slug>`. Não é economia: o
// `proxy.ts` da plataforma roda em toda requisição com ZERO I/O como regra, e
// não pode consultar o banco para descobrir se `/servicos` é uma página deste
// site ou uma rota da plataforma. `/pagina` é o único prefixo que ele reescreve
// nas três origens sem perguntar nada. E `/p` está fora: já é a página pública
// de post.

import type { TemplateLinks } from "@/types/site-template";

export type { TemplateLinks };

/**
 * Os endereços que não são de serviço nem de área.
 *
 * ⚠️ O NAMESPACE DE SLUG É UM SÓ. Serviços, áreas e estas páginas fixas
 * dividem o mesmo `/pagina/<slug>`: dois com o mesmo nome fariam o endereço
 * abrir um deles pela ordem do array, sem erro nenhum. `assertNoSlugClash()`
 * (em `pages.ts`) trava isso no import do módulo.
 */
export const PAGE = {
  servicos: "servicos",
  areas: "areas-atendidas",
  sobre: "sobre",
  contato: "contato",
} as const;

/** O endereço de uma página interna, na origem em que o site está sendo servido. */
export function pageHref(links: TemplateLinks, slug: string): string {
  return `${links.pageBase}/${slug}`;
}

/**
 * O que cada página recebe.
 *
 * `links` desce por PROP e não por contexto de React: a porta do tema é
 * componente de SERVIDOR (é o que põe fonte, folha e JSON-LD no HTML que o
 * buscador lê), e servidor não tem contexto.
 */
export type Ctx = {
  links: TemplateLinks;
};

/**
 * Dinheiro → o texto que a página mostra.
 *
 * ⚠️ ELE EXISTE PARA A CALCULADORA, e não para uma tabela de preços: este
 * negócio NÃO publica preço, porque preço de sistema solar depende de consumo,
 * telhado e arranjo — e um número na vitrine seria chute para baixo. O que a
 * calculadora mostra é a CONTA DE LUZ da pessoa e a projeção dela, que são
 * números dela, não nossos.
 *
 * Num lugar só para que a vírgula, o ponto e o "R$" sejam iguais no controle,
 * no resultado e nas faixas — escrito à mão em cada um, a primeira mudança de
 * formato deixa um para trás.
 */
export function brl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
