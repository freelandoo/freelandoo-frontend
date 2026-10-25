"use client"

// features/meu-mundo/ui/meu-mundo-shell.tsx — a CASCA do Meu Mundo (mm3d-09).
//
// Troca de ambiente (rua ↔ casa ↔ bairro visitado ↔ centro da cidade, mm3d-17). Quem decide para onde o
// jogador vai é o SERVIDOR: a casca só pede (entrar, sair, aceitar, voltar) e
// monta o ambiente que voltou. Só existe UM ambiente 3D por vez — o anterior
// é desmontado (e descartado) quando o próximo chega; até lá ele continua de
// pé atrás da tela de transição, e uma falha devolve o jogador a ele.
//
// Convites e visitas chegam por mensagem da sala ("visits"), sem polling.
// Internação (mm3d-26): a vida diz "hospital" pela sala ("life") e a casca
// cobre o ambiente com a ambulância e o leito — o ambiente fica suspenso por
// baixo, ligado à sala, que é por onde a alta chega.
// Avisos com retrato (mm3d-28): as necessidades vêm no mesmo "life" e o balão
// mora aqui, então a memória do que já foi dito sobrevive à troca de cena.

import { useCallback, useEffect, useRef, useState } from "react"
import { DoorOpen, Home, Loader2, Send } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import MeuMundoView from "./meu-mundo-view"
import { EvoButton, EvoDialog, EvoToast } from "./hud/hud-kit"
import { Chamfer, EVO, teko } from "./status/evo-skin"
import HouseView from "./house-view"
import CenterView from "./center-view"
import StatusScreen from "./status/status-screen"
import { HospitalView } from "./hospital-view"
import { AmbulanceCurtain, useHospitalStay } from "./hospital-stay"
import NeedsBubble from "./needs/needs-bubble"
import {
  fetchAdminNeighborhood,
  getInviteCandidates,
  getVisits,
  postAccept,
  postCancel,
  postCenterEnter,
  postCenterLeave,
  postDecline,
  postEndVisit,
  postHouseEnter,
  postHouseExit,
  postInvite,
} from "../data"
import { BODY_IDS, type BodyId, type CenterPayload, type HousePayload, type LifeNeed, type NeighborhoodPayload, type ScenePayload, type VisitState } from "../types"

const isHouse = (p: ScenePayload): p is HousePayload => (p as HousePayload).scene === "house"
const isCenter = (p: ScenePayload): p is CenterPayload => (p as CenterPayload).scene === "center"
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
  // Tela de STATUS do hóspede (mm3d-13): o corpo em cena vai para o retrato.
  const [statusBody, setStatusBody] = useState<BodyId | null>(null)
  const [lifeTick, setLifeTick] = useState(0)
  const stay = useHospitalStay(initial.life)
  // Necessidades (mm3d-28): a do login sai do payload; depois, de cada "life".
  const [needs, setNeeds] = useState<LifeNeed[]>(() => initial.life?.character.needs ?? [])
  const [needsTick, setNeedsTick] = useState(0)
  const [avatar, setAvatar] = useState<BodyId>(() => initial.life?.avatar ?? initial.me.body)
  const onLife = stay.onLife
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

  // Centro da cidade (mm3d-17): ir (da rua) e voltar para casa. O servidor
  // reserva a sala do centro ANTES de soltar o bairro; falha = fica onde está.
  const goCenter = useCallback(
    () =>
      void run(t("transCenter", "Indo ao centro…"), async (token) => {
        const r = await postCenterEnter(token)
        return r.ok
          ? r.data
          : {
              error:
                r.code === "visiting"
                  ? t("centerVisiting", "Encerre a visita antes de ir ao centro.")
                  : r.code === "moving"
                    ? t("vehicleMoving", "Pare primeiro.")
                    : errText(r),
            }
      }),
    [run, t, errText],
  )
  const goHome = useCallback(
    () =>
      void run(t("transCenterHome", "Voltando para casa…"), async (token) => {
        const r = await postCenterLeave(token)
        return r.ok ? r.data : { error: r.code === "moving" ? t("vehicleMoving", "Pare primeiro.") : errText(r) }
      }),
    [run, t, errText],
  )

  const onServerMessage = useCallback(
    (type: string, payload: unknown) => {
      if (type === "visits") setVisits(payload as VisitState)
      else if (type === "life") {
        const p = payload as { status?: string; needs?: LifeNeed[]; body?: string } | null
        setLifeTick((n) => n + 1)
        onLife(p?.status)
        if (Array.isArray(p?.needs)) {
          setNeeds(p.needs)
          setNeedsTick((n) => n + 1)
        }
        if (p?.body && (BODY_IDS as string[]).includes(p.body)) setAvatar(p.body as BodyId)
      }
      else if (type === "visit_ended") {
        const p = payload as { reason?: string; hostName?: string } | null
        say(t("visitEndedNotice", "A visita a {name} terminou.").replace("{name}", p?.hostName ?? ""))
      } else if (type === "car_denied") {
        const r = (payload as { reason?: string } | null)?.reason
        say(
          r === "blocked"
            ? t("carExitBlocked", "Não há espaço para descer aqui. Pare num lugar mais livre.")
            : r === "moving"
              ? t("vehicleMoving", "Pare primeiro.")
              : r === "spot_busy"
                ? t("carSpotBusy", "A vaga da casa está ocupada agora.")
              : r === "cooldown"
                ? t("carCooldown", "Espere alguns segundos para recuperar de novo.")
                : r === "far"
              ? t("vehicleTooFar", "Chegue mais perto.")
              : r === "busy"
                ? t("vehicleBusy", "Alguém já está usando.")
                : r === "not_owner"
                  ? t("carNotOwner", "Só o morador da casa usa este carro.")
                  : t("vehicleUnavailable", "Não está disponível agora."),
        )
      }
    },
    [say, t, onLife],
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

  // Hospital por cima só quando ele abriu de fato (a planta chegou): sem a
  // rota no ar, o jogo segue normal em vez de ficar parado embaixo do nada.
  const hospitalUp = stay.phase === "ambulance" || (!!stay.phase && !!stay.info)
  const overlayOpen = !!busy || inviteOpen || !!incoming || !!statusBody || hospitalUp
  const suspended = hospitalUp
  const key = `${sceneKeyOf(scene)}#${mount}`

  return (
    <>
      {isCenter(scene) ? (
        <CenterView
          key={key}
          payload={scene}
          visits={visits}
          onGoHome={goHome}
          onMoved={reload}
          onServerMessage={onServerMessage}
          blocked={overlayOpen}
          onOpenStatus={setStatusBody}
          suspended={suspended}
        />
      ) : isHouse(scene) ? (
        <HouseView
          key={key}
          payload={scene}
          visits={visits}
          onExit={exitHouse}
          onOpenInvite={() => setInviteOpen(true)}
          onMoved={reload}
          onServerMessage={onServerMessage}
          blocked={overlayOpen}
          onOpenStatus={setStatusBody}
          suspended={suspended}
        />
      ) : (
        <MeuMundoView
          key={key}
          payload={scene}
          visits={visits}
          onEnterHouse={enterHouse}
          onGoCenter={goCenter}
          onOpenInvite={() => setInviteOpen(true)}
          onMoved={reload}
          onServerMessage={onServerMessage}
          blocked={overlayOpen}
          onOpenStatus={setStatusBody}
          suspended={suspended}
        />
      )}

      {/* Internação (mm3d-26): ambulância, leito e — com a alta — a porta do hospital */}
      {stay.phase === "ambulance" && <AmbulanceCurtain />}
      {stay.phase && stay.phase !== "ambulance" && stay.info && (
        <HospitalView
          interior={stay.info.interior}
          bed={stay.info.bed}
          body={scene.me.body}
          mode="patient"
          discharged={stay.phase === "discharged"}
          health={stay.info.life.character.vitals.health}
          dischargeAt={stay.info.dischargeAt}
          onExit={stay.close}
          onOpenStatus={() => setStatusBody(scene.me.body)}
        />
      )}

      {!busy && !statusBody && !hospitalUp && <NeedsBubble needs={needs} tick={needsTick} body={avatar} onOpenStatus={() => setStatusBody(scene.me.body)} />}

      {statusBody && (
        <StatusScreen name={scene.me.name} body={statusBody} lifeTick={lifeTick} onClose={() => setStatusBody(null)} />
      )}

      {/* Faixa da visita (convite enviado ou visita em andamento) */}
      {(active || outgoing) && !busy && (
        <div
          className="fl-sharp pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
          style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 100px)" }}
        >
          <Chamfer cut={10} border="#ff5fae" width={1.5} className="pointer-events-auto max-w-full">
            <div className={`${teko.className} flex flex-wrap items-center gap-2 py-1 pl-3 pr-1 text-[18px] font-medium uppercase leading-none tracking-[0.08em]`} style={{ color: EVO.branco }}>
              {active ? (
                active.role === "host" ? (
                  <>
                    <Home className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                    <span className="pt-[3px]">{t("visitHostLine", "Visita de {name}").replace("{name}", active.guestName)}</span>
                    <EvoButton variant="ghost" size="sm" onClick={() => endVisit(active.id, false)}>
                      {t("endVisit", "Encerrar visita")}
                    </EvoButton>
                  </>
                ) : (
                  <>
                    <DoorOpen className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                    <span className="pt-[3px]">{t("visitingName", "Visitando {name}").replace("{name}", active.hostName)}</span>
                    <EvoButton variant="primary" size="sm" onClick={() => endVisit(active.id, true)}>
                      {t("backHome", "Voltar para casa")}
                    </EvoButton>
                  </>
                )
              ) : outgoing ? (
                <>
                  <Send className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                  <span className="pt-[3px]">
                    {t("outgoingLine", "Convite para {name} · {time}")
                      .replace("{name}", outgoing.guestName)
                      .replace("{time}", left(outgoing.expiresIn))}
                  </span>
                  <EvoButton variant="ghost" size="sm" onClick={() => void cancel(outgoing.id)}>
                    {t("cancelInvite", "Cancelar")}
                  </EvoButton>
                </>
              ) : null}
            </div>
          </Chamfer>
        </div>
      )}

      {/* Convite recebido */}
      {incoming && !busy && (
        <EvoDialog
          fixed
          z="z-[75]"
          labelId="mm-incoming"
          eyebrow={t("inviteReceived", "Convite de visita")}
          title={t("inviteFrom", "{name} te chamou").replace("{name}", incoming.hostName)}
          kanjiMark="居"
          width="max-w-sm"
          footer={
            <>
              <EvoButton variant="primary" className="flex-1" autoFocus onClick={() => accept(incoming.id)}>
                {t("accept", "Aceitar")}
              </EvoButton>
              <EvoButton variant="ghost" className="flex-1" onClick={() => void decline(incoming.id)}>
                {t("decline", "Recusar")}
              </EvoButton>
            </>
          }
        >
          <p>
            {t("inviteDesc", "Casa {n} · {nb}. O convite vale por {time}.")
              .replace("{n}", String(incoming.house).padStart(2, "0"))
              .replace("{nb}", incoming.neighborhoodName)
              .replace("{time}", left(incoming.expiresIn))}
          </p>
        </EvoDialog>
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
          <EvoToast>{notice}</EvoToast>
        </div>
      )}

      {/* Transição: por cima do ambiente atual, que só sai quando o próximo chega */}
      {busy && (
        <div className="fl-sharp fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(8,7,11,0.86)" }}>
          <EvoToast tone="magenta" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
            {busy}
          </EvoToast>
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
    <EvoDialog
      fixed
      z="z-[75]"
      labelId="mm-invite"
      eyebrow={t("inviteTitle", "Convidar para sua casa")}
      title={t("invite", "Convidar")}
      kanjiMark="居"
      onClose={onClose}
      width="max-w-sm"
      footer={
        <EvoButton
          variant="primary"
          className="w-full"
          onClick={() => void send()}
          disabled={!target || sending}
          icon={sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        >
          {target ? t("inviteConfirm", "Convidar @{name}").replace("{name}", target.replace(/^@/, "")) : t("invite", "Convidar")}
        </EvoButton>
      }
    >
      <p style={{ color: EVO.mudo }}>{t("inviteRule", "Uma visita por vez. O convite expira em 5 minutos.")}</p>
      <div className="mt-3 max-h-48 overflow-y-auto" style={{ boxShadow: `inset 0 0 0 1px ${EVO.linhaForte}`, background: "rgba(0,0,0,0.35)" }}>
        {list === null ? (
          <div className={`${teko.className} flex items-center gap-2 p-3 text-[17px] uppercase tracking-[0.1em]`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingShort", "Carregando…")}
          </div>
        ) : list.length === 0 ? (
          <div className="p-3" style={{ color: EVO.mudo }}>
            {t("inviteNoCandidates", "Ninguém conectado agora. Digite o @ de quem você quer chamar.")}
          </div>
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
              className="flex w-full items-center justify-between border-b px-3 py-2 text-left disabled:opacity-40"
              style={{ borderColor: EVO.linha, background: pick === c.name ? "linear-gradient(90deg, rgba(158,0,66,0.9), rgba(242,13,115,0.8))" : undefined }}
            >
              <span className="font-bold">@{c.name}</span>
              {!c.available && <span className={`${teko.className} text-[14px] uppercase tracking-[0.1em]`}>{t("inVisit", "Em visita")}</span>}
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
        className="mt-2 h-10 w-full px-2 text-sm outline-none placeholder:text-[#a39aa3]"
        style={{ background: "rgba(0,0,0,0.45)", color: EVO.branco, boxShadow: `inset 0 0 0 1.5px ${EVO.dourado}99` }}
      />
      {error && (
        <div className="mt-2 text-xs font-bold" style={{ color: EVO.perigo }}>
          {error}
        </div>
      )}
    </EvoDialog>
  )
}
