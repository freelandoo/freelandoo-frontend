// Os ENDEREÇOS do tema `enzo-cortes`.
//
// ⚠️ NENHUM CAMINHO É ESCRITO À MÃO NAS PÁGINAS. O MESMO site responde em
// três origens — `freelandoo.com.br/c/<slug>`, o subdomínio e o domínio
// próprio do cliente. Um `/servicos/x` literal acerta em UMA e dá 404 nas
// outras duas.
//
// ⚠️ E É POR ISSO QUE ESTE PROJETO JÁ NASCE FALANDO `links`. O site do Ricardo
// foi escrito com caminhos literais e teve que ser reescrito inteiro na hora
// de portar; aqui o tipo abaixo é cópia fiel de `types/site-template.ts` da
// plataforma, então portar é copiar a pasta, não traduzir endereço por
// endereço.
//
// ⚠️ TODA PÁGINA INTERNA VIVE SOB `/pagina/<slug>`. Não é economia: o
// `proxy.ts` da plataforma roda em toda requisição com ZERO I/O como regra, e
// não pode consultar o banco para descobrir se `/servicos` é uma página deste
// site ou uma rota da plataforma. `/pagina` é o único prefixo que ele reescreve
// nas três origens sem perguntar nada. O projeto solto usa o mesmo prefixo de
// propósito: assim o endereço que foi para o Google lá é o mesmo que a
// plataforma serve aqui, sem redirecionamento no meio.

import type { TemplateLinks } from "@/types/site-template"

/**
 * O que a hospedagem entrega ao tema.
 *
 * ⚠️ AQUI ELE É IMPORTADO DA PLATAFORMA, não declarado. No projeto de origem
 * (`SITES/barbeiro- enzo`) este mesmo tipo é escrito à mão, como cópia fiel
 * deste — é o que permite escrever o site lá fora já falando o contrato certo.
 * Importando aqui, qualquer divergência entre as duas cópias vira erro do
 * `tsc` na portagem, que é quando ainda é barato descobrir.
 */
export type { TemplateLinks }

/**
 * Os endereços que não são de serviço nem de bairro.
 *
 * ⚠️ O NAMESPACE DE SLUG É UM SÓ. Serviços, bairros e estas páginas fixas
 * dividem o mesmo `/pagina/<slug>`: dois com o mesmo nome fariam o endereço
 * abrir um deles pela ordem do array, sem erro nenhum. `assertNoSlugClash()`
 * (em `pages.ts`) trava isso no import do módulo.
 */
export const PAGE = {
  servicos: "servicos",
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
 * Preço em reais → o texto que a página mostra.
 *
 * Centavos não entram neste negócio (a tabela do Enzo é toda em reais
 * inteiros), mas o formatador existe num lugar só para que a vírgula, o
 * espaço e o "R$" sejam iguais nas quatro superfícies que desenham preço:
 * o cardápio da home, o card do serviço, a página do serviço e o JSON-LD.
 * Escrito à mão em cada uma, a primeira mudança de formato deixa uma para trás.
 */
export function brl(reais: number): string {
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
