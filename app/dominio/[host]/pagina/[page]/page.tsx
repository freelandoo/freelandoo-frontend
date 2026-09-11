// Sub-página servida por DOMÍNIO PRÓPRIO: <dominio-do-cliente>/pagina/<endereço>
// (migs 214 + 238).
//
// Reusa a MESMA peça de leitura da rota de plataforma — o domínio é só outra
// porta para o mesmo site, e um segundo renderizador divergiria do primeiro na
// primeira mudança de layout.

import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { fetchPublicSiteBySlug, resolveHostToSlug } from "@/lib/community-site"
import { SitePageView } from "@/app/c/[slug]/pagina/[page]/site-page-view"

export const revalidate = 600
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ host: string; page: string }> }

async function load(hostParam: string, pageParam: string) {
  const host = decodeURIComponent(hostParam)
  const slug = await resolveHostToSlug(host)
  if (!slug) return null
  const site = await fetchPublicSiteBySlug(slug)
  if (!site || site.locked || !site.config) return null
  const page = site.config.pages?.find((p) => p.slug === pageParam && p.enabled)
  return page ? { site, page } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, page: pageSlug } = await params
  const found = await load(host, pageSlug)
  if (!found) return {}

  const { site, page } = found
  const siteName = site.config?.siteName || site.community.display_name
  const title = page.title ? `${page.title} · ${siteName}` : siteName

  return {
    title,
    description: page.subtitle || site.config?.tagline || undefined,
    alternates: { canonical: `/pagina/${page.slug}` },
    openGraph: { title, description: page.subtitle || undefined, type: "article" },
  }
}

export default async function CustomDomainSubPage({ params }: Props) {
  const { host, page: pageSlug } = await params
  const found = await load(host, pageSlug)

  // ⚠️ AQUI NÃO SE DÁ 404, e a diferença em relação à rota de plataforma é
  // deliberada: estamos no domínio DO CLIENTE, onde um "página não encontrada"
  // da Freelandoo aparece como se o site dele estivesse quebrado. É a mesma
  // razão pela qual o proxy já manda caminho desconhecido para a home.
  if (!found) redirect("/")

  const { site, page } = found

  return (
    <main className="fl-sharp min-h-[100dvh]">
      <SitePageView
        config={site.config!}
        page={page}
        services={site.services || []}
        providerHref={
          site.provider_profile_id ? `/freelancer/${site.provider_profile_id}` : null
        }
        bookingHref="/agendar"
        pageBase="/pagina"
        homeHref="/"
        communityId={site.id_profile}
      />

      <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
        {/* Link ABSOLUTO: o navegador está num domínio que não é o nosso. */}
        <a
          href={`https://freelandoo.com.br/comunidades/${site.id_profile}`}
          className="text-[10px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase hover:text-[#F2B705]"
        >
          {site.community.display_name} · feito com Freelandoo
        </a>
      </footer>
    </main>
  )
}
