"use client"

// Página da academia — identidade Freelandoo (tabloide escuro/dourado, mesma
// linguagem da página de comunidade): capa com chips rotacionados, avatar
// sobreposto com outline dourado, tiles de estatística, painéis #15120E.

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  BadgeCheck,
  Dumbbell,
  GraduationCap,
  IdCard,
  Loader2,
  MapPin,
  PlugZap,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { getStoredUser, getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { TrainingGrid } from "./training-grid"
import { AcademyFeed } from "./academy-feed"
import { AcademyRanking } from "./academy-ranking"

type Professor = { id_user: string; username: string | null; nome: string | null }
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
  professors: Professor[]
  my_membership: MyMembership
  // campos do dono
  api_base_url?: string
  sync_status?: string
  sync_error?: string | null
  last_sync_at?: string | null
  is_active?: boolean
}

type Member = {
  id_member: string
  id_user: string
  username: string | null
  nome: string | null
  member_name: string | null
  membership_status: string
  plan_name: string | null
  linked_at: string
  is_professor: boolean
}

const STATUS_KEYS: Record<string, [string, string]> = {
  active: ["statusActive", "Matrícula ativa"],
  overdue: ["statusOverdue", "Mensalidade atrasada"],
  canceled: ["statusCanceled", "Matrícula cancelada"],
  expired: ["statusExpired", "Matrícula vencida"],
  pending: ["statusPending", "Matrícula pendente"],
}

const GOLD = "#F2B705"
const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
const H_SECTION = "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"

export function AcademyView({ slug }: { slug: string }) {
  const t = useTranslations("Academies")
  const locale = useLocale()
  const enabled = useFeature("fitness_academias")

  const [academy, setAcademy] = useState<Academy | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [members, setMembers] = useState<Member[]>([])

  const [linkOpen, setLinkOpen] = useState(false)
  const [cpf, setCpf] = useState("")
  const [linking, setLinking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState<"avatar" | "cover" | null>(null)
  const avatarRef = useRef<HTMLInputElement | null>(null)
  const coverRef = useRef<HTMLInputElement | null>(null)

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
        const mres = await fetch(`/api/academies/${data.academy.id_academy}/members`, { headers: authHeaders() })
        if (mres.ok) {
          const mdata = await mres.json()
          setMembers(Array.isArray(mdata.members) ? mdata.members : [])
        }
      }
    } catch {
      setState("error")
    }
  }, [slug, authHeaders])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

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
      toast.success(t("testOk", "Conexão OK — a API da academia respondeu."))
    } catch (err) {
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

  const toggleProfessor = useCallback(
    async (member: Member) => {
      if (!academy) return
      try {
        const res = member.is_professor
          ? await fetch(`/api/academies/${academy.id_academy}/professors/${member.id_user}`, {
              method: "DELETE",
              headers: authHeaders(),
            })
          : await fetch(`/api/academies/${academy.id_academy}/professors`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ id_user: member.id_user }),
            })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success(
          member.is_professor
            ? t("professorRemoved", "Professor removido.")
            : t("professorAdded", "Professor promovido!")
        )
        void load()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("professorError", "Erro ao atualizar professor"))
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
        <header className="mt-3 overflow-hidden border-2 border-[#0B0B0D]" style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}>
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
                <div
                  className="-mt-10 h-24 w-24 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:-mt-14 md:h-32 md:w-32"
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
                <div className="pb-1">
                  <h1 className="text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">{academy.nome}</h1>
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

        {/* Professores */}
        <section className={`${PANEL} mt-6 p-4`}>
          <h2 className={H_SECTION}>
            <GraduationCap className="h-4 w-4 text-[#F2B705]" />
            {t("professorsTitle", "Professores")}
          </h2>
          {academy.professors.length === 0 ? (
            <p className="mt-2 text-xs text-[#9A938A]">{t("professorsEmpty", "Nenhum professor cadastrado ainda.")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {academy.professors.map((p) => (
                <li key={p.id_user} className={`${INNER} px-3 py-1 text-xs font-bold`}>
                  {p.nome || p.username || p.id_user.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </section>

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

        {/* Ranking do mês (público) */}
        <AcademyRanking academyId={academy.id_academy} isOwner={academy.is_owner} />

        {/* Mural social (público; postar = vinculado/staff) */}
        <AcademyFeed academyId={academy.id_academy} slug={academy.slug} canPost={canPost} isOwner={academy.is_owner} meId={meId} />

        {/* Treinos por data (staff) */}
        {isStaff && <TrainingGrid academyId={academy.id_academy} />}

        {/* Membros (staff) */}
        {isStaff && (
          <section className={`${PANEL} mt-6 p-4`}>
            <h2 className={H_SECTION}>
              <Users className="h-4 w-4 text-[#F2B705]" />
              {t("membersTitle", "Membros vinculados")}
            </h2>
            {members.length === 0 ? (
              <p className="mt-2 text-xs text-[#9A938A]">
                {t("membersEmpty", "Ninguém vinculou a matrícula ainda. Divulgue a página da academia!")}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#0B0B0D] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                      <th className="py-2 pr-3">{t("colMember", "Membro")}</th>
                      <th className="py-2 pr-3">{t("colStatus", "Status")}</th>
                      <th className="py-2 pr-3">{t("colPlan", "Plano")}</th>
                      <th className="py-2 pr-3">{t("colLinked", "Vínculo")}</th>
                      {academy.is_owner && <th className="py-2">{t("colProfessor", "Professor")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const meta = STATUS_KEYS[m.membership_status] || STATUS_KEYS.pending
                      return (
                        <tr key={m.id_member} className="border-b border-[#F5F1E8]/10">
                          <td className="py-2 pr-3 font-bold">
                            {m.nome || m.username || m.member_name || "—"}
                            {m.is_professor && (
                              <span className="ml-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-1 text-[10px] font-extrabold uppercase text-[#0B0B0D]">
                                {t("professorBadge", "Prof")}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3">{t(meta[0], meta[1])}</td>
                          <td className="py-2 pr-3">{m.plan_name || "—"}</td>
                          <td className="py-2 pr-3">{fmtDate(m.linked_at)}</td>
                          {academy.is_owner && (
                            <td className="py-2">
                              <button
                                onClick={() => void toggleProfessor(m)}
                                className={`border-2 border-[#0B0B0D] px-2 py-1 text-[10px] font-extrabold uppercase ${m.is_professor ? "bg-[#1D1810] text-[#F5F1E8]" : "bg-[#F2B705] text-[#0B0B0D]"}`}
                              >
                                {m.is_professor ? t("demoteCta", "Remover") : t("promoteCta", "Promover")}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
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
    </div>
  )
}
