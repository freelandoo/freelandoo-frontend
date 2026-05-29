"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, MapPin, Star, Heart } from "lucide-react"
import { PageShell, PageHero, EmptyState, LoadingState } from "@/components/tabloide"

type Machine = { id_machine: number; name: string; slug: string }

type ClanMemberLite = {
  id_member_profile: string
  display_name: string
  avatar_url: string | null
  username: string
  role: "owner" | "member"
}

type ClanCard = {
  id_profile: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  estado: string | null
  municipio: string | null
  machine_slug: string | null
  machine_name: string | null
  total_points: number
  visits_count: number
  likes_count: number
  ratings_count: number
  avg_rating: number
  members: ClanMemberLite[]
}

export default function ClansVitrinePage() {
  const [clans, setClans] = useState<ClanCard[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMachine, setFilterMachine] = useState<string>("__all__")
  const [filterCity, setFilterCity] = useState("")
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterMachine && filterMachine !== "__all__")
        params.set("machine_slug", filterMachine)
      if (filterCity.trim()) params.set("municipio", filterCity.trim())
      if (search.trim()) params.set("q", search.trim())
      const res = await fetch(`/api/public/clans?${params}`)
      const data = await res.json()
      setClans(data.clans || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((d) => setMachines(d.enxames || d.machines || d || []))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputCls =
    "h-11 w-full rounded-xl border-2 border-[#F5F1E8]/12 bg-[#1D1810] px-4 text-sm text-[#F5F1E8] placeholder:text-[#9A938A] outline-none transition focus:border-[#F2B705]"

  return (
    <PageShell>
      <PageHero
        kicker={<><Users className="h-3.5 w-3.5" /> Times Freelandoo</>}
        title="Clans"
        highlight="em jogo"
        subtitle="Times de até 6 sub-perfis trabalhando juntos. O score combina todas as métricas dos membros."
        doodle={false}
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border-2 border-[#F5F1E8]/10 bg-[#1D1810]/60 p-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <input
              className={inputCls}
              placeholder="Buscar por nome ou bio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div className="sm:col-span-3">
            <select className={inputCls} value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}>
              <option value="__all__">Todos os enxames</option>
              {machines.map((m) => (
                <option key={m.id_machine} value={m.slug}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <input
              className={inputCls}
              placeholder="Cidade"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Buscar"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#F2B705] text-[#1A1505] transition hover:bg-[#ffc81f] disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16"><LoadingState label="Carregando clans…" /></div>
        ) : clans.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Nenhum clan"
              description="Nenhum clan encontrado com esses filtros. Tente ampliar a busca."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clans.map((c) => (
              <Link key={c.id_profile} href={`/clans/${c.id_profile}`} className="group block">
                <div className="fl-card fl-hard h-full rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-14 ring-2 ring-[#0B0B0D]/10">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#2a2212] text-[#F5F1E8]">
                        {c.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-black text-[#0B0B0D]">{c.display_name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5b554b]">
                        <span className="rounded-full bg-[#0B0B0D] px-2 py-0.5 text-[10px] font-bold text-[#F1EDE2]">
                          {c.machine_name || "Sem enxame"}
                        </span>
                        {(c.municipio || c.estado) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {[c.municipio, c.estado].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex -space-x-2">
                    {c.members.slice(0, 6).map((m) => (
                      <Avatar key={m.id_member_profile} className="size-8 border-2 border-[#F1EDE2]" title={m.display_name}>
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#2a2212] text-[10px] text-[#F5F1E8]">
                          {m.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {c.members.length > 0 && (
                      <span className="ml-3 self-center text-xs text-[#5b554b]">
                        {c.members.length} {c.members.length === 1 ? "membro" : "membros"}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3 border-t border-[#0B0B0D]/10 pt-3 text-xs text-[#5b554b]">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3" /> {c.likes_count}
                    </span>
                    {c.ratings_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-[#F2B705] text-[#F2B705]" /> {Number(c.avg_rating).toFixed(1)} ({c.ratings_count})
                      </span>
                    )}
                    <span className="ml-auto font-black text-[#0B0B0D]">
                      {Math.round(Number(c.total_points))} pts
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
