"use client"

// features/meu-mundo/ui/hall/hall-panel.tsx — B8 (2026-11-08): o HALL DAS LÂMINAS.
// As 10 cadeiras, quem do top do Poder ainda está fora, os meus desafios do dia e o
// histórico. "Desafiar" pede o ticket ao servidor (POST /hall/challenge) e entrega para a
// tela da luta (a LaminasView abre com o ticket pronto). A regra mora no servidor
// (MeuMundoHallService + utils/meuMundoHallLadder.js): aqui só se mostra e se pede.

import { useCallback, useEffect, useState } from "react"
import { Crown, Loader2, RefreshCw, Shield, Swords } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getHallBoard, postHallChallenge, type FightTicket, type HallBoard, type HallPerson } from "../../data"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { archivo, teko } from "../status/evo-skin"
import { faceOf } from "../portraits"

type Tr = (key: string, fallback: string) => string

export default function HallPanel({ onClose, onFight }: { onClose: () => void; onFight: (ticket: FightTicket, foe: string) => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const locale = useLocale()
  const [board, setBoard] = useState<HallBoard | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(false)
    const r = await getHallBoard(token)
    if (r.ok) setBoard(r.data)
    else setError(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const challenge = async (p: HallPerson) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(p.id)
    const r = await postHallChallenge(token, p.id)
    setBusy(null)
    if (!r.ok) {
      setNotice(r.error)
      void load()
      return
    }
    onFight(r.data.fight, p.name)
  }

  const fmt = (n: number) => Math.round(n).toLocaleString(locale)
  const canChallenge = (p: HallPerson) => !p.isMe && !p.cooldown && (board?.me.left ?? 0) > 0 && (board?.me.power ?? 0) > 0

  const person = (p: HallPerson, lead: React.ReactNode, extra: string | null) => (
    <div key={p.id} className="flex min-h-12 items-center gap-2.5 px-2.5 py-1.5" style={{ background: p.isMe ? MM.rubySoft : MM.card, border: `1px solid ${p.isMe ? MM.rubyBorder : MM.border}` }}>
      <span className={`${teko.className} flex w-9 shrink-0 items-center justify-center gap-0.5 text-[22px] leading-none tabular-nums`} style={{ color: MM.gold }}>
        {lead}
      </span>
      {p.body ? (
        // eslint-disable-next-line @next/next/no-img-element -- retrato local em lista (regra 4: <img> lazy)
        <img src={faceOf(p.body)} alt="" loading="lazy" decoding="async" draggable={false} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ background: "rgba(0,0,0,0.35)" }} />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }} aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className={`${archivo.className} block truncate text-[14px] font-semibold`} style={{ color: MM.text }}>
          {p.name}
          {p.isMe ? <span style={{ color: MM.gold }}> · {t("rkYou", "Você")}</span> : null}
        </span>
        <span className={`${archivo.className} block text-[11px]`} style={{ color: MM.muted }}>
          {t("hlPower", "Poder {n}").replace("{n}", fmt(p.power))}
          {extra ? ` · ${extra}` : ""}
        </span>
      </span>
      {!p.isMe && (
        <EvoButton
          variant="gold"
          size="sm"
          icon={busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          disabled={!canChallenge(p) || !!busy}
          onClick={() => void challenge(p)}
        >
          {p.cooldown ? t("hlCooldown", "Amanhã") : t("hlChallenge", "Desafiar")}
        </EvoButton>
      )}
    </div>
  )

  return (
    <EvoDialog fixed z="z-[78]" labelId="mm-hall" eyebrow={t("hlEyebrow", "Arena das Lâminas")} title={t("hlTitle", "Hall das Lâminas")} onClose={onClose} width="max-w-lg">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center" style={{ color: MM.muted }} role="alert">
          {t("hlLoadFail", "Não carregou o Hall.")}
          <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
            {t("ibRetry", "Tentar de novo")}
          </EvoButton>
        </div>
      ) : !board ? (
        <div className="grid min-h-48 place-items-center" style={{ color: MM.muted }}>
          <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />
        </div>
      ) : (
        <div className={`${archivo.className} grid gap-3`}>
          <p className="text-[13px] leading-snug" style={{ color: MM.muted }}>
            {t("hlIntro", "Desafie quem está numa cadeira do Hall ou no top do Poder. A ficha dele luta por ele, mesmo fora do jogo. Venceu quem está sentado: vocês trocam de cadeira.")}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold" style={{ color: MM.text }}>
            <span className="px-2 py-1" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
              {board.me.seat ? t("hlMySeat", "Sua cadeira: {n}").replace("{n}", String(board.me.seat)) : t("hlNoSeat", "Você está fora do Hall")}
            </span>
            <span className="px-2 py-1" style={{ background: MM.card, border: `1px solid ${board.me.left ? MM.border : MM.rubyBorder}` }}>
              {t("hlLeft", "Desafios hoje: {n} de {max}").replace("{n}", String(board.me.left)).replace("{max}", String(board.me.perDay))}
            </span>
          </div>
          {notice && (
            <p role="status" className="text-[13px]" style={{ color: MM.gold }}>
              {notice}
            </p>
          )}

          <section>
            <h3 className={`${teko.className} mb-1 text-[20px] uppercase tracking-wide`} style={{ color: MM.gold }}>
              {t("hlSeats", "As cadeiras")}
            </h3>
            <div className="grid gap-1.5">
              {Array.from({ length: board.seats }, (_, i) => i + 1).map((n) => {
                const p = board.hall.find((x) => x.seat === n)
                if (p) return person(p, n === 1 ? <><Crown className="h-3.5 w-3.5" aria-hidden />{n}</> : n, p.defenses === 1 ? t("hlDefense1", "1 defesa") : p.defenses ? t("hlDefenses", "{n} defesas").replace("{n}", String(p.defenses)) : null)
                return (
                  <div key={n} className="flex h-10 items-center gap-2.5 px-2.5 text-[13px]" style={{ background: "rgba(0,0,0,0.2)", border: `1px dashed ${MM.border}`, color: MM.muted }}>
                    <span className={`${teko.className} w-9 text-center text-[22px]`}>{n}</span>
                    {t("hlEmptySeat", "Vaga: vença alguém do top do Poder para sentar")}
                  </div>
                )
              })}
            </div>
          </section>

          {board.contenders.length > 0 && (
            <section>
              <h3 className={`${teko.className} mb-1 text-[20px] uppercase tracking-wide`} style={{ color: MM.gold }}>
                {t("hlContenders", "Top do Poder fora do Hall")}
              </h3>
              <div className="grid gap-1.5">{board.contenders.map((p) => person(p, p.position, null))}</div>
            </section>
          )}

          {board.history.length > 0 && (
            <section>
              <h3 className={`${teko.className} mb-1 text-[20px] uppercase tracking-wide`} style={{ color: MM.gold }}>
                {t("hlHistory", "Histórico")}
              </h3>
              <ul className="grid gap-1 text-[13px]">
                {board.history.map((h) => {
                  const mineWon = (h.role === "challenger") === (h.status === "won")
                  const text =
                    h.status === "open"
                      ? t("hlOpen", "Luta aberta contra {name}").replace("{name}", h.other)
                      : h.role === "challenger"
                        ? h.status === "won"
                          ? h.seatWon
                            ? t("hlTook", "Você venceu {name} e ficou com a cadeira {n}").replace("{name}", h.other).replace("{n}", String(h.seatWon))
                            : t("hlWonKept", "Você venceu {name}").replace("{name}", h.other)
                          : t("hlLostTo", "Você perdeu para {name}").replace("{name}", h.other)
                        : h.status === "won"
                          ? t("hlBeatenBy", "{name} venceu a sua ficha").replace("{name}", h.other)
                          : t("hlDefended", "Sua ficha defendeu contra {name}").replace("{name}", h.other)
                  return (
                    <li key={h.id} className="flex items-center gap-2" style={{ color: h.status === "open" ? MM.muted : mineWon ? MM.text : MM.muted }}>
                      {h.role === "defender" ? <Shield className="h-3.5 w-3.5 shrink-0" /> : <Swords className="h-3.5 w-3.5 shrink-0" />}
                      <span className="min-w-0 flex-1">{text}</span>
                      <span className="shrink-0 text-[11px]" style={{ color: MM.muted }}>
                        {new Date(h.at).toLocaleDateString(locale)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </EvoDialog>
  )
}
