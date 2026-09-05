"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { DollarSign, Dumbbell, Gamepad2, type LucideIcon } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
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
 * Altura da pilha cheia, em px: 3 pills de 36px (h-9) + 2 gaps de 6px (gap-1.5).
 * A foto do headcard precisa ser MAIOR que isto para cobrir a pilha — é o que
 * faz os pills escaparem só pela direita, como o desenho pede. A conta de lá
 * vive em `AVATAR_FRAME_CLASS` (components/profile/profile-head-card.tsx).
 */
export const PILL_STACK_PX = 120

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
      initial={false}
      animate={{ x: open ? 10 : 0 }}
      whileHover={reduceMotion ? undefined : { x: open ? 10 : 7 }}
      transition={spring}
    >
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
          style={{ background: baseBg }}
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
          style={{ background: baseBg }}
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

export function HeadcardPills({
  avatarPadClass = "pl-28 md:pl-32",
  className,
}: {
  avatarPadClass?: string
  className?: string
}) {
  const t = useTranslations("Account")
  const router = useRouter()
  const [goingToGames, setGoingToGames] = useState(false)

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

  /**
   * Games não tem URL fixa: o destino é a comunidade "Meus games" da pessoa.
   * Quem já tem, entra na dela; quem não tem, ganha uma vazia e cai na página
   * já editável — MESMA regra do menu dos espaços (a comunidade nasce sem
   * formulário; jogo e plataforma se escolhem no headcard dela).
   */
  const openGames = useCallback(async () => {
    if (goingToGames) return
    const token = getToken()
    if (!token) return
    setGoingToGames(true)
    try {
      const res = await fetch("/api/me/spaces", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => null)
      const mine = res.ok ? json?.spaces?.games?.[0]?.id_profile : null
      if (mine) {
        router.push(`/comunidades/${mine}`)
        return
      }
      const created = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      })
      const body = await created.json().catch(() => null)
      if (created.ok && body?.community?.id_profile) {
        router.push(`/comunidades/${body.community.id_profile}`)
      }
    } catch {
      /* silencioso: o pill continua aberto e a pessoa tenta de novo */
    } finally {
      setGoingToGames(false)
    }
  }, [goingToGames, router])

  const pills: PillSpec[] = []

  // Games é o PRIMEIRO da pilha: fica acima do cifrão e sobe até por cima do
  // banner da manifestação (decisão do Alex 2026-09-03).
  if (gamesFlag) {
    pills.push({
      key: "games",
      icon: Gamepad2,
      label: t("gamesPill", "Games"),
      ariaLabel: t("openGamesAria", "Abrir a comunidade dos meus games"),
      bg: "#6D28D9",
      bgHover: "#5B21B6",
      onOpen: openGames,
    })
  }

  if (walletOn) {
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

  if (academyFlag && fitnessPref) {
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
      // (altura da foto − 108px da pilha) / 2, positiva em ambos.
      //
      // A coluna do avatar tem a altura da FOTO (as estrelas saíram dela em
      // 2026-09-05), então 50% da coluna é 50% da foto.
      className={cn("absolute left-0 top-1/2 -translate-y-1/2", className)}
    />
  )
}
