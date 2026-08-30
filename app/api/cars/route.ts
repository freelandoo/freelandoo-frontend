import { forwardToBackend } from "@/lib/api-proxy"

// Achar-ou-criar: metade das vezes esta chamada ENTRA na comunidade que já
// existe daquele modelo, em vez de criar uma nova.
export async function POST(request: Request) {
  return forwardToBackend(request, "POST", "/cars")
}
