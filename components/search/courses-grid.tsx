"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, GraduationCap } from "lucide-react"

type CourseItem = {
  id: string
  title: string
  slug: string | null
  short_description: string | null
  cover_url: string | null
  price_cents: number | null
  profile_id: string | null
  profile_display_name: string | null
  sub_profile_slug: string | null
  username: string | null
  id_machine: number | null
  id_category: number | null
  category_name: string | null
  machine_name: string | null
  machine_accent: string | null
}

interface Props {
  machineId: number | null
  categoryId: number | null
  q?: string | null
  /** Filtro client-side: cursos com price_cents nulo/0 = gratuitos. */
  priceFilter?: "all" | "free" | "paid"
}

function formatBRL(cents: number | null) {
  if (cents == null) return "Gratuito"
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function CoursesGrid({ machineId, categoryId, q, priceFilter = "all" }: Props) {
  const [items, setItems] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (machineId) params.set("id_machine", String(machineId))
    if (categoryId) params.set("id_category", String(categoryId))
    if (q) params.set("q", q)
    fetch(`/api/search/courses?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Falha ${r.status}`)
        const d = await r.json()
        if (!alive) return
        setItems(Array.isArray(d?.items) ? d.items : [])
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [machineId, categoryId, q])

  const visible = items.filter((c) => {
    if (priceFilter === "free") return !c.price_cents
    if (priceFilter === "paid") return !!c.price_cents && c.price_cents > 0
    return true
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }
  if (error) {
    return <div className="px-4 py-10 text-center text-sm text-red-300">{error}</div>
  }
  if (visible.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="rounded-full border border-white/[0.08] bg-white/[0.02] p-3">
          <GraduationCap className="h-5 w-5 text-white/55" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-tight text-white">Nenhum curso encontrado</p>
        <p className="mt-1 text-[13px] text-white/55">
          Tente outro filtro ou abra um chamado pra avisar os instrutores.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] lg:max-w-none lg:grid-cols-3">
      {visible.map((c) => {
        const href = c.slug ? `/cursos/${c.slug}` : `/cursos/${c.id}`
        const accent = c.machine_accent || "#fbbf24"
        return (
          <Link
            key={c.id}
            href={href}
            className="group relative flex flex-col overflow-hidden bg-zinc-900 transition-transform duration-300 active:scale-[0.98]"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
              {c.cover_url ? (
                <Image
                  src={c.cover_url}
                  alt={c.title}
                  fill
                  sizes="(max-width:768px) 100vw, 360px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/25">
                  <GraduationCap className="h-10 w-10" />
                </div>
              )}
              {c.category_name && (
                <span
                  className="absolute left-2 top-2 bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] backdrop-blur"
                  style={{ color: accent }}
                >
                  {c.category_name}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 border-t-2 border-[#0B0B0D] bg-[#F1EDE2] p-3">
              <p className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0B0B0D]">{c.title}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-[14px] font-black tracking-tight" style={{ color: "#9a7400" }}>
                  {formatBRL(c.price_cents)}
                </p>
                {c.profile_display_name && (
                  <p className="truncate text-[10px] font-semibold text-[#6B6457]">{c.profile_display_name}</p>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
