import type { Metadata } from "next"
import { AnunciarServicosContent } from "./content"

export const metadata: Metadata = {
  title: "Anunciar Serviços — Freelandoo",
  description:
    "Crie seu perfil profissional na Freelandoo, apareça nas máquinas e receba contatos diretos de clientes interessados no seu trabalho.",
}

export default function AnunciarServicosPage() {
  return <AnunciarServicosContent />
}
