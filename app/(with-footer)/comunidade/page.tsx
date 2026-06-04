import type { Metadata } from "next"
import { ComunidadeContent } from "./content"

export const metadata: Metadata = {
  title: "Comunidade — Freelandoo",
  description:
    "A comunidade Freelandoo aproxima profissionais, criadores, prestadores, empresas e pessoas que procuram soluções reais.",
}

export default function ComunidadePage() {
  return (
    <>
      <ComunidadeContent />
    </>
  )
}
