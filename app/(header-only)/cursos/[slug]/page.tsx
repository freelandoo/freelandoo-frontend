"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, GraduationCap, Loader2, ShoppingCart } from "lucide-react"

interface PublicCourse {
  id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  cover_url: string | null
  price_cents: number
  status: "draft" | "published" | "paused"
  modules_count: number
  lessons_count: number
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

export default function PublicCoursePage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug

  const [course, setCourse] = useState<PublicCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/courses/public/by-slug/${slug}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || "Curso não encontrado")
          return
        }
        setCourse(data?.course || null)
      } catch {
        if (!cancelled) setError("Erro ao carregar")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <GraduationCap className="h-12 w-12 text-white/30" />
        <h1 className="text-2xl font-semibold text-white">Curso não encontrado</h1>
        <p className="text-sm text-white/55">{error || "Este curso pode não estar publicado."}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        {/* Cover */}
        <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900">
          {course.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.cover_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-16 w-16 text-white/20" />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {course.title}
        </h1>
        {course.short_description && (
          <p className="mt-2 text-base text-white/70">{course.short_description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/55">
          <span>
            <strong className="text-white">{course.modules_count}</strong> módulos
          </span>
          <span>·</span>
          <span>
            <strong className="text-white">{course.lessons_count}</strong> aulas
          </span>
        </div>

        {course.description && (
          <div className="mt-8 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
            {course.description}
          </div>
        )}

        {/* Preço + CTA */}
        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55">Valor</p>
            <p className="text-3xl font-semibold text-primary">
              {formatPrice(course.price_cents)}
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => router.push(`/checkout/curso/${course.id}`)}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Comprar curso
          </Button>
        </div>
      </main>
    </div>
  )
}
