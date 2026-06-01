import { notFound } from "next/navigation"
import { casaFontVars } from "@/lib/acasaviews/fonts"
import { fetchParticipantBySlug } from "@/lib/acasaviews/participants-live"
import { ParticipantDossie } from "@/features/acasaviews/components/acasaviews/participants/participant-dossie"

export const dynamic = "force-dynamic"

export default async function ParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ compra?: string }>
}) {
  const { slug } = await params
  const { compra } = await searchParams
  const p = await fetchParticipantBySlug(slug)
  if (!p) notFound()

  return (
    <div className={casaFontVars}>
      <ParticipantDossie initial={p} slug={slug} compra={compra} />
    </div>
  )
}
