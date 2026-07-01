import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Público: mapa { flag_key: is_enabled } consumido pelo FeatureFlagsProvider.
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/feature-flags`, { cache: "no-store" })
    const text = await res.text()
    return new Response(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    // Fail-open: sem backend, devolve mapa vazio (o hook trata tudo como ligado).
    return Response.json({ flags: {} })
  }
}
