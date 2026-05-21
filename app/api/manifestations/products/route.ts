import { proxyManifestations } from "../_proxy"

export async function GET(request: Request) {
  return proxyManifestations(request, "/manifestations/products", "GET", { authRequired: false })
}
