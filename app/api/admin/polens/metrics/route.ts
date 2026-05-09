import { proxyPolens } from "@/app/api/polens/_proxy"

export async function GET(request: Request) {
  return proxyPolens(request, "/admin/polens/metrics")
}
