import type { Metadata } from "next"
import { CentralDeAjudaContent } from "./content"

export const metadata: Metadata = {
  title: "Central de Ajuda — Freelandoo",
  description:
    "Encontre respostas sobre conta, ativação, perfis, máquinas, serviços, agenda, cupons e segurança na Freelandoo.",
}

export default function CentralDeAjudaPage() {
  return <CentralDeAjudaContent />
}
