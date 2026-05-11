"use client"

import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  Loader2,
  Mail,
  ReceiptText,
  Users,
} from "lucide-react"
import { formatPriceBRL } from "@/lib/courses/format"
import { useCourseStudents, type CourseStudent } from "@/hooks/use-course-students"

interface Props {
  courseId: string
}

function formatDate(value: string | null): string {
  if (!value) return "Sem compras ainda"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return "Data indisponível"
  }
}

function statusLabel(status: CourseStudent["status"]): string {
  if (status === "refunded") return "Reembolsado"
  if (status === "canceled") return "Cancelado"
  return "Ativo"
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          {label}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{hint}</p>
    </div>
  )
}

function StudentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.025]"
          />
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border border-white/[0.07] p-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-white/[0.035]"
          />
        ))}
      </div>
    </div>
  )
}

function EmptyStudents() {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-10 text-center">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45">
        <Users className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold text-white/85">
        Nenhuma venda registrada ainda
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
        Quando o checkout de curso criar matrículas, os alunos ativos e a
        receita aparecem aqui automaticamente.
      </p>
    </div>
  )
}

export function CourseStudentsSection({ courseId }: Props) {
  const { students, summary, isLoading, error } = useCourseStudents(courseId)

  if (isLoading) return <StudentsSkeleton />

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Não foi possível carregar alunos</p>
          <p className="mt-1 text-red-200/80">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric
          icon={Users}
          label="Alunos ativos"
          value={String(summary.active_students_count)}
          hint={`${summary.total_enrollments_count} matrícula${
            summary.total_enrollments_count === 1 ? "" : "s"
          } no total`}
        />
        <Metric
          icon={CreditCard}
          label="Receita ativa"
          value={formatPriceBRL(summary.active_revenue_cents)}
          hint="Soma de matrículas não reembolsadas"
        />
        <Metric
          icon={CalendarDays}
          label="Última venda"
          value={formatDate(summary.last_enrolled_at)}
          hint="Mais recente matrícula registrada"
        />
      </div>

      {students.length === 0 ? (
        <EmptyStudents />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015]">
          <div className="grid grid-cols-[minmax(0,1.5fr)_140px_120px] gap-3 border-b border-white/[0.07] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 max-md:hidden">
            <span>Aluno</span>
            <span>Valor</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {students.map((student) => (
              <li
                key={student.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_140px_120px] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {student.student_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.student_avatar}
                      alt={student.student_name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-white/70">
                      {initials(student.student_name) || "AL"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {student.student_name}
                    </p>
                    <p className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-white/45">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {student.student_email || "Email não disponível"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="font-mono text-sm font-semibold text-white/85">
                  {formatPriceBRL(student.amount_paid_cents)}
                  {student.order_id && (
                    <p className="mt-0.5 inline-flex items-center gap-1 font-sans text-[11px] font-normal text-white/40">
                      <ReceiptText className="h-3 w-3" />
                      Pedido vinculado
                    </p>
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                      student.status === "active"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : "border-white/12 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    {statusLabel(student.status)}
                  </span>
                  <p className="mt-1 text-[11px] text-white/40">
                    {formatDate(student.enrolled_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
