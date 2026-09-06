// Agendar pelo site da comunidade: freelandoo.com.br/c/<slug>/agendar (mig 221)
//
// Server component pelo mesmo motivo da home do site: ISR e <title>. O passo a
// passo em si é client (`booking-view`), porque é interação pura.
//
// ⚠️ A trava vem de graça e é de propósito: esta página lê o site pela MESMA
// porta pública (`fetchPublicSiteBySlug`), que devolve `locked` para comunidade
// fechada e 404 para site não publicado. Uma consulta própria aqui seria a porta
// dos fundos que mostra o catálogo que a home esconde.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchPublicSiteBySlug } from "@/lib/community-site"
import { SiteBookingView } from "./booking-view"

// ISR de 10 minutos. Literal, e não a constante compartilhada: o Next exige que
// os exports de configuração de segmento sejam estaticamente analisáveis.
export const revalidate = 600
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await fetchPublicSiteBySlug(slug)
  if (!site) return { title: "Site não encontrado" }
  const name = site.config?.siteName || site.community.display_name
  return {
    title: `Agendar · ${name}`,
    alternates: { canonical: `/c/${slug}/agendar` },
    // A página de agendamento não é conteúdo para buscador: ela é a ação. Quem
    // deve ranquear é a home do site, que fala do negócio.
    robots: { index: false, follow: true },
  }
}

export default async function CommunityBookingPage({ params }: Props) {
  const { slug } = await params
  const site = await fetchPublicSiteBySlug(slug)
  if (!site || !site.config) notFound()
  // Comunidade fechada: sem conteúdo, sem agenda. A home já explica o motivo, e
  // é para lá que a pessoa vai.
  if (site.locked) notFound()

  return (
    <SiteBookingView
      config={site.config}
      services={site.services || []}
      professionals={site.professionals || []}
      homeHref={`/c/${slug}`}
    />
  )
}
