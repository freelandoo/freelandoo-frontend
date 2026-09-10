"use client"

// A CASCA DA PLATAFORMA DE GAMES — o canvas escuro, a pele roxa e a textura de
// fundo que TODAS as telas de `/games` dividem.
//
// ⚠️ NASCEU NOS MOLDES DO FINANCEIRO, E NÃO DA COMUNIDADE (pedido do Alex,
// 2026-09-10): "eu pedi para demolir tudo e agora pedi para criar igual o
// financeiro, não uma comunidade, mas uma plataforma, nos moldes do
// financeiro". O games que existia antes era a página de comunidade — um
// componente de ~2.700 linhas desenhando o feed inteiro de uma vez — e era ELA,
// por baixo dos pills, que fazia o hover atrasar e a animação cair a 5 fps. A
// casca do Financeiro é a mesma silhueta, sem aquela página por baixo.
//
// ⚠️ É a cópia de `wallet/_components/finance-shell.tsx` com a pele trocada, e
// ISSO É DELIBERADO: uma peça genérica `<PlatformShell kind>` seria a terceira
// forma de dizer a mesma coisa (a pele em CSS, o fundo e a casca), e o dia em
// que uma correção entrasse só numa das duas seria invisível de qualquer
// jeito. Duas casca de 10 linhas são mais fáceis de manter iguais do que uma
// abstração que ninguém lê.
//
// ⚠️ O FUNDO É O PRIMEIRO FILHO e não tem z-index: tudo que vem depois no DOM
// pinta por cima dele; o conteúdo entra com `relative z-10` para ficar acima
// da camada `fixed`. TELA NOVA DE GAMES usa esta casca.

import type { ReactNode } from "react"
import { TechBackdrop } from "@/components/platform/tech-backdrop"

export function GamesShell({ children }: { children: ReactNode }) {
  return (
    // `fl-root` mantém as variáveis da casa e `fl-games` é a PELE — ela
    // reescreve, só aqui dentro, as cores de superfície da casca de plataforma.
    // Ver o bloco em globals.css.
    <div className="fl-root fl-games relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <TechBackdrop variant="games" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
