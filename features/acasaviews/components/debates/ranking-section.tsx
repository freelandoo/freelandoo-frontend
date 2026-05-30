"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { Users, Eye } from "lucide-react"
import { useState, useEffect } from "react"

interface RankedDebater {
  position: number
  name: string
  points: string
}

interface ApiUser {
  user_login: string
  pontuacao: string
  profile_pic_url: string | null
  tipo_usuario: "PARTICIPANTE" | "ESPECTADOR"
}

export default function RankingSection() {
  const fadeInRef = useFadeIn()
  const [participantes, setParticipantes] = useState<RankedDebater[]>([])
  const [espectadores, setEspectadores] = useState<RankedDebater[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/rankings", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const users: ApiUser[] = await response.json()

        const participantUsers = users
          .filter((user) => user.tipo_usuario === "PARTICIPANTE")
          .sort((a, b) => Number(b.pontuacao) - Number(a.pontuacao))
          .slice(0, 10)
          .map((user, index) => ({
            position: index + 1,
            name: user.user_login,
            points: user.pontuacao,
          }))

        const spectatorUsers = users
          .filter((user) => user.tipo_usuario === "ESPECTADOR")
          .sort((a, b) => Number(b.pontuacao) - Number(a.pontuacao))
          .slice(0, 10)
          .map((user, index) => ({
            position: index + 1,
            name: user.user_login,
            points: user.pontuacao,
          }))

        setParticipantes(participantUsers)
        setEspectadores(spectatorUsers)
        setError(false)
      } catch (err) {
        console.error("Error fetching rankings:", err)
        setError(true)
        setParticipantes([])
        setEspectadores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const RankingList = ({ rankings, emptyMessage }: { rankings: RankedDebater[]; emptyMessage: string }) => {
    if (rankings.length === 0) {
      return (
        <div className="text-center text-slate-400 py-8">
          <p className="text-lg">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {rankings.map((rank) => {
          const getPositionColor = (position: number) => {
            switch (position) {
              case 1:
                return "text-yellow-400"
              case 2:
                return "text-slate-300"
              case 3:
                return "text-amber-600"
              default:
                return "text-slate-400"
            }
          }

          const positionColor = getPositionColor(rank.position)

          return (
            <div
              key={rank.position}
              className="group bg-slate-900/50 rounded-lg border border-slate-800 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    <span className={`font-bold text-xl ${positionColor}`}>{rank.position}</span>
                  </div>

                  <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                    @{rank.name}
                  </h3>
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-bold ${rank.position <= 3 ? positionColor : "text-purple-400"}`}>
                    {rank.points}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">pts</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section ref={fadeInRef} className="py-24 px-4 bg-slate-950 fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Rankings</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Participantes e espectadores mais ativos da comunidade
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-slate-400 py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p>Carregando rankings...</p>
          </div>
        )}

        {!isLoading && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Participantes */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Top 10 Criadores</h3>
              </div>
              <RankingList rankings={participantes} emptyMessage="Nenhum participante encontrado" />
            </div>

            {/* Espectadores */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <Eye className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Top 10 Seguidores</h3>
              </div>
              <RankingList rankings={espectadores} emptyMessage="Nenhum espectador encontrado" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
