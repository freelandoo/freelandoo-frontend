"use client"

// Membros vinculados + treinos por data — as DUAS listas que saíram do corpo da
// página da academia quando ela ganhou o botão rosa "Membros" no headcard.
//
// Por que uma página e não mais um painel: as duas são tabelas largas (a grade
// tem nove colunas) e viviam espremidas embaixo do mural, com o professor
// rolando meia tela de post para chegar nelas. Aqui elas nascem no topo, e a
// página da academia volta a ser o que ela é para quem visita — capa e mural.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ClipboardList, Loader2, ShieldAlert, UserRound } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { TrainingGrid } from "../../_components/training-grid"
import {
  BTN_DARK,
  GOLD,
  H_SECTION,
  PANEL,
  STATUS_KEYS,
  type ExpiredPlans,
} from "../../_components/academy-ui"

type Academy = {
  id_academy: string
  nome: string
  slug: string
  avatar_url: string | null
  is_owner: boolean
  is_professor: boolean
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

type Tab = "membros" | "treinos"

export function AcademyMembersView({ slug }: { slug: string }) {
  const t = useTranslations("Academies")
  const locale = useLocale()
  const enabled = useFeature("fitness_academias")

  const [academy, setAcademy] = useState<Academy | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expired, setExpired] = useState<ExpiredPlans | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "denied" | "error">("loading")

  // A aba inicial vem do link do modal de fichas vencidas (`?aba=treinos`) e é
  // lida do WINDOW, não por `useSearchParams`: o hook obriga Suspense e tira a
  // rota do pré-render — o build já quebrou exatamente assim antes.
  const [tab, setTab] = useState<Tab>("membros")
  useEffect(() => {
    if (typeof window === "undefined") return
    if (new URLSearchParams(window.location.search).get("aba") === "treinos") setTab("treinos")
  }, [])

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/academies/slug/${encodeURIComponent(slug)}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const a: Academy = data.academy
      setAcademy(a)
      // O gate de verdade é do backend (as duas rotas recusam quem não é staff);
      // aqui a checagem serve para dizer o motivo em vez de mostrar tabela vazia.
      if (!a?.is_owner && !a?.is_professor) {
        setState("denied")
        return
      }
      const [mres, eres] = await Promise.all([
        fetch(`/api/academies/${a.id_academy}/members`, { headers: authHeaders() }),
        fetch(`/api/academies/${a.id_academy}/expired-plans`, { headers: authHeaders() }),
      ])
      if (mres.ok) {
        const mdata = await mres.json()
        setMembers(Array.isArray(mdata.members) ? mdata.members : [])
      }
      if (eres.ok) setExpired(await eres.json())
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [slug, authHeaders])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

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
        toast.error(
          err instanceof Error && err.message ? err.message : t("professorError", "Erro ao atualizar professor")
        )
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
      <Blocked
        message={t("disabled", "Recurso indisponível no momento.")}
        backLabel={t("backToList", "Ver academias")}
      />
    )
  }
  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "denied") {
    return (
      <Blocked
        message={t("membersDenied", "Só o dono e os professores desta academia veem esta página.")}
        backHref={`/academias/${slug}`}
        backLabel={t("backToAcademy", "Voltar pra academia")}
      />
    )
  }
  if (state === "error" || !academy) {
    return (
      <Blocked message={t("notFound", "Academia não encontrada.")} backLabel={t("backToList", "Ver academias")} />
    )
  }

  const expiredCount = expired?.count ?? 0
  // A grade não guarda régua própria de "venceu": ela recebe PRONTO quem venceu.
  // Com dois lugares calculando os 90 dias, um deles ficaria para trás no dia em
  // que o número mudasse, e a bolinha apontaria para uma linha sem marca.
  const expiredIds = new Set((expired?.members || []).map((m) => m.id_member))

  const tabBtn = (active: boolean) =>
    `relative inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${
      active ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8] hover:bg-[#241d12]"
    }`

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        <PageBackLink href={`/academias/${academy.slug}`} label={t("backToAcademy", "Voltar pra academia")} />

        <header
          className={`${PANEL} mt-4 flex flex-wrap items-center gap-4 p-4`}
          style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
        >
          <div
            className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]"
            style={{ outline: `2px solid ${GOLD}`, outlineOffset: "2px" }}
          >
            {academy.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={academy.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <UserRound className="h-6 w-6 text-[#9A938A]" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">{academy.nome}</p>
            <h1 className="text-2xl font-black uppercase leading-none md:text-3xl">
              {t("membersPageTitle", "Membros vinculados")}
            </h1>
          </div>
        </header>

        <nav className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("membros")} className={tabBtn(tab === "membros")}>
            <UserRound className="h-4 w-4" />
            {t("tabMembers", "Membros")}
          </button>
          <button type="button" onClick={() => setTab("treinos")} className={tabBtn(tab === "treinos")}>
            <ClipboardList className="h-4 w-4" />
            {t("tabTraining", "Treinos por data")}
            {/* A MESMA bolinha do botão do headcard: o professor chega aqui pelo
                aviso, e a aba precisa dizer para onde ele estava indo. */}
            {expiredCount > 0 && (
              <span
                className="absolute -right-1 -top-1 h-2.5 w-2.5 border border-[#0B0B0D] bg-[#ff3b30]"
                role="status"
                aria-label={t("expiredDot", "Há alunos com a ficha vencida")}
                title={t("expiredDot", "Há alunos com a ficha vencida")}
              />
            )}
          </button>
        </nav>

        {tab === "membros" ? (
          <section className={`${PANEL} mt-4 p-4`}>
            <h2 className={H_SECTION}>
              <UserRound className="h-4 w-4 text-[#F2B705]" />
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
                            {/* Quem está com a ficha vencida aparece marcado
                                TAMBÉM aqui: é a lista para onde a bolinha do
                                headcard aponta, e chegar nela sem ver o motivo
                                deixaria o aviso sem resposta. */}
                            {expiredIds.has(m.id_member) && (
                              <span className="ml-2 border-2 border-[#0B0B0D] bg-[#ff3b30] px-1 text-[10px] font-extrabold uppercase text-[#0B0B0D]">
                                {t("expiredBadge", "Ficha vencida")}
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
        ) : (
          <TrainingGrid academyId={academy.id_academy} expiredIds={expiredIds} expiryDays={expired?.days} />
        )}
      </div>
    </div>
  )
}

function Blocked({
  message,
  backHref,
  backLabel,
}: {
  message: string
  backHref?: string
  /** Rótulo já traduzido: o Blocked mora fora do componente e não tem hook. */
  backLabel: string
}) {
  return (
    <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
      <div>
        <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
        <p className="mt-4 text-sm text-[#9A938A]">{message}</p>
        <Link href={backHref || "/academias"} className={`${BTN_DARK} mt-4 px-4 py-2 text-xs`}>
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
