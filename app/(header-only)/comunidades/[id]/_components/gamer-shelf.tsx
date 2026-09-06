"use client"

/**
 * A ESTANTE — aba "Estante" da comunidade de games (mig 220).
 *
 * ─── O QUE ELA É, E O QUE ELA NÃO É ──────────────────────────────────────────
 *
 * A comunidade de games guarda UM título digitado à mão (`tb_community_game`).
 * Isto aqui é outra coisa: a biblioteca da PESSOA, trazida da plataforma que
 * ela conectou. As duas convivem — o espaço continua sendo sobre um jogo, e a
 * estante é o que o dono dele joga.
 *
 * ─── AS TRÊS REGRAS QUE ESTA TELA CARREGA ────────────────────────────────────
 *
 * 1. NÃO DIZER O QUE A PLATAFORMA NÃO SABE. `capabilities` vem do backend e é
 *    ele que decide o que desenhar: sem `playtime`, a coluna de horas não
 *    aparece — em vez de mostrar "0h", que seria mentira. Nenhuma plataforma
 *    entrega progresso de CAMPANHA, então esta tela nunca escreve "% do jogo":
 *    o que ela mostra é "34/51 conquistas", que é outra coisa.
 *
 * 2. CONTA FECHADA NÃO É ERRO. Quem deixou "Detalhes do jogo" privado na Steam
 *    volta como `needs_permission`, e o que aparece é a instrução de onde
 *    mudar — não um "falha ao sincronizar" que mandaria a pessoa caçar defeito.
 *
 * 3. HORA TEM DONO. Todo número vem com a plataforma escrita do lado, porque
 *    142h na Steam e 0h no Xbox não se somam nem se comparam.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Gamepad2, Link2, Loader2, RefreshCw, Search, Trophy, Unlink, Eye, EyeOff } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { toast } from "sonner"

type Caps = { library: boolean; playtime: boolean; achievements: boolean; presence: boolean; campaign: boolean }
type Account = {
  provider: string
  handle: string | null
  status: "connected" | "needs_permission" | "error"
  visibility: "public" | "private"
  sync_error: string | null
  last_sync_at: string | null
}
type Provider = { provider: string; label: string; capabilities: Caps; account: Account | null }
type Game = {
  id_game: string
  name: string
  cover_url: string | null
  provider: string
  playtime_minutes: number
  last_played_at: string | null
  ach_unlocked: number | null
  ach_total: number | null
}
type CommonGame = {
  id_game: string; name: string; cover_url: string | null
  a_minutes: number; b_minutes: number
  a_ach_unlocked: number | null; a_ach_total: number | null
  b_ach_unlocked: number | null; b_ach_total: number | null
}
type Compare = {
  other: { username: string; name: string | null; avatar_url: string | null }
  locked: boolean
  games: CommonGame[]
  summary?: {
    in_common: number; my_total: number; their_total: number
    my_minutes: number; their_minutes: number
    i_played_more: number; they_played_more: number
  }
}

/** Horas com uma casa só. Minuto exato não diz nada em cima de 9.000 deles. */
function hours(minutes: number) {
  if (!minutes) return "0h"
  if (minutes < 60) return `${minutes}min`
  return `${Math.round(minutes / 60)}h`
}

export function GamerShelf({
  ownerUserId,
  isOwner,
  accent,
}: {
  ownerUserId: string | null
  isOwner: boolean
  accent: string
}) {
  const t = useTranslations("Gamer")
  const [providers, setProviders] = useState<Provider[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [total, setTotal] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState("")

  // Comparação
  const [who, setWho] = useState("")
  const [compare, setCompare] = useState<Compare | null>(null)
  const [comparing, setComparing] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    try {
      // A estante do DONO do espaço. Visitante lê pela rota por id_user, que é
      // onde o backend confere a visibilidade — nunca aqui.
      const url = isOwner ? "/api/gamer/shelf" : `/api/gamer/shelf/${ownerUserId}`
      const [shelfRes, provRes] = await Promise.all([
        fetch(url, { headers }),
        isOwner ? fetch("/api/gamer/providers", { headers }) : Promise.resolve(null),
      ])
      const shelf = await shelfRes.json().catch(() => null)
      if (shelfRes.ok && shelf) {
        setGames(shelf.games || [])
        setTotal(shelf.total || 0)
        setTotalMinutes(shelf.total_minutes || 0)
        setLocked(!!shelf.locked)
        if (isOwner && Array.isArray(shelf.accounts)) {
          // A estante do dono já traz as contas; guardamos para o caso de a
          // lista de provedores falhar.
          setProviders((prev) =>
            prev.length ? prev : shelf.accounts.map((a: Account) => ({
              provider: a.provider, label: a.provider, capabilities: {
                library: true, playtime: true, achievements: true, presence: false, campaign: false,
              }, account: a,
            }))
          )
        }
      }
      if (provRes) {
        const prov = await provRes.json().catch(() => null)
        if (provRes.ok && Array.isArray(prov?.providers)) setProviders(prov.providers)
      }
    } finally {
      setLoading(false)
    }
  }, [isOwner, ownerUserId])

  useEffect(() => { load() }, [load])

  const connect = useCallback(async (provider: string) => {
    const token = getToken()
    if (!token) return
    setBusy(provider)
    try {
      // De onde ela saiu, para voltar aqui e não em /account: a pessoa deixa
      // o site no meio do caminho e reaparecer noutra tela parece que o clique
      // se perdeu. O caminho é validado no backend (só relativo) e viaja
      // assinado dentro do state.
      const back = encodeURIComponent(window.location.pathname)
      const res = await fetch(`/api/gamer/${provider}/connect?return=${back}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.url) { toast.error(body?.error || t("connectFail", "Não deu para começar a conexão.")); return }
      // A pessoa SAI do site: quem autoriza é a plataforma, na tela dela.
      window.location.href = body.url
    } finally {
      setBusy(null)
    }
  }, [t])

  const act = useCallback(async (provider: string, path: string, method: string, body?: object) => {
    const token = getToken()
    if (!token) return null
    setBusy(provider)
    try {
      const res = await fetch(`/api/gamer/${provider}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { toast.error(json?.error || t("actionFail", "Não deu certo.")); return null }
      await load()
      return json
    } finally {
      setBusy(null)
    }
  }, [load, t])

  const doCompare = useCallback(async () => {
    const token = getToken()
    const username = who.trim().replace(/^@/, "")
    if (!token || !username) return
    setComparing(true)
    try {
      const res = await fetch(`/api/gamer/compare/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { toast.error(json?.error || t("compareFail", "Não achei esse perfil.")); setCompare(null); return }
      setCompare(json)
    } finally {
      setComparing(false)
    }
  }, [who, t])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return games
    return games.filter((g) => g.name.toLowerCase().includes(term))
  }, [games, q])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} />
      </div>
    )
  }

  const connected = providers.filter((p) => p.account)
  const notConnected = providers.filter((p) => !p.account)

  return (
    <div className="space-y-6">
      {/* ── Contas (só o dono) ────────────────────────────────────────────── */}
      {isOwner && (
        <div className="space-y-3">
          {connected.map((p) => {
            const a = p.account!
            return (
              <div key={p.provider} className="border-2 border-[#0B0B0D] bg-[#15120E] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Gamepad2 className="h-5 w-5" style={{ color: accent }} />
                  <div className="min-w-0 flex-1">
                    <p className="fl-display text-base leading-tight text-[#F5F1E8]">
                      {p.label} · {a.handle || t("noHandle", "conta conectada")}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                      {a.status === "needs_permission"
                        ? t("statusPrivate", "Sua conta está fechada na plataforma")
                        : a.status === "error"
                          ? a.sync_error || t("statusError", "A última leitura falhou")
                          : t("statusOk", "Sincronizada")}
                    </p>
                  </div>
                  <button type="button" onClick={() => act(p.provider, "/sync", "POST")} disabled={busy === p.provider}
                    className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-50">
                    <RefreshCw className={`h-3 w-3 ${busy === p.provider ? "animate-spin" : ""}`} />
                    {t("syncNow", "Atualizar")}
                  </button>
                  <button type="button" disabled={busy === p.provider}
                    onClick={() => act(p.provider, "/visibility", "PATCH", {
                      visibility: a.visibility === "public" ? "private" : "public",
                    })}
                    className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-50">
                    {a.visibility === "public" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {a.visibility === "public" ? t("visPublic", "Visível") : t("visPrivate", "Só eu")}
                  </button>
                  <button type="button" disabled={busy === p.provider}
                    onClick={() => {
                      // Desconectar apaga a biblioteca junto — e isso precisa
                      // estar escrito ANTES, não descoberto depois.
                      if (!window.confirm(t("disconnectConfirm", "Desconectar apaga os jogos que vieram desta plataforma. Continuar?"))) return
                      act(p.provider, "", "DELETE")
                    }}
                    className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#E11D48] disabled:opacity-50">
                    <Unlink className="h-3 w-3" />
                    {t("disconnect", "Desconectar")}
                  </button>
                </div>

                {/* A instrução exata, e não um aviso genérico: a pessoa precisa
                    saber ONDE mudar, senão o estado vira beco. */}
                {a.status === "needs_permission" && (
                  <p className="mt-3 border-l-4 pl-3 text-xs leading-relaxed text-[#F5F1E8]/80" style={{ borderColor: accent }}>
                    {t("privateHelp", "Na Steam, abra Perfil → Editar perfil → Configurações de privacidade e deixe \"Detalhes do jogo\" como Público. Depois toque em Atualizar aqui.")}
                  </p>
                )}
              </div>
            )
          })}

          {notConnected.map((p) => (
            <button key={p.provider} type="button" onClick={() => connect(p.provider)} disabled={busy === p.provider}
              className="flex w-full items-center gap-3 border-2 border-dashed border-[#F5F1E8]/25 bg-[#15120E] p-4 text-left disabled:opacity-50">
              <Link2 className="h-5 w-5" style={{ color: accent }} />
              <div className="min-w-0 flex-1">
                <p className="fl-display text-base leading-tight text-[#F5F1E8]">
                  {t("connectCta", "Conectar {platform}").replace("{platform}", p.label)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                  {t("connectHint", "Traz seus jogos, horas e conquistas automaticamente")}
                </p>
              </div>
              {busy === p.provider && <Loader2 className="h-4 w-4 animate-spin" style={{ color: accent }} />}
            </button>
          ))}

          {/* Nenhuma plataforma disponível = a instalação não tem credencial
              configurada. Dizer isso é melhor do que uma tela vazia que parece
              defeito. */}
          {providers.length === 0 && (
            <p className="border-2 border-[#0B0B0D] bg-[#15120E] p-4 text-xs text-[#9A938A]">
              {t("noProviders", "Nenhuma plataforma disponível por aqui ainda.")}
            </p>
          )}
        </div>
      )}

      {/* ── Estante ───────────────────────────────────────────────────────── */}
      {locked ? (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-center text-sm text-[#9A938A]">
          {t("shelfLocked", "Esta pessoa não deixa a estante à mostra.")}
        </p>
      ) : games.length === 0 ? (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-center text-sm text-[#9A938A]">
          {isOwner
            ? t("shelfEmptyOwn", "Conecte uma plataforma e seus jogos aparecem aqui.")
            : t("shelfEmpty", "Nenhum jogo por aqui ainda.")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="fl-display text-lg leading-none text-[#F5F1E8]">
              {total} {total === 1 ? t("gameOne", "jogo") : t("gameMany", "jogos")}
              <span className="ml-2 text-sm text-[#9A938A]">{hours(totalMinutes)}</span>
            </p>
            <div className="ml-auto flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#9A938A]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchGames", "Procurar jogo")}
                className="w-40 bg-transparent text-xs text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => (
              <div key={`${g.id_game}-${g.provider}`} className="flex gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-3">
                {/* Capa por <img> e não next/image: são dezenas de mídias únicas
                    por tela, e otimizar cada uma na Vercel é justamente o custo
                    que a política de imagem manda evitar. */}
                <div className="h-16 w-28 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.cover_url ? <img src={g.cover_url} alt={g.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate fl-display text-base leading-tight text-[#F5F1E8]">{g.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                    {hours(g.playtime_minutes)} · {g.provider}
                  </p>
                  {/* Conquistas, e NUNCA "% da campanha": são coisas
                      diferentes, e nenhuma plataforma entrega a segunda. */}
                  {g.ach_total ? (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: accent }}>
                      <Trophy className="h-3 w-3" />
                      {g.ach_unlocked}/{g.ach_total} {t("achievements", "conquistas")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Frente a frente ───────────────────────────────────────────────── */}
      {isOwner && games.length > 0 && (
        <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-4">
          <p className="fl-display text-lg leading-none text-[#F5F1E8]">{t("compareTitle", "Frente a frente")}</p>
          <p className="mt-1 text-xs text-[#9A938A]">
            {t("compareHint", "Digite o @ de alguém e veja o que vocês jogam em comum.")}
          </p>
          <div className="mt-3 flex gap-2">
            <input value={who} onChange={(e) => setWho(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doCompare() }}
              placeholder="@username" maxLength={40}
              className="min-w-0 flex-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
            <button type="button" onClick={doCompare} disabled={comparing || !who.trim()}
              className="border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50"
              style={{ background: accent }}>
              {comparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("compareCta", "Comparar")}
            </button>
          </div>

          {compare && (
            compare.locked ? (
              <p className="mt-4 text-sm text-[#9A938A]">
                {t("compareLocked", "Esta pessoa não deixa a estante à mostra.")}
              </p>
            ) : compare.games.length === 0 ? (
              <p className="mt-4 text-sm text-[#9A938A]">
                {t("compareNone", "Vocês não têm nenhum jogo em comum ainda.")}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {compare.summary && (
                  <p className="text-xs text-[#F5F1E8]/85">
                    {t("compareSummary", "{n} em comum · você jogou mais em {mine}, {who} em {theirs}")
                      .replace("{n}", String(compare.summary.in_common))
                      .replace("{mine}", String(compare.summary.i_played_more))
                      .replace("{who}", `@${compare.other.username}`)
                      .replace("{theirs}", String(compare.summary.they_played_more))}
                  </p>
                )}
                {compare.games.map((g) => {
                  const max = Math.max(g.a_minutes, g.b_minutes, 1)
                  return (
                    <div key={g.id_game} className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                      <p className="truncate fl-display text-sm leading-tight text-[#F5F1E8]">{g.name}</p>
                      {/* Duas barras na MESMA escala. É a régua comum que faz a
                          comparação querer dizer alguma coisa. */}
                      <div className="mt-2 space-y-1">
                        <Bar label={t("compareYou", "Você")} minutes={g.a_minutes} max={max} color={accent}
                          ach={g.a_ach_total ? `${g.a_ach_unlocked}/${g.a_ach_total}` : null} />
                        <Bar label={`@${compare.other.username}`} minutes={g.b_minutes} max={max} color="#F5F1E8"
                          ach={g.b_ach_total ? `${g.b_ach_unlocked}/${g.b_ach_total}` : null} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function Bar({ label, minutes, max, color, ach }: {
  label: string; minutes: number; max: number; color: string; ach: string | null
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{label}</span>
      <div className="h-3 min-w-0 flex-1 bg-[#0B0B0D]">
        <div className="h-full" style={{ width: `${Math.max((minutes / max) * 100, 2)}%`, background: color }} />
      </div>
      <span className="w-20 shrink-0 text-right text-[10px] font-bold text-[#F5F1E8]">
        {hours(minutes)}{ach ? ` · ${ach}` : ""}
      </span>
    </div>
  )
}
