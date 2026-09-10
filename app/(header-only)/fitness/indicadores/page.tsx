"use client"

// /fitness/indicadores — OS INDICADORES: IMC, tendência de peso, médias e
// aderência de calorias/água, macros, sequência, treinos e frequência. Era a
// aba "Indicadores" da raiz e virou sala própria atrás do último pill
// (pedido do Alex, 2026-09-10). O conteúdo é o MESMO componente
// (`indicators-tab`); mudou só a casa. Não recriar a barra de abas na raiz.

import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "../_components/fitness-shell"
import { FitnessHeadcard } from "../_components/fitness-headcard"
import { IndicatorsTab } from "../_components/indicators-tab"

export default function FitnessIndicatorsPage() {
  const t = useTranslations("Fitness")
  const { perfil } = useMeProfile()

  return (
    <FitnessShell>
      <FitnessHeadcard perfil={perfil} title={t("indicatorsTitle", "Indicadores")} backHref="/fitness" active="indicators" />
      <section className="mx-auto mt-2 w-full max-w-5xl px-0 md:px-10">
        <IndicatorsTab />
      </section>
    </FitnessShell>
  )
}
