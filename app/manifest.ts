import type { MetadataRoute } from "next"

// Web App Manifest — torna a Freelandoo instalável ("Adicionar à tela inicial").
// O Next serve isto em /manifest.webmanifest automaticamente.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Freelandoo",
    short_name: "Freelandoo",
    description:
      "A rede de oportunidades: conecte-se com freelancers, influenciadores e prestadores de serviço.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFC600",
    theme_color: "#FFC600",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "social", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
