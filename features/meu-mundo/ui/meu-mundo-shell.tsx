"use client"

// features/meu-mundo/ui/meu-mundo-shell.tsx — a CASCA do Meu Mundo (mm3d-09).
//
// Troca de ambiente (rua ↔ casa ↔ bairro visitado). Quem decide para onde o
// jogador vai é o SERVIDOR: a casca só pede (entrar, sair, aceitar, voltar) e
// monta o ambiente que voltou. Só existe UM ambiente 3D por vez — o anterior
// é desmontado (e descartado) quando o próximo chega; até lá ele continua de
// pé atrás da tela de transição, e uma falha devolve o jogador a ele.
//
// Convites e visitas chegam por mensagem da sala ("visits"), sem polling.

import { useCallback, useEffect, useRef, useState } from "react"
import { DoorOpen, Home, Loader2, Send, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import MeuMundoView, { BTN, SAFE } from "./meu-mundo-view"
import HouseView from "./house-view"
import {
  fetchAdminNeighborhood,
  getInviteCandidates,
  getVisits,
  postAccept,
  postCancel,
  postDecline,
  postEndVisit,
  postHouseEnter,
  postHouseExit,
  postInvite,
} from "../data"
import type { HousePayload, NeighborhoodPayload, ScenePayload, VisitState } from "../types"

const isHouse = (p: ScenePayload): p is HousePayload => (p as HousePayload).scene === "house"
const sceneKeyOf = (p: ScenePayload) =>
  (p as { sceneKey?: string }).sceneKey ?? (isHouse(p) ? `house:${p.house.id}` : `nb:${(p as NeighborhoodPayload).neighborhood.id}`)

export default function MeuMundoShell({ initial }: { initial: ScenePayload }) {
  const t = useTranslations("MeuMundo")
  const [scene, setScene] = useState<ScenePayload>(initial)
  // Conta as montagens: a mesma sala recarregada também remonta o 3D.
  const [mount, setMount] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [visits, setVisits] = useState<VisitState | null>(initial.visits ?? null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const busyRef = useRef(false)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4500)
  }, [])
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
  }, [])

  const apply = useCallback((p: ScenePayload) => {
    setScene(p)
    setMount((m) => m + 1)
    if (p.visits) setVisits(p.visits)
  }, [])

  /** Transição: tela por cima, pedido ao servidor, troca só no sucesso. */
  const run = useCallback(
    async (label: string, job: (token: string) => Promise<ScenePayload | null | { error: string }>) => {
      if (busyRef.current) return
      const token = getToken()
      if (!token) return
      busyRef.current = true
      setBusy(label)
      try {
        const r = await job(token)
        if (r && "error" in r) say(r.error)
        else if (r) apply(r)
      } finally {
        busyRef.current = false
        setBusy(null)
      }
    },
    [apply, say],
  )

  // O servidor levou o jogador para outro lugar (fim de visita, outra aba):
  // pergunta onde ele está agora. Ignorado durante uma transição nossa.
  const reload = useCallback(() => {
    if (busyRef.current) return
    void run(t("transMoving", "Mudando de lugar…"), async (token) => {
      const ac = new AbortController()
      const r = await fetchAdminNeighborhood(token, ac.signal)
      return r.ok ? r.payload : { error: t("transFailed", "Não deu para trocar de lugar. Tente de novo.") }
    })
  }, [run, t])

  const errText = useCallback(
    (r: { status: number; error: string }) => (r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error),
    [t],
  )

  const enterHouse = useCallback(
    (lot: number) =>
      void run(t("transEnter", "Entrando na casa…"), async (token) => {
        const r = await postHouseEnter(token, lot)
        return r.ok ? r.data : { error: errText(r) }
      }),
    [run, t, errText],
  )
  const exitHouse = useCallback(
    () =>
      void run(t("transExit", "Saindo para a rua…"), async (token) => {
        const r = await postHouseExit(token)
        return r.ok ? r.data : { error: errText(r) }
      }),
    [run, t, errText],
  )

  const onServerMessage = useCallback(
    (type: string, payload: unknown) => {
      if (type === "visits") setVisits(payload as VisitState)
      else if (type === "visit_ended") {
        const p = payload as { reason?: string; hostName?: string } | null
        say(t("visitEndedNotice", "A visita a {name} terminou.").replace("{name}", p?.hostName ?? ""))
      }
    },
    [say, t],
  )

  // Estado das visitas ao trocar de ambiente (a sala nova pode demorar a mandar).
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    getVisits(token).then((r) => alive && r.ok && setVisits(r.data))
    return () => {
      alive = false
    }
  }, [mount])

  // Relógio só para a contagem regressiva dos convites pendentes.
  const [now, setNow] = useState(() => Date.now())
  const [visitsAt, setVisitsAt] = useState(() => Date.now())
  useEffect(() => setVisitsAt(Date.now()), [visits])
  const hasPending = !!visits?.outgoing || (visits?.incoming.length ?? 0) > 0
  useEffect(() => {
    if (!hasPending) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasPending])
  const left = (ms: number) => {
    const s = Math.max(0, Math.round((ms - (now - visitsAt)) / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  }

  const incoming = visits?.incoming[0] ?? null
  const active = visits?.active ?? null
  const outgoing = visits?.outgoing ?? null

  const accept = useCallback(
    (id: string) => {
      const token = getToken()
      if (!token || busyRef.current) return
      void run(t("transVisit", "Indo para a casa do anfitrião…"), async () => {
        const r = await postAccept(token, id)
        if (!r.ok) return { error: errText(r) }
        if (r.data.visits) setVisits(r.data.visits)
        return r.data.stay ? null : (r.data.scene ?? null)
      })
    },
    [run, t, errText],
  )
  const decline = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) return
      const r = await postDecline(token, id)
      if (!r.ok) say(errText(r))
      const v = await getVisits(token)
      if (v.ok) setVisits(v.data)
    },
    [say, errText],
  )
  const cancel = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) return
      const r = await postCancel(token, id)
      if (!r.ok) say(errText(r))
      const v = await getVisits(token)
      if (v.ok) setVisits(v.data)
    },
    [say, errText],
  )
  const endVisit = useCallback(
    (id: string, guestLeaving: boolean) => {
      const token = getToken()
      if (!token) return
      if (!guestLeaving) {
        void postEndVisit(token, id).then((r) => {
          if (!r.ok) say(errText(r))
          else if (r.data.visits) setVisits(r.data.visits)
        })
        return
      }
      void run(t("transHome", "Voltando para casa…"), async () => {
        const r = await postEndVisit(token, id)
        if (!r.ok) return { error: errText(r) }
        if (r.data.visits) setVisits(r.data.visits)
        return r.data.scene ?? null
      })
    },
    [run, say, t, errText],
  )

  const overlayOpen = !!busy || inviteOpen || !!incoming
  const key = `${sceneKeyOf(scene)}#${mount}`

  return (
    <>
      {isHouse(scene) ? (
        <HouseView
          key={key}
          payload={scene}
          visits={visits}
          onExit={exitHouse}
          onOpenInvite={() => setInviteOpen(true)}
          onMoved={reload}
          onServerMessage={onServerMessage}
          blocked={overlayOpen}
        />
      ) : (
        <MeuMundoView
          key={key}
          payload={scene}
          visits={visits}
          onEnterHouse={enterHouse}
          onOpenInvite={() => setInviteOpen(true)}
          onMoved={reload}
          onServerMessage={onServerMessage}
          blocked={overlayOpen}
        />
      )}

      {/* Faixa da visita (convite enviado ou visita em andamento) */}
      {(active || outgoing) && !busy && (
        <div
          className="fl-sharp pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
          style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 92px)" }}
        >
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#F7F0D9] px-3 py-1.5 text-[11px] font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
            {active ? (
              active.role === "host" ? (
                <>
                  <Home className="h-4 w-4" />
                  {t("visitHostLine", "Visita de {name}").replace("{name}", active.guestName)}
                  <button type="button" onClick={() => endVisit(active.id, false)} className="ml-1 border-2 border-[#0B0B0D] bg-white px-2 py-0.5">
                    {t("endVisit", "Encerrar visita")}
                  </button>
                </>
              ) : (
                <>
                  <DoorOpen className="h-4 w-4" />
                  {t("visitingName", "Visitando {name}").replace("{name}", active.hostName)}
                  <button type="button" onClick={() => endVisit(active.id, true)} className="ml-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-0.5">
                    {t("backHome", "Voltar para casa")}
                  </button>
                </>
              )
            ) : outgoing ? (
              <>
                <Send className="h-4 w-4" />
                {t("outgoingLine", "Convite para {name} · {time}")
                  .replace("{name}", outgoing.guestName)
                  .replace("{time}", left(outgoing.expiresIn))}
                <button type="button" onClick={() => void cancel(outgoing.id)} className="ml-1 border-2 border-[#0B0B0D] bg-white px-2 py-0.5">
                  {t("cancelInvite", "Cancelar")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Convite recebido */}
      {incoming && !busy && (
        <div className="fl-sharp fixed inset-0 z-[75] flex items-end justify-center bg-black/40 sm:items-center" style={{ paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right }}>
          <div role="dialog" aria-modal="true" aria-labelledby="mm-incoming" className="w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">{t("inviteReceived", "Convite de visita")}</div>
            <h2 id="mm-incoming" className="mt-0.5 text-2xl font-black uppercase leading-none">
              {t("inviteFrom", "{name} te chamou").replace("{name}", incoming.hostName)}
            </h2>
            <p className="mt-2 text-sm">
              {t("inviteDesc", "Casa {n} · {nb}. O convite vale por {time}.")
                .replace("{n}", String(incoming.house).padStart(2, "0"))
                .replace("{nb}", incoming.neighborhoodName)
                .replace("{time}", left(incoming.expiresIn))}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" autoFocus onClick={() => accept(incoming.id)} className="inline-flex h-11 flex-1 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] px-3 text-sm font-black uppercase">
                {t("accept", "Aceitar")}
              </button>
              <button type="button" onClick={() => void decline(incoming.id)} className="inline-flex h-11 flex-1 items-center justify-center border-2 border-[#0B0B0D] bg-white px-3 text-sm font-bold uppercase">
                {t("decline", "Recusar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <InvitePanel
          onClose={() => setInviteOpen(false)}
          onSent={(v) => {
            setVisits(v)
            setInviteOpen(false)
          }}
        />
      )}

      {notice && !busy && (
        <div className="fl-sharp pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex justify-center px-4">
          <div role="status" className="border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 py-2 text-xs font-black uppercase text-[#F2B705] shadow-[3px_3px_0_0_#F2B705]">
            {notice}
          </div>
        </div>
      )}

      {/* Transição: por cima do ambiente atual, que só sai quando o próximo chega */}
      {busy && (
        <div className="fl-sharp fixed inset-0 z-[90] flex items-center justify-center bg-[#0B0B0D]/85 p-6">
          <div role="status" aria-live="polite" className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 py-3 text-sm font-black uppercase tracking-wider text-[#0B0B0D] shadow-[4px_4px_0_0_#F2B705]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy}
          </div>
        </div>
      )}
    </>
  )
}

function InvitePanel({ onClose, onSent }: { onClose: () => void; onSent: (v: VisitState) => void }) {
  const t = useTranslations("MeuMundo")
  const [list, setList] = useState<{ name: string; available: boolean; reason: string | null }[] | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [manual, setManual] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    getInviteCandidates(token).then((r) => {
      if (!alive) return
      if (r.ok) setList(r.data.candidates)
      else {
        setList([])
        setError(r.error)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const target = pick ?? (manual.trim() || null)
  const send = async () => {
    const token = getToken()
    if (!token || !target || sending) return
    setSending(true)
    setError(null)
    const r = await postInvite(token, target.replace(/^@/, ""))
    setSending(false)
    if (r.ok) onSent(r.data.visit)
    else setError(r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error)
  }

  return (
    <div
      className="fl-sharp fixed inset-0 z-[75] flex items-end justify-center bg-black/40 sm:items-center"
      style={{ paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="mm-invite" className="relative w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]">
        <button type="button" onClick={onClose} className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center" aria-label={t("close", "Fechar")}>
          <X className="h-5 w-5" />
        </button>
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">{t("inviteTitle", "Convidar para sua casa")}</div>
        <h2 id="mm-invite" className="mt-0.5 text-2xl font-black uppercase leading-none">
          {t("invite", "Convidar")}
        </h2>
        <p className="mt-2 text-xs">{t("inviteRule", "Uma visita por vez. O convite expira em 5 minutos.")}</p>

        <div className="mt-3 max-h-48 overflow-y-auto border-2 border-[#0B0B0D] bg-white">
          {list === null ? (
            <div className="flex items-center gap-2 p-3 text-xs font-bold uppercase">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingShort", "Carregando…")}
            </div>
          ) : list.length === 0 ? (
            <div className="p-3 text-xs">{t("inviteNoCandidates", "Ninguém conectado agora. Digite o @ de quem você quer chamar.")}</div>
          ) : (
            list.map((c) => (
              <button
                key={c.name}
                type="button"
                disabled={!c.available}
                onClick={() => {
                  setPick(c.name)
                  setManual("")
                }}
                className={`flex w-full items-center justify-between border-b border-[#0B0B0D]/15 px-3 py-2 text-left text-sm disabled:opacity-40 ${pick === c.name ? "bg-[#F2B705]" : ""}`}
              >
                <span className="font-bold">@{c.name}</span>
                {!c.available && <span className="text-[10px] uppercase">{t("inVisit", "Em visita")}</span>}
              </button>
            ))
          )}
        </div>
        <input
          value={manual}
          onChange={(e) => {
            setManual(e.target.value)
            setPick(null)
          }}
          placeholder={t("invitePlaceholder", "@usuario")}
          aria-label={t("invitePlaceholder", "@usuario")}
          className="mt-2 h-10 w-full border-2 border-[#0B0B0D] bg-white px-2 text-sm outline-none"
        />
        {error && <div className="mt-2 text-xs font-bold text-[#B91C1C]">{error}</div>}
        <button
          type="button"
          onClick={() => void send()}
          disabled={!target || sending}
          className={`mt-3 w-full justify-center ${BTN} disabled:opacity-40`}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {target ? t("inviteConfirm", "Convidar @{name}").replace("{name}", target.replace(/^@/, "")) : t("invite", "Convidar")}
        </button>
      </div>
    </div>
  )
}
