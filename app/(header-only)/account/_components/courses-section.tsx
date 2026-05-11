"use client"

import { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useMyCourses,
  type CourseStatus,
  type MyCourse,
} from "@/hooks/use-my-courses"
import {
  COURSE_MIN_PUBLISH_PRICE_CENTS,
  formatPriceBRL,
  parsePriceInput,
} from "@/lib/courses/format"

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
    <div className="group relative">
      <button
        type="button"
        onClick={() =>
          isOwner
            ? onManage?.(course.id)
            : router.push(`/account/courses/${course.id}/watch`)
        }
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition hover:border-primary/30"
        aria-label={`Abrir curso ${course.title}`}
      >
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_url}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="h-10 w-10 text-white/25" />
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
        />
        {isOwner && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
            <Tag className="h-3 w-3" />
            {formatPriceBRL(course.price_cents)}
          </span>
        )}
        {!isOwner && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur-sm">
            Acesso ativo
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
              className="absolute top-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-white/85 backdrop-blur-sm transition hover:bg-zinc-950"
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
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-white/85 backdrop-blur-sm transition hover:bg-zinc-950"
          aria-label="Ver página pública do curso"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="mt-2 min-w-0">
        <p className="inline-flex w-full items-center gap-1.5 text-sm font-medium text-white">
          <GraduationCap className="h-3 w-3 shrink-0 text-primary/80" />
          <span className="truncate">{course.title}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
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
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

function EmptyState({
  variant,
  onCreate,
}: {
  variant: CoursesTab
  onCreate?: () => void
}) {
  if (variant === "created") {
    return (
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
          <GraduationCap className="h-7 w-7 text-white/45" />
        </div>
        <p className="text-sm font-medium text-white/85">
          Você ainda não criou nenhum curso
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
          Crie cursos gratuitamente. Defina módulos, aulas, vídeos e materiais.
          Para publicar e vender, o curso precisa ter no mínimo R$ 5,00.
        </p>
        <Button type="button" onClick={onCreate} className="mt-4 rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Criar meu primeiro curso
        </Button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
        <ShoppingBag className="h-7 w-7 text-white/45" />
      </div>
      <p className="text-sm font-medium text-white/85">
        Você ainda não comprou nenhum curso
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
        Explore o feed do Freelandoo para descobrir cursos publicados por
        outros criadores.
      </p>
      <Link
        href="/explorar"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
      >
        Explorar cursos
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form do modal "Novo Curso"
// ---------------------------------------------------------------------------

interface NewCourseFormState {
  title: string
  short_description: string
  description: string
  cover_url: string
  price_text: string
  profile_id: string
}

function emptyNewForm(): NewCourseFormState {
  return {
    title: "",
    short_description: "",
    description: "",
    cover_url: "",
    price_text: "",
    profile_id: "",
  }
}

function NewCourseForm({
  value,
  onChange,
  profileOptions = [],
  disabled,
}: {
  value: NewCourseFormState
  onChange: (next: NewCourseFormState) => void
  profileOptions?: ProfileOption[]
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nc-title">
          Nome do curso <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nc-title"
          placeholder="Ex.: Fundamentos de Edição de Vídeo"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          disabled={disabled}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nc-short">Descrição curta (opcional)</Label>
        <Input
          id="nc-short"
          placeholder="Uma frase que resume a proposta do curso"
          value={value.short_description}
          onChange={(e) =>
            onChange({ ...value, short_description: e.target.value })
          }
          disabled={disabled}
          maxLength={280}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nc-desc">Descrição completa (opcional)</Label>
        <Textarea
          id="nc-desc"
          placeholder="Pode editar depois pela engrenagem do curso."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={4}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nc-price">Preço (R$, opcional)</Label>
          <Input
            id="nc-price"
            placeholder="0,00"
            value={value.price_text}
            onChange={(e) =>
              onChange({ ...value, price_text: e.target.value })
            }
            disabled={disabled}
            inputMode="decimal"
          />
          <p className="text-[11px] text-white/45">
            Mínimo R$ 5,00 para publicar.
          </p>
        </div>

        {profileOptions.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="nc-profile">Perfil vinculado (opcional)</Label>
            <Select
              value={value.profile_id || "__none__"}
              onValueChange={(v) =>
                onChange({ ...value, profile_id: v === "__none__" ? "" : v })
              }
              disabled={disabled}
            >
              <SelectTrigger id="nc-profile">
                <SelectValue placeholder="Sem perfil vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem perfil vinculado</SelectItem>
                {profileOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/55">
        Após criar, você poderá ajustar capa, descrição completa, módulos e
        aulas pela <strong>engrenagem</strong> do card.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CoursesSection({ profileOptions = [] }: Props) {
  const router = useRouter()
  const { courses, isLoading, error, createCourse, updateCourse, deleteCourse } =
    useMyCourses()

  const [tab, setTab] = useState<CoursesTab>("created")

  // Modal de novo curso
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<NewCourseFormState>(emptyNewForm())
  const [isSavingNew, setIsSavingNew] = useState(false)

  // Modal de exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const counts = useMemo(
    () => ({
      createdTotal: courses.length,
      createdPublished: courses.filter((c) => c.status === "published").length,
      createdDraft: courses.filter((c) => c.status === "draft").length,
      purchasedTotal: 0,
    }),
    [courses],
  )

  const subline =
    tab === "created"
      ? `${counts.createdTotal} criado${counts.createdTotal === 1 ? "" : "s"} · ${counts.createdPublished} publicado${counts.createdPublished === 1 ? "" : "s"} · ${counts.createdDraft} em rascunho`
      : `${counts.purchasedTotal} curso${counts.purchasedTotal === 1 ? "" : "s"} com acesso ativo`

  function openNewCourse() {
    setNewForm(emptyNewForm())
    setIsNewOpen(true)
  }

  function goToManage(id: string) {
    router.push(`/account/courses/${id}`)
  }

  function openPreview(id: string) {
    const c = courses.find((x) => x.id === id)
    if (!c?.slug) return
    router.push(`/cursos/${c.slug}`)
  }

  async function handleCreate(opts: { publish?: boolean }) {
    const title = newForm.title.trim()
    if (!title) {
      toast.error("Informe o título do curso")
      return
    }
    const priceCents = parsePriceInput(newForm.price_text)
    if (
      opts.publish &&
      (priceCents == null || priceCents < COURSE_MIN_PUBLISH_PRICE_CENTS)
    ) {
      toast.error("Para publicar, o preço precisa ser de no mínimo R$ 5,00")
      return
    }
    setIsSavingNew(true)
    try {
      const created = await createCourse({
        title,
        short_description: newForm.short_description.trim() || null,
        description: newForm.description.trim() || null,
        cover_url: newForm.cover_url.trim() || null,
        price_cents: priceCents,
        profile_id: newForm.profile_id || null,
      })
      if (opts.publish) {
        try {
          await updateCourse(created.id, { status: "published" })
          toast.success("Curso publicado!")
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Curso criado em rascunho, mas falhou ao publicar",
          )
        }
      } else {
        toast.success("Curso criado em rascunho")
      }
      setIsNewOpen(false)
      setNewForm(emptyNewForm())
      // Leva direto pra engrenagem para o usuário continuar configurando.
      router.push(`/account/courses/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar curso")
    } finally {
      setIsSavingNew(false)
    }
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

  return (
    <>
      <article className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7">
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
              onClick={openNewCourse}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition active:scale-[0.98]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -16px rgba(242,196,9,0.5)",
              }}
            >
              <Plus className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-center py-12 text-white/55">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando cursos...
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <EmptyState variant="created" onCreate={openNewCourse} />
              )}
            </>
          )}

          {tab === "purchased" && <EmptyState variant="purchased" />}
        </div>
      </article>

      {/* Modal Novo Curso */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar novo curso</DialogTitle>
            <DialogDescription>
              O curso nasce como <strong>rascunho</strong>. Você pode editar
              tudo depois pela engrenagem. Para vender, é preciso publicar com
              preço de no mínimo R$ 5,00.
            </DialogDescription>
          </DialogHeader>
          <NewCourseForm
            value={newForm}
            onChange={setNewForm}
            profileOptions={profileOptions}
            disabled={isSavingNew}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewOpen(false)}
              disabled={isSavingNew}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCreate({ publish: false })}
              disabled={isSavingNew}
            >
              {isSavingNew ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar como rascunho
            </Button>
            <Button
              type="button"
              onClick={() => handleCreate({ publish: true })}
              disabled={isSavingNew}
            >
              {isSavingNew ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar e publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
