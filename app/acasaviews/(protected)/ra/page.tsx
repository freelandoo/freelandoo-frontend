import type { Metadata } from "next"
import "./ra.css"
import { RaPage } from "@/features/acasaviews/ra/ra-page"

export const metadata: Metadata = {
  title: "RA | A Casa Views",
  description: "Aponte a câmera, veja o holograma e colecione os personagens da Casa Views.",
}

export default function Page() {
  return <RaPage />
}
