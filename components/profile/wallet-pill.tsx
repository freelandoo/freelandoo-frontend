"use client"

import Link from "next/link"
import { DollarSign } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { cn } from "@/lib/utils"

/**
 * Botão da Carteira no headcard — PEÇA ÚNICA das duas superfícies.
 *
 * Não existe hierarquia de perfil: todo perfil do dono mostra este botão, seja
 * o primeiro ou um aberto depois. Por isso ele nasce como componente e não como
 * markup solto — a última vez que uma peça do headcard foi escrita duas vezes
 * (uma no /account, outra no ProfileHeadCard), ela divergiu em silêncio.
 *
 * A Carteira é NATIVA (saiu da Loja de Funções na mig 216): ninguém compra.
 * O que ainda pode escondê-la é a preferência pessoal da seção "Funções" do menu
 * lateral — `useUserFeature` já devolve `owned && pref`, e com a função fora da
 * venda `owned` é sempre true, sobrando só a escolha do dono.
 */
export function WalletPill({ className }: { className?: string }) {
  const t = useTranslations("Account")
  const walletOn = useUserFeature("wallet")

  if (!walletOn) return null

  return (
    <Link
      href="/wallet"
      aria-label={t("openWallet", "Abrir minha Carteira")}
      title={t("openWallet", "Abrir minha Carteira")}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 border-2 border-[#0B0B0D] bg-[#15803D] px-2.5 py-1.5",
        "text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition",
        "hover:bg-[#166F36] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_0_#0B0B0D]",
        className
      )}
    >
      {/* O rótulo some no estreito e sobra o cifrão: no celular o headcard não
          tem largura para o texto sem empurrar os contadores para baixo. */}
      <span className="hidden text-[11px] font-extrabold uppercase tracking-wider sm:inline">
        {t("walletPill", "Carteira")}
      </span>
      <DollarSign className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
    </Link>
  )
}
