"use client"

// Lista dos Clusters de Live em que o usuário logado é membro. Cada cluster
// abre a sala (/cluster/[id]) onde ele aguarda o Iniciar do administrador.
// Gated pela flag live_clusters; visual tabloide escuro, cantos retos.
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Loader2, Radio, RefreshCw, Users } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface Cluster {
  id_live_cluster: string
  name: string
  status: "idle" | "started"
  member_count: number
}

export default function ClusterListPage() {
  const t = useTranslations("Cluster")
  const router = useRouter()
  const enabled = useFeature("live_clusters")
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) { router.push("/login"); return }
      const res = await fetch("/api/live-clusters/mine", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setClusters(data.clusters || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar clusters"))
    } finally {
      setLoading(false)
    }
  }, [router, t])

  useEffect(() => { load() }, [load])

  if (!enabled) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-6">
        <p className="text-sm text-white/60">{t("unavailable", "Recurso indisponível.")}</p>
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804]">
      <main className="mx-auto max-w-lg px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-white">
            <Radio className="h-5 w-5 text-[#F2B705]" /> {t("title", "Clusters")}
          </h1>
          <button
            type="button"
            onClick={load}
            className="ml-auto flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition hover:text-white"
            aria-label={t("refresh", "Atualizar")}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-white/55">
          {t("subtitle", "Salas de live sincronizada em que você participa.")}
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-[#F2B705]" />
            </div>
          ) : error ? (
            <div className="space-y-3 border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={load}
                className="border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                {t("retry", "Tentar de novo")}
              </button>
            </div>
          ) : clusters.length === 0 ? (
            <div className="border border-dashed border-white/15 py-16 text-center text-sm text-white/55">
              {t("empty", "Você ainda não faz parte de nenhum cluster.")}
            </div>
          ) : (
            <ul className="space-y-2">
              {clusters.map((cluster) => (
                <li key={cluster.id_live_cluster}>
                  <Link
                    href={`/cluster/${cluster.id_live_cluster}`}
                    className="flex items-center gap-3 border border-white/10 bg-[#15120E] p-4 transition hover:border-[#F2B705]/50"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        cluster.status === "started"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-white/5 text-white/50"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 ${cluster.status === "started" ? "animate-pulse bg-green-400" : "bg-white/40"}`} />
                      {cluster.status === "started" ? t("statusStarted", "Iniciado") : t("statusIdle", "Aguardando")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{cluster.name}</p>
                      <p className="flex items-center gap-1 text-xs text-white/55">
                        <Users className="h-3 w-3" /> {cluster.member_count}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
