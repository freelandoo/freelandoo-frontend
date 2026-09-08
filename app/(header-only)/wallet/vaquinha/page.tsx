"use client"

// /wallet/vaquinha — a página do cofrinho da Carteira.
//
// Era um painel que abria dentro da /wallet; virou rota própria (pedido do
// Alex, 2026-09-08).
//
// ⚠️ ELA PODE NÃO EXISTIR PARA QUEM OLHA: a Vaquinha é função com flag do admin
// E preferência da pessoa, e quando qualquer uma delas está desligada o pill
// nem aparece na pilha. Uma rota que continuasse de pé nesse caso seria porta
// pintada — daí o redirect para a raiz da Carteira. O predicado é o MESMO do
// headcard (`useVaquinhaEnabled`), escrito num lugar só: copiado, um dos dois
// lados deixaria de acompanhar o outro.

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PiggyBank } from "lucide-react"
import { Halftone } from "@/components/home/landing/primitives"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WalletHeadcard, useVaquinhaEnabled } from "../_components/wallet-headcard"
import { GREEN } from "../_components/wallet-ui"

export default function WalletVaquinhaPage() {
  const tr = useTranslations("Wallet")
  const router = useRouter()
  const { perfil } = useMeProfile()
  const enabled = useVaquinhaEnabled()

  useEffect(() => {
    // Os hooks de flag falham ABERTO (`!== false`), então isto só dispara com a
    // resposta na mão dizendo que a função está desligada — nunca durante o
    // carregamento.
    if (!enabled) router.replace("/wallet")
  }, [enabled, router])

  if (!enabled) return null

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      <WalletHeadcard
        perfil={perfil}
        eyebrow={tr("vaquinhaEyebrow", "o seu objetivo")}
        title={tr("vaquinhaPill", "Vaquinha")}
        backHref="/wallet"
        active="vaquinha"
      />

      <section className="mx-auto mt-5 w-full max-w-6xl px-3 md:px-8">
        <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[5px_5px_0_0_#0B0B0D] sm:p-6">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
            <PiggyBank className="h-3.5 w-3.5" /> {tr("myVaquinhaTitle", "Minha vaquinha")}
          </p>
          {/* `/vaquinha/nova` é create-or-open: quem já tem cai na dela. */}
          <Link
            href="/vaquinha/nova"
            className="mt-3 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            style={{ background: GREEN }}
          >
            <PiggyBank className="h-4 w-4" />
            {tr("myVaquinhaCta", "Abrir minha vaquinha")}
          </Link>
          <p className="mt-3 max-w-lg text-[12px] leading-relaxed text-[#6B6457]">
            {tr("myVaquinhaHint", "Arrecade para um objetivo seu. Se você já tem uma, o botão abre a que existe.")}
          </p>
        </div>
      </section>
    </main>
  )
}
