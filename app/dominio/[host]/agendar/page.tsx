// Agendar pelo DOMÍNIO PRÓPRIO do site (migs 214/221).
//
// Ninguém digita esta URL: o `proxy.ts` reescreve `padariadoze.com.br/agendar`
// para cá. É a mesma página de `/c/<slug>/agendar`, com uma diferença que a
// origem impõe:
//
// ⚠️ No domínio do cliente o `/login` da Freelandoo NÃO é alcançável (tudo que
// não é página do site cai na home dele) e a sessão do navegador é POR ORIGEM —
// quem entrou em freelandoo.com.br não está logado aqui. Por isso a view recebe
// `platformBookingUrl`: quem não tem sessão termina do lado da plataforma, com
// a escolha já feita, em vez de esbarrar num erro sem saída.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchPublicSiteBySlug, resolveHostToSlug } from "@/lib/community-site"
import { SiteBookingView } from "@/app/c/[slug]/agendar/booking-view"

// ISR de 10 minutos. Literal por exigência do Next (ver a home do domínio).
export const revalidate = 600
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ host: string }> }

async function load(hostParam: string) {
  const host = decodeURIComponent(hostParam)
  const slug = await resolveHostToSlug(host)
  if (!slug) return null
  const site = await fetchPublicSiteBySlug(slug)
  return site ? { site, slug } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host } = await params
  const found = await load(host)
  if (!found) return { title: "Site não encontrado" }
  const name = found.site.config?.siteName || found.site.community.display_name
  return {
    title: `Agendar · ${name}`,
    robots: { index: false, follow: true },
  }
}

export default async function DomainBookingPage({ params }: Props) {
  const { host } = await params
  const found = await load(host)
  if (!found || !found.site.config) notFound()
  if (found.site.locked) notFound()

  return (
    <SiteBookingView
      config={found.site.config}
      services={found.site.services || []}
      professionals={found.site.professionals || []}
      // No domínio do cliente a home do site é a raiz.
      homeHref="/"
      platformBookingUrl={`https://freelandoo.com.br/c/${found.slug}/agendar`}
    />
  )
}
