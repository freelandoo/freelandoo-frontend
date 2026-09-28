import { forwardToBackend } from "@/lib/api-proxy"

// Régua do selo verificado (mig 268) — só administrador (o backend confere).
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/admin/verification")
}

export async function PUT(request: Request) {
  return forwardToBackend(request, "PUT", "/admin/verification")
}
