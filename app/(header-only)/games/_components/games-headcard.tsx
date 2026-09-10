"use client"

// O HEADCARD DA PLATAFORMA DE GAMES — peça ÚNICA das telas de `/games` (a raiz,
// que é o feed, e as páginas dos quatro botões retráteis).
//
// ⚠️ É A SILHUETA DO FINANCEIRO com a pele roxa (pedido do Alex, 2026-09-10:
// "criar igual o financeiro, não uma comunidade, mas uma plataforma, nos moldes
// do financeiro"). Banner largo, chip do ambiente num canto, selo no outro, a
// foto 2/3 mordendo a borda de baixo com os pills escapando por trás e o título
// gigante ao lado. O que NÃO vem junto é a página de comunidade por baixo — era
// ela que fazia os pills travarem.
//
// ⚠️ OS PILLS NAVEGAM (a mecânica do Financeiro): cada botão é uma ROTA, por
// isso `href`, e `active` marca quem está no ar. O primeiro clique revela o
// rótulo e o SEGUNDO navega — fechado o botão mal escapa de trás da foto e
// navegar no primeiro toque o tornaria armadilha.
//
// ⚠️ A PILHA TEM QUATRO LUGARES: 4 × 36 (h-9) + 3 × 6 (gap-1.5) = 162px, contra
// uma foto de 192px (216 no md) — a MESMA conta que a Carteira já fechou com
// quatro pills. Um QUINTO não cabe (198px escapariam por cima e por baixo).
// PILL NOVO AQUI? Refazer esta conta antes.
//
// ⚠️ A ESTANTE SÓ EXISTE COM `games_conexao` LIGADA — é a condição que o
// backend impõe a /gamer/shelf. Com a flag desligada o pill some e a pilha
// volta a ter três lugares; nada muda na conta, a foto cobre as duas.
//
// ⚠️ OS PILLS PESSOAIS LEVAM O `?de=` E O RANKING NÃO (regra da casa, ver
// games-context): Jogo atual, Posts e Estante são a metade da PESSOA — sem o
// contexto, apertá-los dentro do games de alguém abriria o recorte de quem
// olha enquanto a tela ao redor mostra o dela. O ranking é a metade da CASA e
// mede quem está olhando; levar o contexto prometeria um "ranking do fulano"
// que não existe.
//
// ⚠️ A FOTO É A DE QUEM OLHA, com a foto da plataforma por cima (mig 233):
// `override ?? perfil.avatar`, pelo MESMO hook da Carteira. O badge de câmera
// troca SÓ a foto de games; "usar a minha foto de perfil" apaga o override.

import Link from "next/link"
import { ArrowLeft, Camera, Gamepad2, LayoutGrid, Library, Loader2, Trophy, Undo2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { PerfilCompleto } from "@/lib/types/account"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { usePlatformPresence } from "@/components/layout/platform-presence"
import { usePlatformAvatar } from "@/components/platform/use-platform-avatar"
import { PURPLE, PURPLE_GLOW, initialsOf } from "./games-ui"
import { withOwner, type GamesOwner } from "./games-context"

/** Qual das telas está no ar (a raiz, que é o feed, não acende nenhum). */
export type GamesPillKey = "game" | "posts" | "ranking" | "shelf"

/** As rotas das quatro páginas, num lugar só. */
export const GAMES_ROUTES: Record<GamesPillKey, string> = {
  game: "/games/jogo",
  posts: "/games/posts",
  ranking: "/games/ranking",
  shelf: "/games/estante",
}

export function GamesHeadcard({
  perfil,
  title,
  backHref = "/account",
  active = null,
  action = null,
  owner = null,
}: {
  perfil: PerfilCompleto | null
  /** O nome da SALA (Games, Jogo atual, Posts, Ranking, Estante). */
  title: string
  /** Para onde o "Voltar" leva: /account na raiz, /games nas páginas. */
  backHref?: string
  active?: GamesPillKey | null
  /** O canto de ação do headcard — na raiz, o "+" de publicar. */
  action?: ReactNode
  /**
   * O dono do contexto (`?de=@fulano`), quando a tela está nele. Os pills
   * PESSOAIS o preservam ao navegar; o ranking nunca. `undefined` (ainda
   * resolvendo) conta como "sem contexto" só para montar os links.
   */
  owner?: GamesOwner | null
}) {
  const tr = useTranslations("Games")
  const shelfOn = useFeature("games_conexao")

  /**
   * ⚠️ A BATIDA DE PRESENÇA DE GAMES mora AQUI (mig 226): este headcard é a
   * única peça que todas as telas da plataforma dividem. "Dentro da plataforma
   * de games" é o `/games` inteiro. Fora dele este componente não existe,
   * então o relógio não anda.
   */
  usePlatformPresence("games")

  const { override: photoOverride, busy: photoBusy, upload: uploadPhoto, reset: resetPhoto } =
    usePlatformAvatar("games")
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

  const pills = useMemo<PillSpec[]>(() => {
    const list: PillSpec[] = [
      // JOGO ATUAL é o primeiro e é LARANJA — o que a pessoa está jogando, a
      // metade pessoal do ambiente (mig 232: o jogo é da pessoa, não da casa).
      {
        key: "game",
        icon: Gamepad2,
        label: tr("gamePill", "Jogo atual"),
        ariaLabel: tr("gamePillAria", "O jogo que você está jogando agora"),
        bg: "#C2410C",
        bgHover: "#9A3412",
        href: withOwner(GAMES_ROUTES.game, owner),
        active: active === "game",
      },
      // POSTS é VERDE (decisão do Alex, 2026-09-09) — a vitrine do que a
      // pessoa publicou dentro de games.
      {
        key: "posts",
        icon: LayoutGrid,
        label: tr("postsPill", "Posts de games"),
        ariaLabel: tr("postsPillAria", "Os seus posts publicados em games"),
        bg: "#15803D",
        bgHover: "#0F5F2E",
        href: withOwner(GAMES_ROUTES.posts, owner),
        active: active === "posts",
      },
      // RANKING é ROXO. Sem gate: quem não pontuou vê a fila dos outros e a
      // frase do que fazer. NUNCA leva o `?de=` (é a metade da casa).
      {
        key: "ranking",
        icon: Trophy,
        label: tr("rankingPill", "Ranking"),
        ariaLabel: tr("rankingPillAria", "Ranking de games na sua cidade, no seu estado e por horas jogadas"),
        bg: "#7E22CE",
        bgHover: "#6B21A8",
        href: GAMES_ROUTES.ranking,
        active: active === "ranking",
      },
    ]
    // ESTANTE é AMARELA (pedido do Alex, 2026-09-10) — a biblioteca da Steam
    // da pessoa (mig 220). Era aba da raiz; virou sala própria porque a
    // estante é conteúdo pessoal, como Posts, e conteúdo pessoal mora atrás
    // da foto. O amarelo é o da casa (`#F2B705`), com tinta PRETA: sobre esse
    // fundo o creme dos outros pills não se lê.
    if (shelfOn) {
      list.push({
        key: "shelf",
        icon: Library,
        label: tr("shelfPill", "Estante"),
        ariaLabel: tr("shelfPillAria", "A sua estante de jogos, trazida da Steam"),
        bg: "#F2B705",
        bgHover: "#D9A200",
        fg: "#0B0B0D",
        href: withOwner(GAMES_ROUTES.shelf, owner),
        active: active === "shelf",
      })
    }
    return list
  }, [active, owner, shelfOn, tr])

  return (
    <>
      {/* Top bar — a saída à esquerda e a identidade de quem está olhando à direita. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 pt-6 md:px-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9A938A] transition hover:text-[#F5F1E8]"
        >
          <ArrowLeft className="h-4 w-4" /> {tr("back", "Voltar")}
        </Link>
        {perfil?.username && (
          <span className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[#F5F1E8]">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: PURPLE_GLOW }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
          </span>
        )}
      </div>

      <header className="relative mx-auto mt-4 max-w-5xl px-0 md:px-10">
        {/* `z-0` TRANCA o banner debaixo da linha da foto (ver a nota no
            headcard da Carteira: elemento posicionado com z auto não cria
            contexto de empilhamento). */}
        <div
          className="relative z-0 overflow-hidden border-2 border-[#0B0B0D]"
          style={{ boxShadow: `0 0 30px rgba(139, 92, 246, 0.25), 8px 8px 0 0 rgba(59, 36, 112, 0.9)` }}
        >
          <div className="relative h-44 bg-[#1D1810] md:h-56">
            {/* O banner é DESENHADO, não enviado: a plataforma é do site inteiro
                e não tem dono que a edite. A grade do painel e o brilho roxo. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  "radial-gradient(70% 120% at 18% 0%, rgba(109, 40, 217, 0.40), transparent 65%)",
                  "radial-gradient(60% 120% at 88% 10%, rgba(14, 116, 144, 0.28), transparent 68%)",
                  "repeating-linear-gradient(to right, rgba(167, 139, 250, 0.10) 0 1px, transparent 1px 40px)",
                  "repeating-linear-gradient(to bottom, rgba(167, 139, 250, 0.07) 0 1px, transparent 1px 40px)",
                ].join(","),
              }}
            />
            <Gamepad2
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-64 w-64 select-none md:h-80 md:w-80"
              strokeWidth={1}
              style={{ color: "rgba(167, 139, 250, 0.10)" }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, #0a0616cc 100%)" }}
            />
            {/* O CHIP diz o AMBIENTE, o título diz a SALA. */}
            <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
              {tr("platformTitle", "Games")}
            </span>
            {/* O selo do canto oposto: a assinatura do ambiente, sem número —
                a plataforma é de todo mundo e não acumula XP de grupo. */}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">
                {tr("platformLabel", "Plataforma")}
              </span>
              <Gamepad2 className="h-6 w-6" style={{ color: PURPLE_GLOW }} />
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
              style={{ outline: `2px solid ${PURPLE_GLOW}`, outlineOffset: "2px" }}
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

            {/* O BADGE DE CÂMERA — troca a foto DESTA plataforma (mig 233),
                nunca a de perfil. Fora da caixa da foto (overflow-hidden). Sem
                override abre o seletor direto; com override abre o menu com o
                CAMINHO DE VOLTA. */}
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
                  aria-label={tr("platformPhotoChange", "Trocar a foto no Games")}
                  title={tr("platformPhotoChange", "Trocar a foto no Games")}
                  aria-expanded={photoOverride ? photoMenuOpen : undefined}
                  className="absolute -bottom-2 -right-2 z-20 inline-flex h-8 w-8 items-center justify-center border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] disabled:opacity-60"
                >
                  {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
                        <Camera className="h-4 w-4" style={{ color: PURPLE_GLOW }} />
                        {tr("platformPhotoChange", "Trocar a foto no Games")}
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
              passando do ícone do pill (~40px). */}
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

/** O roxo da plataforma, para quem monta botões fora do headcard. */
export const GAMES_ACCENT = PURPLE
