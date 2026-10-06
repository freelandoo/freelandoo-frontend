import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { VaquinhaView } from "./_components/vaquinha-view"

export const dynamic = "force-dynamic"

type VaquinhaMeta = { title?: string | null; bio?: string | null; cover_url?: string | null; kind?: string | null }

async function fetchVaquinha(slug: string): Promise<VaquinhaMeta | null> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/vaquinhas/${encodeURIComponent(slug)}`, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    return (data?.vaquinha as VaquinhaMeta) || null
  } catch {
    return null
  }
}

/**
 * A PRÉVIA DO LINK COMPARTILHADO (pedido do Alex, 2026-10-05): quem manda a
 * vaquinha pelo WhatsApp/redes vê a CAPA que o dono escolheu no banner como
 * miniatura — é ela o `og:image`. Sem capa, fica a imagem padrão do site.
 * O texto da prévia é pt: é o que o robô do WhatsApp lê, sem locale.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const v = await fetchVaquinha(slug)
  if (!v) return { title: "Vaquinha | Freelandoo" }
  const title = `${v.title || "Vaquinha"} | Freelandoo`
  const description =
    (v.bio || "").trim().slice(0, 200) ||
    (v.kind === "bolsa" ? "Apoie esta bolsa patrocínio na Freelandoo." : "Ajude esta vaquinha na Freelandoo.")
  const images = v.cover_url ? [{ url: v.cover_url }] : undefined
  return {
    title,
    description,
    openGraph: { type: "website", title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: v.cover_url ? [v.cover_url] : undefined },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <VaquinhaView slug={slug} />
}
