"use client"

// O que o site precisa saber sobre SI MESMO enquanto é desenhado — e que não
// está no documento.
//
// São duas coisas, e as duas dependem de POR ONDE o site chegou:
//
//   bookingHref  o endereço da página de agendamento deste site
//   communityId  a comunidade, para o cartão de chamada perguntar o próximo
//                horário livre ao backend
//
// ═══ POR QUE CONTEXTO E NÃO PROP ═══
//
// O destino de agendar é usado pelo banner, pelo bloco de chamada, pela barra
// fixa e pela seção "quem está por trás". Descer a mesma prop por quatro
// caminhos é como um deles fica para trás numa mudança — e o botão que
// esquecemos não dá erro, só leva para lugar nenhum. Mesma razão do
// `site-style-context`.
//
// ═══ POR QUE O DESTINO NÃO MORA NO DOCUMENTO ═══
//
// O mesmo site é servido em três endereços: `freelandoo.com.br/c/padaria`,
// `padaria.freelandoo.com.br` e o domínio próprio. Gravar "/agendar" no JSONB
// deixaria o link certo em um deles e quebrado nos outros dois. O documento
// guarda o TOKEN (`agendar`, validado no backend por `utils/communitySite.js`)
// e quem monta o endereço é a PÁGINA, que sabe por onde foi servida.

import { createContext, useContext, useMemo } from "react"

/** Espelho do `BOOKING_LINK` do backend — o valor gravado no documento. */
export const BOOKING_LINK = "agendar"

/** Espelho do `PAGE_LINK_PREFIX` do backend: `pagina:<slug>` (mig 238). */
export const PAGE_LINK_PREFIX = "pagina:"

type SiteRuntime = {
  /** `null` quando não há para onde agendar (construtor, site sem endereço). */
  bookingHref: string | null
  communityId: string | null
  /**
   * Onde as SUB-PÁGINAS deste site moram, sem barra no fim.
   *
   * Vazio ("") no subdomínio e no domínio próprio, onde a página é `/servicos`;
   * `/c/<slug>` na plataforma, onde a mesma página é `/c/padaria/servicos`. É a
   * razão de o documento guardar um token e não um caminho — o mesmo site
   * responde nos três endereços.
   *
   * `null` no construtor: ali não existe página publicada para onde ir, e um
   * link morto que parece vivo é pior que texto sem link.
   */
  pageBase: string | null
}

const Ctx = createContext<SiteRuntime>({
  bookingHref: null,
  communityId: null,
  pageBase: null,
})

export function SiteRuntimeProvider({
  bookingHref,
  communityId,
  pageBase,
  children,
}: SiteRuntime & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ bookingHref, communityId, pageBase }),
    [bookingHref, communityId, pageBase]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSiteRuntime(): SiteRuntime {
  return useContext(Ctx)
}

/**
 * O `href` de um link do documento, já resolvido.
 *
 * `null` significa "não desenhe como link": ou o campo está vazio, ou é o token
 * de agendar num lugar onde não há página de agendamento (o construtor). Um
 * `<a>` sem href é um botão morto que parece vivo.
 */
export function useSiteHref(url: string): string | null {
  const { bookingHref, pageBase } = useSiteRuntime()
  const raw = (url || "").trim()
  if (!raw) return null
  if (raw === BOOKING_LINK) return bookingHref
  if (raw.startsWith(PAGE_LINK_PREFIX)) {
    // `pageBase` vazio é um valor legítimo (subdomínio: a página é `/servicos`),
    // então a comparação é com null — `!pageBase` trataria a raiz como ausência
    // e apagaria todo link interno justamente no endereço próprio do cliente.
    if (pageBase === null) return null
    const slug = raw.slice(PAGE_LINK_PREFIX.length)
    return slug ? `${pageBase}/${slug}` : null
  }
  return raw
}

/** Link externo abre em aba nova; âncora e caminho interno, não. */
export function isExternalHref(href: string | null): boolean {
  return !!href && href.startsWith("http")
}
