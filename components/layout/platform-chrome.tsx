"use client"

// components/layout/platform-chrome.tsx
//
// O CHROME DA PLATAFORMA — tudo que o layout raiz monta por cima de qualquer
// página: a dock do perfil, os modais de conta, o banner de cookies, os prompts
// de PWA e o script de anúncios.
//
// Existe porque o site público de uma comunidade (`/c/<slug>`, o subdomínio e o
// domínio próprio) é servido pela MESMA aplicação Next, e portanto herda o
// layout raiz. Sem esta peça, o site do cliente nascia com a dock da Freelandoo
// flutuando por cima, o gate de CPF podendo cobrir a tela e um convite para
// instalar o app da Freelandoo — tudo isso no endereço dele.
//
// ═══ POR QUE NÃO DÁ PARA DECIDIR ISSO PELO PATHNAME ═══
//
// A tentação é `usePathname().startsWith("/c/")`. Isso cobre só a MENOS
// importante das três portas. O subdomínio e o domínio próprio chegam por
// REESCRITA no `proxy.ts`, e reescrita não muda a URL do navegador: em
// `enzo.freelandoo.com.br/` o pathname do cliente é `/`, igual ao da home. Um
// gate por pathname deixaria a dock aparecendo exatamente nos dois endereços
// que existem para o site parecer independente.
//
// Por isso quem decide é a PÁGINA, não o endereço: a subárvore do site monta
// `<SuppressPlatformChrome />` (ver `app/c/layout.tsx` e `app/dominio/layout.tsx`)
// e avisa daqui de dentro. Funciona igual nas três portas porque é a mesma
// página nas três.
//
// ═══ POR QUE SÃO DUAS METADES (o `<style>` E o desmonte) ═══
//
// O desmonte é quem apaga de verdade — e só ele serve, porque CSS esconde sem
// desligar: o heartbeat seguiria batendo, o prompt de instalação seguiria armado
// e um modal aberto por portal escaparia de qualquer seletor daqui.
//
// O `<style>` existe para a janela em que o desmonte ainda não aconteceu. Ele
// viaja no mesmo HTML da página, então vale desde a primeira pintura, antes de
// qualquer JavaScript rodar. Duas coisas caem nessa janela:
//
//  - o que ESTE componente renderiza no servidor (hoje o Toaster e a tag do
//    AdSense — verificado no HTML de produção), que chega pintado;
//  - a dock, que não vem no HTML (ela lê o login no cliente e devolve null
//    enquanto não sabe), mas monta na hidratação, no mesmo commit em que o
//    supressor ainda vai rodar o seu efeito.
//
// Ou seja: o CSS não é redundante nem é a metade principal. Ele cobre os
// milissegundos até o desmonte, e cobre de antemão qualquer peça futura que
// venha a renderizar no servidor.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import Script from "next/script"
import { ProfileSidebar } from "@/components/layout/profile-sidebar"
import { BirthdateGate } from "@/components/onboarding/birthdate-gate"
import { CookieConsent } from "@/components/cookie-consent"
import { AnalyticsProvider } from "@/components/analytics-provider"
import { CouponCapture } from "@/components/share/coupon-capture"
import { GlobalOverlays } from "@/components/global-overlays"
import { Toaster } from "sonner"

/** Marcador do wrapper. O `<style>` do supressor mira exatamente nele. */
const CHROME_ATTR = "data-platform-chrome"

type PlatformChromeContextValue = {
  suppressed: boolean
  setSuppressed: (value: boolean) => void
}

const PlatformChromeContext = createContext<PlatformChromeContextValue | null>(null)

export function PlatformChromeProvider({ children }: { children: React.ReactNode }) {
  const [suppressed, setSuppressed] = useState(false)
  const value = useMemo(() => ({ suppressed, setSuppressed }), [suppressed])

  return (
    <PlatformChromeContext.Provider value={value}>
      {children}
    </PlatformChromeContext.Provider>
  )
}

/**
 * Montado UMA vez pela subárvore do site público.
 *
 * O `useEffect` desliga o chrome de verdade (desmonta); o `<style>` cobre o
 * intervalo entre a primeira pintura e a hidratação. Os dois são necessários —
 * ver o cabeçalho.
 *
 * A limpeza devolve o chrome ao sair: quem clica no rodapé "feito com
 * Freelandoo" e volta para dentro do produto precisa da dock de volta, e uma
 * navegação client-side não recarrega a página para restaurá-la sozinha.
 */
export function SuppressPlatformChrome() {
  const ctx = useContext(PlatformChromeContext)
  const setSuppressed = ctx?.setSuppressed

  useEffect(() => {
    if (!setSuppressed) return
    setSuppressed(true)
    return () => setSuppressed(false)
  }, [setSuppressed])

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[${CHROME_ATTR}]{display:none!important}`,
      }}
    />
  )
}

/**
 * O chrome em si. Fica no layout raiz, depois de `{children}`.
 *
 * ⚠️ Peça global nova (overlay, provider visual, script de terceiro) entra AQUI
 * dentro, não solta no `app/layout.tsx` — solta, ela reaparece no site do
 * cliente e ninguém percebe até alguém abrir o site publicado.
 */
export function PlatformChrome() {
  const ctx = useContext(PlatformChromeContext)
  if (ctx?.suppressed) return null

  return (
    <div {...{ [CHROME_ATTR]: "" }}>
      <ProfileSidebar />
      <BirthdateGate />
      <CookieConsent />
      <AnalyticsProvider />
      <CouponCapture />
      {/* Overlays não-críticos (heartbeat, alertas admin, modal de votação,
          prompts PWA) carregados lazy via client wrapper. */}
      <GlobalOverlays />
      {/* Sem este Toaster, TODO toast.error/success do sonner (20+ arquivos)
          dispara no vazio — erros de validação ficavam mudos e botões pareciam
          quebrados. borderRadius 0 = regra fl-sharp. */}
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        toastOptions={{ style: { borderRadius: 0 } }}
      />
      {/* AdSense em lazyOnload: o script de anúncios é pesado e só há ad em ~9
          páginas (blog/legais via <ContentAd>). Carregar no idle tira ele do
          caminho crítico de render em TODA rota (LCP/TBT).
          Mora aqui dentro, e não no layout raiz, porque é rastreamento de
          TERCEIRO: no site de uma comunidade ele carregaria sob o domínio do
          dono, que não pediu anúncio nenhum e não respondeu por esse cookie.
          Como é lazyOnload, o desmonte na hidratação acontece antes de ele
          chegar a carregar. O Consent Mode default segue no layout raiz
          (beforeInteractive, exigência de LGPD, e não carrega nada). */}
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5728915466446266"
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
    </div>
  )
}
