import { redirect } from "next/navigation"

interface ExplorarRedirectProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ExplorarRedirect({ searchParams }: ExplorarRedirectProps) {
  const params = await searchParams
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v))
    else sp.set(key, value)
  }
  const qs = sp.toString()
  redirect(qs ? `/feed?${qs}` : "/feed")
}
