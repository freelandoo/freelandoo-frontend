"use client"

/**
 * "Voltar" — a PEÇA ÚNICA da saída de página.
 *
 * ⚠️ REGRA PERMANENTE (Alex, 2026-09-03): TODA página nasce com um Voltar.
 * Página sem saída visível deixa quem chegou por link/notificação preso — só
 * o gesto do sistema operacional resolve, e no PWA instalado nem isso. As
 * únicas dispensadas são as RAÍZES do dock (`ProfileSidebar`: /feed, /bees,
 * /search, /mensagens, /monsters, /ranking e o /account da foto), que já são
 * o destino de um clique fixo, e as telas de redirecionamento, que ninguém
 * chega a ver.
 *
 * Por que este arquivo existe em vez de cada página escrever o seu:
 *  - o rótulo é traduzido num lugar só (`Navigation.back`, 3 idiomas);
 *  - `TabloidBackLink` mora no `kit.tsx`, que é importado por SERVER
 *    components — não pode virar client. Este wrapper é o degrau de client
 *    que carrega o hook de i18n.
 *
 * O destino é um `href` EXPLÍCITO (o pai canônico da página), não
 * `router.back()`: histórico devolve a página anterior, que pode ser
 * qualquer uma (ou nenhuma, quando a pessoa abriu o link direto). Quem
 * precisa de histórico de verdade (perfil, agenda) já tem o próprio botão.
 */

import type { ReactNode } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { TabloidBackLink } from "./kit"

export function PageBackLink({
  href,
  label,
  className,
}: {
  /** Pai canônico da página. Ex.: "/account" para as ferramentas do perfil. */
  href: string
  /** Só quando o destino precisa de nome ("Voltar para o clan"). */
  label?: ReactNode
  className?: string
}) {
  const t = useTranslations("Navigation")
  return (
    <TabloidBackLink href={href} className={className}>
      {label ?? t("back", "Voltar")}
    </TabloidBackLink>
  )
}
