import Link from "next/link"
import { getBackendApiUrl } from "@/lib/backend"
import { Section } from "@/components/home/landing"

type Enxame = {
  id_machine?: number
  slug: string
  name?: string
  desc_machine?: string
}

async function fetchEnxames(): Promise<Enxame[]> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/enxames`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const body = await res.json()
    const list = Array.isArray(body)
      ? body
      : Array.isArray(body?.enxames)
        ? body.enxames
        : []
    return list.filter((m: Enxame) => m && typeof m.slug === "string")
  } catch {
    return []
  }
}

export async function BuyerCategories() {
  const enxames = (await fetchEnxames()).slice(0, 15)
  if (enxames.length === 0) return null
  return (
    <Section>
      <h2 className="fl-display text-center text-4xl text-[#0B0B0D] sm:text-5xl">
        Explore por área
      </h2>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {enxames.map((e) => (
          <Link
            key={e.slug}
            href={`/enxame/${e.slug}`}
            className="rounded-full border-2 border-[#0B0B0D] bg-white px-4 py-2 text-sm font-bold text-[#0B0B0D] transition hover:bg-[#F2B705] hover:shadow-[3px_3px_0_0_#0B0B0D]"
          >
            {e.name || e.desc_machine || e.slug}
          </Link>
        ))}
      </div>
    </Section>
  )
}
