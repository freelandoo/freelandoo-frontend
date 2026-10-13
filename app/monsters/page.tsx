"use client"

/**
 * EVO Brazil — o jogo, embutido.
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
 *
 * ── 4. Por enquanto, só o administrador entra ─────────────────────────────
 *
 * O jogo ficou órfão quando o front de games saiu (2026-09-09) e voltou em
 * 2026-10-04 com uma porta só: o botão "Jogo" do headcard, que só o admin vê.
 * A página espelha o botão — quem chega pelo endereço sem ser admin lê o aviso
 * em vez de baixar 100–250 MB de build. A trava é de UI: a build é pública no
 * R2 de qualquer forma, e o que ela tem de sensível (a sessão) só atravessa
 * pelo `postMessage` desta página.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { solta } from "@/lib/game/landscape"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

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

/**
 * ── E POR QUE EXISTEM DUAS BUILDS ─────────────────────────────────────────
 *
 * Porque a mesma textura não serve as duas GPUs, e carregar as duas mata o
 * telefone.
 *
 * Placa de vídeo de computador lê S3TC/BPTC e não lê ETC2/ASTC; a de celular é
 * o contrário. Uma build única tem que levar OS DOIS jogos de textura, e foi
 * isso que quebrou aqui: com o `.pck` de 326 MB, o carregador do Godot paga o
 * arquivo DUAS VEZES (`response.arrayBuffer()` e depois `copyToFS()` para
 * dentro do heap da WebAssembly). Medido: **974 MB de pico num processo só**.
 * O Chrome do Android mata a aba muito antes disso, recarrega, mata de novo — e
 * o que a pessoa lê é "um erro ocorreu repetidamente em .../monsters".
 *
 * (Ele nomeia ESTA página, e não o R2, porque no Android o iframe roda no mesmo
 * processo de renderização que ela. Foi assim que o defeito chegou como um
 * problema da Freelandoo.)
 *
 * A build de celular leva só ETC2 e teto de 512 px na textura: 56 MB de `.pck`
 * e 379 MB de pico. Ver `Cat demon/publicacao/exportar.js`.
 */
const JOGO_CELULAR_PADRAO =
  "https://pub-3b9774a0af714847979058ea5677a840.r2.dev/monsters/jogo-celular/index.html"
const JOGO_CELULAR_URL =
  process.env.NEXT_PUBLIC_MONSTERS_JOGO_URL_CELULAR || JOGO_CELULAR_PADRAO

/**
 * QUAL BUILD ESTE APARELHO CONSEGUE DESENHAR.
 *
 * A pergunta NÃO é "tem dedo?", e essa foi a primeira resposta errada. Um
 * notebook 2-em-1 dobrado em modo tablet responde `pointer: coarse` e tem GPU
 * de computador: ele receberia a build ETC2, não leria uma textura sequer, e
 * abriria PRETO — o mesmo defeito que já aconteceu aqui uma vez, agora só nos
 * aparelhos que ninguém tem na mesa para testar.
 *
 * A pergunta certa é a que o próprio WebGL responde. Pedimos a lista de
 * formatos comprimidos que a GPU aceita, que é exatamente o que o Godot vai
 * procurar dentro do `.pck` daqui a pouco. Medido no README: RTX 4060 via
 * ANGLE/D3D11 diz sim para S3TC/BPTC e **não** para ASTC/ETC2; telefone é o
 * contrário; e o iPad, que tem dedo e não tem S3TC, cai certo dos dois jeitos.
 *
 * O critério é S3TC porque é ELE que a build de computador carrega. Sem S3TC,
 * aquela build é uma tela preta — então qualquer dúvida (WebGL indisponível,
 * contexto recusado, lista vazia) manda para a de celular, que é a mais leve e
 * a que mais aparelhos leem.
 */
function leS3TC(): boolean {
  try {
    const c = document.createElement("canvas")
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null
    if (!gl) return false
    const exts = gl.getSupportedExtensions() || []
    return exts.some((e) => e.endsWith("compressed_texture_s3tc"))
  } catch {
    return false
  }
}

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
  const t = useTranslations("Monsters")
  const { status, user } = useAuth()
  const isAdmin = !!(
    user?.is_admin || user?.roles?.some((r) => r.desc_role === "Administrator")
  )
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [entregue, setEntregue] = useState(false)
  // O JOGO JÁ ESTÁ DE PÉ? Diferente de `entregue`, que liga já no `onLoad` do
  // iframe (com a WebAssembly ainda descendo). Só o `jogo:pronto` prova que
  // há um jogo desenhando — e é a partir dele que a saída passa a ser do jogo.
  const [pronto, setPronto] = useState(false)
  const router = useRouter()

  // `null` = ainda não perguntei à GPU. A ESCOLHA TEM QUE VIR ANTES DO
  // `<iframe>` NASCER: trocar o `src` depois de montado recomeça o download do
  // zero, e o que se teria baixado até ali é a build errada — no telefone, a
  // que o mata.
  const [pesada, setPesada] = useState<boolean | null>(null)
  // AS CHAVES DE BANCADA DA BUILD (`?diag=1` liga o medidor de desempenho,
  // `?toque=1` força o controle de toque). A build lê o endereço DELA, que é o
  // do iframe — então a página repassa. Lidas no MESMO efeito que escolhe a
  // build: trocar o `src` depois de montado recomeçaria o download.
  const [chaves, setChaves] = useState("")
  const jogoUrl = pesada ? JOGO_URL : JOGO_CELULAR_URL
  const origemJogo = jogoUrl ? origemDe(jogoUrl) : null

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
      if (!ev.data) return
      // A SAÍDA DE DENTRO DO JOGO. O "← Voltar" desta página cobria o HUD no
      // centro de baixo de toda tela (foto do Alex, 12/10). Com o jogo de pé,
      // quem sai é o "VOLTAR À FREELANDOO" do menu principal dele, que chega
      // aqui — mesma conferência de origem do `jogo:pronto`.
      if (ev.data.tipo === "jogo:sair") {
        router.push("/account")
        return
      }
      if (ev.data.tipo !== "jogo:pronto") return
      setPronto(true)
      entrega()
    }
    window.addEventListener("message", ouve)
    return () => window.removeEventListener("message", ouve)
  }, [origemJogo, entrega, router])

  // ── O RETRATO NÃO É "FEIO", É INJOGÁVEL ────────────────────────────────
  //
  // O jogo desenha num espaço de 1920×1080 e estica por `canvas_items` com
  // `aspect = expand`: a escala é `min(largura/1920, altura/1080)`. Num celular
  // em pé (412×915) isso dá **0,21** — a interface inteira encolhe para um
  // quinto, e os botões do menu ficam com ~16 px de altura CSS, uns 2,5 mm de
  // alvo. Eles continuam funcionando; ninguém consegue acertar. Deitado o mesmo
  // aparelho dá 0,38 e os mesmos botões passam de 4 mm.
  //
  // Por isso o retrato não existe para o jogo: com o aparelho EM PÉ, a moldura
  // do iframe é GIRADA 90° no CSS (`girado`, lá embaixo) e o jogo continua
  // recebendo uma janela deitada. Antes era uma tela pedindo para girar o
  // telefone — e no iPhone, onde a página não pode travar a orientação, era a
  // única saída. Girar a moldura vale nos dois e persiste: a pessoa pode
  // segurar o telefone como quiser que a arena segue horizontal.
  //
  // O toque atravessa a rotação certo: o navegador desfaz o `transform` ao
  // entregar o evento ao iframe, e lá dentro o Godot recebe as coordenadas do
  // documento DELE, que não está girado.
  const [retrato, setRetrato] = useState(false)

  // `dedo` é o aparelho (a BUILD quem escolhe é o `pesada` lá de cima — são
  // perguntas diferentes). NÃO HÁ MAIS PORTA: a tela cheia e a trava deitada
  // são pedidas no clique do botão "Jogo" do perfil (o gesto que o navegador
  // exige), e o que aquela trava não alcança (iPhone, ou quem entrou por link)
  // a moldura girada resolve. Uma porta pedindo "gire o telefone" sobre uma
  // tela que já gira sozinha só custaria um toque.
  const [dedo, setDedo] = useState(false)
  const girado = dedo && retrato

  // AO SAIR DO JOGO o site volta ao normal: sem isto, a Freelandoo inteira
  // seguiria em tela cheia e travada na horizontal depois do "Voltar".
  useEffect(() => () => solta(), [])

  useEffect(() => {
    // A GPU decide a BUILD; o dedo decide a MOLDURA (porta, orientação,
    // controles de toque). São duas perguntas diferentes e é de propósito: o
    // 2-em-1 tem dedo e lê S3TC, e precisa das duas respostas separadas.
    const aqui = new URLSearchParams(window.location.search)
    const repasse = new URLSearchParams()
    for (const k of ["diag", "toque"]) if (aqui.get(k) === "1") repasse.set(k, "1")
    setChaves(repasse.toString())
    // ⚠️ Toque recebe sempre a de celular: o Safari do iPhone DIZ que lê S3TC
    // e baixava a build de computador (318 MB inteiros na memória), e o iOS
    // matava a aba depois de poucas lutas. Ver `public/jogar/motor.html`.
    setPesada(!window.matchMedia("(pointer: coarse)").matches && leS3TC())

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

  if (status === "loading") {
    return <Aviso titulo={t("waitTitle", "Um instante")} texto={t("waitText", "Conferindo sua sessão…")} />
  }

  if (status !== "authenticated") {
    return (
      <Aviso
        titulo={t("loginTitle", "Entre para jogar")}
        texto={t("loginText", "Seu monstro nasce do seu perfil da Freelandoo — sem conta não há de quem nascer.")}
        acao={{ href: "/login?next=/monsters", rotulo: t("loginCta", "Entrar") }}
      />
    )
  }

  if (!isAdmin) {
    return (
      <Aviso
        titulo={t("lockedTitle", "Ainda não")}
        texto={t("lockedText", "O jogo está em teste fechado e por enquanto só abre para a administração.")}
        acao={{ href: "/account", rotulo: t("back", "Voltar") }}
      />
    )
  }

  if (!jogoUrl || !origemJogo) {
    return (
      <Aviso
        titulo={t("noBuildTitle", "A build ainda não foi publicada")}
        texto={t("noBuildText", "Falta apontar NEXT_PUBLIC_MONSTERS_JOGO_URL para o endereço da build Godot.")}
      />
    )
  }

  return (
    <main className="fl-sharp fixed inset-0 z-50 bg-[#0b0804]">
      {/* O IFRAME SÓ NASCE DEPOIS QUE SE PERGUNTA À GPU. `pesada === null` é o
          primeiro quadro, antes de o efeito ter rodado — e montar aqui seria
          começar a baixar uma build no palpite, para trocar de `src` um
          instante depois e baixar tudo de novo. São 56 ou 196 MB de `.pck` de
          diferença, e é justamente o peso que derruba a aba. */}
      {/* A MOLDURA GIRADA. Em pé, ela mede a tela ao contrário (altura por
          largura) e gira 90° no sentido horário a partir do canto de cima: o
          iframe recebe uma janela deitada e o jogo nem sabe que o aparelho
          está em pé. Ela é a MESMA div nos dois estados — trocar o iframe de
          pai o remontaria e recomeçaria o download da build. */}
      <div
        className="absolute left-0 top-0"
        style={
          girado
            ? {
                width: "100dvh",
                height: "100dvw",
                transformOrigin: "top left",
                transform: "rotate(90deg) translateY(-100%)",
              }
            : { width: "100%", height: "100%" }
        }
      >
      {pesada !== null && (
      <iframe
        ref={frame}
        src={chaves ? `${jogoUrl}${jogoUrl.includes("?") ? "&" : "?"}${chaves}` : jogoUrl}
        title={t("frameTitle", "EVO Brazil")}
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
      )}
      </div>

      {/* NO CENTRO DE BAIXO, e nao no canto de cima: o canto superior esquerdo
          e onde o jogo poe o logotipo (placa de kanji + EVO BRAZIL) em todas
          as telas, e o botao ficava por cima dele. O centro de baixo e o unico
          lugar que nenhuma tela do jogo ocupa — e mesmo assim cobria o HUD.
          Por isso ele SÓ EXISTE ATÉ O `jogo:pronto`: carregando, com erro ou
          na porta do celular. Com o jogo de pé, a saída é do jogo. */}
      {!pronto && (
      <Link
        href="/account"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur transition hover:border-white/35 hover:text-white"
      >
        ← {t("back", "Voltar")}
      </Link>
      )}

      {!entregue && (
        <span className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/55 px-3 py-1 text-[11px] text-white/50 backdrop-blur">
          {t("loading", "carregando o mundo…")}
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
    <main className="fl-sharp flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0b0804] px-6 text-center">
      <h1 className="fl-headline text-3xl text-[#f2b705]">{titulo}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/60">{texto}</p>
      {acao && (
        <Link
          href={acao.href}
          className="mt-2 bg-[#f2b705] px-5 py-2 text-sm font-semibold text-[#0b0b0d] transition hover:bg-[#e0a500]"
        >
          {acao.rotulo}
        </Link>
      )}
    </main>
  )
}
