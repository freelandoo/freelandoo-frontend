import { getBackendApiUrl } from "@/lib/backend"

export async function GET() {
  const response = await fetch(`${getBackendApiUrl()}/manifestations/products`, {
    cache: "no-store",
  })
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  return Response.json(data, { status: response.status })
}
