"use client"

// /games/jogo — O JOGO ATUAL: o que a pessoa está jogando agora.
//
// É a metade PESSOAL da plataforma (mig 232: "a estante, o jogo atual e os
// posts são do perfil do usuário"): três campos gravados em
// `tb_user_current_game` pela chave do TOKEN, sem id de espaço nenhum.
//
// ⚠️ DOIS REGIMES NA MESMA TELA. Sem contexto, a pessoa EDITA o seu; com
// `?de=@fulano`, ela LÊ o dele — e os campos viram texto, porque o PATCH grava
// pela chave do token: de pé, a pessoa editaria o próprio jogo achando que
// mexia no dela. A régua de quem é quem (`is_me`) vem do servidor.
//
// ⚠️ SEM PRIVACIDADE, DE PROPÓSITO: o jogo atual é declaração deliberada ("é
// isto que estou jogando"), escrita para aparecer. Quem não quer anunciá-lo
// apaga o campo. A ESTANTE é o oposto (chega inteira da Steam) e só ela tem
// visibilidade.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Gamepad2, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { GamesShell } from "../_components/games-shell"
import { GamesHeadcard } from "../_components/games-headcard"
import { PURPLE, PURPLE_GLOW } from "../_components/games-ui"
import { ownerLabel, useGamesContext, withOwner } from "../_components/games-context"

/** Espelho de GAME_PLATFORMS no backend (utils/subjectCommunities.js). */
const PLATFORMS = ["pc", "playstation", "xbox", "nintendo", "mobile", "retro", "outra"] as const
type Platform = (typeof PLATFORMS)[number]

type Subject = { platform?: string | null; game_title?: string | null; gamertag?: string | null }

export default function GamesCurrentPage() {
  const tr = useTranslations("Games")
  const { perfil } = useMeProfile()
  const { owner, subject: theirs } = useGamesContext()

  const [mine, setMine] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState<string>("")
  const [title, setTitle] = useState("")
  const [gamertag, setGamertag] = useState("")

  const platformLabel = (p: string | null | undefined) => {
    switch (p) {
      case "pc": return tr("platformPc", "PC")
      case "playstation": return tr("platformPlaystation", "PlayStation")
      case "xbox": return tr("platformXbox", "Xbox")
      case "nintendo": return tr("platformNintendo", "Nintendo")
      case "mobile": return tr("platformMobile", "Celular")
      case "retro": return tr("platformRetro", "Retrô")
      case "outra": return tr("platformOther", "Outra")
      default: return ""
    }
  }

  // O MEU jogo — só quando o contexto é o próprio (owner === null). Visitando
  // alguém, o que se lê já veio com o contexto.
  useEffect(() => {
    if (owner !== null) return
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    let alive = true
    fetch("/api/games/current", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        const s: Subject | null = d?.subject ?? null
        setMine(s)
        setPlatform(s?.platform || "")
        setTitle(s?.game_title || "")
        setGamertag(s?.gamertag || "")
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [owner])

  const save = async () => {
    const token = getToken()
    if (!token || saving) return
    setSaving(true)
    try {
      const r = await fetch("/api/games/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform: platform || null, game_title: title || null, gamertag: gamertag || null }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || tr("gameSaveError", "Não deu para salvar."))
      setMine(d?.subject ?? null)
      toast.success(tr("gameSaved", "Jogo atual salvo."))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("gameSaveError", "Não deu para salvar."))
    } finally {
      setSaving(false)
    }
  }

  const visiting = !!owner
  const shown: Subject | null = visiting ? theirs : mine

  const fieldClass =
    "w-full border-2 border-[#0B0B0D] bg-[#0b0804]/80 px-3 py-2.5 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/60 focus:border-[#F5F1E8]/60"
  const labelClass = "mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]"

  return (
    <GamesShell>
      <GamesHeadcard
        perfil={perfil}
        title={visiting && owner ? tr("gameOfTitle", "O jogo de {who}").replace("{who}", ownerLabel(owner)) : tr("gameTitle", "Jogo atual")}
        backHref={withOwner("/games", owner)}
        active="game"
        owner={owner}
      />

      <section className="mx-auto mt-8 w-full max-w-3xl px-0 md:px-10">
        <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-5 md:p-7" style={{ boxShadow: `8px 8px 0 0 ${PURPLE}` }}>
          <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            <Gamepad2 className="h-3.5 w-3.5" style={{ color: PURPLE_GLOW }} />
            {visiting ? tr("gameReadOnly", "O que essa pessoa está jogando") : tr("gameHint", "Vale só dentro do Games e aparece para quem visita o seu")}
          </p>

          {owner === undefined || (loading && !visiting) ? (
            <div className="mt-6 flex items-center gap-2 text-[#9A938A]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visiting ? (
            // LEITURA: os três campos como texto. Sem "Salvar".
            shown?.game_title || shown?.platform || shown?.gamertag ? (
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className={labelClass}>{tr("gameTitleLabel", "Jogo")}</dt>
                  <dd className="fl-display text-3xl leading-none text-[#F5F1E8]">{shown?.game_title || "—"}</dd>
                </div>
                <div>
                  <dt className={labelClass}>{tr("gamePlatformLabel", "Plataforma")}</dt>
                  <dd className="text-sm font-extrabold text-[#F5F1E8]">{platformLabel(shown?.platform) || "—"}</dd>
                </div>
                <div>
                  <dt className={labelClass}>{tr("gamertagLabel", "Gamertag")}</dt>
                  <dd className="text-sm font-extrabold text-[#F5F1E8]">{shown?.gamertag || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-[#9A938A]">
                {tr("gameEmptyOther", "{who} ainda não disse o que está jogando.").replace("{who}", owner ? ownerLabel(owner) : "")}
              </p>
            )
          ) : (
            // EDIÇÃO: os três campos e o Salvar próprio.
            <form
              className="mt-6 grid gap-4 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <div className="sm:col-span-3">
                <label className={labelClass} htmlFor="game-title">{tr("gameTitleLabel", "Jogo")}</label>
                <input
                  id="game-title"
                  className={fieldClass}
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tr("gameTitlePlaceholder", "O que você está jogando agora?")}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="game-platform">{tr("gamePlatformLabel", "Plataforma")}</label>
                <select id="game-platform" className={fieldClass} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="">{tr("gamePlatformNone", "Escolha…")}</option>
                  {PLATFORMS.map((p: Platform) => (
                    <option key={p} value={p}>{platformLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="game-gamertag">{tr("gamertagLabel", "Gamertag")}</label>
                <input
                  id="game-gamertag"
                  className={fieldClass}
                  value={gamertag}
                  maxLength={60}
                  onChange={(e) => setGamertag(e.target.value)}
                  placeholder={tr("gamertagPlaceholder", "Seu nome nas plataformas")}
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: "#F2B705" }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {tr("gameSave", "Salvar")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* A SAÍDA do contexto: quem entra no games de alguém precisa de um
            caminho de volta ao seu, senão fica preso — o Voltar leva ao feed
            (ainda no contexto) e o pill está a duas telas. */}
        {visiting && (
          <div className="mt-5">
            <Link href="/games/jogo" className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] transition hover:text-[#F5F1E8]">
              {tr("seeMine", "Ver o meu games")} →
            </Link>
          </div>
        )}
      </section>
    </GamesShell>
  )
}
