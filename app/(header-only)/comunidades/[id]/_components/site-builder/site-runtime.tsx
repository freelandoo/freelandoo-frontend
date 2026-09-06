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

type SiteRuntime = {
  /** `null` quando não há para onde agendar (construtor, site sem endereço). */
  bookingHref: string | null
  communityId: string | null
}

const Ctx = createContext<SiteRuntime>({ bookingHref: null, communityId: null })

export function SiteRuntimeProvider({
  bookingHref,
  communityId,
  children,
}: SiteRuntime & { children: React.ReactNode }) {
  const value = useMemo(() => ({ bookingHref, communityId }), [bookingHref, communityId])
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
  const { bookingHref } = useSiteRuntime()
  const raw = (url || "").trim()
  if (!raw) return null
  if (raw === BOOKING_LINK) return bookingHref
  return raw
}

/** Link externo abre em aba nova; âncora e caminho interno, não. */
export function isExternalHref(href: string | null): boolean {
  return !!href && href.startsWith("http")
}
