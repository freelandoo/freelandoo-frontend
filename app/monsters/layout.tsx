// app/monsters/layout.tsx — o jogo roda SOZINHO dentro da Freelandoo.
//
// O `/monsters` é uma build Godot (WebAssembly + WebGL) num iframe, e no
// Android o iframe roda no MESMO processo de renderização da página. Tudo o
// que a Freelandoo deixa ligado por trás dele disputa a mesma memória, a mesma
// thread principal e a mesma bateria com o jogo — e o relato que abriu isto
// foi exatamente esse: o celular esquentando e a aba caindo no meio do torneio.
//
// Até aqui o jogo herdava o chrome inteiro da plataforma: dock (já escondido
// por rota, mas montado), heartbeat de XP, alertas de admin, três modais que
// escutam o socket, prompt de instalar o app, puxar-para-atualizar (que faz
// `location.reload()` — numa partida, isso é perder o torneio), banner de
// cookies, analytics e o WebSocket com reconexão. NADA disso serve a quem está
// jogando. A página declara isso aqui, no layout, pelo mesmo mecanismo do site
// publicado das comunidades (`SuppressPlatformChrome`).
//
// O SOCKET É À PARTE porque ele não é um componente do chrome: é um módulo
// (`lib/realtime.ts`) que fica vivo enquanto a aba existe. Suspendê-lo fecha a
// conexão e impede que algo a reabra; ao sair do jogo ele volta sozinho.
//
// `overscroll-behavior: none` desliga o puxar-para-atualizar NATIVO do Chrome:
// sem ele um arrasto para baixo perto do topo, fora do canvas, recarrega a
// página com a partida no meio.
"use client"

import { useEffect } from "react"
import { SuppressPlatformChrome } from "@/components/layout/platform-chrome"
import { suspendRealtime } from "@/lib/realtime"

export default function MonstersLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => suspendRealtime(), [])
  return (
    <>
      <SuppressPlatformChrome />
      <style
        dangerouslySetInnerHTML={{
          __html: "html,body{overscroll-behavior:none;overflow:hidden}",
        }}
      />
      {children}
    </>
  )
}
