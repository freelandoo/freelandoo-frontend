"use client"

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { DollarSign, Dumbbell, Gamepad2, Star, type LucideIcon } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

/**
 * Os botões RETRÁTEIS do headcard — PEÇA ÚNICA das duas superfícies (o headcard
 * do /account e o `ProfileHeadCard` do perfil).
 *
 * São três, empilhados um em cima do outro atrás da foto: Games (roxo, o mais
 * alto — sobe até por cima do banner da manifestação), Carteira (verde) e
 * Fitness (laranja). Fechados, só o ícone escapa pela direita da
 * foto; no hover ele espia um pouco mais para fora; no clique abre e mostra o
 * rótulo. O SEGUNDO clique é que navega — abrir e ir embora são gestos
 * diferentes, e o ícone mal aparece de trás da foto: fazê-lo navegar no
 * primeiro toque o transformaria numa armadilha.
 *
 * COMO ELES FICAM ATRÁS DA FOTO, sem z-index negativo: a pilha é o PRIMEIRO
 * filho da coluna do avatar e o card da foto é `relative`. Dois elementos
 * posicionados sem z-index pintam na ordem do DOM, então a foto cobre a pilha
 * naturalmente. Um `-z-10` funcionaria no /account (a linha é `relative z-10` e
 * forma contexto de empilhamento) mas SUMIRIA no ProfileHeadCard, onde o
 * contexto mais próximo é o `<article>` — a pilha iria parar atrás do papel
 * creme do card.
 *
 * `avatarPadClass` é o padding-esquerdo que empurra o conteúdo para além da
 * foto, e por isso tem que casar com a LARGURA DO AVATAR daquela superfície
 * (/account é w-24 md:w-28; ProfileHeadCard é w-24 md:w-32). É esse padding que
 * faz o corpo colorido nascer debaixo da foto em vez de ao lado dela.
 * MEXEU NA LARGURA DO AVATAR? Ajustar o padding junto.
 *
 * A largura do avatar NÃO BASTA, porém: o card da foto é rotacionado -3deg
 * (o canto avança ~4px além da caixa) e tem sombra dura de 6px para a direita,
 * e a sombra é pintada DEPOIS da pilha, logo por cima dela. Com o conteúdo
 * começando na largura nua, o ícone nascia debaixo desses ~10px e aparecia
 * cortado pela metade. Daí o CLEARANCE fixo abaixo — ele é a folga entre a
 * caixa da foto e a borda VISÍVEL dela, igual nas duas superfícies, então mora
 * aqui e não na prop.
 *
 * Botão novo de headcard entra AQUI, nunca como markup solto na página: peça de
 * headcard escrita duas vezes diverge em silêncio (foi assim que a foto de
 * perfil sumiu de uma das telas).
 *
 * A Carteira tem headcard próprio com OUTROS três botões (cofrinho, cupom e
 * mercado, que abrem painéis da própria página em vez de navegar). O que ela
 * reusa é o `PillStack` abaixo — a mecânica —, não este preset: a lista de
 * botões é da superfície, a mecânica é de todo mundo.
 */

/** Folga fixa da rotação (-3deg) + sombra dura da foto. Ver comentário acima. */
const CLEARANCE = "pl-3.5"

/**
 * O respiro entre o rótulo e o ícone, em px.
 *
 * Está aqui como NÚMERO, e não como classe, porque ele entra numa CONTA: o
 * deslocamento que fecha o pill vale `largura do rótulo + este valor`. Escrito
 * como `mr-2` no JSX, a conta teria que repetir o 8 do outro lado — e no dia
 * em que um dos dois mudasse, o pill fecharia mostrando um pedaço do texto ao
 * lado do ícone, sem erro nenhum aparecer.
 */
const LABEL_GAP = 8

/**
 * Altura da pilha CHEIA do headcard, em px: 4 pills de 36px (h-9) + 3 gaps de
 * 6px (gap-1.5). A foto do headcard precisa ser MAIOR que isto para cobrir a
 * pilha — é o que faz os pills escaparem só pela direita, como o desenho pede.
 * A conta de lá vive em `AVATAR_FRAME_CLASS`
 * (components/profile/profile-head-card.tsx).
 *
 * A Carteira monta a própria pilha (3 botões) com o `PillStack` cru, então esta
 * constante não vale para ela — lá a conta é 3 × 36 + 2 × 6 = 120px.
 */
export const PILL_STACK_PX = 162

export type PillSpec = {
  key: string
  icon: LucideIcon
  label: string
  ariaLabel: string
  /** Cor do corpo e do hover. */
  bg: string
  bgHover: string
  href?: string
  /** Destino resolvido na hora do clique (Games precisa criar-ou-abrir). */
  onOpen?: () => void
  /**
   * Marca o pill cujo destino já está no ar. Só escurece o corpo (a cor de
   * hover): mantê-lo ABERTO seria a alternativa óbvia, mas o rótulo aberto
   * cobre o que está à direita da foto enquanto durar o painel.
   */
  active?: boolean
  /**
   * Bolinha vermelha de "tem coisa te esperando lá dentro" — o quadradinho da
   * casa, que não é redondo (regra dos cantos retos).
   *
   * Fica na quina de CIMA À DIREITA porque é a única parte do pill fechado que
   * escapa de trás da foto: na esquerda ela nasceria coberta e o aviso não
   * existiria para quem não abre o botão.
   */
  dot?: boolean
  /** O que a bolinha está avisando (vira title/aria dela). */
  dotLabel?: string
}

/**
 * ⚠️ MEMOIZADO, e isto é o que mantém a animação honesta fora de uma tela
 * pequena. A pilha é montada DENTRO de páginas gigantes (a da comunidade tem
 * ~2700 linhas num componente só): sem `memo`, qualquer estado que mude lá em
 * cima re-renderiza os três pills — inclusive no meio do spring, que é
 * justamente quando o quadro não pode ser perdido. Ver o `memo` do `PillStack`
 * abaixo e o `onArm` estável que o alimenta.
 */
const Pill = memo(function Pill({
  spec,
  open,
  onArm,
  avatarPadClass,
}: {
  spec: PillSpec
  open: boolean
  /** Recebe a chave para poder ser ESTÁVEL — ver o `armPill` do `PillStack`. */
  onArm: (key: string) => void
  avatarPadClass: string
}) {
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 24 }

  /**
   * ⚠️ A ABERTURA NÃO MEXE MAIS NA LARGURA DE NADA — e é essa a diferença
   * entre 5 quadros por segundo e a animação lisa que o perfil sempre teve.
   *
   * O desenho é o mesmo de antes: fechado só o ícone escapa por trás da foto;
   * aberto o rótulo aparece à esquerda dele. O que mudou é COMO.
   *
   * Antes o rótulo crescia (`maxWidth`, depois `width`). Largura é LAYOUT:
   * cada quadro obriga o navegador a recalcular posições, e esse cálculo custa
   * proporcional ao TAMANHO DO DOCUMENTO. Numa página leve como o perfil isso
   * não aparece; na plataforma de games, que desenha o feed inteiro, cada
   * quadro passava dos 200ms — os "5 fps" que o Alex viu. O pill sempre foi o
   * mesmo nas duas telas; o que difere é quanto custa um layout em cada uma.
   *
   * Agora o rótulo está SEMPRE lá, com a largura natural dele, e o pill inteiro
   * DESLIZA: fechado ele fica deslocado para a esquerda exatamente o tamanho do
   * rótulo (mais os 8px de respiro), o que enfia o texto atrás da foto e deixa
   * o ícone no mesmo lugar de sempre. Abrir é voltar o deslocamento a zero.
   * `transform` e `opacity` são as duas coisas que o navegador COMPÕE sem
   * recalcular nem repintar nada — o custo por quadro deixa de depender da
   * página.
   *
   * ⚠️ POR QUE O DESLOCAMENTO PRECISA SER MEDIDO. Ele vale `rótulo + 8`, e o
   * rótulo muda com o texto e com o idioma — não há como escrevê-lo no CSS. A
   * medida sai em `useLayoutEffect`, que roda DEPOIS do DOM e ANTES da pintura:
   * o navegador nunca chega a mostrar o estado sem medida. Um `useEffect` aqui
   * piscaria o pill aberto no primeiro quadro.
   *
   * ⚠️ E O `ResizeObserver` NÃO É LUXO: o dicionário do i18n chega DEPOIS da
   * montagem (é carregado por `import()`), então o rótulo troca de "Games" para
   * "Games"/"Juegos" com a tela já de pé — e a fonte da casa também chega
   * depois. Sem observar, o deslocamento continuaria valendo o texto antigo e o
   * pill fecharia torto, mostrando um pedaço do rótulo ao lado do ícone.
   */
  const labelRef = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)
  /**
   * ⚠️ O PRIMEIRO DESLOCAMENTO NÃO PODE SER ANIMADO.
   *
   * O deslocamento nasce em 0 (ninguém mediu ainda) e vira `-rótulo` assim que
   * a medida sai. Para o framer isso é uma mudança de alvo como outra
   * qualquer: ele animaria dali até lá, e o pill ENTRARIA NA TELA aberto,
   * deslizando para fechado, a cada carregamento de página.
   *
   * Este estado vira `true` num `useEffect` — ou seja, depois da PRIMEIRA
   * PINTURA. Até lá a transição é instantânea e a medida se acomoda sem
   * ninguém ver; do primeiro clique em diante vale o spring de sempre.
   */
  const [settled, setSettled] = useState(false)
  useEffect(() => setSettled(true), [])

  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) return
    // `LABEL_GAP` é o respiro entre rótulo e ícone. Ele entra na conta porque
    // fechado ele também tem que sumir atrás da foto.
    const measure = () => setShift(el.offsetWidth + LABEL_GAP)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [spec.label])

  const Icon = spec.icon
  const body = (
    <span className={cn("flex items-center", CLEARANCE)}>
      {/*
        LARGURA NATURAL, SEMPRE — nada aqui anima. Quem se move é o pill
        inteiro (ver o comentário do deslocamento acima). `whitespace-nowrap`
        porque o rótulo não pode quebrar em duas linhas: a pilha tem altura
        fixa e a conta que faz a foto cobri-la depende disso.
      */}
      <span
        ref={labelRef}
        style={{ marginRight: LABEL_GAP, opacity: open ? 1 : 0 }}
        className="fl-pill-label whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider"
      >
        {spec.label}
      </span>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
    </span>
  )

  /**
   * ⚠️ O HOVER É 100% CSS, SEM UMA LINHA DE JAVASCRIPT — e essa é a correção
   * que o Alex pediu ("o hover dos botões do game está bem lento PARA
   * APARECER").
   *
   * Aqui havia `onMouseEnter`/`onMouseLeave` do React trocando o
   * `style.background` na mão, mais um `whileHover` do framer para o
   * empurrãozinho de 7px. Os dois dependem da THREAD PRINCIPAL: numa página
   * cheia (a da comunidade carrega o feed inteiro), o evento do mouse entra na
   * fila atrás do que estiver rodando, e o hover só acende quando chegar a vez
   * dele. Foi por isso que ele parecia "lento" numa tela e instantâneo em
   * outra, com o MESMO componente: nada ali era lento — era tardio.
   *
   * `:hover` do CSS não passa por fila nenhuma. As duas cores descem como
   * variáveis (elas são DADO de cada pill, então não cabem numa folha de
   * estilo), e quem decide qual delas aparece é a `.fl-pill` em globals.css.
   * O empurrão de 7px foi junto, pela mesma razão.
   *
   * ⚠️ `data-pill-open` existe para o CSS saber que, ABERTO, o hover NÃO
   * empurra mais nada: o deslocamento de 10px do estado aberto já é do framer,
   * e somar os dois levaria o pill a 17px enquanto o mouse estivesse em cima.
   */
  const pillVars = {
    "--fl-pill-bg": spec.active ? spec.bgHover : spec.bg,
    "--fl-pill-bg-hover": spec.bgHover,
  } as React.CSSProperties

  // ALTURA FIXA (h-9 = 36px), e não padding: a altura de um pill com padding
  // depende do `line-height` HERDADO do rótulo, que muda conforme a árvore em
  // que a pilha for montada. Sem número certo aqui, "a foto cobre a pilha" vira
  // estimativa — e foi assim que a foto cresceu em 2026-09-05 e os pills
  // continuaram escapando por cima. Com h-9, a pilha mede
  // 3 × 36 + 2 × 6 (gap-1.5) = 120px, e a folga dentro da foto é conta fechada.
  // MEXEU AQUI OU NO NÚMERO DE PILLS? Confira PILL_STACK_PX abaixo.
  // `fl-pill` (globals.css) carrega a cor, o hover e o empurrão — ver acima.
  // Nada de `transition-colors` aqui: a transição da cor mora lá, curta, junto
  // da regra que a dispara.
  const className = cn(
    "fl-pill flex h-9 w-full shrink-0 items-center border-2 border-[#0B0B0D] pr-3 text-left",
    "text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D]",
    avatarPadClass
  )

  return (
    // ⚠️ `w-max`: cada linha tem a largura do PRÓPRIO pill, e não a da pilha.
    // Com `w-full` (como era) todos os pills ficavam do tamanho do mais largo,
    // e o deslocamento de fechar — que é o rótulo DAQUELE pill — deixaria o
    // ícone dos rótulos curtos parar atrás da foto. De quebra, abrir um pill
    // deixa de esticar os outros dois.
    <motion.div
      className="fl-pill-row relative w-max"
      data-pill-open={open ? "true" : undefined}
      initial={false}
      animate={{ x: open ? 10 : -shift }}
      transition={settled ? spring : { duration: 0 }}
    >
      {spec.dot && (
        // ⚠️ A BOLINHA ANDA JUNTO no hover, e por isso ela tem classe própria:
        // ela é irmã do pill (não filha), então o empurrão dele não a levaria
        // — e ela ficaria para trás, sozinha, na quina de cima.
        <span
          className="fl-pill-dot pointer-events-none absolute right-1 top-1 z-10 h-2.5 w-2.5 border border-[#0B0B0D] bg-[#ff3b30]"
          role="status"
          aria-label={spec.dotLabel}
          title={spec.dotLabel}
        />
      )}
      {spec.href ? (
        <Link
          href={spec.href}
          aria-expanded={open}
          aria-label={spec.ariaLabel}
          title={spec.ariaLabel}
          onClick={(e) => {
            if (!open) {
              e.preventDefault()
              onArm(spec.key)
            }
          }}
          className={className}
          style={pillVars}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-label={spec.ariaLabel}
          title={spec.ariaLabel}
          onClick={() => (open ? spec.onOpen?.() : onArm(spec.key))}
          className={className}
          style={pillVars}
        >
          {body}
        </button>
      )}
    </motion.div>
  )
})

/**
 * A mecânica dos pills, sem opinião sobre QUAIS são: um aberto por vez, fecha
 * por clique fora e Esc, empilhados de cima para baixo atrás da foto.
 *
 * Existe separada do preset do headcard porque a Carteira precisa dos MESMOS
 * botões com outro conteúdo (cofrinho, cupom e mercado, que abrem painéis da
 * própria página em vez de navegar). Reescrever a mecânica lá dentro seria a
 * duplicação que este arquivo existe para impedir.
 *
 * Qual destino está no ar é dito pela COR (`spec.active`), não por deixar o
 * pill aberto: aberto, o rótulo cobriria o que estiver à direita da foto o
 * tempo todo em que o painel durasse.
 *
 * ⚠️ MEMOIZADO — e o `memo` SÓ ENGATA COM `pills` ESTÁVEL. Ele existe porque a
 * pilha é montada dentro de páginas enormes (a da comunidade é um componente
 * único de ~2700 linhas): sem ele, qualquer estado daquela página re-renderiza
 * os pills no meio do spring. Quem monta precisa entregar o array em `useMemo`
 * — a página da comunidade e o headcard da Carteira já entregam. O preset
 * `HeadcardPills` abaixo e a academia ainda montam o array no corpo do render,
 * então lá o `memo` não engata (não é regressão — só não há ganho). Se um dia
 * a academia engasgar como games engasgou, é por aí que se começa.
 */
export const PillStack = memo(function PillStack({
  pills,
  avatarPadClass,
  className,
}: {
  pills: PillSpec[]
  avatarPadClass: string
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Um aberto por vez: três rótulos abertos ao mesmo tempo viram uma parede de
  // texto saindo de trás da foto.
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    if (!openKey) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenKey(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [openKey])

  // `useCallback` sem dependência: o setter do React é estável, então esta
  // função nasce UMA vez para a vida da pilha. É ela que faz o `memo` do `Pill`
  // valer alguma coisa.
  const armPill = useCallback((key: string) => setOpenKey(key), [])

  if (pills.length === 0) return null

  return (
    // ⚠️ `items-start` + `overflow-hidden` são as duas metades do deslizar.
    //
    // `items-start`: sem ele o flex ESTICA as linhas até a largura da pilha, e
    // `w-max` de cada linha não valeria nada.
    //
    // `overflow-hidden`: fechado, o pill fica deslocado para a esquerda o
    // tamanho do rótulo, e num rótulo longo a ponta dele passaria da borda
    // esquerda da pilha — que é justamente onde a foto termina de cobrir. O
    // recorte apara isso. O `pr-5`/`pb-1` devolvem o espaço que o recorte
    // tiraria do lado bom: os 10px de aberto, os 7px de hover e os 3px da
    // sombra dura. Sem eles o pill aberto sairia com a borda direita cortada.
    <div ref={rootRef} className={cn("flex flex-col items-start gap-1.5 overflow-hidden pb-1 pr-5", className)}>
      {pills.map((spec) => (
        <Pill
          key={spec.key}
          spec={spec}
          open={openKey === spec.key}
          // ⚠️ ESTÁVEL DE PROPÓSITO (`armPill`, em useCallback abaixo): uma
          // arrow escrita aqui nasceria nova a cada render e derrubaria o
          // `memo` do `Pill` sozinha, deixando-o de enfeite.
          onArm={armPill}
          avatarPadClass={avatarPadClass}
        />
      ))}
    </div>
  )
})

export function HeadcardPills({
  avatarPadClass = "pl-28 md:pl-32",
  className,
  visitorOf = null,
}: {
  avatarPadClass?: string
  className?: string
  /**
   * O @username do dono do perfil que se está VISITANDO. Presente, a pilha
   * vira uma só: o pill de Games, levando à plataforma com o contexto DELE.
   *
   * ⚠️ É a MESMA peça de propósito, e não um botão novo ao lado. Os outros
   * pills (Business, Carteira, Fitness) são da CONTA de quem olha e não têm
   * o que mostrar no perfil alheio; games é o único que tem, porque a
   * plataforma é de todos e o que está dentro dela é de cada um. Um segundo
   * componente ganharia uma cor, um ícone ou uma correção só de um lado — foi
   * assim que a foto de perfil sumiu de uma das superfícies.
   */
  visitorOf?: string | null
}) {
  const t = useTranslations("Account")
  const router = useRouter()
  const [going, setGoing] = useState<string | null>(null)

  // A Carteira é NATIVA (saiu da Loja de Funções na mig 216): ninguém compra. O
  // que ainda pode escondê-la é só a preferência da seção "Funções" do menu
  // lateral — `useUserFeature` devolve `owned && pref`, e com a função fora da
  // venda `owned` é sempre true.
  const walletOn = useUserFeature("wallet")
  // Flag global do admin E preferência do usuário em consts SEPARADAS: um `&&`
  // inline deixaria a segunda chamada de hook condicional (rules-of-hooks).
  const academyFlag = useFeature("fitness_academias")
  const fitnessPref = useUserFeature("fitness_academias")
  const gamesFlag = useFeature("games")
  // Mesma preferência que escondia "Minha comunidade" no menu da foto.
  const communitiesOn = useUserFeature("communities")

  /**
   * A COMUNIDADE DA PESSOA não tem URL fixa: quem já tem, entra na dela; quem
   * não tem, ganha uma vazia e cai na página já editável — MESMA regra do menu
   * dos espaços (a comunidade nasce sem formulário; o assunto se escolhe no
   * headcard dela).
   *
   * ⚠️ GAMES DEIXOU DE PASSAR POR AQUI (mig 232). Ele virou PLATAFORMA do site
   * inteiro: não há "a de cada um" para procurar, e a busca em `/me/spaces`
   * seria uma requisição para ler um balde que nunca mais enche.
   */
  const openSpace = useCallback(
    async (key: string, spaceKey: "common", createPath: string) => {
      if (going) return
      const token = getToken()
      if (!token) return
      setGoing(key)
      try {
        const res = await fetch("/api/me/spaces", { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json().catch(() => null)
        const mine = res.ok ? json?.spaces?.[spaceKey]?.[0]?.id_profile : null
        if (mine) {
          router.push(`/comunidades/${mine}`)
          return
        }
        const created = await fetch(createPath, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: "{}",
        })
        const body = await created.json().catch(() => null)
        if (created.ok && body?.community?.id_profile) {
          router.push(`/comunidades/${body.community.id_profile}`)
          return
        }
        // A comunidade comum é a única que pode ser RECUSADA (teto, nível).
        // Engolir o erro deixaria o pill parecendo quebrado — no menu dos
        // espaços essa recusa aparecia escrita; aqui não há onde escrevê-la.
        if (body?.error) toast.error(body.error)
      } catch {
        /* silencioso: o pill continua aberto e a pessoa tenta de novo */
      } finally {
        setGoing(null)
      }
    },
    [going, router],
  )

  /**
   * ABRE A PLATAFORMA DE GAMES — uma só, do site inteiro (mig 232).
   *
   * ⚠️ UMA REQUISIÇÃO, e não duas: o backend faz get-or-create do singleton e
   * devolve sempre a MESMA linha. O caminho antigo (procurar em `/me/spaces` e
   * criar se não achasse) ainda funcionaria, mas leria um balde que a mig 232
   * esvaziou de vez — e pagaria uma ida ao servidor para descobrir isso toda
   * vez que alguém apertasse o pill.
   */
  const openGamesPlatform = useCallback(async () => {
    if (going) return
    const token = getToken()
    if (!token) return
    setGoing("games")
    try {
      const res = await fetch("/api/games/platform", { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => null)
      if (res.ok && body?.community?.id_profile) {
        // O DONO DO CONTEXTO viaja na URL, e por @username: é o que cabe numa
        // mensagem ("olha o meu games") e é como a página vai reabrir no F5.
        // Sem ele a plataforma abre no recorte de quem está olhando, que é o
        // comportamento de sempre e continua sendo o certo pelo próprio pill.
        const q = visitorOf ? `?de=${encodeURIComponent(visitorOf.replace(/^@/, ""))}` : ""
        router.push(`/comunidades/${body.community.id_profile}${q}`)
        return
      }
      // A recusa aqui é o kill-switch da flag `games`, e ela vem escrita.
      // Engoli-la deixaria o pill parecendo quebrado.
      if (body?.error) toast.error(body.error)
    } catch {
      /* silencioso: o pill continua aberto e a pessoa tenta de novo */
    } finally {
      setGoing(null)
    }
  }, [going, router, visitorOf])

  const pills: PillSpec[] = []

  // ⚠️ VISITANTE: a pilha é UM pill só. Os de baixo (Business, Carteira,
  // Fitness) abrem coisas da CONTA de quem olha — oferecê-los pendurados na
  // foto de outra pessoa diria que são dela. Games é a exceção porque a
  // plataforma não é de ninguém: o pill leva ao recorte do dono do perfil.
  const gamesSpec: PillSpec = {
    key: "games",
    icon: Gamepad2,
    label: t("gamesPill", "Games"),
    ariaLabel: visitorOf
      ? t("openGamesOfAria", "Ver o games de {who}").replace("{who}", `@${visitorOf.replace(/^@/, "")}`)
      : t("openGamesPlatformAria", "Abrir a plataforma de games"),
    bg: "#6D28D9",
    bgHover: "#5B21B6",
    onOpen: openGamesPlatform,
  }

  // Um RETURN só para os dois papéis: a pilha do visitante é a mesma peça com
  // um item, e não um caminho paralelo. Separados, o posicionamento (que é
  // absoluto e centrado na foto) precisaria estar escrito duas vezes.
  const visiting = !!visitorOf

  // Business é o PRIMEIRO da pilha. Ele é a porta da comunidade da pessoa, que
  // SAIU do menu da foto de perfil (pedido do Alex, 2026-09-05) — lá ela era um
  // item entre pet, carro, condomínio e rua; aqui ela tem botão próprio.
  if (!visiting && communitiesOn) {
    pills.push({
      key: "business",
      icon: Star,
      label: t("businessPill", "Business"),
      ariaLabel: t("openCommunityAria", "Abrir minha comunidade"),
      bg: "#BE185D",
      bgHover: "#9F1239",
      onOpen: () => openSpace("business", "common", "/api/communities"),
    })
  }

  // Games vem logo abaixo: fica acima do cifrão e sobe até por cima do
  // banner da manifestação (decisão do Alex 2026-09-03). Desde a mig 232 ele
  // é a porta da PLATAFORMA — a mesma para todo mundo —, e continua sendo o
  // único caminho até o ambiente (o Monsters saiu da barra principal).
  if (gamesFlag) {
    pills.push(gamesSpec)
  }

  if (!visiting && walletOn) {
    pills.push({
      key: "wallet",
      icon: DollarSign,
      label: t("walletPill", "Carteira"),
      ariaLabel: t("openWallet", "Abrir minha Carteira"),
      bg: "#15803D",
      bgHover: "#166F36",
      href: "/wallet",
    })
  }

  if (!visiting && academyFlag && fitnessPref) {
    pills.push({
      key: "fitness",
      icon: Dumbbell,
      label: t("fitnessPill", "Fitness"),
      ariaLabel: t("fitnessAria", "Painel fitness: calorias, água, peso e treinos"),
      bg: "#C2410C",
      bgHover: "#9A3412",
      href: "/fitness",
    })
  }

  return (
    <PillStack
      pills={pills}
      avatarPadClass={avatarPadClass}
      // CENTRADA NA FOTO. Antes a pilha era ancorada numa porcentagem com um
      // deslocamento fixo (`48% - 2.5rem`), e o Games subia acima da borda de
      // cima da foto, caindo sobre o banner. O Alex pediu (2026-09-05) que a
      // foto ALCANCE o Games: a foto cresceu para 2/3 e a pilha voltou ao
      // centro, então ela cabe inteira e volta a escapar SÓ pela direita — que
      // é a regra do desenho.
      //
      // Centrar em vez de fixar um offset é o que mantém isso verdade nos dois
      // breakpoints sem número mágico por tamanho: a folga é
      // (altura da foto − PILL_STACK_PX) / 2, positiva em ambos.
      //
      // A coluna do avatar tem a altura da FOTO (as estrelas saíram dela em
      // 2026-09-05), então 50% da coluna é 50% da foto.
      className={cn("absolute left-0 top-1/2 -translate-y-1/2", className)}
    />
  )
}
