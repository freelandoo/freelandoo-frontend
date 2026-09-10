"use client"

// O HEADCARD DO FINANCEIRO — peça ÚNICA das quatro telas da plataforma (o feed,
// que é a raiz, e as páginas dos três botões retráteis).
//
// ⚠️ ELE VIROU A SILHUETA DA PLATAFORMA (pedido do Alex, 2026-09-08: "mantenha
// o layout do anexo 01, a silhueta do anexo 01 exatamente, porém com a
// identidade verde do financeiro"). Era um card de papel creme com a foto e o
// título ao lado; agora é o MESMO desenho da plataforma de games — banner
// largo, chip do ambiente no canto, selo no canto oposto, a foto quadrada
// mordendo a borda de baixo com os pills escapando por trás e o título gigante
// ao lado dela.
//
// A identidade não é a de games: o roxo dá lugar ao verde (`.fl-finance`, em
// globals.css) e o fundo é a textura verde do ambiente. O que se copiou foi a
// SILHUETA, não a pele.
//
// ⚠️ O FUNDO ANIMADO MORREU em 2026-09-09 (o shader de tela cheia dividia a
// GPU com o compositor e engasgava a rolagem e os pills); o que ficou é uma
// camada estática. Ver components/platform/tech-backdrop.tsx.
//
// ⚠️ OS PILLS NAVEGAM (pedido do Alex, 2026-09-08: "os pills têm que ter
// páginas próprias, e não apenas abrir seções"): cada botão é uma ROTA, por
// isso `href`, e por isso o `active` marca quem está no ar em vez de um estado
// local. O primeiro clique só revela o rótulo e o SEGUNDO navega — é a mecânica
// do `PillStack`, e ela vale aqui porque fechado o botão mal escapa de trás da
// foto e navegar no primeiro toque o tornaria armadilha.
//
// ⚠️ O MERCADO SAIU DA PILHA e virou ABA da raiz (pedido do Alex: "no
// financeiro vai ter feed e mercados (...) e o pill de mercados vai sumir de
// trás da foto de perfil"). Ele é conteúdo da plataforma, como a Estante é em
// games — e conteúdo mora nas abas. A rota `/wallet/mercado` foi APAGADA junto:
// mantida de pé, a mesma tela teria duas portas, e é assim que uma delas para
// de acompanhar a outra.
//
// BOTÃO NOVO DA CARTEIRA ENTRA NESTA LISTA — e, sendo uma rota, ganha a página
// dele em `app/(header-only)/wallet/<rota>/page.tsx`. Solto na página, ele
// existiria numa das telas e sumiria nas outras, em silêncio.
//
// ⚠️ A PILHA TEM TRÊS LUGARES: 3 × 36 (h-9) + 2 × 6 (gap-1.5) = 120px, e a foto
// mede 192px no celular e 216px no computador (largura w-32/w-36 na proporção
// 2/3 do headcard do perfil). A foto TEM que ser maior que a pilha, senão o
// pill de cima e o de baixo escapam por cima e por baixo em vez de só pela
// direita. PILL NOVO AQUI? Refazer esta conta antes — é a mesma que, em games,
// já obrigou a foto a subir de h-28 para h-32 quando ela ainda era quadrada.

import Link from "next/link"
import { ArrowLeft, Camera, Loader2, Percent, Trophy, Undo2, Wallet } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { PerfilCompleto } from "@/lib/types/account"
import { usePlatformAvatar } from "@/components/platform/use-platform-avatar"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { usePlatformPresence } from "@/components/layout/platform-presence"
import { GREEN, initialsOf } from "./wallet-ui"

/** Qual das telas está no ar (a raiz, que é o feed, não acende nenhum). */
export type WalletPillKey = "wallet" | "ranking" | "coupon"

/** As rotas das três páginas, num lugar só. */
export const WALLET_ROUTES: Record<WalletPillKey, string> = {
  wallet: "/wallet/carteira",
  ranking: "/wallet/ranking",
  coupon: "/wallet/cupom",
}

/**
 * A Vaquinha pode FALTAR: é função com flag do admin E preferência da pessoa
 * (mesma regra do menu lateral). Ela não está na pilha — virou um botão dentro
 * da Carteira, ao lado da Vida Financeira —, mas o predicado continua morando
 * aqui, no arquivo que as telas da Carteira já importam: copiado para dentro da
 * Carteira, ele deixaria de acompanhar a regra no dia em que ela mudasse.
 */
export function useVaquinhaEnabled() {
  const flag = useFeature("vaquinha")
  const pref = useUserFeature("vaquinha")
  return flag && pref
}

/**
 * A FOTO DENTRO DO FINANCEIRO (mig 233): `override ?? perfil.avatar`, pelo
 * hook compartilhado com a plataforma de games — ver
 * components/platform/use-platform-avatar.ts. Mora no headcard porque ele é
 * a peça que as quatro salas dividem.
 */
export function WalletHeadcard({
  perfil,
  title,
  backHref = "/account",
  active = null,
  action = null,
}: {
  perfil: PerfilCompleto | null
  /** O nome da SALA (Financeiro, Carteira, Ranking, Meu cupom). */
  title: string
  /** Para onde o "Voltar" leva: /account na raiz, /wallet nas páginas. */
  backHref?: string
  active?: WalletPillKey | null
  /** O canto de ação do headcard — na raiz, o "+" de publicar. */
  action?: ReactNode
}) {
  const tr = useTranslations("Wallet")

  /**
   * ⚠️ A BATIDA DE PRESENÇA DO FINANCEIRO mora AQUI, e não numa das telas
   * (mig 230). Este headcard é a única peça que todas as telas da plataforma
   * dividem — pendurar o relógio numa delas faria ir do feed para a Carteira
   * parar a contagem, e cada tela nova nasceria sem contar tempo.
   *
   * "Dentro da plataforma financeira" é o `/wallet` inteiro: o feed, a
   * Carteira, o cupom e o ranking são salas do MESMO ambiente. Fora do
   * `/wallet` este componente não existe, então o relógio não anda — que é o
   * recorte pedido.
   */
  usePlatformPresence("finance")

  const { override: photoOverride, busy: photoBusy, upload: uploadPhoto, reset: resetPhoto } =
    usePlatformAvatar("finance")
  // O que a foto mostra: o override da plataforma ou o rosto de sempre.
  const avatarSrc = photoOverride ?? perfil?.avatar ?? null
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)

  useEffect(() => {
    if (!photoMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhotoMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [photoMenuOpen])

  const onPickPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      const ok = await uploadPhoto(file)
      if (!ok) toast.error(tr("platformPhotoError", "Não deu para trocar a foto. Tente de novo."))
    },
    [uploadPhoto, tr]
  )

  const onResetPhoto = useCallback(async () => {
    setPhotoMenuOpen(false)
    const ok = await resetPhoto()
    if (!ok) toast.error(tr("platformPhotoError", "Não deu para trocar a foto. Tente de novo."))
  }, [resetPhoto, tr])

  const pills = useMemo<PillSpec[]>(
    () => [
      // CARTEIRA é o primeiro e é VERDE — o dinheiro da pessoa, que era o corpo
      // desta tela até 2026-09-08 e virou uma página atrás deste botão quando a
      // raiz passou a ser o Financeiro. O verde é o MESMO do pill da Carteira no
      // headcard do perfil: é a mesma porta, e mudar de tom por superfície faria
      // procurar duas vezes.
      {
        key: "wallet",
        icon: Wallet,
        label: tr("walletPill", "Carteira"),
        ariaLabel: tr("walletPillAria", "Minha carteira: vida financeira, ganhos e extrato"),
        bg: "#15803D",
        bgHover: "#0F5F2E",
        href: WALLET_ROUTES.wallet,
        active: active === "wallet",
      },
      // ⚠️ O RANKING NÃO TEM GATE: não é função comprável nem preferência. Quem
      // não pontuou vê a fila dos outros e a frase do que fazer — um pill que
      // some conforme a pontuação faria a porta piscar.
      {
        key: "ranking",
        icon: Trophy,
        label: tr("rankingPill", "Ranking"),
        ariaLabel: tr("rankingPillAria", "Ranking do Financeiro na sua cidade e no seu estado"),
        bg: "#DB2777",
        bgHover: "#BE185D",
        href: WALLET_ROUTES.ranking,
        active: active === "ranking",
      },
      {
        key: "coupon",
        icon: Percent,
        label: tr("couponPill", "Meu cupom"),
        ariaLabel: tr("couponPillAria", "Meu cupom, vendas com ele e painel do afiliado"),
        bg: "#C2410C",
        bgHover: "#9A3412",
        href: WALLET_ROUTES.coupon,
        active: active === "coupon",
      },
    ],
    [active, tr]
  )

  return (
    <>
      {/* Top bar — a mesma linha da plataforma de games: a saída à esquerda e a
          identidade de quem está olhando à direita. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 pt-6 md:px-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9A938A] transition hover:text-[#F5F1E8]"
        >
          <ArrowLeft className="h-4 w-4" /> {tr("back", "Voltar")}
        </Link>
        {perfil?.username && (
          <span className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[#F5F1E8]">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: GREEN }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
          </span>
        )}
      </div>

      <header className="relative mx-auto mt-4 max-w-5xl px-0 md:px-10">
        {/* ⚠️ `z-0` NÃO é decoração: é o que TRANCA o banner debaixo da linha da
            foto. Sem ele o banner é `relative` com z-index AUTO, e elemento
            posicionado com z auto NÃO cria contexto de empilhamento — qualquer
            camada de dentro dele subiria para o contexto do <header> e passaria
            por cima do card da foto. Foi a armadilha paga na página da
            comunidade. */}
        <div
          className="relative z-0 overflow-hidden border-2 border-[#0B0B0D]"
          style={{ boxShadow: `0 0 30px rgba(22, 183, 154, 0.22), 8px 8px 0 0 rgba(11, 58, 46, 0.9)` }}
        >
          <div className="relative h-44 bg-[#1D1810] md:h-56">
            {/* O banner do Financeiro é DESENHADO, não enviado: não há foto de
                capa a subir aqui (a plataforma é do site inteiro, e não tem
                dono que a edite). O que ele mostra é a própria identidade —
                a grade do painel, o brilho verde e o cifrão de marca d'água. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  "radial-gradient(70% 120% at 18% 0%, rgba(22, 183, 154, 0.34), transparent 65%)",
                  "radial-gradient(60% 120% at 88% 10%, rgba(0, 135, 107, 0.30), transparent 68%)",
                  "repeating-linear-gradient(to right, rgba(22, 183, 154, 0.10) 0 1px, transparent 1px 40px)",
                  "repeating-linear-gradient(to bottom, rgba(22, 183, 154, 0.07) 0 1px, transparent 1px 40px)",
                ].join(","),
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-2 -top-10 select-none font-[Georgia,serif] text-[13rem] font-bold leading-none md:text-[17rem]"
              style={{ color: "rgba(22, 183, 154, 0.10)" }}
            >
              $
            </span>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, #05140Fcc 100%)" }}
            />
            {/* O CHIP diz o AMBIENTE, o título diz a SALA — é por isso que ele
                é o mesmo nas quatro telas, como o chip "GAMES" é o mesmo em
                todas as telas da plataforma de games. */}
            <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
              {tr("financePlatformTitle", "Financeiro")}
            </span>
            {/* O selo do canto oposto. Em games ali fica o NÍVEL da comunidade;
                aqui não há nível a mostrar — a plataforma é de todo mundo e não
                acumula XP de grupo — e inventar um número seria afirmar o que
                ninguém apurou. O que ele carrega é a assinatura do ambiente. */}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">
                {tr("financePlatformLabel", "Plataforma")}
              </span>
              <span className="fl-display text-2xl leading-none" style={{ color: GREEN }}>
                $
              </span>
            </span>
          </div>
        </div>

        {/* ⚠️ O RECUO ACOMPANHA A PROPORÇÃO: com a foto em 2/3 (192px no
            celular, 216 no md) o recuo é ~metade da altura dela, como no
            headcard do perfil — metade sobre o banner, metade sobre o papel.
            Mantido o -mt-12, os 64px a mais cairiam todos para baixo e a foto
            desgrudaria do banner. */}
        <div className="relative z-20 -mt-24 flex flex-wrap items-end gap-4 px-2 md:-mt-[108px] md:px-3">
          {/* A COLUNA DA FOTO: a pilha é o PRIMEIRO filho e a foto vem depois no
              DOM. Sem z-index em nenhum dos dois, quem pinta por último cobre —
              é assim que a foto esconde o corpo do botão e só o ícone escapa
              pela direita. (`-z-10` NÃO serve: aqui o contexto de empilhamento
              mais próximo é esta linha `relative z-20`, e o botão iria parar
              atrás do banner.)

              A pilha fica FORA da caixa da foto porque aquela caixa é
              `overflow-hidden` — lá dentro o botão seria recortado na borda.

              `pl-32 md:pl-36` casa com a LARGURA DA FOTO. Mexeu no tamanho da
              foto? Ajustar o padding junto, senão o corpo colorido nasce ao
              lado dela em vez de debaixo. */}
          <div className="relative shrink-0">
            <PillStack
              pills={pills}
              avatarPadClass="pl-32 md:pl-36"
              className="absolute left-0 top-1/2 -translate-y-1/2"
            />
            {/* ⚠️ PROPORÇÃO 2/3, A MESMA DO HEADCARD DO PERFIL (pedido do Alex,
                2026-09-09). A LARGURA não mudou (w-32/w-36), e é por isso que o
                `pl-32 md:pl-36` da pilha continua valendo — o padding casa com
                a largura, não com a altura. */}
            <div
              className="relative aspect-[2/3] w-32 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:w-36"
              style={{ outline: `2px solid ${GREEN}`, outlineOffset: "2px" }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center fl-display text-4xl text-[#F5F1E8]/40">
                  {initialsOf(perfil?.nome)}
                </span>
              )}
            </div>

            {/* O BADGE DE CÂMERA — a mesma quina do headcard do perfil, mas o
                que ele troca é a foto DESTA plataforma (mig 233), nunca a de
                perfil. Fica FORA da caixa da foto (que é overflow-hidden) e só
                existe para quem está logado: sem perfil não há de quem ser a
                foto.

                Sem override o clique abre o seletor direto; com override abre
                um menu de duas linhas, porque aí existe um CAMINHO DE VOLTA
                ("usar a minha foto") e ele tem que estar a um toque do mesmo
                botão que criou a divergência. */}
            {perfil && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (photoBusy) return
                    if (photoOverride) setPhotoMenuOpen((v) => !v)
                    else fileInputRef.current?.click()
                  }}
                  disabled={photoBusy}
                  aria-label={tr("platformPhotoChange", "Trocar a foto no Financeiro")}
                  title={tr("platformPhotoChange", "Trocar a foto no Financeiro")}
                  aria-expanded={photoOverride ? photoMenuOpen : undefined}
                  className="absolute -bottom-2 -right-2 z-20 inline-flex h-8 w-8 items-center justify-center border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] disabled:opacity-60"
                >
                  {photoBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickPhoto}
                />
                {photoMenuOpen && photoOverride && (
                  <>
                    {/* O fundo invisível fecha o menu no clique fora. */}
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setPhotoMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute left-full top-full z-40 ml-2 flex w-64 flex-col border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8] shadow-[4px_4px_0_0_#0B0B0D]"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setPhotoMenuOpen(false)
                          fileInputRef.current?.click()
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.12em] transition hover:bg-[#1D1810]"
                      >
                        <Camera className="h-4 w-4" style={{ color: GREEN }} />
                        {tr("platformPhotoChange", "Trocar a foto no Financeiro")}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={onResetPhoto}
                        className="flex items-center gap-2 border-t-2 border-[#0B0B0D] px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.12em] transition hover:bg-[#1D1810]"
                      >
                        <Undo2 className="h-4 w-4 text-[#9A938A]" />
                        {tr("platformPhotoReset", "Usar a minha foto de perfil")}
                      </button>
                      <p className="border-t-2 border-[#0B0B0D] px-3 py-2 text-[10px] leading-snug text-[#9A938A]">
                        {tr(
                          "platformPhotoHint",
                          "Vale só aqui dentro — a sua foto de perfil continua a mesma no resto do site."
                        )}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ⚠️ NO CELULAR O TÍTULO DESCE PARA BAIXO DA FOTO (pedido do Alex,
              2026-09-10: "nada sobreponha os nomes no mobile"). Ao lado dela,
              o rótulo do pill ABERTO deslizava por cima do nome — a folga de
              44px cobre o ícone fechado, não o rótulo. O espaçador (só no
              celular) empurra a ação para a direita da foto, e o título, com
              `order-last` + `basis-full`, ocupa a linha inteira embaixo. No md
              o espaçador some e o título volta para o lado, com a folga
              passando do ícone do pill (~40px). MESMA peça no headcard de
              games e no da comunidade. */}
          <div aria-hidden className="flex-1 md:hidden" />
          <div className="order-last basis-full pl-1 pt-1 md:order-none md:basis-auto md:flex-1 md:pb-2 md:pl-12 md:pt-0">
            <h1 className="fl-display text-4xl leading-[0.85] text-[#F5F1E8] sm:text-5xl md:text-6xl">
              {title}
            </h1>
          </div>

          {action && <div className="pb-1">{action}</div>}
        </div>
      </header>
    </>
  )
}
