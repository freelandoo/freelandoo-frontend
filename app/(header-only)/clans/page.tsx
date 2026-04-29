"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Users, MapPin, Star, Heart } from "lucide-react"

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
    fetch("/api/machines")
      .then((r) => r.json())
      .then((d) => setMachines(d.machines || d || []))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="size-7" /> Clans Freelandoo
        </h1>
        <p className="text-muted-foreground mt-1">
          Times de até 6 sub-perfis trabalhando juntos. Score combina todas as
          métricas dos membros.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <Input
                placeholder="Buscar por nome ou bio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <div className="sm:col-span-3">
              <Select value={filterMachine} onValueChange={setFilterMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as máquinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as máquinas</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id_machine} value={m.slug}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Input
                placeholder="Cidade"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <div className="sm:col-span-1">
              <Button className="w-full" onClick={load} disabled={loading}>
                <Search className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : clans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum clan encontrado com esses filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clans.map((c) => (
            <Link
              key={c.id_profile}
              href={`/clans/${c.id_profile}`}
              className="block group"
            >
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-14">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback>
                        {c.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base group-hover:text-primary transition-colors truncate">
                        {c.display_name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.machine_name || "—"}
                        </Badge>
                        {(c.municipio || c.estado) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {[c.municipio, c.estado].filter(Boolean).join(" — ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex -space-x-2">
                    {c.members.slice(0, 6).map((m) => (
                      <Avatar
                        key={m.id_member_profile}
                        className="size-8 border-2 border-background"
                        title={m.display_name}
                      >
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {m.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {c.members.length > 0 && (
                      <span className="ml-3 text-xs text-muted-foreground self-center">
                        {c.members.length} {c.members.length === 1 ? "membro" : "membros"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3" /> {c.likes_count}
                    </span>
                    {c.ratings_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3" /> {Number(c.avg_rating).toFixed(1)} ({c.ratings_count})
                      </span>
                    )}
                    <span className="ml-auto font-medium">
                      {Math.round(Number(c.total_points))} pts
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
