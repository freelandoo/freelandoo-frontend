import type { Metadata } from "next"
import { CarreirasContent } from "./content"

export const metadata: Metadata = {
  title: "Carreiras — Freelandoo",
  description:
    "A Freelandoo está em crescimento. Conheça nossa visão e fale conosco se você acredita que pode contribuir.",
}

export default function CarreirasPage() {
  return <CarreirasContent />
}
