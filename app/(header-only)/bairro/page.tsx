import { redirect } from "next/navigation"

// /bairro virou a aba "Meu bairro" de Minha cidade (2026-11-24). O endereço
// continua valendo — está em links salvos e no menu antigo — e leva direto à aba.
export default function Page() {
  redirect("/minha-cidade?lugar=bairro")
}
