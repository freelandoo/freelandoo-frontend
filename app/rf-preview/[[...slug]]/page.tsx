// ROTA TEMPORÁRIA DE CONFERÊNCIA — apagar depois do QA.
//
// Ela existe só para renderizar o tema `ricardo-fogoes` sem precisar de uma
// comunidade no banco. Não é parte do produto.

import { notFound } from "next/navigation"

import { RicardoFogoesSite, resolveRicardoPage } from "@/components/site-templates/ricardo-fogoes"

export const dynamic = "force-dynamic"

/**
 * ⚠️ SÓ EXISTE EM DESENVOLVIMENTO.
 *
 * Em produção esta rota seria o site de um cliente servido num endereço da
 * Freelandoo, fora do domínio dele e sem passar pela oferta — indexável por
 * buscador e concorrendo com a página de verdade. O caminho do produto é
 * reservar a oferta e o líder aceitar.
 */
const SOMENTE_EM_DEV = process.env.NODE_ENV !== "production"

const links = {
  origin: "http://localhost:3100",
  communityId: "preview",
  home: "/rf-preview",
  pageBase: "/rf-preview",
  booking: null,
}

export default async function Preview({ params }: { params: Promise<{ slug?: string[] }> }) {
  if (!SOMENTE_EM_DEV) notFound()
  const { slug } = await params
  const first = slug?.[0]
  if (!first) return RicardoFogoesSite({ links, page: null })
  const page = resolveRicardoPage(first)
  if (!page) notFound()
  return RicardoFogoesSite({ links, page })
}
