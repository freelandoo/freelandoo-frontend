"use client"

// O HEADCARD da Carteira — peça ÚNICA das quatro telas dela (a raiz e as três
// páginas dos botões retráteis).
//
// Ele é a MANCHETE da página: a foto com os botões atrás dela e, no lugar onde
// no perfil ficam o nome e o @, o título da tela. O que muda de uma para outra
// é só o par eyebrow/título e para onde o "Voltar" leva — a pilha, a geometria
// e o link do @ são os mesmos.
//
// ⚠️ OS PILLS NAVEGAM (pedido do Alex, 2026-09-08: "os pills têm que ter
// páginas próprias, e não apenas abrir seções"). Antes cada um abria um painel
// da própria /wallet, então três assuntos diferentes moravam numa rolagem só e
// nenhum deles tinha endereço: não dava para mandar o link do cupom para
// alguém, o "Voltar" do navegador saía da Carteira inteira e o F5 devolvia a
// tela fechada. Cada botão agora é uma ROTA — por isso `href`, e por isso o
// `active` marca quem está no ar em vez de um estado local.
//
// O primeiro clique só revela o rótulo e o SEGUNDO navega: é a mecânica do
// `PillStack`, e ela vale mais aqui do que no perfil, porque fechado o botão
// mal escapa de trás da foto e navegar no primeiro toque o tornaria armadilha.
//
// BOTÃO NOVO DA CARTEIRA ENTRA NESTA LISTA — e, sendo uma rota, ganha a página
// dele em `app/(header-only)/wallet/<rota>/page.tsx`. Solto na página, ele
// existiria numa das quatro telas e sumiria nas outras três, em silêncio.

import Link from "next/link"
import { ArrowLeft, BarChart3, Percent, PiggyBank } from "lucide-react"
import { useMemo } from "react"
import type { PerfilCompleto } from "@/lib/types/account"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
import { Underline } from "@/components/home/landing/primitives"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { GREEN, GREEN_DEEP, initialsOf } from "./wallet-ui"

/** Qual das quatro telas está no ar (a raiz não acende pill nenhum). */
export type WalletPillKey = "vaquinha" | "coupon" | "market"

/** As rotas das três páginas, num lugar só. */
export const WALLET_ROUTES: Record<WalletPillKey, string> = {
  vaquinha: "/wallet/vaquinha",
  coupon: "/wallet/cupom",
  market: "/wallet/mercado",
}

/**
 * A Vaquinha é a única que pode FALTAR: é função com flag do admin E
 * preferência da pessoa (mesma regra do menu lateral). Fica aqui, e não copiada
 * em cada tela, porque a página dela precisa da MESMA resposta para decidir se
 * existe — duas leituras da mesma regra é como uma delas para de acompanhar a
 * outra.
 */
export function useVaquinhaEnabled() {
  const flag = useFeature("vaquinha")
  const pref = useUserFeature("vaquinha")
  return flag && pref
}

export function WalletHeadcard({
  perfil,
  eyebrow,
  title,
  backHref = "/account",
  active = null,
}: {
  perfil: PerfilCompleto | null
  eyebrow: string
  title: string
  /** Para onde o "Voltar" leva: /account na raiz, /wallet nas três páginas. */
  backHref?: string
  active?: WalletPillKey | null
}) {
  const tr = useTranslations("Wallet")
  const vaquinhaOn = useVaquinhaEnabled()

  const pills = useMemo<PillSpec[]>(() => {
    const list: PillSpec[] = []
    if (vaquinhaOn) {
      list.push({
        key: "vaquinha",
        icon: PiggyBank,
        label: tr("vaquinhaPill", "Vaquinha"),
        ariaLabel: tr("vaquinhaPillAria", "Abrir minha vaquinha"),
        bg: "#15803D",
        bgHover: "#0F5F2E",
        href: WALLET_ROUTES.vaquinha,
        active: active === "vaquinha",
      })
    }
    list.push({
      key: "coupon",
      icon: Percent,
      label: tr("couponPill", "Meu cupom"),
      ariaLabel: tr("couponPillAria", "Meu cupom, vendas com ele e painel do afiliado"),
      bg: "#C2410C",
      bgHover: "#9A3412",
      href: WALLET_ROUTES.coupon,
      active: active === "coupon",
    })
    list.push({
      key: "market",
      icon: BarChart3,
      label: tr("marketPill", "Mercado"),
      ariaLabel: tr("marketPillAria", "Notícias de mercado, cotações e ações em alta"),
      bg: GREEN_DEEP,
      bgHover: "#046A55",
      href: WALLET_ROUTES.market,
      active: active === "market",
    })
    return list
  }, [vaquinhaOn, active, tr])

  return (
    <section className="mx-auto w-full max-w-6xl px-3 pt-5 md:px-8 md:pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9C2B6] transition hover:text-[#F1EDE2]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {tr("back", "Voltar")}
        </Link>
        {perfil?.username && (
          <span className="inline-flex items-center gap-2 bg-[#0B0B0D] px-3 py-1.5 text-[#F1EDE2]">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: GREEN }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
          </span>
        )}
      </div>

      {/* A pilha é o PRIMEIRO filho da coluna do avatar e o card da foto vem
          depois no DOM: sem z-index, quem pinta por último cobre, então a foto
          esconde o corpo do botão e só o ícone escapa pela direita. É a mesma
          armadilha já paga no headcard do perfil — `-z-10` funcionaria aqui e
          quebraria lá, por isso a regra é a ordem do DOM. */}
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
        <div className="flex items-center gap-3 md:gap-5">
          {/* TRÊS CAMADAS, de trás para a frente: título → botões → foto.
              O `z-10` desta coluna é o que põe os botões NA FRENTE da
              tipografia (sem ele o título, que vem depois no DOM, pintava por
              cima do rótulo aberto e cortava a palavra no meio). Como a coluna
              inteira sobe junto, a foto continua cobrindo o corpo do botão pela
              ordem do DOM lá dentro — nada de z-index na foto. */}
          <div className="relative z-10 flex shrink-0 flex-col items-center">
            <PillStack
              pills={pills}
              avatarPadClass="pl-28 md:pl-32"
              className="absolute left-0 top-1/2 -translate-y-1/2"
            />
            {/* Mesma geometria do headcard do perfil: a foto precisa cobrir a
                pilha, e a largura casa com o `avatarPadClass` acima. Aqui a
                pilha é outra (cofrinho, cupom e mercado), mas a mecânica e o
                tamanho são os mesmos — 3 × 36 + 2 × 6 = 120px. */}
            <div className="w-28 -rotate-3 md:w-32">
              <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-4 border-[#F1EDE2] bg-[#0B0B0D]/[0.07] shadow-[6px_6px_0_0_#16B79A] ring-2 ring-[#0B0B0D]">
                {perfil?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={perfil.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="fl-display text-3xl text-[#0B0B0D]">{initialsOf(perfil?.nome)}</span>
                )}
              </div>
            </div>
          </div>

          {/* A folga tem que passar dos ÍCONES, não da foto: os botões nascem
              atrás dela e cada ícone escapa uns 42px para cá. Com folga só da
              largura da foto, o título começava debaixo deles. O título usa
              clamp porque divide a linha com a foto — em vw puro ele estouraria
              a caixa nos celulares estreitos. */}
          <div className="min-w-0 flex-1 pl-16 md:pl-24">
            <p className="fl-marker text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>
              {eyebrow}
            </p>
            <h1 className="relative mt-1 min-w-0">
              <span className="fl-display block text-[clamp(2.1rem,9vw,4.25rem)] leading-[0.84] text-[#0B0B0D]">
                {title}
                <span style={{ color: GREEN_DEEP }}>.</span>
              </span>
              <Underline className="absolute -bottom-1 left-0.5 h-3 w-[52%] max-w-[220px]" style={{ color: GREEN }} />
            </h1>
          </div>
        </div>
      </div>
    </section>
  )
}
