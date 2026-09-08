"use client"

// /wallet/mercado — a página do botão "Mercado" da Carteira.
//
// Era um painel que abria dentro da /wallet; virou rota própria (pedido do
// Alex, 2026-09-08). O headcard é o MESMO das outras três telas, com o pill do
// mercado aceso: sem ele a pessoa cairia numa página sem os outros botões e o
// único caminho de volta seria o "Voltar".

import { Halftone } from "@/components/home/landing/primitives"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WalletHeadcard } from "../_components/wallet-headcard"
import { MarketPanel } from "../_components/market-panel"

export default function WalletMarketPage() {
  const tr = useTranslations("Wallet")
  const { perfil } = useMeProfile()

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      <WalletHeadcard
        perfil={perfil}
        eyebrow={tr("marketEyebrow", "o mundo lá fora")}
        title={tr("market", "Mercado")}
        backHref="/wallet"
        active="market"
      />

      <section className="mx-auto mt-5 w-full max-w-6xl px-3 md:px-8">
        <MarketPanel />
      </section>
    </main>
  )
}
