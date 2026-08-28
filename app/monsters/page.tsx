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
import { RotateCcw } from "lucide-react"
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

  // ── O RETRATO NÃO É "FEIO", É INJOGÁVEL ────────────────────────────────
  //
  // O jogo desenha num espaço de 1920×1080 e estica por `canvas_items` com
  // `aspect = expand`: a escala é `min(largura/1920, altura/1080)`. Num celular
  // em pé (412×915) isso dá **0,21** — a interface inteira encolhe para um
  // quinto, e os botões do menu ficam com ~16 px de altura CSS, uns 2,5 mm de
  // alvo. Eles continuam funcionando; ninguém consegue acertar. Deitado o mesmo
  // aparelho dá 0,38 e os mesmos botões passam de 4 mm.
  //
  // Por isso o retrato é BLOQUEADO e não só avisado: deixar entrar é deixar a
  // pessoa concluir que o jogo está quebrado.
  const [retrato, setRetrato] = useState(false)

  // ── E O AVISO VEM ANTES, E NÃO SÓ QUANDO DÁ ERRADO ─────────────────────
  //
  // O bloqueio acima é uma REAÇÃO: ele espera a pessoa estar em pé para
  // dizer que em pé não dá. Quem chega com o aparelho já deitado nunca lê
  // nada — e é essa a pessoa que gira o telefone no meio da partida sem
  // saber que está desmontando a tela.
  //
  // `dedo` é o aparelho e `entrou` é o toque que abre o jogo. Enquanto esse
  // toque não vem, a porta fica fechada: é ela que carrega o pedido escrito e
  // é ela que dá ao `deita()` o GESTO que o navegador exige (ver abaixo — sem
  // gesto, tela cheia e trava de orientação são as duas recusadas).
  //
  // No computador não existe porta nenhuma: `dedo` é falso e o jogo abre
  // direto, como sempre abriu.
  const [dedo, setDedo] = useState(false)
  const [entrou, setEntrou] = useState(false)

  useEffect(() => {
    // `pointer: coarse` separa dedo de mouse. Sem isso, quem estreitasse a
    // janela no computador levaria um "gire o telefone" sem ter telefone.
    const toque = window.matchMedia("(pointer: coarse)")
    const empe = window.matchMedia("(orientation: portrait)")
    const olha = () => {
      setDedo(toque.matches)
      setRetrato(toque.matches && empe.matches)
    }
    olha()
    empe.addEventListener("change", olha)
    toque.addEventListener("change", olha)
    return () => {
      empe.removeEventListener("change", olha)
      toque.removeEventListener("change", olha)
    }
  }, [])

  // DEITAR SOZINHO SÓ FUNCIONA DENTRO DE UM GESTO E EM TELA CHEIA. A versão
  // anterior chamava `orientation.lock` num `useEffect` no carregamento; o
  // navegador recusa nas duas contas (sem gesto, e fora de tela cheia) e a
  // promessa era engolida por um `catch` vazio — parecia tratado e não fazia
  // nada. Agora quem chama é o dedo, e a tela cheia vem antes.
  const deita = useCallback(async () => {
    const alvo = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
    }
    try {
      if (!document.fullscreenElement) {
        await (alvo.requestFullscreen?.() ?? alvo.webkitRequestFullscreen?.())
      }
    } catch {
      /* o iOS não tem tela cheia em página; o pedido escrito cobre */
    }
    try {
      const o = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>
      }
      await o.lock?.("landscape")
    } catch {
      /* iOS não trava orientação; a pessoa gira na mão */
    }
    // A PORTA ABRE MESMO QUE AS DUAS TENTATIVAS ACIMA TENHAM FALHADO. No iPhone
    // elas falham sempre — não há tela cheia em página nem trava de orientação
    // — e prender o jogo atrás de uma promessa que aquele aparelho nunca vai
    // cumprir seria trocar um aviso por uma parede. Ali o texto é o mecanismo:
    // a pessoa leu, gira na mão, e entra.
    setEntrou(true)
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
        //
        // `allow-pointer-lock` NÃO É OPCIONAL, e a falta dele custou uma tela
        // onde o mouse não girava a câmera nem golpeava.
        //
        // Todo o mouse do `jogador.gd` está atrás de
        // `Input.mouse_mode == MOUSE_MODE_CAPTURED` — a câmera em
        // `_unhandled_input` e o golpe em `botao_ataque_segurado()`. No
        // navegador, `MOUSE_MODE_CAPTURED` vira `requestPointerLock()`, e num
        // iframe com atributo `sandbox` o navegador recusa isso a menos que
        // este token esteja aqui. Recusa com uma linha no console e mais nada:
        // o jogo abre, desenha, anda pelo teclado, e o mouse simplesmente não
        // existe. Sem sandbox nenhum funcionaria por acidente; com sandbox,
        // funciona porque está escrito.
        //
        // (`pointer-lock` no atributo `allow` não serve — não é uma feature de
        // Permissions Policy, e o Chrome só responde "Unrecognized feature".
        // Quem manda em pointer lock dentro de iframe é o sandbox.)
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        allow="fullscreen; autoplay; gamepad"
      />

      <Link
        href="/feed"
        className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur transition hover:border-white/35 hover:text-white"
      >
        ← Freelandoo
      </Link>

      {!entregue && !retrato && (!dedo || entrou) && (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/50 backdrop-blur">
          carregando o mundo…
        </span>
      )}

      {/* A PORTA. Ela cobre a tela e o iframe carrega atrás dela — os 364 MB
          começam a descer no primeiro segundo, enquanto a pessoa lê. Fechar o
          jogo por trás de um toque não custa espera nenhuma; custa só o toque,
          que é justamente o que o navegador exige para deitar a tela. */}
      {dedo && !entrou && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0804] px-8 text-center">
          <RotateCcw className="h-10 w-10 text-[#f2b705]" aria-hidden />
          <h2 className="fl-headline text-2xl text-[#f2b705]">O jogo é deitado</h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Vire o celular na horizontal. Em pé, a arena fica do tamanho de um
            selo e os botões viram grãos de arroz.
          </p>
          <button
            type="button"
            onClick={deita}
            className="mt-1 rounded-full bg-[#f2b705] px-5 py-2 text-sm font-semibold text-[#0b0b0d] transition hover:bg-[#e0a500]"
          >
            {retrato ? "Girar e entrar em tela cheia" : "Entrar em tela cheia"}
          </button>
          <span className="text-[11px] text-white/35">
            {entregue
              ? "no iPhone o giro é na mão — o Safari não deixa a página girar sozinha"
              : "o mundo já está baixando enquanto você lê"}
          </span>
        </div>
      )}

      {/* O iframe continua vivo por baixo: a build segue baixando os 364 MB
          enquanto a pessoa gira o aparelho. Desmontá-lo aqui recomeçaria o
          download do zero a cada rotação. */}
      {retrato && entrou && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0804] px-8 text-center">
          <RotateCcw className="h-10 w-10 text-[#f2b705]" aria-hidden />
          <h2 className="fl-headline text-2xl text-[#f2b705]">Deite o telefone</h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Em pé, a arena fica do tamanho de um selo e os botões somem. Girando,
            tudo volta ao tamanho certo.
          </p>
          <button
            type="button"
            onClick={deita}
            className="mt-1 rounded-full bg-[#f2b705] px-5 py-2 text-sm font-semibold text-[#0b0b0d] transition hover:bg-[#e0a500]"
          >
            Girar e entrar em tela cheia
          </button>
          <span className="text-[11px] text-white/35">
            no iPhone o giro é na mão — o Safari não deixa a página girar sozinha
          </span>
        </div>
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
