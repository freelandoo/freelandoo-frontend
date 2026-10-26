"use client"

// A CASCA DA PLATAFORMA FITNESS — o canvas escuro, a pele CINZA + LARANJA
// ESCURO e a textura de fundo que TODAS as telas de `/fitness` dividem.
//
// ⚠️ É a cópia de `games/_components/games-shell.tsx` (que por sua vez é a do
// Financeiro) com a pele trocada, e ISSO É DELIBERADO — pedido do Alex
// (2026-09-10): "todo o visual padrão, conforme o game e o financeiro, sem
// margem também". Três cascas de 10 linhas são mais fáceis de manter iguais
// do que uma abstração `<PlatformShell kind>` que ninguém lê.
//
// ⚠️ O FUNDO É O PRIMEIRO FILHO e não tem z-index: tudo que vem depois no DOM
// pinta por cima dele; o conteúdo entra com `relative z-10`. `overflow-x-clip`
// recorta as sombras duras de 8px, que abririam rolagem lateral no celular
// com as seções indo de ponta a ponta. TELA NOVA DE FITNESS usa esta casca.
//
// A flag `fitness_academias` é o kill-switch do painel inteiro; com ela
// desligada a casca desenha o aviso e não monta a tela — num lugar só, para
// que uma sala nova nasça gateada sem lembrar de nada.

import type { ReactNode } from "react"
import { Dumbbell } from "lucide-react"
import { TechBackdrop } from "@/components/platform/tech-backdrop"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useTranslations } from "@/components/i18n/I18nProvider"

export function FitnessShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Fitness")
  const enabled = useFeature("fitness_academias")

  return (
    // `fl-root` mantém as variáveis da casa e `fl-fitness` é a PELE — ela
    // reescreve, só aqui dentro, as cores de superfície da casca de plataforma
    // para o cinza do ambiente (o laranja escuro é o acento, ver `fitness-ui`).
    // `fl-sharp` porque os modais do painel são montados aqui dentro.
    <div className="fl-root fl-fitness fl-sharp relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <TechBackdrop variant="fitness" />
      <div className="relative z-10">
        {enabled ? (
          children
        ) : (
          <div className="flex min-h-[100dvh] items-center justify-center px-4 text-center">
            <div>
              <Dumbbell className="mx-auto h-10 w-10 text-[#9A938A]" />
              <p className="mt-4 text-sm text-[#9A938A]">{t("disabled", "Recurso indisponível no momento.")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
