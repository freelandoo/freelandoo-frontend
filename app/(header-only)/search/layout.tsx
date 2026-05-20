import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Busca de Profissionais | Freelandoo",
  description: "Encontre freelancers e influenciadores ideais para o seu projeto filtrando por enxame, profissão, estado e cidade.",
  alternates: {
    canonical: "https://www.freelandoo.com.br/search",
  },
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.freelandoo.com.br"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Busca",
        item: "https://www.freelandoo.com.br/search"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      {children}
    </>
  )
}
