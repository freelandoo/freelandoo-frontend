"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import {
  DEFAULT_QUICK_PILLS,
  QUICK_ENTRIES,
  QUICK_PILL_MAX,
  useQuickAvailability,
  useQuickPills,
  type QuickKey,
} from "@/components/profile/quick-access"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

/**
 * Os botões RETRÁTEIS do headcard — PEÇA ÚNICA das duas superfícies (o headcard
 * do /account e o `ProfileHeadCard` do perfil).
 *
 * São três, empilhados um em cima do outro atrás da foto: Business (o mais
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
  /**
   * Cor do texto e do ícone. O padrão é o creme da casa, que serve a todo pill
   * escuro; um corpo CLARO (o amarelo da Estante em games) precisa de tinta
   * preta, senão o rótulo some dentro do botão.
   */
  fg?: string
  href?: string
  /** Destino resolvido na hora do clique (o Business precisa criar-ou-abrir). */
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

function Pill({
  spec,
  open,
  onArm,
  avatarPadClass,
}: {
  spec: PillSpec
  open: boolean
  onArm: () => void
  avatarPadClass: string
}) {
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 24 }

  const Icon = spec.icon
  const body = (
    <span className={cn("flex items-center", CLEARANCE)}>
      <motion.span
        initial={false}
        animate={{
          maxWidth: open ? 200 : 0,
          opacity: open ? 1 : 0,
          marginRight: open ? 8 : 0,
        }}
        transition={spring}
        className="overflow-hidden whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider"
      >
        {spec.label}
      </motion.span>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
    </span>
  )

  const baseBg = spec.active ? spec.bgHover : spec.bg

  // ALTURA FIXA (h-9 = 36px), e não padding: a altura de um pill com padding
  // depende do `line-height` HERDADO do rótulo, que muda conforme a árvore em
  // que a pilha for montada. Sem número certo aqui, "a foto cobre a pilha" vira
  // estimativa — e foi assim que a foto cresceu em 2026-09-05 e os pills
  // continuaram escapando por cima. Com h-9, a pilha mede
  // 3 × 36 + 2 × 6 (gap-1.5) = 120px, e a folga dentro da foto é conta fechada.
  // MEXEU AQUI OU NO NÚMERO DE PILLS? Confira PILL_STACK_PX abaixo.
  const className = cn(
    "flex h-9 w-full shrink-0 items-center border-2 border-[#0B0B0D] pr-3 text-left",
    "text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition-colors",
    avatarPadClass
  )

  return (
    <motion.div
      className="relative"
      initial={false}
      animate={{ x: open ? 10 : 0 }}
      whileHover={reduceMotion ? undefined : { x: open ? 10 : 7 }}
      transition={spring}
    >
      {spec.dot && (
        <span
          className="pointer-events-none absolute right-1 top-1 z-10 h-2.5 w-2.5 border border-[#0B0B0D] bg-[#ff3b30]"
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
              onArm()
            }
          }}
          className={className}
          style={{ background: baseBg, color: spec.fg }}
          onMouseEnter={(e) => (e.currentTarget.style.background = spec.bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-label={spec.ariaLabel}
          title={spec.ariaLabel}
          onClick={() => (open ? spec.onOpen?.() : onArm())}
          className={className}
          style={{ background: baseBg, color: spec.fg }}
          onMouseEnter={(e) => (e.currentTarget.style.background = spec.bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
        >
          {body}
        </button>
      )}
    </motion.div>
  )
}

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
 */
export function PillStack({
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

  if (pills.length === 0) return null

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1.5", className)}>
      {pills.map((spec) => (
        <Pill
          key={spec.key}
          spec={spec}
          open={openKey === spec.key}
          onArm={() => setOpenKey(spec.key)}
          avatarPadClass={avatarPadClass}
        />
      ))}
    </div>
  )
}

/**
 * ⚠️ A PILHA É DO DONO, e desde que a plataforma de games saiu do ar ela só
 * existe para ele. O preset tinha uma prop `visitorOf` que, no perfil alheio,
 * reduzia a pilha a UM pill — o de Games, o único que fazia sentido ali,
 * porque a plataforma não era de ninguém e o que estava dentro dela era de
 * cada um. Sem games, todos os pills restantes (Business, Carteira, Fitness)
 * abrem coisas da CONTA de quem olha, e pendurados na foto de outra pessoa
 * diriam que são dela — então no perfil alheio não há pilha nenhuma, e a prop
 * saiu junto em vez de ficar como um parâmetro que ninguém alimenta.
 */
export function HeadcardPills({
  avatarPadClass = "pl-28 md:pl-32",
  className,
}: {
  avatarPadClass?: string
  className?: string
}) {
  const t = useTranslations("Account")
  const ts = useTranslations("Spaces")
  const router = useRouter()
  const [going, setGoing] = useState<string | null>(null)

  // O ACESSO RÁPIDO É ESCOLHA DA PESSOA (mig 260, "Gerenciar pills" no menu da
  // foto). `null` = nunca escolheu → a pilha de sempre. As cores saem do MESMO
  // catálogo que pinta as linhas do menu (components/profile/quick-access.ts).
  const available = useQuickAvailability()
  const { pills: chosen } = useQuickPills()

  /**
   * OS ESPAÇOS NÃO TÊM URL FIXA: quem já tem, entra no seu; quem não tem, ganha
   * um vazio e cai na página já editável — MESMA regra do menu dos espaços (a
   * comunidade nasce sem formulário; o assunto se escolhe no headcard dela).
   * Com mais de um (pet, carro), o pill abre o primeiro da lista.
   *
   * ⚠️ GAMES NÃO PASSA POR AQUI (mig 232): ele é PLATAFORMA, com URL fixa.
   */
  const openSpace = useCallback(
    async (key: QuickKey) => {
      if (going) return
      const token = getToken()
      if (!token) return
      const spaceKey = key === "business" ? "common" : key
      setGoing(key)
      try {
        const res = await fetch("/api/me/spaces", { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json().catch(() => null)
        const mine = res.ok ? json?.spaces?.[spaceKey]?.[0]?.id_profile : null
        if (mine) {
          router.push(`/comunidades/${mine}`)
          return
        }
        // Condomínio e bairro se cadastram por tela própria (endereço, CEP).
        if (key === "condo") return router.push("/comunidades/criar?tipo=condo")
        if (key === "neighborhood") return router.push("/bairro")
        const createPath = key === "pet" ? "/api/pets" : key === "car" ? "/api/cars" : "/api/communities"
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
        // Engolir o erro deixaria o pill parecendo quebrado.
        if (body?.error) toast.error(body.error)
      } catch {
        /* silencioso: o pill continua aberto e a pessoa tenta de novo */
      } finally {
        setGoing(null)
      }
    },
    [going, router],
  )

  // Rótulos e arias dos quatro pills que já existiam continuam no ns Account
  // (as chaves estão nos três dicionários); os espaços usam o ns Spaces, o
  // mesmo das linhas do menu.
  const labelOf = (k: QuickKey): { label: string; aria: string } => {
    switch (k) {
      case "business":
        return { label: t("businessPill", "Business"), aria: t("openCommunityAria", "Abrir minha comunidade") }
      case "wallet":
        return { label: t("walletPill", "Carteira"), aria: t("openWallet", "Abrir minha Carteira") }
      case "fitness":
        return { label: t("fitnessPill", "Fitness"), aria: t("fitnessAria", "Painel fitness: calorias, água, peso e treinos") }
      case "games":
        return { label: t("gamesPill", "Games"), aria: t("openGamesPlatformAria", "Abrir a plataforma de games") }
      default: {
        const e = QUICK_ENTRIES[k]
        const label = ts(e.labelKey, e.fallback)
        return { label, aria: label }
      }
    }
  }

  const HREF: Partial<Record<QuickKey, string>> = {
    wallet: "/wallet",
    fitness: "/fitness",
    games: "/games",
    children: "/account/parental",
  }

  const pills: PillSpec[] = (chosen ?? DEFAULT_QUICK_PILLS)
    .filter((k) => available[k])
    .slice(0, QUICK_PILL_MAX)
    .map((k) => {
      const e = QUICK_ENTRIES[k]
      const { label, aria } = labelOf(k)
      const href = HREF[k]
      return {
        key: k,
        icon: e.icon,
        label,
        ariaLabel: aria,
        bg: e.bg,
        bgHover: e.bgHover,
        fg: e.fg,
        ...(href ? { href } : { onOpen: () => openSpace(k) }),
      }
    })

  return (
    <PillStack
      pills={pills}
      avatarPadClass={avatarPadClass}
      // CENTRADA NA FOTO. Antes a pilha era ancorada numa porcentagem com um
      // deslocamento fixo (`48% - 2.5rem`), e o pill do topo subia acima da borda de
      // cima da foto, caindo sobre o banner. O Alex pediu (2026-09-05) que a
      // foto ALCANCE o pill do topo: a foto cresceu para 2/3 e a pilha voltou ao
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
