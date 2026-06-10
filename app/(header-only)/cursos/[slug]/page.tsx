import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getBackendApiUrl } from "@/lib/backend"
import CourseLandingClient, { type PublicCourse } from "./_components/course-landing-client"

// Landing pública de curso em RSC + ISR (F3.S5): o curso é buscado no server
// e cacheado por 5 min — HTML indexável (título/descrição/preço) e metadata
// real pra SEO/OG. Interação (dono, compra, consent) fica na ilha client.
export const revalidate = 300

// Sem isto o Next trata a rota como 100% dinâmica; vazio = nada prerenderizado
// no build, mas cada slug visitado entra no cache ISR (dynamicParams default).
export function generateStaticParams(): { slug: string }[] {
  return []
}

const BASE_URL = "https://www.freelandoo.com.br"

async function fetchCourse(slug: string): Promise<PublicCourse | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(
      `${getBackendApiUrl()}/courses/public/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 }, signal: controller.signal },
    ).finally(() => clearTimeout(timer))
    if (!res.ok) return null
    const data = await res.json()
    return (data?.course as PublicCourse) || null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = await fetchCourse(slug)
  if (!course) return { title: "Curso não encontrado | Freelandoo" }
  const description =
    course.short_description || course.description?.slice(0, 160) || undefined
  const url = `${BASE_URL}/cursos/${course.slug}`
  return {
    title: `${course.title} — Curso na Freelandoo`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: course.title,
      description,
      url,
      images: course.cover_url ? [{ url: course.cover_url }] : undefined,
    },
    twitter: {
      card: course.cover_url ? "summary_large_image" : "summary",
      title: course.title,
      description,
      images: course.cover_url ? [course.cover_url] : undefined,
    },
  }
}

export default async function PublicCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Memoizado pelo Next dentro do mesmo render (mesma URL do generateMetadata).
  const course = await fetchCourse(slug)
  if (!course) notFound()

  return (
    // Suspense: a ilha usa useSearchParams (banners de retorno do checkout).
    <Suspense fallback={null}>
      <CourseLandingClient course={course} />
    </Suspense>
  )
}
