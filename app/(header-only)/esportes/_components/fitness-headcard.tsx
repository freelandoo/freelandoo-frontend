"use client"

// O HEADCARD DA PLATAFORMA FITNESS — peça ÚNICA das telas de `/fitness` (a
// raiz, que é o FEED da plataforma desde a mig 276, e as salas dos quatro
// botões retráteis — o "Meu dia" mora na do Histórico).
//
// ⚠️ É A SILHUETA DO GAMES/FINANCEIRO com a pele laranja (pedido do Alex,
// 2026-09-10: "o card da foto precisa ficar retangular na mesma proporção dos
// outros do game, do financeiro, e você precisa colocar os pills atrás do
// card igual no financeiro e no games"). Banner largo, chip do ambiente num
// canto, selo no outro, a foto 2/3 mordendo a borda de baixo com os pills
// escapando por trás e o título gigante ao lado.
//
// ⚠️ OS PILLS NAVEGAM: cada botão é uma ROTA (`href`) e `active` marca quem
// está no ar. O primeiro clique revela o rótulo e o SEGUNDO navega.
//
// ⚠️ A PILHA TEM QUATRO LUGARES: 4 × 36 (h-9) + 3 × 6 (gap-1.5) = 162px,
// contra uma foto de 192px (216 no md) — a MESMA conta do Games e da
// Carteira. Um QUINTO não cabe. PILL NOVO AQUI? Refazer esta conta antes.
//
// ⚠️ A FOTO É A DE QUEM OLHA (`perfil.avatar`, mig 215 — a fonte única do
// rosto da pessoa). O override por plataforma (mig 233) NÃO existe para
// fitness no backend (`PLATFORM_KINDS` é games e finance), então não há badge
// de câmera aqui: quem quiser outra imagem troca a foto de perfil.

import { Activity, CalendarDays, Dumbbell, History } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import type { PerfilCompleto } from "@/lib/types/account"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { BANNER_LAYERS, EMBER_GLOW, HEADCARD_SHADOW, PILL, initialsOf } from "./fitness-ui"
import { EASE, SPRING } from "./ui/motion"

/**
 * As LINHAS DE QUADRA do banner (repaginada "Placar Brasa", 2026-10-27): o
 * haltere fantasma não dizia "esporte". SVG estático de 1 px — círculo
 * central, linha do meio e as duas áreas.
 */
const COURT_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 220" preserveAspectRatio="none" fill="none" stroke="rgba(251,146,60,.16)" stroke-width="1.5"><rect x="20" y="16" width="760" height="188"/><line x1="400" y1="16" x2="400" y2="204"/><circle cx="400" cy="110" r="46"/><rect x="20" y="62" width="96" height="96"/><rect x="684" y="62" width="96" height="96"/><rect x="20" y="88" width="34" height="44"/><rect x="746" y="88" width="34" height="44"/></svg>`
)
const COURT_BG = `url("data:image/svg+xml,${COURT_SVG}") center/100% 100% no-repeat`
const REFLECTORS =
  "radial-gradient(28% 70% at 14% -10%, rgba(255,210,166,.20), transparent 70%), radial-gradient(28% 70% at 86% -10%, rgba(255,210,166,.16), transparent 70%)"
const SPEED_STRIPES = "repeating-linear-gradient(135deg, rgba(255,140,43,.18) 0 6px, transparent 6px 16px)"

/** O chip "Esportes" bate como carimbo UMA vez por sessão (não a cada sala). */
function useFirstInSession(key: string) {
  const [first, setFirst] = useState(false)
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(key) === "1") return
      window.sessionStorage.setItem(key, "1")
      setFirst(true)
    } catch {
      /* sem storage: sem cerimônia */
    }
  }, [key])
  return first
}

/** Qual das salas está no ar (a raiz, que é o feed, não acende nenhuma). */
export type FitnessPillKey = "academy" | "workout" | "history" | "indicators"

/** As rotas das quatro salas, num lugar só. */
export const FITNESS_ROUTES: Record<FitnessPillKey, string> = {
  academy: "/esportes/academia",
  workout: "/esportes/treino",
  history: "/esportes/historico",
  indicators: "/esportes/indicadores",
}

export function FitnessHeadcard({
  perfil,
  title,
  backHref = "/account",
  active = null,
  action = null,
}: {
  perfil: PerfilCompleto | null
  /** O nome da SALA (Fitness, Minha academia, Treino, Histórico, Indicadores). */
  title: string
  /** Para onde o "Voltar" leva: /account na raiz, /fitness nas salas. */
  backHref?: string
  active?: FitnessPillKey | null
  /** O canto de ação do headcard (na raiz, o "+" de publicar; no Histórico, Metas). */
  action?: ReactNode
}) {
  const tr = useTranslations("Fitness")
  const reduce = useReducedMotion()
  const stampChip = useFirstInSession("esp:hc")
  // A foto "diz" em que sala você está: o contorno é a cor do pill aceso.
  const roomColor = active ? PILL[active].bg : EMBER_GLOW

  const pills = useMemo<PillSpec[]>(
    () => [
      // MINHA ACADEMIA é o primeiro e é LARANJA — frequência da catraca e
      // mensalidades (o que saiu do corpo da raiz).
      {
        key: "academy",
        icon: CalendarDays,
        label: tr("academyPill", "Minha academia"),
        ariaLabel: tr("academyPillAria", "Frequência na catraca e mensalidades da sua academia"),
        bg: PILL.academy.bg,
        bgHover: PILL.academy.hover,
        href: FITNESS_ROUTES.academy,
        active: active === "academy",
      },
      // TREINO é ROSA — a ficha do dia, com os checks.
      {
        key: "workout",
        icon: Dumbbell,
        label: tr("workoutPill", "Treino"),
        ariaLabel: tr("workoutPillAria", "A sua ficha de treino de hoje"),
        bg: PILL.workout.bg,
        bgHover: PILL.workout.hover,
        href: FITNESS_ROUTES.workout,
        active: active === "workout",
      },
      // HISTÓRICO é TURQUESA — peso, altura e os dias já gravados (água e
      // calorias de cada dia).
      {
        key: "history",
        icon: History,
        label: tr("historyPill", "Histórico"),
        ariaLabel: tr("historyPillAria", "Calorias, água, refeições, peso e o histórico dos seus dias"),
        bg: PILL.history.bg,
        bgHover: PILL.history.hover,
        href: FITNESS_ROUTES.history,
        active: active === "history",
      },
      // INDICADORES é o último — a antiga aba, agora sala própria.
      {
        key: "indicators",
        icon: Activity,
        label: tr("indicatorsPill", "Indicadores"),
        ariaLabel: tr("indicatorsPillAria", "Os seus indicadores de saúde e consistência"),
        bg: PILL.indicators.bg,
        bgHover: PILL.indicators.hover,
        href: FITNESS_ROUTES.indicators,
        active: active === "indicators",
      },
    ],
    [active, tr]
  )

  return (
    <>
      {/* Top bar — a saída à esquerda e a identidade de quem está olhando à direita. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 pt-6 md:px-10">
        <PageBackLink href={backHref} />
        {perfil?.username && (
          <span className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[#F5F1E8]">
            <span className="h-2 w-2 rounded-full" style={{ background: EMBER_GLOW }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
          </span>
        )}
      </div>

      <header className="relative mx-auto mt-4 max-w-5xl px-0 md:px-10">
        {/* `z-0` TRANCA o banner debaixo da linha da foto (ver a nota no
            headcard da Carteira). */}
        <div
          className="relative z-0 overflow-hidden border-2 border-[#0B0B0D]"
          style={{ boxShadow: HEADCARD_SHADOW }}
        >
          <div className="relative h-44 bg-[#1D1810] md:h-56">
            {/* O banner é DESENHADO, não enviado: o painel é da pessoa e não
                tem banner próprio. A grade do painel e o brilho laranja. */}
            <div aria-hidden className="absolute inset-0" style={{ backgroundImage: BANNER_LAYERS }} />
            <div aria-hidden className="absolute inset-0" style={{ background: `${REFLECTORS}, ${COURT_BG}` }} />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-6" style={{ background: SPEED_STRIPES }} />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, #0c0503cc 100%)" }}
            />
            {/* O CHIP diz o AMBIENTE, o título diz a SALA. */}
            <motion.span
              className="absolute left-4 top-4 z-20 border-2 border-[#0B0B0D] bg-[#FF8C2B] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]"
              initial={stampChip && !reduce ? { scale: 1.6, rotate: -10, opacity: 0 } : false}
              animate={{ scale: 1, rotate: -2, opacity: 1 }}
              transition={stampChip ? { ...SPRING.stamp, delay: 0.12 } : { duration: 0 }}
            >
              {tr("platformTitle", "Esportes")}
            </motion.span>
            {/* O selo do canto oposto: a assinatura do ambiente, sem número. */}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">
                {tr("platformLabel", "Plataforma")}
              </span>
              <Dumbbell className="h-6 w-6" style={{ color: EMBER_GLOW }} />
            </span>
          </div>
        </div>

        {/* O recuo é ~metade da altura da foto: metade sobre o banner, metade
            sobre o papel, como no headcard do perfil. */}
        <div className="relative z-20 -mt-24 flex flex-wrap items-end gap-4 px-2 md:-mt-[108px] md:px-3">
          {/* A pilha é o PRIMEIRO filho e a foto vem depois no DOM: quem pinta
              por último cobre. `pl-32 md:pl-36` casa com a LARGURA da foto. */}
          <div className="relative shrink-0">
            <PillStack
              pills={pills}
              avatarPadClass="pl-32 md:pl-36"
              className="absolute left-0 top-1/2 -translate-y-1/2"
            />
            <div
              className="relative aspect-[2/3] w-32 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:w-36"
              style={{ outline: `2px solid ${roomColor}`, outlineOffset: "2px" }}
            >
              {perfil?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center fl-display text-4xl text-[#F5F1E8]/40">
                  {initialsOf(perfil?.nome)}
                </span>
              )}
            </div>
          </div>

          {/* ⚠️ NO CELULAR O TÍTULO DESCE PARA BAIXO DA FOTO (regra das três
              cascas, 2026-09-10): ao lado dela, o rótulo do pill ABERTO
              deslizaria por cima do nome. O espaçador (só no celular) empurra
              a ação para a direita da foto, e o título, com `order-last` +
              `basis-full`, ocupa a linha inteira embaixo. */}
          <div aria-hidden className="flex-1 md:hidden" />
          <div className="order-last basis-full pl-1 pt-1 md:order-none md:basis-auto md:flex-1 md:pb-2 md:pl-12 md:pt-0">
            {/* Máscara reta SÓ no h1 (nunca na coluna da foto: cortaria os pills). */}
            <h1 className="fl-display overflow-hidden text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl md:text-6xl">
              <motion.span
                key={title}
                className="block"
                initial={reduce ? false : { y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.32, ease: EASE.paper }}
              >
                {title}
              </motion.span>
            </h1>
          </div>

          {action && <div className="pb-1">{action}</div>}
        </div>
      </header>
    </>
  )
}
