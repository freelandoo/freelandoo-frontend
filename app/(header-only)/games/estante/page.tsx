"use client"

// /games/estante — A ESTANTE: a biblioteca da Steam de UMA pessoa (mig 220),
// atrás do pill AMARELO do headcard.
//
// Era a aba "Estante" da raiz de `/games` (slice G4). Virou sala própria a
// pedido do Alex (2026-09-10: "migre a estante para um pill no card da foto"):
// a estante é conteúdo PESSOAL, como Posts, e conteúdo pessoal mora atrás da
// foto, com endereço próprio — dá para mandar o link, o F5 volta ao mesmo lugar
// e o "Voltar" do navegador sai da sala, não da plataforma.
//
// ⚠️ O CONTEXTO `?de=@fulano` TROCA O DONO DA ESTANTE, e só ele. O feed e o
// ranking continuam de todos. `ownerUserId` só recebe o `id_user` que
// `GET /gamer/profile/:username` resolveu — nunca id de comunidade (a regra
// está escrita na própria `GamerShelf`).
//
// ⚠️ A FLAG `games_conexao` gateia a SALA, e não só o pill: com ela desligada
// o backend recusa /gamer/shelf com 403, e uma página que só o pill esconde
// continuaria abrindo em branco para quem tem o link.

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { GamesShell } from "../_components/games-shell"
import { GamesHeadcard } from "../_components/games-headcard"
import { GamerShelf } from "../_components/gamer-shelf"
import { PURPLE } from "../_components/games-ui"
import { ownerLabel, useGamesContext, withOwner } from "../_components/games-context"

export default function GamesShelfPage() {
  const tr = useTranslations("Games")
  const router = useRouter()
  const { perfil } = useMeProfile()
  const { owner } = useGamesContext()
  const shelfOn = useFeature("games_conexao")

  // Os hooks de flag falham ABERTO (`!== false`), então o redirect só dispara
  // com a resposta na mão — a mesma disciplina da Vaquinha na Carteira.
  useEffect(() => {
    if (shelfOn === false) router.replace("/games")
  }, [shelfOn, router])

  const visiting = !!owner

  return (
    <GamesShell>
      <GamesHeadcard
        perfil={perfil}
        title={
          visiting && owner
            ? tr("shelfTitleOf", "Estante de {who}").replace("{who}", ownerLabel(owner))
            : tr("shelfTitle", "Estante")
        }
        backHref={withOwner("/games", owner)}
        active="shelf"
        owner={owner}
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        {/* ESPERA o contexto resolver: sem isso a estante buscaria a de quem
            olha e a trocaria por baixo quando o `?de=` chegasse. */}
        {owner === undefined || !shelfOn ? (
          <div className="flex items-center justify-center py-20 text-[#9A938A]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <GamerShelf
            signedIn={!!perfil}
            accent={PURPLE}
            ownerUserId={owner?.id_user ?? null}
            ownerName={owner ? owner.name || `@${owner.username}` : null}
          />
        )}

        {visiting && (
          <div className="mt-5">
            <Link
              href="/games/estante"
              className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              {tr("seeMine", "Ver o meu games")} →
            </Link>
          </div>
        )}
      </section>
    </GamesShell>
  )
}
