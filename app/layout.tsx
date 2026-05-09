import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { CookieConsent } from "@/components/cookie-consent"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { ProfileSidebar } from "@/components/layout"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freelandoo.com.br"),
  applicationName: "Freelandoo",
  title: {
    default: "Freelandoo — Plataforma para freelancers e clientes",
    template: "%s | Freelandoo",
  },
  description:
    "Freelandoo é a plataforma que conecta freelancers, influenciadores e prestadores de serviço com seus clientes. Ative uma máquina, encontre profissionais e fale direto pelo WhatsApp.",
  keywords:
    "Freelandoo, freelancer, freelancers, influenciadores, prestadores de serviço, contratar, plataforma de freelancers, profissionais autônomos",
  authors: [{ name: "Freelandoo" }],
  creator: "Freelandoo",
  publisher: "Freelandoo",
  generator: "v0.app",
  alternates: {
    canonical: "https://www.freelandoo.com.br",
  },
  openGraph: {
    type: "website",
    siteName: "Freelandoo",
    title: "Freelandoo — Plataforma para freelancers e clientes",
    description:
      "Conecta freelancers, influenciadores e prestadores de serviço com clientes. Ative uma máquina e encontre quem resolve.",
    url: "https://www.freelandoo.com.br",
    locale: "pt_BR",
    images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: "Freelandoo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelandoo — Plataforma para freelancers e clientes",
    description:
      "Conecta freelancers, influenciadores e prestadores de serviço com clientes.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Freelandoo",
    legalName: "Freelandoo",
    alternateName: "Freelandoo Plataforma",
    url: "https://www.freelandoo.com.br",
    logo: "https://www.freelandoo.com.br/freelandoo-logo.png",
    description:
      "Plataforma que conecta freelancers, influenciadores e prestadores de serviço com seus clientes.",
    sameAs: [],
  }

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Freelandoo",
    alternateName: "Freelandoo",
    url: "https://www.freelandoo.com.br",
    publisher: { "@type": "Organization", name: "Freelandoo" },
    inLanguage: "pt-BR",
  }

  const orgLd = JSON.stringify(orgJsonLd)
  const websiteLd = JSON.stringify(websiteJsonLd)

  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {/* JSON-LD no body evita conflito de ordem/atributos com scripts gerenciados pelo Next no <head>. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteLd }} />
        {children}
        <ProfileSidebar />
        <CookieConsent />
        <AnalyticsProvider />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5728915466446266"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  )
}
