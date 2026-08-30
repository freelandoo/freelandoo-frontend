import { forwardToBackend } from "@/lib/api-proxy"

export async function POST(request: Request) {
  return forwardToBackend(request, "POST", "/pets")
}
