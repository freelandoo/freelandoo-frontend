import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchParticipantsForGrid } from "@/lib/acasaviews/participants-live"
import { MotionGate, RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import {
  ConvenienceVitrine,
  type StoreProduct,
  type SupportTarget,
} from "@/features/acasaviews/components/reality/convenience-vitrine"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Conveniência Views | A Casa Views",
  description:
    "A loja oficial da Casa Views. Compre e escolha qual participante você apoia — cada venda fica registrada no nome dele.",
}

/**
 * Vitrine pública da Conveniência Views.
 *
 * A loja é ÚNICA (o mesmo catálogo aparece em cada dossiê) e o backend exige
 * a ATRIBUIÇÃO: toda compra registra qual participante recebeu a venda. Na
 * página do participante ela vem do endereço; aqui quem compra escolhe — é por
 * isso que a lista de participantes vem junto. Pública de propósito: ver a
 * prateleira não exige conta; comprar exige (o checkout leva ao login).
 */
async function fetchStore(): Promise<StoreProduct[] | null> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/casa/store/products`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data?.products) ? (data.products as StoreProduct[]) : []
  } catch {
    return null
  }
}

export default async function ConvenienciaPage() {
  const [products, participants] = await Promise.all([fetchStore(), fetchParticipantsForGrid()])

  // Quem pode receber apoio: participantes publicados, quem está na casa primeiro.
  const order: Record<string, number> = { winner: 0, finalist: 1, active: 2, eliminated: 3 }
  const targets: SupportTarget[] = participants
    .map((p) => ({
      slug: p.slug,
      name: p.display_name,
      avatar: p.avatar_url,
      status: p.status,
    }))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  return (
    <div className="rv rv-page-in" suppressHydrationWarning>
      <MotionGate />
      <RealityMotion />
      <ConvenienceVitrine products={products} targets={targets} />
    </div>
  )
}
