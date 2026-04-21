import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const u = searchParams.get("u") || ""

  try {
    const url = `${getBackendApiUrl()}/auth/check-username?u=${encodeURIComponent(u)}`
    const response = await fetch(url)
    const data = await response.json()
    return Response.json(data, { status: response.status })
  } catch {
    return Response.json({ available: false, reason: "server_error" }, { status: 500 })
  }
}
