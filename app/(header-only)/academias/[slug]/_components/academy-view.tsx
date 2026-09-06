"use client"

// Página da academia — identidade Freelandoo (tabloide escuro/dourado, mesma
// linguagem da página de comunidade): capa com chips rotacionados, avatar
// sobreposto com outline dourado, tiles de estatística, painéis #15120E.

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  IdCard,
  Loader2,
  MapPin,
  MessageCircle,
  PlugZap,
  RefreshCcw,
  ShieldAlert,
  Star,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { getStoredUser, getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { PublishMenuButton } from "@/components/composer/publish-menu-button"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
// A gaveta dos números — a MESMA peça da comunidade. Só a mecânica é dela: o
// que entra na coluna (vinculados, professores, destaque e ranking do mês) é
// desta página.
import { RetractableColumn } from "@/components/tabloide"
import { AcademyFeed } from "./academy-feed"
import {
  BTN_DARK,
  BTN_GOLD,
  GOLD,
  H_SECTION,
  INNER,
  PANEL,
  STATUS_KEYS,
  type ExpiredPlans,
} from "./academy-ui"

const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)
// Recado = post só-texto (mig 209). Fica fora do MediaComposer de propósito:
// publicar um parágrafo não deve baixar o módulo de câmera inteiro.
const RecadoComposer = dynamic(
  () => import("@/components/composer/RecadoComposer").then((m) => m.RecadoComposer),
  { ssr: false }
)

type Professor = { id_user: string; username: string | null; nome: string | null; id_profile?: string | null }
/** Uma linha do ranking do mês (`GET /academies/:id/ranking`, porta pública). */
type RankMember = {
  id_member: string
  nome: string | null
  username: string | null
  avatar_url: string | null
  freq_days: number
}
type MyMembership = {
  membership_status: string
  plan_name: string | null
  expires_at: string | null
  linked_at: string
} | null

type Academy = {
  id_academy: string
  nome: string
  slug: string
  descricao: string | null
  cidade: string | null
  avatar_url: string | null
  cover_url: string | null
  member_count: number
  is_owner: boolean
  is_professor: boolean
  owner_profile_id: string | null
  professors: Professor[]
  my_membership: MyMembership
  // campos do dono
  api_base_url?: string
  sync_status?: string
  sync_error?: string | null
  last_sync_at?: string | null
  is_active?: boolean
}

/**
 * O alerta de ficha vencida aparece UMA VEZ POR DIA por academia, não a cada
 * navegação: o professor entra na página várias vezes ao dia (mural, ranking,
 * membros e volta), e um modal em toda entrada vira a caixa que se fecha sem
 * ler. O que fica no ar o tempo todo é a BOLINHA no botão "Membros" — o aviso
 * continua visível, é só o modal que não repete.
 */
function alertSeenToday(id_academy: string): boolean {
  try {
    return localStorage.getItem(`fl_academy_plan_alert:${id_academy}`) === new Date().toISOString().slice(0, 10)
  } catch {
    return false
  }
}

function markAlertSeen(id_academy: string) {
  try {
    localStorage.setItem(`fl_academy_plan_alert:${id_academy}`, new Date().toISOString().slice(0, 10))
  } catch {
    /* navegador sem storage: o modal volta na próxima visita, e tudo bem */
  }
}

export function AcademyView({ slug }: { slug: string }) {
  const t = useTranslations("Academies")
  const locale = useLocale()
  const enabled = useFeature("fitness_academias")

  const [academy, setAcademy] = useState<Academy | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  // Fichas vencidas: acende a bolinha do botão "Membros" e monta o modal que
  // recebe o professor. Só o staff enxerga (a rota recusa o resto).
  const [expired, setExpired] = useState<ExpiredPlans | null>(null)
  const [expiredOpen, setExpiredOpen] = useState(false)

  const [linkOpen, setLinkOpen] = useState(false)
  const [cpf, setCpf] = useState("")
  const [linking, setLinking] = useState(false)
  const [testing, setTesting] = useState(false)
  // Resultado do último "Testar conexão": bolinha verde (ok) / vermelha (falha).
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState<"avatar" | "cover" | null>(null)
  const avatarRef = useRef<HTMLInputElement | null>(null)
  const coverRef = useRef<HTMLInputElement | null>(null)
  // Publicar no mural: o "+" do headcard abre estes composers, e o mural
  // recarrega por `feedReload` (o botão não mora mais dentro do feed).
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerKind, setComposerKind] = useState<"post" | "bee">("post")
  const [recadoOpen, setRecadoOpen] = useState(false)
  // Professores, destaque e ranking do mês moram na GAVETA dos números (a
  // mesma peça da comunidade): o "+" do headcard voltou a ser só o menu de
  // publicar. Dois lugares abrindo a lista de professores é como um deles
  // deixaria de acompanhar o outro sem nada quebrar.
  //
  // O ranking é carregado SÓ quando a gaveta abre: ele é a única tela que o
  // usa, e a maioria das visitas ao mural não abre a gaveta — cobrar uma
  // requisição de todas elas seria pagar por quem não pediu.
  const [ranking, setRanking] = useState<RankMember[]>([])
  const [rankingState, setRankingState] = useState<"idle" | "loading" | "loaded" | "error">("idle")
  const [feedReload, setFeedReload] = useState(0)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/academies/slug/${encodeURIComponent(slug)}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAcademy(data.academy)
      setState("loaded")
      if (data.academy?.is_owner || data.academy?.is_professor) {
        const eres = await fetch(`/api/academies/${data.academy.id_academy}/expired-plans`, {
          headers: authHeaders(),
        })
        if (eres.ok) {
          const edata: ExpiredPlans = await eres.json()
          setExpired(edata)
          // O modal SÓ nasce aberto: quem fechar não é reaberto por um
          // recarregamento da página (o `load` roda de novo em várias ações).
          if (edata.count > 0 && !alertSeenToday(data.academy.id_academy)) {
            markAlertSeen(data.academy.id_academy)
            setExpiredOpen(true)
          }
        }
      }
    } catch {
      setState("error")
    }
  }, [slug, authHeaders])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  // Só busca na PRIMEIRA abertura (ou de novo depois de um erro): reabrir a
  // gaveta não precisa recontar o mês inteiro. A porta é anônima — o ranking
  // da academia é público, como na página cheia dele.
  const loadRanking = useCallback(async () => {
    if (!academy) return
    if (rankingState === "loading" || rankingState === "loaded") return
    setRankingState("loading")
    try {
      const res = await fetch(`/api/academies/${academy.id_academy}/ranking`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRanking(Array.isArray(data.members) ? data.members : [])
      setRankingState("loaded")
    } catch {
      // Fica em "error" de propósito: lista vazia diria "ninguém treinou este
      // mês", que é outra coisa — e a próxima abertura tenta de novo.
      setRankingState("error")
    }
  }, [academy, rankingState])

  // A fila do mês é por FREQUÊNCIA (dias de catraca), o mesmo padrão com que a
  // página cheia do ranking abre. Destaque = quem está em primeiro nela.
  const rankedByFreq = [...ranking].sort((a, b) => Number(b.freq_days || 0) - Number(a.freq_days || 0))
  const topOfMonth = rankedByFreq.find((m) => Number(m.freq_days || 0) > 0) || null

  const link = useCallback(async () => {
    const token = getToken()
    if (!token) {
      toast.error(t("loginRequired", "Entre na sua conta para cadastrar uma academia."))
      return
    }
    if (!academy) return
    setLinking(true)
    try {
      const res = await fetch(`/api/academies/${academy.id_academy}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ cpf }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("linkOk", "Matrícula vinculada! Seu painel fitness está liberado."))
      setLinkOpen(false)
      setCpf("")
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("linkError", "Não foi possível vincular o CPF"))
    } finally {
      setLinking(false)
    }
  }, [academy, cpf, authHeaders, load, t])

  const unlink = useCallback(async () => {
    if (!academy) return
    if (!window.confirm(t("unlinkConfirm", "Desvincular sua matrícula desta academia?"))) return
    try {
      const res = await fetch(`/api/academies/${academy.id_academy}/link`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("unlinkOk", "Vínculo removido."))
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("unlinkError", "Erro ao desvincular"))
    }
  }, [academy, authHeaders, load, t])

  const testConnection = useCallback(async () => {
    if (!academy) return
    setTesting(true)
    try {
      const res = await fetch(`/api/academies/${academy.id_academy}/test-connection`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestResult("ok")
      toast.success(t("testOk", "Conexão OK — a API da academia respondeu."))
    } catch (err) {
      setTestResult("fail")
      toast.error(err instanceof Error && err.message ? err.message : t("testError", "Falha no teste de conexão"))
    } finally {
      setTesting(false)
    }
  }, [academy, authHeaders, t])

  const syncNow = useCallback(async () => {
    if (!academy) return
    setSyncing(true)
    try {
      const res = await fetch(`/api/academies/${academy.id_academy}/sync`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("syncOk", "Sincronização executada."))
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("syncError", "Falha na sincronização"))
    } finally {
      setSyncing(false)
    }
  }, [academy, authHeaders, load, t])

  const uploadMedia = useCallback(
    async (kind: "avatar" | "cover", file: File) => {
      if (!academy) return
      setUploadingMedia(kind)
      try {
        const fd = new FormData()
        fd.set("kind", kind)
        fd.set("media", file)
        const res = await fetch(`/api/academies/${academy.id_academy}/media`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success(t("mediaOk", "Imagem atualizada!"))
        void load()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("mediaError", "Erro ao enviar imagem"))
      } finally {
        setUploadingMedia(null)
      }
    },
    [academy, authHeaders, load, t]
  )

  const fmtDate = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return "—"
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale)
    },
    [locale]
  )

  if (!enabled) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <Dumbbell className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">{t("disabled", "Recurso indisponível no momento.")}</p>
        </div>
      </div>
    )
  }
  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "error" || !academy) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">{t("notFound", "Academia não encontrada.")}</p>
          <Link href="/academias" className={`${BTN_DARK} mt-4 px-4 py-2 text-xs`}>
            {t("backToList", "Ver academias")}
          </Link>
        </div>
      </div>
    )
  }

  const ms = academy.my_membership
  const statusMeta = ms ? STATUS_KEYS[ms.membership_status] || STATUS_KEYS.pending : null
  const isStaff = academy.is_owner || academy.is_professor
  const canPost = academy.is_owner || academy.is_professor || !!ms
  const meId = getStoredUser()?.id_user || null
  const expiredCount = expired?.count ?? 0

  /**
   * O botão retrátil do headcard da academia. Hoje é UM (Membros, rosa) — e é a
   * mesma pilha do headcard do perfil e da comunidade, não uma cópia: botão
   * novo de headcard de academia entra NESTA lista, nunca como bloco solto no
   * meio da página.
   *
   * Ele só existe para o staff porque é o que ele abre que é do staff (a lista
   * de vinculados e a grade de treinos). Dar o botão a quem receberia 403 do
   * outro lado seria uma porta pintada.
   */
  const pills: PillSpec[] = isStaff
    ? [
        {
          key: "members",
          icon: UserRound,
          label: t("membersPill", "Membros"),
          ariaLabel: t("membersPillAria", "Abrir membros vinculados e treinos por data"),
          bg: "#DB2777",
          bgHover: "#BE185D",
          href: `/academias/${academy.slug}/membros`,
          dot: expiredCount > 0,
          dotLabel: t("expiredDot", "Há alunos com a ficha vencida"),
        },
      ]
    : []

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/fitness"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#9A938A] hover:text-[#F2B705]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("backToFitness", "Voltar pro painel fitness")}
          </Link>
          <Link
            href="/academias"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#9A938A] hover:text-[#F2B705]"
          >
            {t("backToList", "Ver academias")}
          </Link>
        </div>

        {/* Cabeçalho estilo comunidade: capa + chips + avatar sobreposto */}
        <header className="relative mt-3 border-2 border-[#0B0B0D]" style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}>
          <div className="relative h-40 bg-[#1D1810] md:h-52">
            {academy.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={academy.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
              {t("chipAcademy", "Academia parceira")}
            </span>
            {academy.cidade && (
              <span className="absolute left-4 top-12 z-20 inline-flex -rotate-2 items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F5F1E8]">
                <MapPin className="h-3 w-3 text-[#F2B705]" />
                {academy.cidade}
              </span>
            )}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-lg font-black leading-none text-[#F2B705]">{academy.member_count}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                {t("membersSuffix", "vinculados")}
              </span>
            </span>
          </div>

          <div className="bg-[#15120E] px-5 pb-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                {/* Coluna da foto: a pilha de pills é o PRIMEIRO filho e a foto
                    vem DEPOIS no DOM — dois posicionados sem z-index pintam na
                    ordem do documento, então a foto cobre o botão e só o ícone
                    escapa pela direita. `-z-10` NÃO serve aqui (o card da foto
                    é z-30 e formaria contexto próprio). A pilha fica FORA da
                    caixa da foto, que é `overflow-hidden` e recortaria o pill
                    na borda. */}
                <div className="relative -mt-10 h-24 w-24 shrink-0 md:-mt-14 md:h-32 md:w-32">
                  {pills.length > 0 && (
                    <PillStack
                      pills={pills}
                      // Casa com a LARGURA DA FOTO desta superfície (w-24
                      // md:w-32). Mexeu no tamanho da foto? Ajustar aqui.
                      avatarPadClass="pl-24 md:pl-32"
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                    />
                  )}
                  <div
                    className="relative z-30 h-full w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]"
                    style={{ outline: `2px solid ${GOLD}`, outlineOffset: "2px" }}
                  >
                    {academy.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={academy.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Dumbbell className="h-9 w-9 text-[#9A938A]" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">{academy.nome}</h1>
                    {academy.owner_profile_id && (
                      <Link
                        href={`/mensagens?with=${encodeURIComponent(academy.owner_profile_id)}`}
                        aria-label={t("messageCta", "Enviar mensagem")}
                        title={t("messageCta", "Enviar mensagem")}
                        className={`${BTN_DARK} h-9 w-9 shrink-0`}
                      >
                        <MessageCircle className="h-4 w-4 text-[#F2B705]" />
                      </Link>
                    )}
                    {/* Publicar no mural: mesmo "+" amarelo das comunidades,
                        no headcard. A academia não tem Bee (story pertence a
                        comunidade, não a academia) — só Post, Curto e Recado. */}
                    <PublishMenuButton
                      label={t("composeCta", "Publicar")}
                      canPost={canPost}
                      blockedMessage={t("joinToPost", "Vincule sua matrícula para publicar.")}
                      onBlocked={(m) => toast.error(m)}
                      items={[
                        { kind: "post", label: t("postLabel", "Post") },
                        { kind: "bee", label: t("curtoLabel", "Curto") },
                        { kind: "recado", label: t("recadoLabel", "Recado") },
                      ]}
                      onPick={(kind) => {
                        if (kind === "recado") { setRecadoOpen(true); return }
                        setComposerKind(kind === "bee" ? "bee" : "post")
                        setComposerOpen(true)
                      }}
                    />
                  </div>
                  {academy.descricao && <p className="mt-2 max-w-xl text-sm text-[#9A938A]">{academy.descricao}</p>}
                </div>
              </div>

              {/* Meu vínculo */}
              <div className="min-w-[220px] pt-4">
                {ms ? (
                  <div className={`${INNER} p-3`}>
                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F2B705]">
                      <BadgeCheck className="h-4 w-4" />
                      {statusMeta ? t(statusMeta[0], statusMeta[1]) : ms.membership_status}
                    </p>
                    {ms.plan_name && <p className="mt-1 text-xs text-[#9A938A]">{ms.plan_name}</p>}
                    <p className="mt-1 text-[11px] text-[#9A938A]">
                      {t("linkedSince", "Vinculado desde")} {fmtDate(ms.linked_at)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Link href="/fitness" className={`${BTN_GOLD} px-3 py-1.5 text-[11px]`}>
                        {t("goFitness", "Meu painel fitness")}
                      </Link>
                      <button onClick={() => void unlink()} className={`${BTN_DARK} px-2 py-1.5`} aria-label={t("unlinkCta", "Desvincular")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setLinkOpen(true)} className={`${BTN_GOLD} w-full px-4 py-3 text-xs`}>
                    <IdCard className="h-4 w-4" />
                    {t("linkCta", "Vincular matrícula (CPF)")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* OS NÚMEROS DA ACADEMIA — a gaveta, a MESMA da comunidade.

            Fica escondida atrás da pontinha da seta na borda direita e não
            ocupa um centímetro da página: o mural continua começando logo
            depois do headcard. Dentro dela, na mesma ordem da comunidade —
            número, quem é destaque, quem está na frente.

            O ranking do mês chega no `onOpen` (ver `loadRanking`), então quem
            só passou pelo mural não paga a requisição dele.

            Bloco novo de número da academia entra AQUI DENTRO, nunca solto
            entre o headcard e o mural. */}
        <RetractableColumn
          title={t("statsTitle", "Números da academia")}
          ariaLabel={t("statsAria", "Números da academia: vinculados, professores, destaque e ranking do mês")}
          closeLabel={t("close", "Fechar")}
          icon={<BarChart3 className="h-4 w-4" />}
          accent={GOLD}
          onOpen={() => void loadRanking()}
        >
          <div className={`${PANEL} flex items-center gap-3 px-4 py-3`}>
            <Users className="h-4 w-4 shrink-0 text-[#F2B705]" />
            <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A938A]">
              {t("membersSuffix", "vinculados")}
            </span>
            <span className="text-2xl font-black leading-none text-[#F5F1E8]">{academy.member_count}</span>
          </div>

          {/* Professores — a lista que era um modal do "+". */}
          <div className={`${PANEL} p-4`}>
            <h2 className={`${H_SECTION} border-b-2 border-[#0B0B0D] pb-2`}>
              <GraduationCap className="h-4 w-4 text-[#F2B705]" />
              {t("professorsTitle", "Professores")}
            </h2>
            {academy.professors.length === 0 ? (
              <p className="mt-3 text-xs text-[#9A938A]">{t("professorsEmpty", "Nenhum professor cadastrado ainda.")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {academy.professors.map((prof) => (
                  <li key={prof.id_user} className={`${INNER} flex items-center justify-between gap-3 px-3 py-2 text-xs font-bold`}>
                    <span className="min-w-0 truncate">{prof.nome || prof.username || prof.id_user.slice(0, 8)}</span>
                    {/* Sem perfil (professor que nunca criou nenhum) o link não
                        aparece — melhor nada do que /freelancer/undefined. */}
                    {prof.id_profile && (
                      <Link
                        href={`/freelancer/${prof.id_profile}`}
                        className="shrink-0 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] hover:-translate-y-0.5"
                      >
                        {t("professorViewProfile", "Ver perfil")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destaque do mês — quem mais bateu a catraca. Só aparece com pelo
              menos um dia registrado: pódio de zero dia não é destaque. */}
          {topOfMonth && (
            <div className={`${PANEL} p-4`}>
              <h2 className={`${H_SECTION} border-b-2 border-[#0B0B0D] pb-2`}>
                <Star className="h-4 w-4 text-[#F2B705]" />
                {t("spotlightTitle", "Destaque")}
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div className={`${INNER} h-14 w-14 shrink-0 overflow-hidden`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={topOfMonth.avatar_url || "/placeholder-user.jpg"} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black uppercase leading-tight text-[#F5F1E8]">
                    {topOfMonth.nome || topOfMonth.username || "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                    {t("spotlightSub", "Mais frequente do mês")} ·{" "}
                    {t("rankFreqDays", "{n} dias").replace("{n}", String(topOfMonth.freq_days))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ranking do mês — os cinco primeiros; a fila inteira (e as outras
              métricas) continuam na página do ranking. */}
          <div className={`${PANEL} p-4`}>
            <h2 className={`${H_SECTION} border-b-2 border-[#0B0B0D] pb-2`}>
              <Trophy className="h-4 w-4 text-[#F2B705]" />
              {t("rankingTitle", "Ranking do mês")}
            </h2>
            {rankingState === "loading" ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-[#9A938A]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </p>
            ) : rankingState === "error" ? (
              <p className="mt-3 text-xs text-[#9A938A]">
                {t("rankingError", "Não deu para carregar o ranking agora.")}
              </p>
            ) : rankedByFreq.length === 0 ? (
              <p className="mt-3 text-xs text-[#9A938A]">{t("rankingEmpty", "Ninguém treinou este mês ainda.")}</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {rankedByFreq.slice(0, 5).map((m, i) => (
                  <li key={m.id_member} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-base font-black text-[#F5F1E8]/40">{i + 1}</span>
                    <div className="h-8 w-8 shrink-0 overflow-hidden border border-[#0B0B0D] bg-[#1D1810]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.avatar_url || "/placeholder-user.jpg"} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#F5F1E8]">
                      {m.nome || m.username || "—"}
                    </span>
                    <span className="shrink-0 text-[11px] font-extrabold text-[#F2B705]">
                      {t("rankFreqDays", "{n} dias").replace("{n}", String(m.freq_days))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <Link href={`/academias/${academy.slug}/ranking`} className={`${BTN_DARK} mt-3 w-full px-3 py-2 text-[11px]`}>
              {t("rankingSeeAll", "Ver ranking completo")}
            </Link>
          </div>
        </RetractableColumn>

        {/* Painel do dono */}
        {academy.is_owner && (
          <section className={`${PANEL} mt-6 p-4`}>
            <h2 className={H_SECTION}>
              <PlugZap className="h-4 w-4 text-[#F2B705]" />
              {t("ownerPanelTitle", "Gestão — conexão com o software da academia")}
            </h2>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("ownerApiUrl", "URL da API")}</dt>
                <dd className="mt-0.5 break-all font-mono text-[#F5F1E8]">{academy.api_base_url}</dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("ownerSyncStatus", "Status do sync")}</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-block border-2 border-[#0B0B0D] px-2 py-0.5 font-extrabold uppercase ${academy.sync_status === "ok" ? "bg-[#4fc95a] text-[#0B0B0D]" : academy.sync_status === "never" ? "bg-[#1D1810] text-[#9A938A]" : "bg-[#ff5a44] text-[#0B0B0D]"}`}
                  >
                    {academy.sync_status}
                  </span>
                  {academy.sync_error && <span className="ml-2 text-[#9A938A]">{academy.sync_error}</span>}
                </dd>
              </div>
              <div>
                <dt className="font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("ownerLastSync", "Última sincronização")}</dt>
                <dd className="mt-0.5">{academy.last_sync_at ? new Date(academy.last_sync_at).toLocaleString(locale) : "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void testConnection()} disabled={testing} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                {t("testCta", "Testar conexão")}
                {!testing && testResult && (
                  <span
                    data-dot
                    className={`ml-1 inline-block h-2.5 w-2.5 shrink-0 ${testResult === "ok" ? "bg-[#4fc95a]" : "bg-[#ff5a44]"}`}
                    role="status"
                    aria-label={testResult === "ok" ? t("testDotOk", "Conectado") : t("testDotFail", "Sem conexão")}
                    title={testResult === "ok" ? t("testDotOk", "Conectado") : t("testDotFail", "Sem conexão")}
                  />
                )}
              </button>
              <button onClick={() => void syncNow()} disabled={syncing} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                {t("syncCta", "Sincronizar agora")}
              </button>
              <button onClick={() => avatarRef.current?.click()} disabled={uploadingMedia !== null} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {uploadingMedia === "avatar" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("mediaAvatarCta", "Trocar avatar")}
              </button>
              <button onClick={() => coverRef.current?.click()} disabled={uploadingMedia !== null} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {uploadingMedia === "cover" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("mediaCoverCta", "Trocar capa")}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadMedia("avatar", f)
                  e.target.value = ""
                }}
              />
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadMedia("cover", f)
                  e.target.value = ""
                }}
              />
            </div>
          </section>
        )}

        {/* Mural social (público; postar = vinculado/staff) */}
        <AcademyFeed academyId={academy.id_academy} slug={academy.slug} reloadKey={feedReload} isOwner={academy.is_owner} meId={meId} />
      </div>

      {/* Modal vincular CPF */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLinkOpen(false)}>
          <div
            className={`fl-sharp w-full max-w-md ${PANEL} p-6 text-[#F5F1E8]`}
            style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b-2 border-[#0B0B0D] pb-3">
              <h2 className="text-xl font-black uppercase">{t("linkTitle", "Vincular matrícula")}</h2>
              <button onClick={() => setLinkOpen(false)} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
              </button>
            </div>
            <p className="mt-3 text-xs text-[#9A938A]">
              {t(
                "linkIntro",
                "Digite o CPF cadastrado na academia. Vamos confirmar sua matrícula direto no sistema dela — na hora."
              )}
            </p>
            <label className="mt-4 block">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("cpfLabel", "CPF")}</span>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 font-mono text-lg text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-4">
              <button onClick={() => setLinkOpen(false)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {t("cancel", "Cancelar")}
              </button>
              <button onClick={() => void link()} disabled={linking} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {linking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("linkSubmit", "Vincular")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fichas vencidas — o que recebe o professor ao entrar na academia.
          A lista completa (e a grade por data) fica no botão "Membros". */}
      {expiredOpen && expired && expired.count > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setExpiredOpen(false)}>
          <div
            className={`fl-sharp max-h-[85vh] w-full max-w-md overflow-y-auto ${PANEL} p-6 text-[#F5F1E8]`}
            style={{ boxShadow: "8px 8px 0 0 #ff3b30" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b-2 border-[#0B0B0D] pb-3">
              <h2 className="flex items-center gap-2 text-xl font-black uppercase">
                <ClipboardList className="h-5 w-5 text-[#ff3b30]" />
                {t("expiredTitle", "Fichas vencidas")}
              </h2>
              <button onClick={() => setExpiredOpen(false)} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
              </button>
            </div>
            <p className="mt-3 text-xs text-[#9A938A]">
              {t("expiredIntro", "{n} aluno(s) estão com a mesma ficha há {d} dias ou mais. Hora de montar um treino novo.")
                .replace("{n}", String(expired.count))
                .replace("{d}", String(expired.days))}
            </p>
            <ul className="mt-3 space-y-2">
              {expired.members.map((m) => (
                <li key={m.id_member} className={`${INNER} flex items-center justify-between gap-3 px-3 py-2 text-xs`}>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{m.nome || "—"}</span>
                    <span className="block truncate text-[11px] text-[#9A938A]">
                      {m.active_plan_nome || t("noPlanName", "sem nome")}
                    </span>
                  </span>
                  <span className="shrink-0 border-2 border-[#0B0B0D] bg-[#ff3b30] px-2 py-1 text-[10px] font-black uppercase text-[#0B0B0D]">
                    {t("expiredDays", "{n} dias").replace("{n}", String(m.days_on_plan))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-4">
              <button onClick={() => setExpiredOpen(false)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {t("expiredLater", "Agora não")}
              </button>
              <Link href={`/academias/${academy.slug}/membros?aba=treinos`} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {t("expiredCta", "Ver treinos por data")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Composers do "+" do headcard */}
      {recadoOpen && (
        <RecadoComposer
          open
          academyId={academy.id_academy}
          onClose={() => setRecadoOpen(false)}
          onPosted={() => {
            setRecadoOpen(false)
            setFeedReload((n) => n + 1)
          }}
        />
      )}
      {composerOpen && (
        <MediaComposer
          open
          mode={composerKind}
          academyId={academy.id_academy}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false)
            setFeedReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
