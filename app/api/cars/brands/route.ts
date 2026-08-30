import { forwardToBackend } from "@/lib/api-proxy"

export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/cars/brands")
}
