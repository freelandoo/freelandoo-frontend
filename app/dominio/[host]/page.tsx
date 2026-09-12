// Site servido por DOMÍNIO PRÓPRIO (mig 214).
//
// Ninguém digita esta URL: o `proxy.ts` reescreve para cá todo Host que
// não é da plataforma, carregando o domínio no caminho. É aqui que a pergunta
// "de quem é este domínio?" é respondida — e não no proxy, de propósito:
// neste ponto a resposta entra no cache do ISR e passa a valer por 10 minutos
// para TODAS as visitas daquele domínio, em vez de custar uma consulta por
// requisição.
//
// A página é a mesma de /c/<slug>. O domínio é só outra porta para o mesmo
// site — e por isso ela reusa `PublicSiteView`, sem um segundo renderizador.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Lock } from "lucide-react"
import {
  domainTemplateLinks,
  fetchPublicSiteBySlug,
  resolveHostToSlug,
} from "@/lib/community-site"
import { templateFor } from "@/components/site-templates/registry"
import { PublicSiteView } from "@/app/c/[slug]/public-site-view"

// ISR de 10 minutos.
//
// O valor é um LITERAL e não a constante compartilhada de propósito: o Next
// exige que os exports de configuração de segmento sejam estaticamente
// analisáveis, e `export const revalidate = UMA_CONSTANTE_IMPORTADA` faz o
// build falhar com "Invalid segment configuration export". A constante segue
// valendo para o cache dos `fetch` em lib/community-site.ts, onde qualquer
// expressão é aceita — os dois têm que ser mudados juntos.
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

  const { site } = found

  // Site gerenciado descreve a si mesmo — e aqui o canônico e o JSON-LD saem
  // com a origem DO CLIENTE, que é o endereço que ele quer no buscador.
  const tpl = site.locked ? null : templateFor(site.template?.slug)
  if (tpl && site.template) {
    return tpl.metadata({
      data: site.template.data,
      links: domainTemplateLinks(site, decodeURIComponent(host)),
      page: null,
    })
  }

  const name = site.config?.siteName || site.community.display_name
  const description = site.config?.tagline || site.community.bio || undefined
  const heroImage = site.config?.sections
    .find((s) => s.kind === "hero")
    ?.data?.slides?.find((slide) => slide.imageUrl)?.imageUrl
  const image = heroImage || site.community.avatar_url || undefined

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      description,
      images: image ? [image] : undefined,
    },
    robots: site.locked ? { index: false, follow: false } : undefined,
  }
}

export default async function CommunityDomainPage({ params }: Props) {
  const { host } = await params
  const found = await load(host)
  // Domínio apontado para nós mas não reconhecido (ou site despublicado) é 404.
  // Cair no site de outra comunidade seria bem pior do que não abrir.
  if (!found) notFound()

  const { site } = found

  // ⚠️ ANTES do `!site.config`: num site gerenciado o canvas de seções está
  // vazio, e a checagem de baixo o trataria como trancado — o cliente veria a
  // caixa de cadeado no próprio domínio.
  const tpl = site.locked ? null : templateFor(site.template?.slug)

  // Tema desconhecido por este deploy: 404 em vez do ramo de baixo, que diria
  // "comunidade fechada" — explicação errada no domínio do cliente.
  if (!tpl && site.template) notFound()

  if (tpl && site.template) {
    return (
      <main className="fl-sharp min-h-[100dvh]">
        <tpl.Site
          data={site.template.data}
          links={domainTemplateLinks(site, decodeURIComponent(host))}
          page={null}
        />

        <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
          {/* Link ABSOLUTO: estamos num domínio que não é o nosso, e um href
              relativo apontaria para uma rota inexistente do cliente. */}
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

  if (site.locked || !site.config) {
    return (
      <main className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0B0B0D] px-6">
        <div
          className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-8 text-center"
          style={{ boxShadow: "6px 6px 0 0 #F2B705" }}
        >
          <Lock className="mx-auto h-10 w-10 text-[#F2B705]" />
          <h1 className="fl-display mt-4 text-2xl leading-none text-[#F5F1E8]">
            {site.community.display_name}
          </h1>
          <p className="mt-3 text-sm text-[#F5F1E8]/70">
            Este site é de uma comunidade fechada.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="fl-sharp min-h-[100dvh]">
      <PublicSiteView
        config={site.config}
        services={site.services || []}
        // O botão do card leva ao perfil do prestador, que é onde moram agenda,
        // sinal e pagamento — este site não tem como concluir uma contratação.
        providerHref={
          site.provider_profile_id ? `/freelancer/${site.provider_profile_id}` : null
        }
        // Caminho relativo: aqui o navegador está no domínio do cliente, e é
        // ele que o proxy traduz de volta para /dominio/<host>/agendar.
        bookingHref="/agendar"
        // No domínio próprio o site é a raiz, e a sub-página responde em
        // `/pagina/<endereço>` — o mesmo prefixo dos outros dois endereços,
        // para o líder não ter que aprender duas formas de URL.
        pageBase="/pagina"
        homeHref="/"
        communityId={site.id_profile}
      />
      <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
        {/* Link ABSOLUTO: estamos num domínio que não é o nosso, então um href
            relativo apontaria para uma rota inexistente do domínio do cliente. */}
        <a
          href={`https://freelandoo.com.br/comunidades/${site.id_profile}`}
          className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A] hover:text-[#F2B705]"
        >
          {site.community.display_name} · feito com Freelandoo
        </a>
      </footer>
    </main>
  )
}
