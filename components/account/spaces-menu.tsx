"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Car,
  Check,
  LayoutList,
  PawPrint,
  Plus,
  Signpost,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { getToken } from "@/lib/auth"
import {
  DEFAULT_QUICK_PILLS,
  QUICK_ENTRIES,
  QUICK_ORDER,
  QUICK_PILL_MAX,
  useQuickAvailability,
  useQuickPills,
  type QuickKey,
} from "@/components/profile/quick-access"

/**
 * CADA LINHA NA COR DA PÁGINA QUE ELA ABRE (Alex, 2026-09-24). A cor sai do
 * catálogo do acesso rápido — o MESMO que pinta os pills atrás da foto —, então
 * a linha "Meu carro" e o pill do carro são o mesmo vermelho por construção.
 * O hover é por variável CSS porque a cor é dado, não classe.
 */
type Swatch = { bg: string; bgHover: string; fg: string }
const swatchStyle = (c: Swatch): CSSProperties =>
  ({ "--bg": c.bg, "--bgh": c.bgHover, color: c.fg }) as CSSProperties
// "Novo perfil" leva ao próprio perfil — o amarelo da casa. "Ver seus bees", o
// rosa do anel neon do avatar.
const PROFILE_SWATCH: Swatch = { bg: "#F2B705", bgHover: "#D9A300", fg: "#0B0B0D" }
const BEES_SWATCH: Swatch = { bg: "#DB2777", bgHover: "#BE185D", fg: "#F1EDE2" }
const NEUTRAL_SWATCH: Swatch = { bg: "#1D1810", bgHover: "#241d12", fg: "#F5F1E8" }
const swatchOfKind = (k: SpaceKind): Swatch => QUICK_ENTRIES[k === "common" ? "business" : k]

/**
 * O menu que abre ao apertar a foto de perfil (decisão do Alex, 2026-08-30).
 *
 * Ele responde uma pergunta só: "o que é meu?". Cada linha é uma modalidade —
 * pet, carro, condomínio, rua (bairro) e comunidade temática. Quem JÁ tem
 * daquele tipo vê a lista; quem não tem cai direto no fluxo de criar. Nenhuma
 * linha leva a uma tela vazia perguntando o que fazer.
 *
 * GAMES e ACADEMIA saíram daqui (decisão do Alex, 2026-09-04): cada um tinha o
 * próprio botão retrátil atrás da foto de perfil (`HeadcardPills`), e manter a
 * linha no menu seria a segunda porta para a mesma tela. "Meus filhos" entrou
 * no lugar delas — é o painel parental, que antes só se alcançava por um chip
 * perdido entre os badges do headcard. (Games foi mais longe: em 2026-09-09 o
 * frontend inteiro daquele ambiente foi apagado.)
 *
 * O visual é o mesmo do "+" do mural (publish-menu-button): itens EMPILHADOS,
 * um em cima do outro, fecha por clique fora e Esc.
 */

type SpaceKind = "pet" | "car" | "condo" | "neighborhood" | "common"

/**
 * Modalidades de UM só por pessoa (decisão do Alex, 2026-09-17): *"só pode uma
 * de condomínio, e uma de rua, somente o pet pode ter mais de uma"*. O carro
 * saiu da lista na mig 259 (2026-09-24): "um ou mais, estilo o meu pet".
 *
 * ⚠️ ESPELHO, NÃO REGRA. Quem recusa é o backend (`utils/spaceCaps` — as três
 * portas do condomínio, as duas do bairro e o botão genérico de entrar); aqui
 * só se decide o que OFERECER. Errar para mais deste lado esconde um botão;
 * errar do outro abriria a porta. Mexeu numa lista, confira a outra.
 */
const SINGLE_SPACE_KINDS: SpaceKind[] = ["condo", "neighborhood"]

type SpaceRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  kind: SpaceKind
  role: string | null
  subject_label: string | null
}

/**
 * `GET /me/spaces` também devolve `academies`; o menu não lê nenhuma das duas —
 * elas viraram botão retrátil do headcard.
 *
 * ⚠️ A CHAVE `games` SAIU DO TIPO (2026-09-09). A resposta do backend ainda
 * traz o balde, e uma chave a mais no JSON é inofensiva em tempo de execução —
 * o que não podia continuar é o tipo ANUNCIAR uma modalidade que este menu não
 * tem como abrir. Ela nascia vazia para todo mundo desde a mig 232 (games virou
 * plataforma e ninguém é membro dela) e o frontend daquele ambiente foi apagado
 * inteiro.
 */
type SpacesPayload = {
  spaces: Record<SpaceKind, SpaceRow[]>
}

const EMPTY: SpacesPayload = {
  spaces: { pet: [], car: [], condo: [], neighborhood: [], common: [] },
}

export function SpacesMenu({
  open,
  onClose,
  onNewProfile,
  hasBees = false,
  onViewBees,
  isMinor = false,
}: {
  open: boolean
  onClose: () => void
  /** Abre o modal de "Criar novo perfil", que vive na página /account. */
  onNewProfile: () => void
  hasBees?: boolean
  onViewBees?: () => void
  /**
   * Menor supervisionado não tem "Meus filhos": para ele o painel parental é
   * outra coisa (pedir permissão), e essa porta continua sendo o chip
   * "Supervisionada" do headcard.
   */
  isMinor?: boolean
}) {
  const t = useTranslations("Spaces")
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Flag do admin E preferência do usuário em consts SEPARADAS: `&&` inline
  // deixaria a segunda chamada de hook condicional (rules-of-hooks).
  const profilesPref = useUserFeature("profiles")
  const condoFlag = useFeature("condominio")
  const neighborhoodFlag = useFeature("bairro")
  const petFlag = useFeature("pet")
  const carFlag = useFeature("carro")

  const [data, setData] = useState<SpacesPayload>(EMPTY)
  const [loading, setLoading] = useState(false)
  // `"pills"` é o gerenciador do acesso rápido (mig 260).
  const [view, setView] = useState<SpaceKind | "pills" | null>(null)
  const available = useQuickAvailability()
  const { pills: chosenPills, save: savePills } = useQuickPills()
  const [pillDraft, setPillDraft] = useState<QuickKey[]>([])
  const [savingPills, setSavingPills] = useState(false)
  const [pillsMsg, setPillsMsg] = useState<string | null>(null)
  const [creating, setCreating] = useState<"pet" | "car" | null>(null)
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
  const createAndOpen = async (kind: "pet" | "car") => {
    const token = getToken()
    if (!token || creating) return
    setCreating(kind)
    setCreateError(null)
    try {
      // Pet e carro (mig 210) têm base própria. Corpo vazio nos dois: o
      // backend reconhece o pedido sem nome e sem enxame como RASCUNHO (mig
      // 219) e devolve a comunidade já criada, que a página abre em modo de
      // edição.
      const path = kind === "pet" ? "/api/pets" : "/api/cars"
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
        setData({ spaces: { ...EMPTY.spaces, ...(json.spaces || {}) } })
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
    key: SpaceKind
    icon: LucideIcon
    label: string
    enabled: boolean
    rows: { id: string; name: string; subtitle: string | null; href: string }[]
    /** O que acontece quando a pessoa ainda não tem nenhum daquele tipo. */
    create: () => void
    createLabel: string
  }

  /**
   * Nas modalidades de um só, o item do menu deixa de ser uma LISTA e vira
   * porta: quem não tem, cria; quem tem, abre. Sem isso o submenu abriria com
   * uma linha e um "+" que o backend recusa — botão que só falha depois do
   * clique é pior que botão nenhum.
   */
  const isSingle = (kind: SpaceKind) => SINGLE_SPACE_KINDS.includes(kind)
  const canCreateMore = (item: Item) => !isSingle(item.key) || item.rows.length === 0

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
      label: t("myStreet", "Meu bairro"),
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
    /* "Minha comunidade" SAIU daqui em 2026-09-05 (pedido do Alex): virou o pill
       "Business" da pilha do headcard (components/profile/headcard-pills.tsx),
       que faz o mesmo abre-ou-cria contra `/api/communities`. Deixá-la nos dois
       lugares seriam duas portas para a mesma ação — e o `createAndOpen` daqui
       ficou só com pet e carro. */
  ]

  const current = view && view !== "pills" ? items.find((i) => i.key === view) || null : null

  // O que o gerenciador oferece: o que a conta pode usar agora. Menor
  // supervisionado não tem "Meus filhos" (ver `isMinor`).
  const pillOptions = QUICK_ORDER.filter((k) => available[k] && !(k === "children" && isMinor))

  const openPillManager = () => {
    setPillDraft((chosenPills ?? DEFAULT_QUICK_PILLS).filter((k) => pillOptions.includes(k)))
    setPillsMsg(null)
    setView("pills")
  }

  const togglePill = (k: QuickKey) => {
    setPillsMsg(null)
    setPillDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : d.length >= QUICK_PILL_MAX ? d : [...d, k]))
  }

  const submitPills = async () => {
    setSavingPills(true)
    const ok = await savePills(pillDraft)
    setSavingPills(false)
    setPillsMsg(ok ? t("pillsSaved", "Acesso rápido salvo.") : t("pillsSaveError", "Não foi possível salvar."))
  }

  // Base SEM cor: a cor de cada linha vem do `swatchStyle` dela.
  const itemCls =
    "mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[var(--bg)] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] last:mb-0 hover:bg-[var(--bgh)]"

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
          {view === "pills" ? (
            <>
              <button
                type="button"
                onClick={() => setView(null)}
                className="mb-1 flex w-full items-center gap-2 px-1 py-1 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] hover:text-[#F5F1E8]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("managePills", "Gerenciar pills")}
              </button>
              <p className="mb-2 px-1 text-[11px] font-semibold leading-snug text-[#9A938A]">
                {t("managePillsHint", "Escolha até {max} para o acesso rápido atrás da sua foto.").replace(
                  "{max}",
                  String(QUICK_PILL_MAX),
                )}
              </p>
              {pillOptions.map((k) => {
                const e = QUICK_ENTRIES[k]
                const on = pillDraft.includes(k)
                const full = !on && pillDraft.length >= QUICK_PILL_MAX
                return (
                  <button
                    key={k}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    disabled={full}
                    onClick={() => togglePill(k)}
                    className={`${itemCls} disabled:opacity-40 ${on ? "" : "opacity-60"}`}
                    style={swatchStyle(e)}
                  >
                    <e.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{t(e.labelKey, e.fallback)}</span>
                    <span className="grid h-4 w-4 place-items-center border-2 border-current">
                      {on && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                )
              })}
              <div className="mt-1 flex items-center justify-between gap-2 px-1">
                <span className="text-[10px] font-extrabold tabular-nums text-[#9A938A]">
                  {pillDraft.length}/{QUICK_PILL_MAX}
                </span>
                <button
                  type="button"
                  onClick={submitPills}
                  disabled={savingPills}
                  className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
                >
                  {savingPills ? t("saving", "Salvando...") : t("save", "Salvar")}
                </button>
              </div>
              {pillsMsg && <p className="px-1 pt-1 text-[11px] font-semibold text-[#9A938A]">{pillsMsg}</p>}
            </>
          ) : current ? (
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
                  style={swatchStyle(swatchOfKind(current.key))}
                >
                  <current.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate normal-case tracking-normal">{row.name}</span>
                    {row.subtitle && (
                      <span className="block truncate text-[10px] font-semibold normal-case tracking-normal opacity-75">
                        {row.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {/* O "+" some quando a modalidade é de um só e a pessoa já tem o
                  dela. Ele continua aqui para o pet — e para o caso legado de
                  quem já tinha dois de algo antes do teto existir, que segue
                  vendo os dois e não ganha um terceiro. */}
              {canCreateMore(current) && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => current.create()}
                  className={itemCls}
                  style={swatchStyle(NEUTRAL_SWATCH)}
                >
                  <Plus className="h-4 w-4 shrink-0 text-[#F2B705]" /> {current.createLabel}
                </button>
              )}
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
                  style={swatchStyle(BEES_SWATCH)}
                >
                  <Sparkles className="h-4 w-4 shrink-0" /> {t("viewBees", "Ver seus bees")}
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
                  style={swatchStyle(PROFILE_SWATCH)}
                >
                  <UserRound className="h-4 w-4 shrink-0" /> {t("newProfile", "Novo perfil")}
                </button>
              )}

              {/* Meus filhos = painel parental. Entrou aqui porque a única
                  porta dele era um chip espremido entre os badges do headcard;
                  o chip do adulto foi embora junto, para não virarem duas
                  portas para a mesma tela. */}
              {!isMinor && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go("/account/parental")}
                  className={itemCls}
                  style={swatchStyle(QUICK_ENTRIES.children)}
                >
                  <ChildrenIcon /> {t("myChildren", "Meus filhos")}
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
                      // Um só e já tem: abre direto. O submenu existiria para
                      // escolher entre uma opção e um "+" que não vale — dois
                      // cliques para chegar onde o primeiro já chegava.
                      if (isSingle(item.key) && item.rows.length === 1) {
                        go(item.rows[0].href)
                        return
                      }
                      if (item.rows.length > 0) {
                        setView(item.key)
                        return
                      }
                      onClose()
                      item.create()
                    }}
                    className={itemCls}
                    style={swatchStyle(swatchOfKind(item.key))}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {/* Contador só onde ele diz alguma coisa: num item de um só
                        ele seria sempre "1". */}
                    {item.rows.length > 0 && !isSingle(item.key) && (
                      <span className="text-[10px] font-extrabold tabular-nums">
                        {item.rows.length}
                      </span>
                    )}
                  </button>
                ))}

              {/* O acesso rápido: quais destes (e dos pills de sempre) ficam
                  atrás da foto. */}
              <button
                type="button"
                role="menuitem"
                onClick={openPillManager}
                className={itemCls}
                style={swatchStyle(NEUTRAL_SWATCH)}
              >
                <LayoutList className="h-4 w-4 shrink-0 text-[#F2B705]" /> {t("managePills", "Gerenciar pills")}
              </button>

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

function ChildrenIcon() {
  const Icon = QUICK_ENTRIES.children.icon
  return <Icon className="h-4 w-4 shrink-0" />
}
