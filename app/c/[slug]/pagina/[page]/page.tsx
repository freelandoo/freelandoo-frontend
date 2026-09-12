// Sub-página do site publicado: freelandoo.com.br/c/<slug>/pagina/<endereço>
// (mig 238). Serve também o SUBDOMÍNIO, que o proxy reescreve para cá.
//
// Mesmas escolhas da home ao lado, pelas mesmas razões: server component (é o
// que o buscador lê), ISR de 10 minutos com `generateStaticParams` vazio
// OBRIGATÓRIO — sem ele o Next trata a rota como dinâmica e o ISR não vale
// nada — e o valor do `revalidate` como LITERAL, que é o que o build aceita.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchPublicSiteBySlug, platformTemplateLinks } from "@/lib/community-site"
import { templateFor } from "@/components/site-templates/registry"
import { SitePageView } from "./site-page-view"

export const revalidate = 600
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string; page: string }> }

/**
 * O site e a página pedida.
 *
 * Página desligada conta como inexistente de propósito: `enabled: false` é o
 * líder dizendo "isto não está no ar", e servi-la por URL direta desfaria a
 * escolha dele sem que ele soubesse.
 */
async function load(slugParam: string, pageParam: string) {
  const site = await fetchPublicSiteBySlug(slugParam)
  if (!site || site.locked) return null

  // ⚠️ O TEMA É CONSULTADO ANTES DO CANVAS. Num site gerenciado `config` está
  // vazio, então perguntar primeiro ao canvas devolveria "não existe" para toda
  // sub-página — as dez páginas do cliente dariam 404 sem um único erro.
  const tpl = templateFor(site.template?.slug)
  if (tpl && site.template) {
    const page = tpl.resolvePage(site.template.data, pageParam)
    return page ? ({ kind: "template", site, tpl, data: site.template.data, page } as const) : null
  }
  // Tema que este deploy não conhece: nada a desenhar, e o canvas abaixo está
  // vazio — cai no `null`, que a rota trata como página inexistente.
  if (site.template) return null

  if (!site.config) return null
  const page = site.config.pages?.find((p) => p.slug === pageParam && p.enabled)
  return page ? ({ kind: "canvas", site, page } as const) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page: pageSlug } = await params
  const found = await load(slug, pageSlug)
  if (!found) return { title: "Página não encontrada" }

  if (found.kind === "template") {
    return found.tpl.metadata({
      data: found.data,
      links: platformTemplateLinks(found.site, slug),
      page: found.page,
    })
  }

  const { site, page } = found
  const siteName = site.config?.siteName || site.community.display_name
  // O título da aba nomeia a PÁGINA e depois o site: é assim que o resultado
  // de busca distingue "Conserto em Aguaí" de "Conserto em Mogi Guaçu" quando
  // as duas páginas são do mesmo negócio.
  const title = page.title ? `${page.title} · ${siteName}` : siteName
  const url = `/c/${slug}/pagina/${page.slug}`

  return {
    title,
    description: page.subtitle || site.config?.tagline || undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: page.subtitle || undefined,
      type: "article",
      url,
    },
  }
}

export default async function CommunitySiteSubPage({ params }: Props) {
  const { slug, page: pageSlug } = await params
  const found = await load(slug, pageSlug)
  if (!found) notFound()

  if (found.kind === "template") {
    const Site = found.tpl.Site
    return (
      <main className="fl-sharp min-h-[100dvh]">
        <Site
          data={found.data}
          links={platformTemplateLinks(found.site, slug)}
          page={found.page}
        />

        <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
          <Link
            href={`/comunidades/${found.site.id_profile}`}
            className="text-[10px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase hover:text-[#F2B705]"
          >
            {found.site.community.display_name} · feito com Freelandoo
          </Link>
        </footer>
      </main>
    )
  }

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
        bookingHref={`/c/${slug}/agendar`}
        pageBase={`/c/${slug}/pagina`}
        homeHref={`/c/${slug}`}
        communityId={site.id_profile}
      />

      <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
        <Link
          href={`/comunidades/${site.id_profile}`}
          className="text-[10px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase hover:text-[#F2B705]"
        >
          {site.community.display_name} · feito com Freelandoo
        </Link>
      </footer>
    </main>
  )
}
