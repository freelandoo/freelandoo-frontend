"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Car,
  Dumbbell,
  Gamepad2,
  PawPrint,
  Plus,
  Signpost,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { getToken } from "@/lib/auth"

/**
 * O menu que abre ao apertar a foto de perfil (decisão do Alex, 2026-08-30).
 *
 * Ele responde uma pergunta só: "o que é meu?". Cada linha é uma modalidade —
 * pet, carro, games, academia, condomínio, rua (bairro) e comunidade temática.
 * Quem JÁ tem daquele tipo vê a lista; quem não tem cai direto no fluxo de
 * criar. Nenhuma linha leva a uma tela vazia perguntando o que fazer.
 *
 * O visual é o mesmo do "+" do mural (publish-menu-button): itens EMPILHADOS,
 * um em cima do outro, fecha por clique fora e Esc.
 */

type SpaceKind = "pet" | "car" | "games" | "condo" | "neighborhood" | "common"

type SpaceRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  kind: SpaceKind
  role: string | null
  subject_label: string | null
}

type AcademyRow = {
  id_academy: string
  slug: string | null
  display_name: string
  avatar_url: string | null
  role: string
}

type SpacesPayload = {
  spaces: Record<SpaceKind, SpaceRow[]>
  academies: AcademyRow[]
}

const EMPTY: SpacesPayload = {
  spaces: { pet: [], car: [], games: [], condo: [], neighborhood: [], common: [] },
  academies: [],
}

type MenuKey = SpaceKind | "academy"

export function SpacesMenu({
  open,
  onClose,
  onNewProfile,
  hasBees = false,
  onViewBees,
}: {
  open: boolean
  onClose: () => void
  /** Abre o modal de "Criar novo perfil", que vive na página /account. */
  onNewProfile: () => void
  hasBees?: boolean
  onViewBees?: () => void
}) {
  const t = useTranslations("Spaces")
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Flag do admin E preferência do usuário em consts SEPARADAS: `&&` inline
  // deixaria a segunda chamada de hook condicional (rules-of-hooks).
  const communitiesPref = useUserFeature("communities")
  const profilesPref = useUserFeature("profiles")
  const academyFlag = useFeature("fitness_academias")
  const academyPref = useUserFeature("fitness_academias")
  const condoFlag = useFeature("condominio")
  const neighborhoodFlag = useFeature("bairro")
  const petFlag = useFeature("pet")
  const carFlag = useFeature("carro")
  const gamesFlag = useFeature("games")

  const [data, setData] = useState<SpacesPayload>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<MenuKey | null>(null)
  const [creating, setCreating] = useState<"pet" | "car" | "games" | "common" | null>(null)
  // A comunidade comum é a única das quatro que pode ser RECUSADA (teto de
  // comunidades, nível mínimo). Antes o formulário explicava o motivo; sem ele,
  // engolir o erro deixaria o item do menu parecendo quebrado.
  const [createError, setCreateError] = useState<string | null>(null)

  /**
   * Cria a comunidade VAZIA e abre a página dela.
   *
   * Não há formulário: quem escolhe raça, modelo ou jogo é o headcard da
   * própria comunidade, no modo de edição em que o dono já cai (decisão do
   * Alex: "já entra em uma página pronta editável, sem modal"). Um modal
   * perguntando as mesmas coisas antes seria um segundo lugar para editar o
   * que a página já sabe editar.
   */
  const createAndOpen = async (kind: "pet" | "car" | "games" | "common") => {
    const token = getToken()
    if (!token || creating) return
    setCreating(kind)
    setCreateError(null)
    try {
      // A comunidade comum entra pela rota genérica; as trêss modalidades da mig
      // 210 têm base própria. Corpo vazio nas quatro: o backend reconhece o
      // pedido sem nome e sem enxame como RASCUNHO (mig 219) e devolve a
      // comunidade já criada, que a página abre em modo de edição.
      const path =
        kind === "pet" ? "/api/pets"
          : kind === "car" ? "/api/cars"
            : kind === "games" ? "/api/games"
              : "/api/communities"
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      })
      const json = await res.json()
      if (!res.ok || !json?.community?.id_profile) {
        setCreateError(json?.error || t("createError", "Não foi possível criar."))
        return
      }
      onClose()
      router.push(`/comunidades/${json.community.id_profile}`)
    } catch {
      /* silencioso: o menu continua aberto e a pessoa tenta de novo */
    } finally {
      setCreating(null)
    }
  }

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch("/api/me/spaces", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (res.ok) {
        setData({
          spaces: { ...EMPTY.spaces, ...(json.spaces || {}) },
          academies: Array.isArray(json.academies) ? json.academies : [],
        })
      }
    } catch {
      /* menu continua utilizável: sem dados ele oferece criar */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setView(null)
    setCreateError(null)
    load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      // O gatilho (a própria foto de perfil) NÃO conta como clique fora: senão
      // o mousedown fecharia o menu e o click logo em seguida o reabriria, e a
      // foto nunca conseguiria fechar o que ela abriu.
      if (target?.closest?.("[data-spaces-trigger]")) return
      if (wrapRef.current && !wrapRef.current.contains(target)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open, onClose])

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  type Item = {
    key: MenuKey
    icon: LucideIcon
    label: string
    enabled: boolean
    rows: { id: string; name: string; subtitle: string | null; href: string }[]
    /** O que acontece quando a pessoa ainda não tem nenhum daquele tipo. */
    create: () => void
    createLabel: string
  }

  const items: Item[] = [
    {
      key: "pet",
      icon: PawPrint,
      label: t("myPet", "Meu pet"),
      enabled: petFlag,
      rows: data.spaces.pet.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: r.subject_label,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => createAndOpen("pet"),
      createLabel: t("newPet", "Novo pet"),
    },
    {
      key: "car",
      icon: Car,
      label: t("myCar", "Meu carro"),
      enabled: carFlag,
      rows: data.spaces.car.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: r.subject_label,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => createAndOpen("car"),
      createLabel: t("newCar", "Adicionar carro"),
    },
    {
      key: "games",
      icon: Gamepad2,
      label: t("myGames", "Meus games"),
      enabled: gamesFlag,
      rows: data.spaces.games.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: r.subject_label,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => createAndOpen("games"),
      createLabel: t("newGame", "Novo jogo"),
    },
    {
      key: "academy",
      icon: Dumbbell,
      label: t("myAcademy", "Minha academia"),
      enabled: academyFlag && academyPref,
      rows: data.academies.map((a) => ({
        id: a.id_academy,
        name: a.display_name,
        subtitle:
          a.role === "owner" ? t("academyOwner", "Você é dono") : t("academyMember", "Aluno"),
        href: a.slug ? `/academias/${a.slug}` : "/academias",
      })),
      // Academia continua tendo cadastro próprio (mig 176): o menu leva à
      // vitrine, que é onde se cria e onde se acha a academia para se vincular.
      create: () => go("/academias"),
      createLabel: t("findAcademy", "Encontrar academia"),
    },
    {
      key: "condo",
      icon: Building2,
      label: t("myCondo", "Meu condomínio"),
      enabled: condoFlag,
      rows: data.spaces.condo.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: null,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => go("/comunidades/criar?tipo=condo"),
      createLabel: t("newCondo", "Cadastrar condomínio"),
    },
    {
      key: "neighborhood",
      icon: Signpost,
      label: t("myStreet", "Minha rua"),
      enabled: neighborhoodFlag,
      rows: data.spaces.neighborhood.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: null,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => go("/bairro"),
      createLabel: t("findStreet", "Encontrar meu bairro"),
    },
    {
      key: "common",
      icon: Users,
      label: t("myCommunity", "Minha comunidade"),
      enabled: communitiesPref,
      rows: data.spaces.common.map((r) => ({
        id: r.id_profile,
        name: r.display_name,
        subtitle: null,
        href: `/comunidades/${r.id_profile}`,
      })),
      create: () => createAndOpen("common"),
      createLabel: t("newCommunity", "Criar comunidade"),
    },
  ]

  const current = view ? items.find((i) => i.key === view) || null : null

  const itemCls =
    "mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12]"

  return (
    <div ref={wrapRef} className="contents">
      {open && (
        <div
          role="menu"
          // AO LADO da foto, não embaixo dela: embaixo o painel cobria o nome, os
          // contadores e a bio inteira do headcard. `max-w` porque no celular a
          // coluna do avatar deixa pouco espaço à direita — o menu encolhe em vez
          // de vazar da tela (o <main> tem overflow-x-hidden e cortaria).
          className="absolute left-full top-0 z-50 ml-3 flex w-56 max-w-[calc(100vw-8.5rem)] flex-col border-2 border-[#0B0B0D] bg-[#15120E] p-2"
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {current ? (
            <>
              <button
                type="button"
                onClick={() => setView(null)}
                className="mb-1 flex w-full items-center gap-2 px-1 py-1 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] hover:text-[#F5F1E8]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {current.label}
              </button>
              {current.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  onClick={() => go(row.href)}
                  className={itemCls}
                >
                  <current.icon className="h-4 w-4 shrink-0 text-[#F2B705]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate normal-case tracking-normal">{row.name}</span>
                    {row.subtitle && (
                      <span className="block truncate text-[10px] font-semibold normal-case tracking-normal text-[#9A938A]">
                        {row.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={() => current.create()}
                className={itemCls}
                style={{ background: "#241d12" }}
              >
                <Plus className="h-4 w-4 shrink-0 text-[#F2B705]" /> {current.createLabel}
              </button>
              {createError && (
                <p className="px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-[#ff7a6a]">
                  {createError}
                </p>
              )}
            </>
          ) : (
            <>
              {/* Com o anel de bee aceso o avatar deixou de ser o atalho para os
                  bees — o menu passa a ser. Sem essa linha, publicar um bee
                  faria a única entrada para ele sumir. */}
              {hasBees && onViewBees && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose()
                    onViewBees()
                  }}
                  className={itemCls}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-[#ff2d95]" /> {t("viewBees", "Ver seus bees")}
                </button>
              )}

              {profilesPref && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose()
                    onNewProfile()
                  }}
                  className={itemCls}
                >
                  <UserRound className="h-4 w-4 shrink-0 text-[#F2B705]" /> {t("newProfile", "Novo perfil")}
                </button>
              )}

              {items
                .filter((i) => i.enabled)
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (item.rows.length > 0) {
                        setView(item.key)
                        return
                      }
                      onClose()
                      item.create()
                    }}
                    className={itemCls}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-[#F2B705]" />
                    <span className="flex-1">{item.label}</span>
                    {item.rows.length > 0 && (
                      <span className="text-[10px] font-extrabold tabular-nums text-[#F2B705]">
                        {item.rows.length}
                      </span>
                    )}
                  </button>
                ))}

              {loading && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A938A]">
                  {t("loading", "Carregando...")}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
