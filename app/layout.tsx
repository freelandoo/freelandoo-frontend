import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CookieConsent } from "@/components/cookie-consent"
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
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
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
        <Analytics />
      </body>
    </html>
  )
}
