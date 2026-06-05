"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  GraduationCap,
  Plus,
  Settings,
  Edit,
  Eye,
  Trash2,
  BookOpen,
  PlaySquare,
  Users,
  ShoppingBag,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  useMyCourses,
  type CourseStatus,
  type MyCourse,
} from "@/hooks/use-my-courses"
import {
  usePurchasedCourses,
  type PurchasedCourse,
} from "@/hooks/use-purchased-courses"
import { formatPriceBRL } from "@/lib/courses/format"

type CoursesTab = "created" | "purchased"

export interface ProfileOption {
  id: string
  name: string
}

interface Props {
  /**
   * Lista de subperfis (não-clan) do usuário logado, para o select
   * "Perfil vinculado". Quando vazio, o campo fica oculto.
   */
  profileOptions?: ProfileOption[]
}

// ---------------------------------------------------------------------------
// Tipo "leve" usado pelos cards
// ---------------------------------------------------------------------------

interface CourseCardData {
  id: string
  title: string
  cover_url: string | null
  status: CourseStatus
  price_cents: number | null
  modules_count: number
  lessons_count: number
  students_count: number
  slug?: string | null
  creator_name?: string | null
  progress_percent?: number | null
}

function toCardData(c: MyCourse): CourseCardData {
  return {
    id: c.id,
    title: c.title,
    cover_url: c.cover_url,
    status: c.status,
    price_cents: c.price_cents,
    modules_count: c.modules_count,
    lessons_count: c.lessons_count,
    students_count: c.students_count,
    slug: c.slug,
  }
}

function toPurchasedCardData(c: PurchasedCourse): CourseCardData {
  return {
    id: c.id,
    title: c.title,
    cover_url: c.cover_url,
    status: c.status,
    price_cents: c.price_cents,
    modules_count: c.modules_count,
    lessons_count: c.lessons_count,
    students_count: c.students_count,
    slug: c.slug,
    creator_name: c.creator_name,
    progress_percent: c.progress_percent,
  }
}

// ---------------------------------------------------------------------------
// Badge de status
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CourseStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Publicado
      </span>
    )
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
        Pausado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
      Rascunho
    </span>
  )
}

// ---------------------------------------------------------------------------
// Card do curso
// ---------------------------------------------------------------------------

function CourseCard({
  course,
  variant,
  onManage,
  onPreview,
  onDelete,
}: {
  course: CourseCardData
  variant: CoursesTab
  onManage?: (id: string) => void
  onPreview?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const router = useRouter()
  const isOwner = variant === "created"
  const progress = course.progress_percent ?? 0

  return (
    <article className="group relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] transition duration-300 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() =>
          isOwner
            ? onManage?.(course.id)
            : router.push(`/account/courses/${course.id}/watch`)
        }
        className="relative block aspect-[4/5] w-full overflow-hidden bg-zinc-900/80 transition"
        aria-label={`Abrir curso ${course.title}`}
      >
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_url}
            alt={course.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(242,196,9,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
            <GraduationCap className="h-10 w-10 text-primary/45" />
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"
        />
        {isOwner && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
            <Tag className="h-3 w-3" />
            {formatPriceBRL(course.price_cents)}
          </span>
        )}
        {!isOwner && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur-sm">
            Matriculado
          </span>
        )}
        {!isOwner && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/15 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
            {Math.round(progress)}%
          </span>
        )}
      </button>

      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute top-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-zinc-950/85 text-white/85 shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:border-primary/40 hover:text-primary"
              aria-label="Ações do curso"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => onManage?.(course.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Gerenciar curso
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onPreview?.(course.id)}
              disabled={course.status !== "published" || !course.slug}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver página pública
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(course.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <StatusBadge status={course.status} />
        </div>
      )}

      {!isOwner && course.slug && (
        <Link
          href={`/cursos/${course.slug}`}
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-zinc-950/85 text-white/85 backdrop-blur-sm transition hover:border-primary/40 hover:text-primary"
          aria-label="Ver página pública do curso"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="min-w-0 px-2 pb-2 pt-2">
        <p className="inline-flex w-full items-center gap-1.5 text-xs font-medium text-white md:text-sm">
          <GraduationCap className="h-3 w-3 shrink-0 text-primary/80" />
          <span className="truncate">{course.title}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/55 md:text-[11px]">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {course.modules_count} mód.
          </span>
          <span className="inline-flex items-center gap-1">
            <PlaySquare className="h-3 w-3" />
            {course.lessons_count} aulas
          </span>
          {isOwner && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {course.students_count} alunos
            </span>
          )}
          {!isOwner && course.creator_name && (
            <span className="truncate">por {course.creator_name}</span>
          )}
        </div>
        {!isOwner && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-white/35">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

function CourseCardSkeleton() {
  return (
    <div className="bg-white/[0.025]">
      <div className="aspect-[4/5] animate-pulse bg-white/[0.05]" />
      <div className="px-1.5 pb-1 pt-3">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
    </div>
  )
}

function EmptyState({
  variant,
  onCreate,
}: {
  variant: CoursesTab
  onCreate?: () => void
}) {
  if (variant === "created") {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top_left,rgba(242,196,9,0.12),transparent_34%),rgba(255,255,255,0.018)] p-8 text-center sm:p-10">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm font-medium text-white/85">
          Você ainda não criou nenhum curso
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
          Crie cursos gratuitamente. Defina módulos, aulas, vídeos e materiais.
          Para publicar e vender, o curso precisa ter no mínimo R$ 5,00.
        </p>
        <Button
          type="button"
          onClick={onCreate}
          className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar meu primeiro curso
        </Button>
      </div>
    )
  }
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-8 text-center sm:p-10">
      <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <ShoppingBag className="h-7 w-7 text-primary/80" />
      </div>
      <p className="text-sm font-medium text-white/85">
        Você ainda não comprou nenhum curso
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
        Explore o feed do Freelandoo para descobrir cursos publicados por
        outros criadores.
      </p>
      <Link
        href="/feed"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Explorar cursos
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CoursesSection(_props: Props) {
  const router = useRouter()
  const { courses, isLoading, error, createCourse, deleteCourse } =
    useMyCourses()
  const {
    courses: purchasedCourses,
    isLoading: loadingPurchased,
    error: purchasedError,
  } = usePurchasedCourses()

  const [tab, setTab] = useState<CoursesTab>("created")
  const [creating, setCreating] = useState(false)
  const creatingRef = useRef(false)

  // Modal de exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // "+Curso": cria um rascunho na hora e abre a landing do curso já editável
  // in-place — sem modal de cadastro.
  const createAndGo = useCallback(async () => {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreating(true)
    try {
      const created = await createCourse({ title: "Novo curso" })
      router.push(`/account/courses/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar curso")
      creatingRef.current = false
      setCreating(false)
    }
  }, [createCourse, router])

  // Escuta o "+ Curso" do RetractableProfileHeader (via window event).
  useEffect(() => {
    const onCreate = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: string }>).detail
      if (detail?.kind === "curso" || detail?.kind === "cursos") {
        setTab("created")
        void createAndGo()
      }
    }
    window.addEventListener("freelandoo:create", onCreate)
    return () => window.removeEventListener("freelandoo:create", onCreate)
  }, [createAndGo])

  const counts = useMemo(
    () => ({
      createdTotal: courses.length,
      createdPublished: courses.filter((c) => c.status === "published").length,
      createdDraft: courses.filter((c) => c.status === "draft").length,
      purchasedTotal: purchasedCourses.length,
    }),
    [courses, purchasedCourses],
  )

  const subline =
    tab === "created"
      ? `${counts.createdTotal} criado${counts.createdTotal === 1 ? "" : "s"} · ${counts.createdPublished} publicado${counts.createdPublished === 1 ? "" : "s"} · ${counts.createdDraft} em rascunho`
      : `${counts.purchasedTotal} curso${counts.purchasedTotal === 1 ? "" : "s"} com acesso ativo`

  function goToManage(id: string) {
    router.push(`/account/courses/${id}`)
  }

  function openPreview(id: string) {
    const c = courses.find((x) => x.id === id)
    if (!c?.slug) return
    router.push(`/cursos/${c.slug}`)
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteCourse(deletingId)
      toast.success("Curso excluído")
      setDeletingId(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao excluir curso",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const createdCards = courses.map(toCardData)
  const purchasedCards = purchasedCourses.map(toPurchasedCardData)

  return (
    <>
      <article className="bg-transparent p-0">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <GraduationCap className="h-4 w-4 text-primary" />
              Meus Cursos
            </h2>
            <p className="mt-1 text-xs text-white/50">{subline}</p>
          </div>
          {tab === "created" && (
            <button
              type="button"
              onClick={createAndGo}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -16px rgba(242,196,9,0.5)",
              }}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Novo Curso
            </button>
          )}
        </header>

        {/* Segmented tabs */}
        <div className="mb-5 inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setTab("created")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
              tab === "created"
                ? "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.22)_inset]"
                : "text-white/65 hover:text-white"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Criados por mim
            <span
              className={`ml-1 rounded-full px-1.5 py-px text-[10px] ${
                tab === "created"
                  ? "bg-black/15 text-primary-foreground"
                  : "bg-white/[0.06] text-white/55"
              }`}
            >
              {counts.createdTotal}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("purchased")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
              tab === "purchased"
                ? "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.22)_inset]"
                : "text-white/65 hover:text-white"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Comprados por mim
            <span
              className={`ml-1 rounded-full px-1.5 py-px text-[10px] ${
                tab === "purchased"
                  ? "bg-black/15 text-primary-foreground"
                  : "bg-white/[0.06] text-white/55"
              }`}
            >
              {counts.purchasedTotal}
            </span>
          </button>
        </div>

        {/* Conteúdo */}
        <div>
          {tab === "created" && isLoading && (
            <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          )}

          {tab === "created" && !isLoading && error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {tab === "created" && !isLoading && !error && (
            <>
              {createdCards.length > 0 ? (
                <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
                  {createdCards.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      variant="created"
                      onManage={goToManage}
                      onPreview={openPreview}
                      onDelete={(id) => setDeletingId(id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState variant="created" onCreate={createAndGo} />
              )}
            </>
          )}

          {tab === "purchased" && loadingPurchased && (
            <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          )}

          {tab === "purchased" && !loadingPurchased && purchasedError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" />
              {purchasedError}
            </div>
          )}

          {tab === "purchased" && !loadingPurchased && !purchasedError && (
            <>
              {purchasedCards.length > 0 ? (
                <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
                  {purchasedCards.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      variant="purchased"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState variant="purchased" />
              )}
            </>
          )}
        </div>
      </article>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir curso?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O curso, seus módulos e aulas
              serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
