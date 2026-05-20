import { redirect } from "next/navigation"
import { MACHINES } from "@/components/home/machines/tokens"

export default async function EnxameRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const valid = MACHINES.some((m) => m.id === id)

  if (!valid) {
    redirect("/search")
  }

  const qp = new URLSearchParams()
  qp.set("from", `enxame-${id}`)
  const q = typeof sp.q === "string" ? sp.q : null
  if (q) qp.set("q", q)

  redirect(`/search?${qp.toString()}`)
}
