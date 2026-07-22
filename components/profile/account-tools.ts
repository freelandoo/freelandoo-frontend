"use client"

import type { LucideIcon } from "lucide-react"
import { BarChart3, Bot, CalendarDays, Database, Dumbbell, FolderCog, Wallet } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"

/**
 * FONTE ÚNICA das ferramentas da CONTA (Métricas, Gerenciar, Agenda, Carteira,
 * Conexões de Dados, Atendimento IA, Fitness).
 *
 * Existe porque essa lista estava escrita DUAS vezes — na toolbar do headcard
 * do /account e no menu da engrenagem do headcard do perfil — e derivava a cada
 * feature nova: o botão de Agenda entrou só no /account, as ferramentas da
 * conta entraram só na engrenagem. Compartilhamos os DADOS, não o markup: cada
 * superfície mantém o próprio estilo de botão, mas o CONJUNTO é o mesmo.
 *
 * Ao adicionar ferramenta nova: só aqui.
 */
export type AccountTool = {
  key: string
  icon: LucideIcon
  /** Texto do title/tooltip. */
  label: string
  /** Descrição longa pro aria-label. */
  ariaLabel: string
  href?: string
  onClick?: () => void
}

export function useAccountTools({
  agendaProfileId,
  onOpenDataConnections,
}: {
  /** Qualquer perfil do dono serve: a agenda é da CONTA e o backend resolve o
   *  escopo (mig 190), então o href pode usar o perfil que a tela já tem. */
  agendaProfileId?: string | null
  /** Conexões de Dados abre modal, então cada superfície passa o próprio handler. */
  onOpenDataConnections?: () => void
}): AccountTool[] {
  const t = useTranslations("Account")

  // Carteira não tem flag global hoje — só a preferência do usuário. Não
  // inventar um gate que não existe: espelha as duas superfícies.
  const walletPrefOn = useUserFeature("wallet")
  const dataApiOn = useFeature("data_api")
  const atendimentoIaOn = useFeature("atendimento_ia_venda")
  const academiasOn = useFeature("fitness_academias")
  const fitnessPrefOn = useUserFeature("fitness_academias")

  const tools: AccountTool[] = [
    {
      key: "metrics",
      icon: BarChart3,
      label: t("metrics", "Métricas"),
      ariaLabel: t("metrics", "Métricas"),
      href: "/account/xp",
    },
    {
      key: "manage",
      icon: FolderCog,
      label: t("manage", "Gerenciar"),
      ariaLabel: t("manage", "Gerenciar"),
      href: "/account/gerenciamento",
    },
  ]

  if (agendaProfileId) {
    tools.push({
      key: "agenda",
      icon: CalendarDays,
      label: t("agenda", "Agenda"),
      ariaLabel: t("openAgendaAria", "Abrir a agenda da conta (compartilhada por todos os seus perfis)"),
      href: `/account/profile/${agendaProfileId}/agenda`,
    })
  }

  if (walletPrefOn) {
    tools.push({
      key: "wallet",
      icon: Wallet,
      label: t("myWallet", "Minha Carteira"),
      ariaLabel: t("openWallet", "Abrir minha Carteira"),
      href: "/wallet",
    })
  }

  if (dataApiOn && onOpenDataConnections) {
    tools.push({
      key: "data",
      icon: Database,
      label: t("dataApi", "Conexões de Dados"),
      ariaLabel: t("dataApiAria", "Conexões de Dados: gerar token de API para ler os dados da conta"),
      onClick: onOpenDataConnections,
    })
  }

  if (atendimentoIaOn) {
    tools.push({
      key: "ia",
      icon: Bot,
      label: t("atendimentoIa", "Atendimento IA"),
      ariaLabel: t("atendimentoIaAria", "Atendimento IA: bot que responde suas conversas"),
      href: "/account/atendimento-ia",
    })
  }

  if (academiasOn && fitnessPrefOn) {
    tools.push({
      key: "fitness",
      icon: Dumbbell,
      label: t("fitnessTool", "Fitness"),
      ariaLabel: t("fitnessAria", "Painel fitness: calorias, água, peso e treinos"),
      href: "/fitness",
    })
  }

  return tools
}
