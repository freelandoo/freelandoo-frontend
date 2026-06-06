import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout, readBodyWithTimeout, isFetchTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

export async function GET() {
  try {
    const res = await fetchWithTimeout(
      `${BACKEND}/site-assets`,
      { method: "GET", cache: "no-store" },
      2500,
    )
    const text = await readBodyWithTimeout(res, 1500)
    return Response.json(text ? JSON.parse(text) : { assets: {} }, { status: res.status })
  } catch (e) {
    if (isFetchTimeout(e)) return Response.json({ assets: {}, timeout: true }, { status: 200 })
    return Response.json({ assets: {} }, { status: 200 })
  }
}
