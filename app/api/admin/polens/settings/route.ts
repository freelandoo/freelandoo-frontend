import { proxyPolens } from "@/app/api/polens/_proxy"

export async function GET(request: Request) {
  return proxyPolens(request, "/admin/polens/settings")
}

export async function PUT(request: Request) {
  return proxyPolens(request, "/admin/polens/settings", "PUT")
}
