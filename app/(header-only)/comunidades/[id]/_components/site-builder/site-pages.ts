// A tradução entre "a pilha de seções que está na prancheta" e "o documento do
// site" (mig 238).
//
// ═══ POR QUE ISTO É UM MÓDULO PRÓPRIO, E PURO ═══
//
// O `SiteCanvas` não sabe o que é uma sub-página — para ele existe UMA pilha de
// seções, a que está sendo editada. Isso é deliberado: ele também é o
// renderizador do site publicado, onde a pergunta "qual página?" já foi
// respondida pela rota. Então alguém tem que traduzir, nos dois sentidos.
//
// Essa tradução tem um modo de falhar que não dá sintoma na hora: gravar o
// retorno do canvas cru enquanto se edita uma sub-página SUBSTITUI a home pelas
// seções dela. O site publicado perderia a página inicial por causa de uma
// edição em outra página, sem erro nenhum — e só o recarregamento mostraria.
//
// Por isso mora aqui, fora do componente: função pura se confere sozinha, e é o
// que permite exercitar os invariantes (ver `scripts/check-site-pages.mjs`).

import type { CommunitySiteConfig, SitePage, SiteSection } from "@/types/community-site"

/** `null` = a home está na prancheta. */
export type ActivePageId = string | null

/**
 * A página que está sendo editada.
 *
 * Página que não resolve devolve `null` — ou seja, cai na home. Ela pode ter
 * sido apagada (por esta aba ou por outra), e uma prancheta vazia sem
 * explicação é pior do que voltar para o começo.
 */
export function findActivePage(
  pages: SitePage[],
  activePageId: ActivePageId
): SitePage | null {
  if (!activePageId) return null
  return pages.find((p) => p.id === activePageId) || null
}

/**
 * O documento como o canvas deve vê-lo: tudo igual, `sections` trocadas pelas
 * da página ativa.
 *
 * ⚠️ `theme`, `textStyles`, `siteName` e `tagline` continuam sendo os do SITE.
 * A casca (barra, rodapé, cores, tamanhos de texto) é uma só — é isso que faz a
 * sub-página parecer o mesmo site, e não um site novo de mesmo dono.
 */
export function canvasConfigFor(
  config: CommunitySiteConfig,
  activePage: SitePage | null
): CommunitySiteConfig {
  if (!activePage) return config
  return { ...config, sections: activePage.sections }
}

/**
 * O caminho de volta: o canvas devolveu um documento cujas `sections` são as da
 * pilha ativa.
 *
 * ⚠️ Na sub-página, `sections` do documento salvo TEM que voltar a ser a da
 * home, e as seções recebidas vão para dentro da página ativa. É o invariante
 * que impede a edição de uma página de apagar a outra.
 */
export function writeCanvasChange(
  config: CommunitySiteConfig,
  activePageId: ActivePageId,
  next: CommunitySiteConfig
): CommunitySiteConfig {
  if (!activePageId) return next

  const pages = config.pages || []
  // Página que não existe mais: grava o que o canvas devolveu sem inventar uma
  // página para recebê-lo. Sem esta guarda, `next.sections` seria descartado em
  // silêncio — o líder veria a prancheta aceitar a edição e o save perdê-la.
  if (!pages.some((p) => p.id === activePageId)) return next

  return {
    ...next,
    sections: config.sections,
    pages: pages.map((p) =>
      p.id === activePageId ? { ...p, sections: next.sections } : p
    ),
  }
}

/**
 * Acrescenta uma seção à pilha ATIVA.
 *
 * Com `config.sections` cru no lugar disto, adicionar seção dentro de uma
 * sub-página empilharia a seção na home: a prancheta não mudaria, e o líder
 * tentaria de novo — criando seções invisíveis a cada tentativa.
 */
export function addSectionTo(
  config: CommunitySiteConfig,
  activePageId: ActivePageId,
  section: SiteSection
): CommunitySiteConfig {
  const pages = config.pages || []
  if (activePageId && pages.some((p) => p.id === activePageId)) {
    return {
      ...config,
      pages: pages.map((p) =>
        p.id === activePageId ? { ...p, sections: [...p.sections, section] } : p
      ),
    }
  }
  return { ...config, sections: [...config.sections, section] }
}
