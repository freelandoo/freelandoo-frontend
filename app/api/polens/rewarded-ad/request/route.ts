import { proxyPolens } from "../../_proxy"

export async function POST(request: Request) {
  return proxyPolens(request, "/polens/rewarded-ad/request", "POST")
}
