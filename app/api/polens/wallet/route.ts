import { proxyPolens } from "../_proxy"

export async function GET(request: Request) {
  return proxyPolens(request, "/polens/wallet")
}
