"use client"

// A CASCA DO AMBIENTE FINANCEIRO — o canvas escuro, a pele verde e a textura
// de fundo que as CINCO telas da plataforma dividem.
//
// Pedido do Alex (2026-09-08): "o financeiro não é uma comunidade, não tem
// membros, não precisa entrar, é como games (...) são como se fossem
// plataformas, têm o mesmo comportamento (...) coloca verde e no fundo algum
// símbolo de dinheiro e faz efeitos webgpu".
//
// ⚠️ O WEBGPU SAIU em 2026-09-09: o shader de tela cheia dividia a GPU com o
// compositor e travava a rolagem da página inteira. Ficou a textura estática
// na mesma cor — ver components/platform/tech-backdrop.tsx.
//
// ⚠️ POR QUE UMA PEÇA, E NÃO A CLASSE REPETIDA EM CADA PÁGINA: "dentro da
// plataforma financeira" é o `/wallet` INTEIRO — o feed, a Carteira, o cupom e
// o ranking são salas do mesmo ambiente, e foi assim que a batida de presença
// da mig 230 já tinha sido definida. Com a classe escrita cinco vezes, a tela
// que esquecesse dela nasceria fora do ambiente: fundo diferente, sem o
// fundo, sem a pele — e ninguém perceberia até alguém abrir aquela sala.
//
// ⚠️ O FUNDO É O PRIMEIRO FILHO e não tem z-index: tudo que vem depois no DOM
// pinta por cima dele. É a mesma ordem de pintura que faz a foto do headcard
// cobrir a pilha de pills — e é por isso que o conteúdo entra com `relative
// z-10`, para ficar acima da camada `fixed` do fundo.
//
// TELA NOVA DO FINANCEIRO usa esta casca. Escrita solta, ela seria a única
// clara no meio de um ambiente escuro.

import type { ReactNode } from "react"

// O fundo do ambiente: uma textura estática na cor da plataforma. Import
// DIRETO (e não por `dynamic`) porque ele deixou de ser um shader e virou
// quatro divs de CSS — um chunk à parte só faria a cor do ambiente piscar na
// entrada da tela. Ver components/platform/tech-backdrop.tsx.
import { TechBackdrop } from "@/components/platform/tech-backdrop"

export function FinanceShell({ children }: { children: ReactNode }) {
  return (
    // `fl-root` mantém as variáveis da casa (o amarelo, a tinta, o papel) e
    // `fl-finance` é a PELE — ela reescreve, só aqui dentro, as sete cores de
    // superfície da casca de plataforma. Ver o bloco em globals.css.
    <div className="fl-root fl-finance relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <TechBackdrop variant="finance" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
