"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Layers,
  Megaphone,
  PlaySquare,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImageDropZone } from "@/components/courses/image-drop-zone"
import { PageShell } from "@/components/tabloide"
import { fetchWithLog } from "@/lib/fetch-with-log"
import { useMyCourse } from "@/hooks/use-my-course"
import { useCourseModules, type CourseModule } from "@/hooks/use-course-modules"
import {
  COURSE_MIN_PUBLISH_PRICE_CENTS,
  centsToInputText,
  formatPriceBRL,
  parsePriceInput,
} from "@/lib/courses/format"
import { CourseFeeBreakdown } from "./course-fee-breakdown"
import { CoursePublishSection } from "./section-publish"
import { CourseStudentsSection } from "./section-students"
import { NewModuleModal } from "./new-module-modal"

interface Props {
  courseId: string
}

type SubProfileOption = { id: string; name: string }

interface MeProfileLite {
  profiles?: {
    id_profile: string
    display_name?: string | null
    is_clan?: boolean
  }[]
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function StatusBadge({ status }: { status: "draft" | "published" | "paused" }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Publicado
      </span>
    )
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
        Pausado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
      Rascunho
    </span>
  )
}

function ModuleStatusPill({ status }: { status: "draft" | "published" | "hidden" }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
        <span className="h-1 w-1 rounded-full bg-emerald-300" />
        Publicado
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
        <EyeOff className="h-3 w-3" /> Oculto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
      Rascunho
    </span>
  )
}

function ModuleCard({
  module,
  courseId,
}: {
  module: CourseModule
  courseId: string
}) {
  return (
    <Link
      href={`/account/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module.id)}`}
      className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_45px_-22px_rgba(230,184,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
        {module.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={module.banner_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(230,184,0,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
            <Layers className="h-10 w-10 text-primary/45" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute left-3 top-3">
          <ModuleStatusPill status={module.status} />
        </div>
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-white/12 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
          <PlaySquare className="h-3 w-3" />
          {module.lessons_count} aula
          {module.lessons_count === 1 ? "" : "s"}
        </div>
        <span className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-zinc-950/85 text-white/85 backdrop-blur-sm transition group-hover:border-primary/45 group-hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <p className="line-clamp-1 text-base font-semibold text-white">
          {module.title}
        </p>
        {module.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/55">
            {module.description}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-white/35">
            Sem descrição. Abra para editar.
          </p>
        )}
      </div>
    </Link>
  )
}

export function CourseLandingView({ courseId }: Props) {
  const router = useRouter()
  const {
    course,
    isLoading: courseLoading,
    error: courseError,
    refresh: refreshCourse,
    updateCourse,
    uploadCover,
    removeCover,
  } = useMyCourse(courseId)
  const {
    modules,
    isLoading: modulesLoading,
    error: modulesError,
    createModule,
    uploadModuleBanner,
  } = useCourseModules(courseId)

  const [profileOptions, setProfileOptions] = useState<SubProfileOption[]>([])
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [studentsOpen, setStudentsOpen] = useState(false)

  // ---- Edição in-place dos dados do curso (sem modal) ----
  const [form, setForm] = useState({
    title: "",
    short_description: "",
    description: "",
    price_text: "",
    profile_id: "",
  })
  const [savingField, setSavingField] = useState<string | null>(null)
  const courseSyncId = course?.id

  useEffect(() => {
    if (!course) return
    setForm({
      title: course.title || "",
      short_description: course.short_description || "",
      description: course.description || "",
      price_text: centsToInputText(course.price_cents),
      profile_id: course.profile_id || "",
    })
    // sincroniza só quando troca de curso — não sobrescreve edição em andamento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSyncId])

  const saveField = useCallback(
    async (
      field: "title" | "short_description" | "description" | "price" | "profile_id",
      rawValue?: string,
    ) => {
      if (!course) return
      let patch: Record<string, unknown> | null = null
      if (field === "price") {
        const cents = parsePriceInput(form.price_text)
        if (cents === course.price_cents) return
        patch = { price_cents: cents }
      } else if (field === "profile_id") {
        const v = rawValue || null
        if (v === course.profile_id) return
        patch = { profile_id: v }
      } else {
        const v = (rawValue ?? "").trim()
        if (v === (course[field] || "")) return
        if (field === "title" && !v) return // título não pode ficar vazio
        patch = { [field]: v || null }
      }
      if (!patch) return
      setSavingField(field)
      try {
        await updateCourse(patch)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao salvar")
      } finally {
        setSavingField(null)
      }
    },
    [course, form.price_text, updateCourse],
  )

  // Carrega subperfis do usuário (não-clan) para o select no modal de dados.
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithLog("courseLanding:me", "/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = (await res.json().catch(() => null)) as MeProfileLite | null
        if (cancelled) return
        const list = (data?.profiles || [])
          .filter((p) => !p.is_clan)
          .map((p) => ({
            id: p.id_profile,
            name: p.display_name || "Perfil sem nome",
          }))
        setProfileOptions(list)
      } catch {
        // ignora — campo "perfil vinculado" fica oculto se não carregar
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.position - b.position),
    [modules],
  )

  const lessonsTotal = useMemo(
    () => modules.reduce((acc, m) => acc + (m.lessons_count || 0), 0),
    [modules],
  )

  const handleCoverUpload = useCallback(
    async (file: File) => {
      try {
        await uploadCover(file)
        toast.success("Capa atualizada!")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao enviar capa")
        throw err
      }
    },
    [uploadCover],
  )

  const handleCoverRemove = useCallback(async () => {
    try {
      await removeCover()
      toast.success("Capa removida.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover")
      throw err
    }
  }, [removeCover])

  // ---------- estados de erro / loading ----------

  if (courseLoading) {
    return (
      <PageShell className="md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/[0.04]" />
          <div className="mt-6 aspect-[21/9] animate-pulse rounded-[1.5rem] bg-white/[0.05]" />
          <div className="mt-6 h-9 w-2/3 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-white/[0.04]" />
        </div>
      </div>
      </PageShell>
    )
  }

  if (courseError || !course) {
    return (
      <PageShell className="md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          <AlertCircle className="mb-3 h-5 w-5" />
          <p className="font-medium">Não foi possível carregar o curso.</p>
          <p className="mt-1 text-red-200/80">
            {courseError || "Curso indisponível."}
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/85"
          >
            Voltar para Meus Cursos
          </Link>
        </div>
      </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="text-white md:pl-[80px]">
      {/* Background ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_30%_-10%,rgba(230,184,0,0.16),transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Meus Cursos
          </Link>
          <StatusBadge status={course.status} />
          {course.slug && course.status === "published" && (
            <Link
              href={`/cursos/${course.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Página pública
            </Link>
          )}

          {savingField && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/45">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2B705]" />
              salvando…
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStudentsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              Alunos
            </button>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-[0_10px_28px_-12px_rgba(230,184,0,0.7)] transition hover:bg-primary/90"
            >
              <Megaphone className="h-3.5 w-3.5" />
              {course.status === "published" ? "Publicação" : "Publicar"}
            </button>
          </div>
        </div>

        {/* Hero / banner */}
        <section className="relative">
          <ImageDropZone
            currentUrl={course.cover_url}
            aspect="21/9"
            label="Banner do curso"
            title="Arraste ou envie uma imagem para o banner do curso"
            hint="Recomendado 21:9 ou 16:9 · JPG, PNG ou WebP · até 12MB"
            onUpload={handleCoverUpload}
            onRemove={course.cover_url ? handleCoverRemove : undefined}
          />

          {/* Painel editável (tabloide) — tudo editável in-place pelo dono */}
          <div className="relative mt-5 border-2 border-white/12 bg-[#15100A] p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.5)] md:p-6">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#F2B705]">
              <Sparkles className="h-3 w-3" />
              Curso Freelandoo · edite tudo aqui
            </p>

            {/* Título editável */}
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={(e) => saveField("title", e.target.value)}
              placeholder="Nome do curso"
              maxLength={160}
              className="fl-display mt-2 w-full bg-transparent text-3xl leading-tight text-white outline-none placeholder:text-white/25 md:text-4xl"
            />

            {/* Descrição curta */}
            <input
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
              onBlur={(e) => saveField("short_description", e.target.value)}
              placeholder="Uma frase que resume a proposta do curso (opcional)"
              maxLength={280}
              className="mt-3 w-full border-b border-white/10 bg-transparent pb-1.5 text-sm text-white/75 outline-none placeholder:text-white/30 focus:border-[#F2B705]/50"
            />

            {/* Meta pills (contadores) */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <MetaPill icon={<Layers className="h-3.5 w-3.5" />}>
                {course.modules_count ?? modules.length} módulos
              </MetaPill>
              <MetaPill icon={<PlaySquare className="h-3.5 w-3.5" />}>
                {course.lessons_count ?? lessonsTotal} aulas
              </MetaPill>
            </div>

            {/* Descrição completa */}
            <div className="mt-5">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                Descrição completa
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                onBlur={(e) => saveField("description", e.target.value)}
                rows={4}
                placeholder="Conte o que o aluno vai aprender, pra quem é o curso, o que ele precisa saber antes…"
                className="w-full resize-y border-2 border-white/10 bg-[#0E0B06] p-3 text-sm leading-relaxed text-white/80 outline-none placeholder:text-white/30 focus:border-[#F2B705]/40"
              />
            </div>

            {/* Preço + perfil vinculado */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Preço
                </label>
                <div className="flex items-center border-2 border-white/12 bg-[#0E0B06] px-3 focus-within:border-[#F2B705]/50">
                  <span className="fl-display text-lg text-[#F2B705]">R$</span>
                  <input
                    value={form.price_text}
                    onChange={(e) => setForm((f) => ({ ...f, price_text: e.target.value }))}
                    onBlur={() => saveField("price")}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="fl-display w-full bg-transparent px-2 py-2.5 text-xl text-white outline-none placeholder:text-white/25"
                  />
                </div>
                <p className="mt-1 text-[11px] text-white/40">
                  Mínimo {formatPriceBRL(COURSE_MIN_PUBLISH_PRICE_CENTS)} para publicar.
                </p>
              </div>

              {profileOptions.length > 0 && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Perfil vinculado
                  </label>
                  <select
                    value={form.profile_id}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => ({ ...f, profile_id: v }))
                      void saveField("profile_id", v)
                    }}
                    className="h-[46px] w-full border-2 border-white/12 bg-[#0E0B06] px-3 text-sm text-white outline-none focus:border-[#F2B705]/40"
                  >
                    <option value="">Sem perfil vinculado</option>
                    {profileOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Breakdown: o que você recebe × o que o cliente paga */}
            <CourseFeeBreakdown
              priceCents={parsePriceInput(form.price_text)}
              affiliatesAllowed={course.affiliates_allowed}
            />
          </div>
        </section>

        {/* Modules */}
        <section className="mt-10">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/85">
                <Layers className="h-3 w-3" />
                Módulos do curso
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                Organize o conteúdo em módulos
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Cada módulo terá sua própria página com banner e aulas.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsNewModuleOpen(true)}
              className="rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_-14px_rgba(230,184,0,0.65)] hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo módulo
            </Button>
          </header>

          {modulesLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[5/3] animate-pulse rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025]"
                />
              ))}
            </div>
          )}

          {!modulesLoading && modulesError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" />
              {modulesError}
            </div>
          )}

          {!modulesLoading && !modulesError && orderedModules.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top,rgba(230,184,0,0.1),transparent_36%),rgba(255,255,255,0.018)] p-10 text-center">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <Layers className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-white/85">
                Nenhum módulo ainda
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
                Comece pelo primeiro módulo — pode ser uma introdução curta com
                boas-vindas. Você adiciona as aulas dentro dele depois.
              </p>
              <Button
                type="button"
                onClick={() => setIsNewModuleOpen(true)}
                className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro módulo
              </Button>
            </div>
          )}

          {!modulesLoading && !modulesError && orderedModules.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {orderedModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  courseId={courseId}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal: Novo módulo */}
      <NewModuleModal
        open={isNewModuleOpen}
        onOpenChange={setIsNewModuleOpen}
        onCreate={(input) => createModule(input)}
        onUploadBanner={uploadModuleBanner}
        onCreated={(created) => {
          // Redireciona para a página visual do módulo (Slice 3).
          router.push(
            `/account/courses/${encodeURIComponent(
              courseId,
            )}/modules/${encodeURIComponent(created.id)}`,
          )
        }}
      />

      {/* Modal: Publicação */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Publicação do curso</DialogTitle>
            <DialogDescription>
              Controle o status do curso e o post no feed do Freelandoo.
            </DialogDescription>
          </DialogHeader>
          <CoursePublishSection
            course={course}
            onCourseChanged={() => {
              void refreshCourse()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Alunos / vendas */}
      <Dialog open={studentsOpen} onOpenChange={setStudentsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>Alunos e vendas</DialogTitle>
            <DialogDescription>
              Quem comprou este curso e quanto já entrou em receita.
            </DialogDescription>
          </DialogHeader>
          <CourseStudentsSection courseId={course.id} />
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function MetaPill({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[12px] font-semibold text-white/85">
      <span className="text-primary/80">{icon}</span>
      {children}
    </span>
  )
}
