"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Eye,
  GraduationCap,
  BookOpen,
  PlaySquare,
  Video,
  FileText,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Users,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { CourseStatus, MyCourse } from "@/hooks/use-my-courses"
import { CourseDataSection } from "./section-data"
import { CourseModulesSection } from "./section-modules"
import { CoursePublishSection } from "./section-publish"
import { CourseStudentsSection } from "./section-students"
import { ComingSoonSection } from "./section-coming-soon"

interface Props {
  courseId: string
}

type SectionKey =
  | "data"
  | "modules"
  | "lessons"
  | "videos"
  | "materials"
  | "quizzes"
  | "publish"
  | "comments"
  | "students"

interface SectionDef {
  key: SectionKey
  label: string
  icon: typeof BookOpen
  slice: string
  short: string
}

const SECTIONS: SectionDef[] = [
  { key: "data", label: "Dados do curso", icon: GraduationCap, slice: "Slice 3", short: "Título, descrição, capa, preço e perfil." },
  { key: "modules", label: "Módulos", icon: BookOpen, slice: "Slice 4", short: "Estrutura macro do curso." },
  { key: "lessons", label: "Aulas", icon: PlaySquare, slice: "Slice 5", short: "Aulas dentro de cada módulo." },
  { key: "videos", label: "Vídeos", icon: Video, slice: "Slice 7-8", short: "Upload e processamento dos vídeos." },
  { key: "materials", label: "Materiais", icon: FileText, slice: "Slice 9", short: "PDFs, imagens e links externos." },
  { key: "quizzes", label: "Questionários", icon: HelpCircle, slice: "Slice 10", short: "Perguntas e alternativas por aula." },
  { key: "publish", label: "Publicação", icon: Megaphone, slice: "Slice 16", short: "Divulgar o curso no feed." },
  { key: "comments", label: "Comentários", icon: MessageSquare, slice: "Slice 15", short: "Moderar comentários dos alunos." },
  { key: "students", label: "Alunos / Vendas", icon: Users, slice: "Slice 11", short: "Quem comprou, receita gerada." },
]

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function StatusPill({ status }: { status: CourseStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Publicado
      </span>
    )
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
        Pausado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
      Rascunho
    </span>
  )
}

interface MeProfileLite {
  profiles?: { id_profile: string; display_name?: string | null; is_clan?: boolean }[]
}

export function CourseAdminView({ courseId }: Props) {
  const router = useRouter()
  const [course, setCourse] = useState<MyCourse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>("data")
  const [profileOptions, setProfileOptions] = useState<{ id: string; name: string }[]>([])

  const loadCourse = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetchWithLog(
        "courseAdmin:get",
        `/api/me/courses/${encodeURIComponent(courseId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = (await res.json().catch(() => null)) as
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok) {
        setLoadError(data?.error || "Falha ao carregar o curso")
        setCourse(null)
        return
      }
      setCourse(data?.course || null)
    } catch {
      setLoadError("Falha de rede ao carregar curso")
    } finally {
      setIsLoading(false)
    }
  }, [courseId, router])

  // Lista dos subperfis (não-clan) do user logado, para o select Perfil vinculado.
  const loadProfiles = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetchWithLog("courseAdmin:me", "/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = (await res.json().catch(() => null)) as MeProfileLite | null
      const list = (data?.profiles || [])
        .filter((p) => !p.is_clan)
        .map((p) => ({
          id: p.id_profile,
          name: p.display_name || "Perfil sem nome",
        }))
      setProfileOptions(list)
    } catch {
      // Falha silenciosa — select fica oculto se não houver perfis.
    }
  }, [])

  useEffect(() => {
    void loadCourse()
    void loadProfiles()
  }, [loadCourse, loadProfiles])

  const sectionMeta = useMemo(
    () => SECTIONS.find((s) => s.key === activeSection) ?? SECTIONS[0],
    [activeSection],
  )
  const SectionIcon = sectionMeta.icon

  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          {course && <StatusPill status={course.status} />}
          {course?.slug && course.status === "published" && (
            <Link
              href={`/cursos/${course.slug}`}
              target="_blank"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver página pública
            </Link>
          )}
        </div>

        {/* Estado: carregando */}
        {isLoading && (
          <div className="flex items-center justify-center rounded-[2rem] border border-white/[0.07] bg-white/[0.02] py-16 text-white/55">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando curso...
          </div>
        )}

        {/* Estado: erro */}
        {!isLoading && loadError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Não foi possível carregar o curso</p>
              <p className="mt-1 text-red-200/80">{loadError}</p>
              <Link
                href="/account"
                className="mt-3 inline-block text-red-200 underline underline-offset-2 hover:text-white"
              >
                Voltar para /account
              </Link>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!isLoading && !loadError && course && (
          <>
            {/* Título do curso */}
            <h1 className="mb-6 inline-flex items-center gap-2 text-xl font-semibold text-white md:text-2xl">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="truncate">{course.title}</span>
            </h1>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              {/* Sidebar de seções */}
              <aside className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-4">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Gestão do curso
                </p>
                <nav className="flex flex-col gap-1">
                  {SECTIONS.map((s) => {
                    const Icon = s.icon
                    const isActive = activeSection === s.key
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setActiveSection(s.key)}
                        className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition ${
                          isActive
                            ? "bg-primary/15 text-white shadow-[inset_0_0_0_1px_rgba(242,196,9,0.35)]"
                            : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-primary" : "text-white/55"
                          }`}
                        />
                        <span className="flex-1 truncate">{s.label}</span>
                        {s.key !== "data" &&
                          s.key !== "modules" &&
                          s.key !== "publish" &&
                          s.key !== "students" && (
                          <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-white/45">
                            em breve
                          </span>
                        )}
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 transition ${
                            isActive
                              ? "text-primary"
                              : "text-white/30 group-hover:text-white/55"
                          }`}
                        />
                      </button>
                    )
                  })}
                </nav>
              </aside>

              {/* Área principal */}
              <section className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7">
                <header className="mb-5">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                    <SectionIcon className="h-4 w-4 text-primary" />
                    {sectionMeta.label}
                  </h2>
                  <p className="mt-1 text-xs text-white/50">
                    {sectionMeta.short}
                  </p>
                </header>

                {activeSection === "data" && (
                  <CourseDataSection
                    course={course}
                    profileOptions={profileOptions}
                    onSaved={(updated) => setCourse(updated)}
                  />
                )}
                {activeSection === "modules" && (
                  <CourseModulesSection
                    courseId={course.id}
                    onModulesChanged={loadCourse}
                  />
                )}
                {activeSection === "students" && (
                  <CourseStudentsSection courseId={course.id} />
                )}
                {activeSection === "publish" && (
                  <CoursePublishSection
                    course={course}
                    onCourseChanged={(updated) => setCourse(updated)}
                  />
                )}
                {activeSection !== "data" &&
                  activeSection !== "modules" &&
                  activeSection !== "publish" &&
                  activeSection !== "students" && (
                  <ComingSoonSection
                    label={sectionMeta.label}
                    slice={sectionMeta.slice}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
