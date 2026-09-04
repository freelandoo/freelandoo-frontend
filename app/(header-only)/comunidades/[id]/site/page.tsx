"use client"

// `/comunidades/<id>/site` — "Meu Site" numa PÁGINA PRÓPRIA.
//
// Era uma aba dentro da página da comunidade até 2026-09-03. Virou página
// porque o construtor monta uma PÁGINA INTEIRA: espremido embaixo do feed, do
// mural e das configurações, ele mostrava um site que não era o que ia ao ar —
// e o líder editava com metade da tela ocupada por outra coisa. As duas portas
// ("Meu Site" no menu do "+" e a aba "Site" do headcard) mandam para cá; a aba
// virou link de propósito, para não existirem duas experiências do mesmo site.
//
// Esta rota é só a MOLDURA: quem carrega, valida permissão e desenha o site é
// o `CommunitySiteBuilder`, o mesmo componente de antes. Aqui só se descobre de
// que comunidade se trata e quem está olhando.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { getStoredUser, getToken } from "@/lib/auth"

const CommunitySiteBuilder = dynamic(
  () =>
    import("../_components/site-builder/community-site-builder").then(
      (m) => m.CommunitySiteBuilder
    ),
  { ssr: false }
)

// Mesma paleta de destaque da página da comunidade. Duplicada aqui de
// propósito: são oito pares de chave e cor, e importá-los da página obrigaria
// a exportar metade do módulo de 3 mil linhas para dentro desta rota.
const ACCENTS: Record<string, string> = {
  gold: "#F2B705",
  magenta: "#ff1f8e",
  cyan: "#16c8e8",
  purple: "#a06bff",
  leaf: "#4fc95a",
  red: "#ff5a44",
  orange: "#ff8c2e",
  gray: "#b8b1a6",
}

type CommunityHead = {
  id_profile: string
  display_name: string
  id_leader_user: string | null
  community_theme: { accent?: string } | null
}

export default function CommunitySitePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const t = useTranslations("CommunitySite")

  const [community, setCommunity] = useState<CommunityHead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/communities/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("notFound", "Comunidade não encontrada."))
      setCommunity(data.community as CommunityHead)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound", "Comunidade não encontrada."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  const currentUserId = getStoredUser()?.id_user ?? null
  const isLeader =
    !!community && !!currentUserId && community.id_leader_user === currentUserId
  const accent = ACCENTS[community?.community_theme?.accent || "gold"] || ACCENTS.gold

  return (
    <main className="fl-sharp min-h-[100dvh] bg-[#0b0804] px-3 py-4 md:px-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageBackLink
          href={id ? `/comunidades/${id}` : "/comunidades"}
          label={t("backToCommunity", "Voltar para a comunidade")}
          className="mb-4"
        />

        {community && (
          <h1 className="mb-4 fl-display text-2xl leading-none text-[#F5F1E8] md:text-4xl">
            {community.display_name}
          </h1>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} />
          </div>
        ) : error || !community ? (
          <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center text-sm text-[#F5F1E8]/70">
            {error || t("notFound", "Comunidade não encontrada.")}
          </div>
        ) : (
          <CommunitySiteBuilder
            idProfile={community.id_profile}
            isLeader={isLeader}
            accent={accent}
          />
        )}
      </div>
    </main>
  )
}
