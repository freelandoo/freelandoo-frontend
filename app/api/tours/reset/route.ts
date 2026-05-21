import { proxyTours } from "../_proxy";

export async function POST(request: Request) {
  return proxyTours(request, "/tours/reset");
}
