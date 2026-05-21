import { proxyTours } from "../_proxy";

export async function GET(request: Request) {
  return proxyTours(request, "/tours/progress");
}
