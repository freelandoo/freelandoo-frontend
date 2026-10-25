"use client"

// features/meu-mundo/ui/player-card/player-card.tsx — o card de perfil de
// outro jogador (mm3d-31): abre ao tocar/clicar no boneco dele e fica até ser
// dispensado (X, Escape ou toque no vazio do mundo — este último vem do motor).
//
// Dados: GET /players/:session — o servidor traduz a sessão tocada na CONTA
// pela sala de quem pergunta (nunca o perfil de quem olha) e devolve só a
// projeção pública; bloqueio = "indisponível". Cache curto por sessão (trocar
// de jogador e voltar não refaz a consulta); um card por sessão (`key` no
// pai), então troca rápida nunca mistura dados de dois jogadores.
//
// Ações reaproveitam o site: Ver perfil (/freelancer/<perfil>) abre em outra
// aba; Mensagem abre a conversa no chat do jogo (mm3d-32, `onMessage`; sem
// ela, /mensagens?with=<perfil> em outra aba); Seguir é o /entity-follows do
// FollowButton.
//
// Visual: grafite a 70% SÓ no fundo (texto e imagem nítidos), rubi na ação
// principal, dourado no Seguir, sem blur. Topo = capa da manifestação em 6:9
// (altura:largura) com a foto 2:3 do perfil subindo sobre ela e "Online"
// embaixo da foto; ao lado, nome e cidade (sem @, pedido do Alex). Sempre 9:14
// (margem embaixo dos botões) e ao lado do boneco
// (place.ts); no celular o mesmo card, menor, numa borda — e a câmera gira
// para o boneco ficar na outra metade (pedido do Alex: nada de card embaixo).
//
// `data-mm-panel`: teclado com foco aqui dentro não comanda o personagem
// (input.ts); toque no card não chega ao canvas.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { Loader2, MapPin, MessageCircle, RotateCw, Star, User, UserCheck, UserPlus, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { PlayerTap } from "../../engine/player-select"
import type { PlayerProfile } from "../../types"
import { getPlayerProfile, postFollow } from "../../data"
import { MM } from "../hud/tokens"
import { archivo } from "../status/evo-skin"
import { cardWidth, isCompactViewport, placeCard, placeCompact, type CardPlace } from "./place"
import s from "../hud/hud.module.css"

/** Fundo do card: grafite a 70% (pedido do Alex) — só o fundo é translúcido. */
const BG = "rgba(18, 22, 28, 0.70)"
const TTL = 45_000
const OUT_MS = 170
const cache = new Map<string, { at: number; p: PlayerProfile }>()
const cached = (sid: string) => {
  const c = cache.get(sid)
  return c && Date.now() - c.at < TTL ? c.p : null
}

/** O que cada cena recebe da casca para o toque em outro jogador. */
export interface ScenePlayerProps {
  /** sessão do card aberto (o motor destaca esse boneco) */
  selectedPlayer?: string | null
  /** celular: onde o boneco deve ficar na tela (fração da largura), ao lado do card */
  selectedFrame?: number | null
  onPlayerTap?: (tap: PlayerTap | null) => void
  onPlayerGone?: (sessionId: string) => void
  /** Balão de fala (mm3d-32): a cena pronta põe aqui quem desenha o "say" da sala; sessão null = o meu boneco. */
  sayRef?: RefObject<((sessionId: string | null, text: string) => void) | null>
}

type Load = { state: "loading" } | { state: "ready"; p: PlayerProfile } | { state: "error"; gone: boolean }

export interface PlayerCardProps {
  tap: PlayerTap
  /** saiu da cena depois de aberto (o card fica até ser dispensado) */
  gone: boolean
  /** sobe a cada toque no vazio do mundo: fecha com a animação de saída */
  dismiss: number
  onClose: (sessionId: string) => void
  /** mm3d-32: "Mensagem" abre a conversa no chat do jogo (sem ela, o /mensagens em outra aba) */
  onMessage?: (p: PlayerProfile) => void
}

export default function PlayerCard({ tap, gone, dismiss, onClose, onMessage }: PlayerCardProps) {
  const t = useTranslations("MeuMundo")
  const locale = useLocale()
  const [load, setLoad] = useState<Load>(() => {
    const p = cached(tap.sessionId)
    return p ? { state: "ready", p } : { state: "loading" }
  })
  const [attempt, setAttempt] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [compact, setCompact] = useState(() => isCompactViewport(window.innerWidth, window.innerHeight))
  const [place, setPlace] = useState<CardPlace | null>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cached(tap.sessionId)) return
    let alive = true
    getPlayerProfile(getToken() ?? "", tap.sessionId).then((r) => {
      if (!alive) return
      if (r.ok) {
        cache.set(tap.sessionId, { at: Date.now(), p: r.data.player })
        setLoad({ state: "ready", p: r.data.player })
      } else setLoad({ state: "error", gone: r.status === 404 })
    })
    return () => {
      alive = false
    }
  }, [tap.sessionId, attempt])

  const close = useCallback(() => {
    setLeaving(true)
    window.setTimeout(() => onClose(tap.sessionId), OUT_MS)
  }, [onClose, tap.sessionId])

  useEffect(() => {
    if (dismiss) close()
  }, [dismiss, close])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      close()
    }
    const onResize = () => setCompact(isCompactViewport(window.innerWidth, window.innerHeight))
    window.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
    }
  }, [close])

  // Mede o card e encosta ao lado do boneco (uma vez por abertura/tamanho de tela).
  useLayoutEffect(() => {
    if (!ref.current) return
    const el = ref.current
    setPlace((compact ? placeCompact : placeCard)(tap.box, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight))
  }, [compact, tap.box])

  const p = load.state === "ready" ? load.p : null
  const title = p?.displayName || p?.name || tap.name
  const usable = !!p && !p.unavailable && !!p.profileId

  const toggleFollow = async () => {
    if (!p?.profileId || !p.viewerProfileId || followBusy) return
    const token = getToken()
    if (!token) return
    setFollowBusy(true)
    setFollowError(false)
    const r = await postFollow(token, p.viewerProfileId, p.profileId, !p.isFollowing)
    setFollowBusy(false)
    if (!r.ok) {
      setFollowError(true)
      return
    }
    const next: PlayerProfile = { ...p, isFollowing: r.data.isFollowing, followers: r.data.followers ?? p.followers }
    cache.set(tap.sessionId, { at: Date.now(), p: next })
    setLoad({ state: "ready", p: next })
  }

  const num = (n: number | undefined) => (typeof n === "number" ? new Intl.NumberFormat(locale).format(n) : "—")
  const ratingLine = (() => {
    const r = p?.ratings
    if (!r || !r.count) return t("pcNoRatings", "Sem avaliações")
    const avg = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(r.avg)
    return (r.count === 1 ? t("pcRatingsOne", "{avg} · 1 avaliação") : t("pcRatingsMany", "{avg} · {n} avaliações"))
      .replace("{avg}", avg)
      .replace("{n}", num(r.count))
  })()

  const frame: React.CSSProperties = place ? { left: place.left, top: place.top } : { left: -9999, top: 0 }
  const width = cardWidth(compact, window.innerWidth, window.innerHeight)
  // Foto 2:3 (a do perfil) subindo sobre a capa; o nome começa onde a capa acaba.
  const photoW = compact ? 62 : 92
  const overlap = compact ? 56 : 84

  return (
    <div
      ref={ref}
      data-mm-panel
      role="dialog"
      aria-modal="false"
      aria-label={t("pcTitle", "Perfil do jogador")}
      className={`${archivo.className} ${leaving ? s.cardOut : s.cardIn} fixed z-[74] flex flex-col overflow-hidden ${compact ? "gap-1.5 p-2 pb-3.5" : "gap-3 p-3 pb-5"}`}
      style={{ ...frame, width, aspectRatio: "9 / 14", background: BG, border: `1px solid ${MM.borderStrong}`, borderRadius: MM.radius.panel, boxShadow: MM.shadow, color: MM.text }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div>
        {/* Capa da manifestação (6:9) com o fechar por cima */}
        <div className="relative">
          <Cover url={usable ? p?.coverUrl : null} />
          <button
            type="button"
            onClick={close}
            aria-label={t("pcClose", "Fechar")}
            className={`absolute right-1.5 top-1.5 inline-flex ${compact ? "h-7 w-7" : "h-8 w-8"} items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5BE70]`}
            style={{ background: "rgba(10,12,16,0.55)", color: "#fff" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Foto + Online embaixo dela; nome, cidade e @ ao lado */}
        <div className={`flex px-1.5 ${compact ? "gap-2" : "gap-3"}`} style={{ marginTop: -overlap }}>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Avatar url={usable ? p?.avatarUrl : null} name={title} width={photoW} alt={t("pcAvatarAlt", "Foto de {name}").replace("{name}", title)} />
            <span className={`inline-flex items-center gap-1 font-semibold ${compact ? "text-[10px]" : "text-[12px]"}`} style={{ color: gone ? MM.muted : MM.text }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: gone ? MM.muted : MM.online }} aria-hidden />
              {gone ? t("pcLeft", "Saiu daqui") : t("pcOnline", "Online")}
            </span>
          </div>
          <div className="min-w-0 flex-1" style={{ paddingTop: overlap + (compact ? 4 : 8) }}>
            <h2 className={`truncate font-bold leading-tight ${compact ? "text-[15px]" : "text-[19px]"}`}>{title}</h2>
            {usable && p?.city && (
              <div className={`mt-0.5 flex items-center gap-1 ${compact ? "text-[11px]" : "text-[13px]"}`} style={{ color: MM.gold }}>
                <MapPin className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} aria-hidden />
                <span className="truncate">{p.city}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {load.state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-2 text-[13px]" style={{ color: MM.muted }} role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("pcLoading", "Carregando perfil…")}
        </div>
      ) : load.state === "error" ? (
        <div className="flex flex-col items-center gap-2 py-1 text-center text-[13px]" style={{ color: MM.muted }}>
          <span>{load.gone ? t("pcGone", "Esse jogador não está mais aqui.") : t("pcError", "Não deu para carregar o perfil.")}</span>
          {!load.gone && (
            <button
              type="button"
              onClick={() => {
                setLoad({ state: "loading" })
                setAttempt((n) => n + 1)
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 font-semibold"
              style={{ border: `1px solid ${MM.border}`, color: MM.text }}
            >
              <RotateCw className="h-4 w-4" />
              {t("pcRetry", "Tentar de novo")}
            </button>
          )}
        </div>
      ) : p?.unavailable ? (
        <div className="py-1 text-center text-[13px]" style={{ color: MM.muted }}>
          <div className="font-semibold" style={{ color: MM.text }}>
            {t("pcUnavailable", "Perfil indisponível")}
          </div>
          {t("pcUnavailableHint", "Este perfil não está disponível para você.")}
        </div>
      ) : (
        <div className={`flex flex-col ${compact ? "gap-1" : "gap-2"}`}>
          {/* Números reais: posts públicos, seguidores, seguindo e avaliações */}
          <div className="grid grid-cols-3 text-center" style={{ borderBottom: `1px solid ${MM.border}` }}>
            {[
              [p?.posts, t("pcPosts", "Posts")],
              [p?.followers, t("pcFollowers", "Seguidores")],
              [p?.following, t("pcFollowing", "Seguindo")],
            ].map(([n, label], i) => (
              <div key={i} className={`min-w-0 ${compact ? "pb-1" : "pb-2"}`} style={i ? { borderLeft: `1px solid ${MM.border}` } : undefined}>
                <div className={`font-bold tabular-nums leading-tight ${compact ? "text-[15px]" : "text-[19px]"}`}>{num(n as number | undefined)}</div>
                <div className={`truncate ${compact ? "text-[10px]" : "text-[12px]"}`} style={{ color: MM.muted }}>
                  {label as string}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Stars avg={p?.ratings?.count ? p.ratings.avg : 0} small={compact} />
            <span className={`truncate ${compact ? "text-[10px]" : "text-[12px]"}`} style={{ color: MM.muted }}>
              {ratingLine}
            </span>
          </div>
        </div>
      )}

      {/* Ações: uma linha (rubi, grafite, dourado), presa embaixo */}
      <div className="mt-auto">
        <div className={`grid grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
          <ActionLink
            href={usable ? `/freelancer/${encodeURIComponent(p!.profileId!)}` : null}
            primary
            icon={<User className="h-4 w-4" />}
            label={t("pcViewProfile", "Ver perfil")}
            compact={compact}
          />
          {onMessage ? (
            <button
              type="button"
              onClick={() => p && onMessage(p)}
              disabled={!usable}
              className={actionClass(compact)}
              style={{ border: `1px solid ${MM.borderStrong}`, color: usable ? MM.text : MM.disabledText }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="truncate">{t("pcMessage", "Mensagem")}</span>
            </button>
          ) : (
            <ActionLink
              href={usable ? `/mensagens?with=${encodeURIComponent(p!.profileId!)}` : null}
              icon={<MessageCircle className="h-4 w-4" />}
              label={t("pcMessage", "Mensagem")}
              compact={compact}
            />
          )}
          <button
            type="button"
            onClick={() => void toggleFollow()}
            // Enviando: segue habilitado (desabilitar tira o foco do card e devolve o teclado ao jogo).
            disabled={!usable || !p?.viewerProfileId}
            aria-busy={followBusy}
            aria-pressed={!!p?.isFollowing}
            className={actionClass(compact)}
            style={{
              border: `1px solid ${usable ? MM.gold : MM.border}`,
              background: p?.isFollowing ? "rgba(229,190,112,0.12)" : "transparent",
              color: usable ? MM.gold : MM.disabledText,
            }}
          >
            {followBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : p?.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span className="truncate">{p?.isFollowing ? t("pcFollowingBtn", "Seguindo") : t("pcFollow", "Seguir")}</span>
          </button>
        </div>
        {followError && (
          <div className="mt-1 text-center text-[11px] font-semibold" style={{ color: MM.danger }} role="alert">
            {t("pcFollowError", "Não deu para seguir agora.")}
          </div>
        )}
      </div>
    </div>
  )
}

/** Capa da manifestação: 6:9 (altura:largura), largura toda do card. */
function Cover({ url }: { url: string | null | undefined }) {
  const [broken, setBroken] = useState(false)
  return (
    <div
      className="w-full shrink-0 overflow-hidden"
      style={{ aspectRatio: "9 / 6", borderRadius: MM.radius.card, background: "linear-gradient(135deg, #650D2A 0%, #2A1A22 55%, #1D232C 100%)" }}
    >
      {url && !broken && (
        // eslint-disable-next-line @next/next/no-img-element -- capa de usuário (regra 4: <img> lazy, host fora do otimizador)
        <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      )}
    </div>
  )
}

/** Foto do perfil em 2:3 (a mesma proporção do headcard do perfil). */
function Avatar({ url, name, alt, width }: { url: string | null | undefined; name: string; alt: string; width: number }) {
  const [broken, setBroken] = useState(false)
  const height = Math.round(width * 1.5)
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width, height, borderRadius: MM.radius.card, border: "2px solid rgba(255,255,255,0.85)", background: "#232733", boxShadow: MM.shadowSoft }}
    >
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de pessoa (regra 4: <img> lazy)
        <img src={url} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[24px] font-bold" style={{ color: MM.gold }} aria-label={alt}>
          {(name.trim()[0] || "?").toUpperCase()}
        </span>
      )}
    </div>
  )
}

function Stars({ avg, small }: { avg: number; small?: boolean }) {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={small ? "h-3.5 w-3.5" : "h-4 w-4"} style={{ color: avg >= i - 0.25 ? MM.gold : MM.muted }} fill={avg >= i - 0.25 ? MM.gold : "none"} strokeWidth={1.6} />
      ))}
    </span>
  )
}

/** Botão da linha de ações: no celular o ícone vai em cima do texto (três cabem lado a lado). */
const actionClass = (compact: boolean) =>
  `inline-flex min-w-0 items-center justify-center rounded-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5BE70] ${
    compact ? "h-[42px] flex-col gap-0.5 px-1 text-[10px]" : "h-11 gap-1 px-1 text-[12.5px]"
  }`

function ActionLink({ href, icon, label, primary, compact }: { href: string | null; icon: React.ReactNode; label: string; primary?: boolean; compact: boolean }) {
  const cls = actionClass(compact)
  const style: React.CSSProperties = primary
    ? { background: href ? MM.rubyFill : "rgba(255,255,255,0.06)", border: `1px solid ${href ? MM.rubyBorder : MM.border}`, color: href ? "#fff" : MM.disabledText }
    : { border: `1px solid ${MM.borderStrong}`, color: href ? MM.text : MM.disabledText }
  if (!href)
    return (
      <span className={cls} style={style} aria-disabled="true">
        {icon}
        <span className="truncate">{label}</span>
      </span>
    )
  return (
    <a href={href} target="_blank" rel="noopener" className={cls} style={style}>
      {icon}
      <span className="truncate">{label}</span>
    </a>
  )
}
