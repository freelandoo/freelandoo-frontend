import { backendUrl, proxyJson } from "../_proxy"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const response = await fetch(
    backendUrl(`/entity-follows/counts?${url.searchParams.toString()}`),
    {
      method: "GET",
      cache: "no-store",
    }
  )
  return proxyJson(response)
}
