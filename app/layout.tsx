import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Geist, Geist_Mono, Anton, Archivo, Caveat } from "next/font/google"
import { CookieConsent } from "@/components/cookie-consent"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { ProfileSidebar } from "@/components/layout"
import { BirthdateGate } from "@/components/onboarding/birthdate-gate"
import { CouponCapture } from "@/components/share/coupon-capture"
import { OnlineHeartbeat } from "@/components/online-heartbeat"
import { AdminAlerts } from "@/components/admin/admin-alerts"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { PullToRefresh } from "@/components/pwa/pull-to-refresh"
import { I18nProvider } from "@/components/i18n/I18nProvider"
import { TourProvider } from "@/features/tour/TourProvider"
import { ConsentProvider } from "@/components/consent/ConsentProvider"
import "./globals.css"

// TOUR DESLIGADO (2026-06-14): o TourProvider segue montado mas INERTE
// (TOURS_DISABLED em features/tour/TourProvider.tsx) e o modal de entrada de
// tour (IntentModal) foi REMOVIDO daqui. Será reconstruído do zero. Arquivos
// em features/intent/* ficam órfãos.

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
// Display condensado para as headlines em caixa-alta da landing (poster look).
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" })
// Corpo/UI editorial e manuscrito (rabiscos/notas) da landing tabloide.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" })
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-caveat", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freelandoo.com.br"),
  applicationName: "Freelandoo",
  appleWebApp: {
    capable: true,
    title: "Freelandoo",
    statusBarStyle: "default",
  },
  title: {
    default: "Freelandoo — Plataforma para freelancers e clientes",
    template: "%s | Freelandoo",
  },
  description:
    "Freelandoo é a plataforma que conecta freelancers, influenciadores e prestadores de serviço com seus clientes. Ative um enxame, encontre profissionais e fale direto pelo WhatsApp.",
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
      "Conecta freelancers, influenciadores e prestadores de serviço com clientes. Ative um enxame e encontre quem resolve.",
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

export const viewport: Viewport = {
  themeColor: "#FFC600",
}

// IMPORTANTE (F3.S5): este layout NÃO pode ler cookies()/headers() — isso
// forçaria TODAS as rotas a renderização dinâmica e mataria static/ISR no
// site inteiro. Locale/país são resolvidos no cliente pelo I18nProvider.
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${anton.variable} ${archivo.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {/* JSON-LD no body evita conflito de ordem/atributos com scripts gerenciados pelo Next no <head>. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteLd }} />
        <I18nProvider>
          <TourProvider>
            {/* ConsentProvider precisa envolver TODA a árvore (children + os
                componentes globais abaixo): a ProfileSidebar/UserDropside monta
                o OpenChamadoModal, que chama useConsentContext(). Com o provider
                envolvendo só {children}, a sidebar (irmã) ficava fora do contexto
                e estourava "useConsentContext fora do ConsentProvider" ao logar. */}
            <ConsentProvider>
              {children}
              <ProfileSidebar />
              <BirthdateGate />
              <CookieConsent />
              <AnalyticsProvider />
              <CouponCapture />
              <OnlineHeartbeat />
              <AdminAlerts />
              <InstallPrompt />
              <PullToRefresh />
            </ConsentProvider>
          </TourProvider>
        </I18nProvider>
        {/* Google Consent Mode v2 — estado padrão "denied" antes de qualquer
            tag do Google carregar (LGPD). O banner de cookies atualiza para
            "granted" quando o usuário aceita. */}
        <Script id="google-consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`}
        </Script>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5728915466446266"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  )
}
