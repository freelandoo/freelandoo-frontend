"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, ArrowRight, Loader2, Crown, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ClanItem = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  machine_slug: string | null
  machine_name: string | null
  my_role: "owner" | "member"
  free_slots?: number | null
  paid_slots?: number | null
  max_slots?: number | null
  members_count?: number
}

function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?"
}

export function AccountClansSection() {
  const [clans, setClans] = useState<ClanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setLoading(false)
      return
    }
    fetch("/api/clans/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao listar clans")
        return r.json()
      })
      .then((d) => {
        const list: ClanItem[] = Array.isArray(d) ? d : d?.clans ?? []
        setClans(list)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Meus Clans
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Carregando…"
                : `${clans.length} clan${clans.length === 1 ? "" : "s"} ${
                    clans.filter((c) => c.my_role === "owner").length > 0
                      ? `· ${clans.filter((c) => c.my_role === "owner").length} como dono`
                      : ""
                  }`}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/account/clans">
              Gerenciar clans
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && clans.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Você ainda não participa de nenhum clan.
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/account/clans">Criar ou entrar em um clan</Link>
            </Button>
          </div>
        )}

        {!loading && !error && clans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clans.map((c) => {
              const totalSlots =
                (c.free_slots ?? 0) + (c.paid_slots ?? 0) || c.max_slots || null
              return (
                <Link
                  key={c.id_profile}
                  href={`/account/clans/${c.id_profile}`}
                  className="block"
                >
                  <Card className="hover:shadow-md hover:border-primary/40 transition-all h-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {c.avatar_url && (
                            <AvatarImage src={c.avatar_url} alt={c.display_name} />
                          )}
                          <AvatarFallback>{getInitials(c.display_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{c.display_name}</p>
                          {c.machine_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {c.machine_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {c.my_role === "owner" ? (
                          <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
                            <Crown className="h-3 w-3 mr-1" />
                            Dono
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Membro
                          </Badge>
                        )}
                        {typeof c.members_count === "number" && (
                          <Badge variant="outline">
                            {c.members_count} membro{c.members_count === 1 ? "" : "s"}
                            {totalSlots ? ` / ${totalSlots}` : ""}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
