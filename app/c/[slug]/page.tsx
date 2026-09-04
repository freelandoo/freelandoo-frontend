// Site público da comunidade: freelandoo.com.br/c/<slug>  (migs 212/213)
//
// Server component de propósito: é a superfície que buscador e link de rede
// social consomem, e ela precisa de <title>, descrição e imagem de preview no
// HTML — coisas que um componente client entrega tarde demais.
//
// ISR em vez de render por visita: site publicado muda pouco e é justamente o
// que robô varre sem parar. Sem cache, cada varredura seria uma renderização
// paga (a mesma preocupação de custo que tirou os polls do resto do produto).
//
// `generateStaticParams` vazio é OBRIGATÓRIO aqui, não decorativo: sem ele o
// Next trata a rota como 100% dinâmica e o ISR não vale de nada — foi assim
// que /blog/[slug] e /cursos/[slug] foram configurados.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Lock } from "lucide-react"
import { fetchPublicSiteBySlug } from "@/lib/community-site"
import { PublicSiteView } from "./public-site-view"

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

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await fetchPublicSiteBySlug(slug)
  if (!site) return { title: "Site não encontrado" }

  const name = site.config?.siteName || site.community.display_name
  const description = site.config?.tagline || site.community.bio || undefined
  // Imagem de preview: a primeira foto do hero é a capa que o líder escolheu.
  // Sem ela, o avatar da comunidade — melhor um símbolo do que um card cego.
  const heroImage = site.config?.sections
    .find((s) => s.kind === "hero")
    ?.data?.slides?.find((slide) => slide.imageUrl)?.imageUrl
  const image = heroImage || site.community.avatar_url || undefined

  return {
    title: name,
    description,
    alternates: { canonical: `/c/${slug}` },
    openGraph: {
      title: name,
      description,
      type: "website",
      url: `/c/${slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      description,
      images: image ? [image] : undefined,
    },
    // Site trancado não deve ser indexado: o robô só encontraria a porta
    // fechada, e o resultado de busca prometeria um conteúdo que ninguém abre.
    robots: site.locked ? { index: false, follow: false } : undefined,
  }
}

export default async function CommunitySitePage({ params }: Props) {
  const { slug } = await params
  const site = await fetchPublicSiteBySlug(slug)
  if (!site) notFound()

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
            Este site é de uma comunidade fechada. Entre na comunidade para ver o
            conteúdo.
          </p>
          <Link
            href={`/comunidades/${site.id_profile}`}
            className="mt-6 inline-block border-2 border-[#0B0B0D] bg-[#F2B705] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]"
          >
            Ver a comunidade
          </Link>
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
      />

      {/* Rodapé de origem: quem chega por um link solto (ou por domínio
          próprio) não tem como saber onde está nem como entrar na comunidade.
          É também o único caminho de volta para dentro do produto. */}
      <footer className="border-t-2 border-[#0B0B0D] bg-[#0B0B0D] px-5 py-6 text-center md:px-10">
        <Link
          href={`/comunidades/${site.id_profile}`}
          className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A] hover:text-[#F2B705]"
        >
          {site.community.display_name} · feito com Freelandoo
        </Link>
      </footer>
    </main>
  )
}
