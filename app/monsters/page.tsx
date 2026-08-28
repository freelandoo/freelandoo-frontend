"use client"

/**
 * Freelandoo Monsters — o jogo, embutido.
 *
 * A página é uma casca fina: quem desenha é a build Godot (WebAssembly) num
 * `<iframe>`. O que esta tela faz de verdade são três coisas, e nenhuma delas
 * é visual.
 *
 * ── 1. Ela entrega a sessão, e por `postMessage` ──────────────────────────
 *
 * O jogo não tem cadastro: quem loga é a Freelandoo (ver
 * `Cat demon/servidor/README.md`, que recusa até compartilhar o `JWT_SECRET`
 * com o serviço do jogo). A build lê o token que esta página passa e o repassa
 * à Monsters API, que então PERGUNTA à Freelandoo se ele vale.
 *
 * O token não vai na URL do iframe. Seria uma linha a menos e seria a
 * credencial da rede social inteira no histórico do navegador, no `Referer` de
 * toda requisição que a build fizer e no log de qualquer intermediário. Por
 * `postMessage` ela nunca chega a existir como endereço.
 *
 * ── 2. Quem pergunta é o jogo, não a página ───────────────────────────────
 *
 * O caminho óbvio seria postar a sessão no `onLoad` do iframe. Ela chegaria
 * antes de a WebAssembly ter terminado de carregar — e mensagem que chega
 * antes do ouvinte não espera, se perde. Com centenas de MB de download no
 * meio, "antes" é a regra e não o azar.
 *
 * Então a build avisa que nasceu (`jogo:pronto`) e esta página responde
 * (`freelandoo:sessao`). Ver `jogo/scripts/criacao/sessao.gd`, a outra ponta.
 *
 * ── 3. Ela confere a origem de quem pediu ─────────────────────────────────
 *
 * `postMessage` chega de qualquer janela, inclusive de um iframe de anúncio na
 * mesma página. Responder a todo mundo que gritar "jogo:pronto" seria entregar
 * o token de quem está logado a qualquer terceiro embutido aqui. Só a origem
 * da build é respondida, e o destino do `postMessage` é essa mesma origem —
 * nunca `"*"`.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

/**
 * Onde a build Godot está publicada. Ela não cabe neste repositório: o `.pck`
 * passa de 250 MB e o GitHub recusa arquivo acima de 100 MB — por isso a build
 * mora no mesmo bucket R2 que já serve a mídia pública, e entra aqui por
 * endereço e não por `public/`.
 *
 * O ENDEREÇO É CONSTANTE E NÃO SÓ VARIÁVEL DE AMBIENTE, pelo mesmo motivo que
 * `BACKEND_PUBLIC` e `R2_PUBLIC` são constantes no `next.config.mjs`: não há
 * segredo nenhum aqui (é uma URL pública que o navegador vai buscar de
 * qualquer jeito), e uma variável esquecida no painel da Vercel é uma tela que
 * diz "a build não foi publicada" numa build que está publicada. A variável
 * continua valendo por cima, para apontar a bancada local ou uma versão de
 * teste sem tocar no código.
 */
const JOGO_PADRAO =
  "https://pub-3b9774a0af714847979058ea5677a840.r2.dev/monsters/jogo/index.html"
const JOGO_URL = process.env.NEXT_PUBLIC_MONSTERS_JOGO_URL || JOGO_PADRAO

/** Onde mora a Monsters API (o serviço da semente social). */
const API_URL = process.env.NEXT_PUBLIC_MONSTERS_API_URL || ""

/** A origem de JOGO_URL, para conferir remetente e endereçar a resposta. */
function origemDe(url: string): string | null {
  try {
    return new URL(url, typeof window === "undefined" ? undefined : window.location.href).origin
  } catch {
    return null
  }
}

export default function MonstersPage() {
  const { status } = useAuth()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [entregue, setEntregue] = useState(false)
  const origemJogo = JOGO_URL ? origemDe(JOGO_URL) : null

  const entrega = useCallback(() => {
    const janela = frame.current?.contentWindow
    if (!janela || !origemJogo) return
    janela.postMessage(
      {
        tipo: "freelandoo:sessao",
        token: getToken() || "",
        api: API_URL,
      },
      // O destino é a origem da build, e nunca "*": com "*" a mensagem seria
      // legível por qualquer página que tivesse conseguido tomar o lugar do
      // iframe (redirect, navegação de dentro dele) — e o que viaja aqui é a
      // credencial de sessão de quem está logado.
      origemJogo,
    )
    setEntregue(true)
  }, [origemJogo])

  useEffect(() => {
    if (!origemJogo) return
    function ouve(ev: MessageEvent) {
      if (ev.origin !== origemJogo) return
      if (!ev.data || ev.data.tipo !== "jogo:pronto") return
      entrega()
    }
    window.addEventListener("message", ouve)
    return () => window.removeEventListener("message", ouve)
  }, [origemJogo, entrega])

  // O CELULAR PRECISA DEITAR. O jogo desenha num espaço 16:9 e os controles de
  // toque moram nos dois cantos de baixo (ver `jogo/scripts/ui/toque.gd`); em
  // pé, os dois polegares se encontram no meio da tela. `orientation.lock` só
  // existe em tela cheia e só no Android — onde não existe, o aviso abaixo faz
  // o pedido em português.
  useEffect(() => {
    const tela = screen as Screen & {
      orientation?: ScreenOrientation & { lock?: (o: string) => Promise<void> }
    }
    tela.orientation?.lock?.("landscape").catch(() => {
      /* iOS e desktop não deixam; o aviso na tela cobre esse caso */
    })
  }, [])

  if (status === "loading") {
    return <Aviso titulo="Um instante" texto="Conferindo sua sessão…" />
  }

  if (status !== "authenticated") {
    return (
      <Aviso
        titulo="Entre para jogar"
        texto="Seu monstro nasce do seu perfil da Freelandoo — sem conta não há de quem nascer."
        acao={{ href: "/login?next=/monsters", rotulo: "Entrar" }}
      />
    )
  }

  if (!JOGO_URL || !origemJogo) {
    return (
      <Aviso
        titulo="A build ainda não foi publicada"
        texto="Falta apontar NEXT_PUBLIC_MONSTERS_JOGO_URL para o endereço da build Godot."
      />
    )
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#0b0804]">
      <iframe
        ref={frame}
        src={JOGO_URL}
        title="Freelandoo Monsters"
        // `onLoad` não garante que a WebAssembly já subiu — a entrega de
        // verdade vem do `jogo:pronto`. Este é só o primeiro tiro, para o caso
        // de a build já estar em cache e ter perguntado antes deste efeito.
        onLoad={entrega}
        className="h-full w-full border-0"
        // A build precisa de `allow-scripts` e `allow-same-origin` (o Godot usa
        // IndexedDB para o `user://`). `allow-forms` e `allow-popups` ficam de
        // fora: o jogo não abre nem uma coisa nem outra.
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen; autoplay; gamepad"
      />

      <Link
        href="/feed"
        className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur transition hover:border-white/35 hover:text-white"
      >
        ← Freelandoo
      </Link>

      {!entregue && (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/50 backdrop-blur">
          carregando o mundo — deite o telefone
        </span>
      )}
    </main>
  )
}

function Aviso({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: { href: string; rotulo: string }
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0b0804] px-6 text-center">
      <h1 className="fl-headline text-3xl text-[#f2b705]">{titulo}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/60">{texto}</p>
      {acao && (
        <Link
          href={acao.href}
          className="mt-2 rounded-full bg-[#f2b705] px-5 py-2 text-sm font-semibold text-[#0b0b0d] transition hover:bg-[#e0a500]"
        >
          {acao.rotulo}
        </Link>
      )}
    </main>
  )
}
