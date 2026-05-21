import { proxyManifestations } from "../_proxy"

export async function POST(request: Request) {
  return proxyManifestations(request, "/manifestations/apply", "POST")
}
