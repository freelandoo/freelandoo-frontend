import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { CookieConsent } from "@/components/cookie-consent"
import { AnalyticsProvider } from "@/components/analytics-provider"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Freelandoo — Freelancers e influenciadores para o seu projeto",
  description:
    "Encontre o melhor profissional freelancer para o seu projeto. Plataforma para contratar talentos, influenciadores e serviços.",
  keywords: "freelancer, influenciadores, marcas, contratar, projeto, Freelandoo",
  authors: [{ name: "Freelandoo" }],
  creator: "Freelandoo",
  generator: "v0.app",
  openGraph: {
    title: "Freelandoo — Encontre freelancers e influenciadores",
    description: "Encontre o melhor profissional freelancer para o seu projeto.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: "Freelandoo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelandoo — Encontre freelancers e influenciadores",
    description: "Encontre o melhor profissional freelancer para o seu projeto.",
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
  return (
    <html lang="pt-BR" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <CookieConsent />
        <AnalyticsProvider />
      </body>
    </html>
  )
}
