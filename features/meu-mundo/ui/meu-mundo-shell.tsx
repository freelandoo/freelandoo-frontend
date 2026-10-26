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
// Sino, caixa de entrada, Itens e Poléns (mm3d-30) também moram aqui: a sala
// empurra "notice"; os painéis valem em todas as cenas.
// Chat (mm3d-32): o Global chega pela sala ("chat", já filtrado por bloqueio
// no servidor) e mora aqui para sobreviver à troca de cena; "say" é o balão
// sobre a cabeça de quem falou. O 1:1 é a conversa do /mensagens, aberta
// dentro do jogo (card do jogador, caixa de entrada ou nome no Global).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Backpack, DoorOpen, Home, Loader2, Mail, MessageCircle, Send } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useNavCounts } from "@/components/navigation/use-nav-counts"
import MeuMundoView from "./meu-mundo-view"
import { EvoButton, EvoDialog, EvoToast, type DrawerItem } from "./hud/hud-kit"
import { Chamfer, EVO, archivo } from "./status/evo-skin"
import { MM } from "./hud/tokens"
import HouseView from "./house-view"
import CenterView from "./center-view"
import StatusScreen from "./status/status-screen"
import { HospitalView } from "./place-view"
import { AmbulanceCurtain, useHospitalStay } from "./hospital-stay"
import NoticeStack from "./inbox/notice-stack"
import HudInbox from "./inbox/hud-inbox"
import InboxPanel, { type InboxView } from "./inbox/inbox-panel"
import ItemsPanel from "./items/items-panel"
import PolensSheet, { PolensReturn } from "./polens/polens-sheet"
import PlayerCard from "./player-card/player-card"
import ChatPanel, { type ChatView } from "./chat/chat-panel"
import { bubbleText, bumpUnread, confirmLine, dropPending, mergeLines, newClientId, pendingLine, type Line } from "./chat/chat-logic"
import type { PlayerTap } from "../engine/player-select"
import { compactFrameX, isCompactViewport } from "./player-card/place"
import {
  fetchAdminNeighborhood,
  getAccountProfileId,
  getChatGlobal,
  getInviteCandidates,
  getNoticeSummary,
  getVisits,
  postAccept,
  postCancel,
  postCenterEnter,
  postChatDirect,
  postChatGlobal,
  postChatReport,
  postCenterLeave,
  postDecline,
  postEndVisit,
  postHouseEnter,
  postHouseExit,
  postInvite,
  type ChatLine,
} from "../data"
import {
  BODY_IDS,
  type BodyId,
  type CenterPayload,
  type HousePayload,
  type InboxCounts,
  type LifeNeed,
  type MMNotice,
  type NeighborhoodPayload,
  type ScenePayload,
  type VisitState,
} from "../types"

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
  const [asleep, setAsleep] = useState(() => initial.life?.character.activity.kind === "sleeping")
  const [avatar, setAvatar] = useState<BodyId>(() => initial.life?.avatar ?? initial.me.body)
  const onLife = stay.onLife
  // Sino e caixa (mm3d-30): contadores do servidor + o que a sala empurrou.
  const [counts, setCounts] = useState<InboxCounts | null>(null)
  const [pushed, setPushed] = useState<MMNotice[]>([])
  const [inbox, setInbox] = useState<InboxView | null>(null)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [polensOpen, setPolensOpen] = useState(false)
  // Card de perfil de outro jogador (mm3d-31): um por vez; `dismiss` sobe no
  // toque no vazio do mundo (o card sai com a animação dele).
  // `frame` (celular): onde a câmera põe o boneco, na metade oposta à do card.
  const [playerCard, setPlayerCard] = useState<{ tap: PlayerTap; gone: boolean; dismiss: number; frame: number | null } | null>(null)
  // Chat (mm3d-32): linhas do Global (teto em chat-logic), não lidas e a vista aberta.
  const [chatView, setChatView] = useState<ChatView | null>(null)
  const [chatLines, setChatLines] = useState<Line[]>([])
  const [chatUnread, setChatUnread] = useState(0)
  // Perfil-conta de quem joga: o "ator" das conversas (do /users/me).
  const [actorId, setActorId] = useState<string | null>(null)
  const globalOpenRef = useRef(false)
  // Conversa 1:1 aberta agora (mm3d-33: com ela na tela a mensagem nova não vira aviso).
  const threadOpenRef = useRef<string | null>(null)
  // Balão 3D (Slice 5): a cena pronta preenche; sessão null = o meu boneco
  // (a sala não devolve o "say" para quem falou).
  const bubbleRef = useRef<((session: string | null, text: string) => void) | null>(null)
  const [actorFailed, setActorFailed] = useState(false)
  const nav = useNavCounts()
  const dmUnread = actorId ? (nav.conversationByActor[actorId] ?? 0) : 0
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

  // Ao entrar: os contadores e, no máximo, as 2 notificações frescas (10 min)
  // que ainda valem card — nunca a fila do tempo offline.
  const refreshCounts = useCallback(async (withFresh = false) => {
    const token = getToken()
    if (!token) return
    const r = await getNoticeSummary(token)
    if (!r.ok) return
    setCounts(r.data.counts)
    if (withFresh && r.data.fresh.length) setPushed((l) => [...l, ...r.data.fresh])
  }, [])
  useEffect(() => {
    void refreshCounts(true)
  }, [refreshCounts])

  const onServerMessage = useCallback(
    (type: string, payload: unknown) => {
      if (type === "chat") {
        const l = payload as ChatLine | null
        if (!l || typeof l.id !== "string") return
        setChatLines((cur) => mergeLines(cur, [l]))
        setChatUnread((n) => bumpUnread(n, l, globalOpenRef.current))
        return
      }
      if (type === "say") {
        const p = payload as { s?: string; t?: string } | null
        if (p && typeof p.s === "string" && typeof p.t === "string") bubbleRef.current?.(p.s, p.t)
        return
      }
      if (type === "dm") {
        // mm3d-33: 1:1 que chegou — só eu recebo. Balão em cima de quem falou
        // (se está na minha sala) e o aviso com o meu rosto, menos com a
        // conversa já aberta na tela.
        const p = payload as { s?: string | null; t?: string; c?: string; n?: string } | null
        if (!p || typeof p.t !== "string" || typeof p.c !== "string") return
        if (typeof p.s === "string") bubbleRef.current?.(p.s, p.t)
        if (threadOpenRef.current === p.c) return
        const at = new Date().toISOString()
        setPushed((l) => [
          ...l.slice(-30),
          { id: `dm:${p.c}:${at}`, kind: "dm", code: p.c!, priority: 3, data: { from: p.n || undefined, conversationId: p.c }, mailId: null, createdAt: at, read: false },
        ])
        return
      }
      if (type === "notice") {
        const n = payload as MMNotice | null
        if (!n || typeof n.id !== "string") return
        setPushed((l) => [...l.slice(-30), n])
        setCounts((c) =>
          c
            ? { notices: c.notices + 1, mail: c.mail + (n.mailId ? 1 : 0), gifts: c.gifts + (n.kind === "gift" ? 1 : 0) }
            : c,
        )
        return
      }
      if (type === "visits") setVisits(payload as VisitState)
      else if (type === "life") {
        const p = payload as { status?: string; activity?: string; needs?: LifeNeed[]; body?: string } | null
        if (typeof p?.activity === "string") setAsleep(p.activity === "sleeping")
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
  const panelOpen = !!inbox || itemsOpen || polensOpen || !!chatView
  const overlayOpen = !!busy || inviteOpen || !!incoming || !!statusBody || hospitalUp || panelOpen
  const openStatus = useCallback(() => setStatusBody(scene.me.body), [scene.me.body])
  const onCounts = useCallback((c: InboxCounts) => setCounts(c), [])
  const lifeChanged = useCallback(() => setLifeTick((n) => n + 1), [])

  // ═══ mm3d-32: chat ═══
  // Perfil-conta (ator das conversas): no começo e de novo ao abrir o chat ou
  // uma thread enquanto não veio. Falha = a thread mostra erro + "Tentar de novo".
  const actorRef = useRef<string | null>(null)
  const ensureActor = useCallback(() => {
    if (actorRef.current) return
    const token = getToken()
    if (!token) return
    setActorFailed(false)
    void getAccountProfileId(token).then((id) => {
      if (id) {
        actorRef.current = id
        setActorId(id)
      } else setActorFailed(true)
    })
  }, [])
  useEffect(() => {
    ensureActor()
  }, [ensureActor])
  const adoptActor = useCallback((id: string) => {
    if (actorRef.current) return
    actorRef.current = id
    setActorId(id)
  }, [])
  const showChat = useCallback(
    (v: ChatView | null) => {
      // O ref acompanha na hora: linha que chega no mesmo instante já sabe se o Global está à vista.
      globalOpenRef.current = v?.tab === "global"
      threadOpenRef.current = v?.tab === "thread" ? v.conversationId : null
      setChatView(v)
      if (v?.tab === "global") setChatUnread(0)
      if (v && v.tab !== "global") ensureActor()
    },
    [ensureActor],
  )
  const openChat = useCallback(
    (v: ChatView = { tab: "global" }) => {
      showChat(v)
      ensureActor()
      const token = getToken()
      if (!token) return
      void getChatGlobal(token).then((r) => {
        if (r.ok) setChatLines((cur) => mergeLines(cur, r.data.items))
      })
    },
    [showChat, ensureActor],
  )
  const chatErr = useCallback(
    (r: { status: number; error: string; code?: string }) =>
      r.status === 0
        ? t("chOffline", "Sem conexão. Tente de novo.")
        : r.code === "block"
        ? t("chBlocked", "Mensagem bloqueada.")
        : r.code === "mute_temp"
          ? t("chMuted", "Você está sem falar no chat por um tempo.")
          : r.code === "review"
            ? t("chReview", "Sua mensagem foi para revisão.")
            : errText(r),
    [t, errText],
  )
  const sendGlobal = useCallback(
    async (text: string) => {
      const token = getToken()
      if (!token) return false
      const clientId = newClientId()
      setChatLines((cur) => mergeLines(cur, [pendingLine(clientId, text)]))
      const r = await postChatGlobal(token, text)
      if (r.ok) {
        setChatLines((cur) => confirmLine(cur, clientId, r.data.line))
        // O meu balão: mesmo corte que o back usa no "say" dos outros.
        bubbleRef.current?.(null, bubbleText(r.data.line.text || text))
      } else {
        setChatLines((cur) => dropPending(cur, clientId))
        say(chatErr(r))
      }
      return r.ok
    },
    [say, chatErr],
  )
  /** Erro cru da thread 1:1 ("network" ou texto do servidor) na língua de quem joga. */
  const dmErr = useCallback((e: string) => (e === "network" ? t("chOffline", "Sem conexão. Tente de novo.") : e), [t])
  const reportLine = useCallback(
    (id: string) => {
      const token = getToken()
      if (!token) return
      void postChatReport(token, id).then((r) => say(r.ok ? t("chReported", "Denúncia enviada. Obrigado.") : errText(r)))
    },
    [say, t, errText],
  )
  /**
   * Acha/cria a conversa 1:1 e abre a thread no chat do jogo. O perfil-conta
   * vale de qualquer sala; a sessão só quando é o que se tem (e "gone" com um
   * perfil na mão tenta por ele).
   */
  const openDirect = useCallback(
    async (target: { session?: string | null; profileId?: string | null }, title: string) => {
      const token = getToken()
      if (!token) return
      const byProfile = target.profileId ? { profileId: target.profileId } : null
      const bySession = target.session ? { session: target.session } : null
      const first = byProfile ?? bySession
      if (!first) return
      let r = await postChatDirect(token, first)
      // "gone" por um caminho: tenta o outro, se houver.
      const other = first === byProfile ? bySession : byProfile
      if (!r.ok && r.code === "gone" && other) r = await postChatDirect(token, other)
      if (r.ok) showChat({ tab: "thread", conversationId: r.data.conversation.id_conversation, title })
      else say(r.code === "self" ? t("chSelf", "Esse é você") : r.code === "gone" ? t("pcGone", "Esse jogador não está mais aqui.") : chatErr(r))
    },
    [showChat, say, t, chatErr],
  )
  // Tecla T abre o chat (desktop). Campo editável e painel aberto ficam de fora.
  useEffect(() => {
    if (overlayOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyT" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.closest?.("[data-mm-panel]"))) return
      e.preventDefault()
      openChat()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [overlayOpen, openChat])

  const chatBadge = chatUnread + dmUnread
  // Entradas da gaveta (as três cenas): Chat, Itens e a caixa de entrada.
  const menuExtras: DrawerItem[] = useMemo(
    () => [
      {
        id: "chat",
        label: t("chTitle", "Chat"),
        hint: t("menuChatHint", "Global e conversas"),
        icon: <MessageCircle className="h-5 w-5" />,
        kind: "nav",
        badge: chatBadge ? String(chatBadge > 99 ? "99+" : chatBadge) : undefined,
        onSelect: () => openChat(),
      },
      { id: "items", label: t("itTitle", "Itens"), hint: t("menuItemsHint", "Comida, vestuário, veículos e casa"), icon: <Backpack className="h-5 w-5" />, kind: "nav", onSelect: () => setItemsOpen(true) },
      {
        id: "inbox",
        label: t("ibMailTitle", "Caixa de entrada"),
        hint: t("menuInboxHint", "Presentes, comunicados e compras"),
        icon: <Mail className="h-5 w-5" />,
        kind: "nav",
        badge: counts?.mail ? String(counts.mail > 99 ? "99+" : counts.mail) : undefined,
        onSelect: () => setInbox({ view: "mail", tab: counts?.gifts ? "gift" : "official" }),
      },
    ],
    [t, counts, chatBadge, openChat],
  )
  const suspended = hospitalUp
  const key = `${sceneKeyOf(scene)}#${mount}`
  // Outra cena = outras sessões: o card da anterior não vale mais.
  useEffect(() => setPlayerCard(null), [key])
  const onPlayerTap = useCallback((tap: PlayerTap | null) => {
    setPlayerCard((c) => {
      if (!tap) return c ? { ...c, dismiss: c.dismiss + 1 } : c
      if (c && c.tap.sessionId === tap.sessionId) return c
      const frame = isCompactViewport(window.innerWidth, window.innerHeight) ? compactFrameX(tap.box, window.innerWidth, window.innerHeight) : null
      return { tap, gone: false, dismiss: 0, frame }
    })
  }, [])
  const onPlayerGone = useCallback((sid: string) => setPlayerCard((c) => (c && c.tap.sessionId === sid ? { ...c, gone: true } : c)), [])
  // Só fecha o card DAQUELA sessão (a saída animada não pode fechar o próximo).
  const closePlayerCard = useCallback((sid: string) => setPlayerCard((c) => (c && c.tap.sessionId === sid ? null : c)), [])
  const scenePlayer = { selectedPlayer: playerCard?.tap.sessionId ?? null, selectedFrame: playerCard?.frame ?? null, onPlayerTap, onPlayerGone, sayRef: bubbleRef }

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
          menuExtras={menuExtras}
          {...scenePlayer}
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
          menuExtras={menuExtras}
          {...scenePlayer}
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
          menuExtras={menuExtras}
          {...scenePlayer}
        />
      )}

      {/* Internação (mm3d-26): ambulância, leito e — com a alta — a porta do hospital */}
      {stay.phase === "ambulance" && <AmbulanceCurtain />}
      {stay.phase && stay.phase !== "ambulance" && stay.info && (
        <HospitalView
          interior={stay.info.interior}
          bed={stay.info.bed}
          body={scene.me.body}
          look={scene.me.look}
          mode="patient"
          discharged={stay.phase === "discharged"}
          health={stay.info.life.character.vitals.health}
          dischargeAt={stay.info.dischargeAt}
          onExit={stay.close}
          onOpenStatus={() => setStatusBody(scene.me.body)}
        />
      )}

      {/* Notificações (mm3d-30): a fila segue mesmo escondida (STATUS, painel, sono) */}
      <NoticeStack
        needs={needs}
        needsTick={needsTick}
        pushed={pushed}
        body={avatar}
        below={active || outgoing ? 56 : 0}
        hidden={!!busy || !!statusBody || hospitalUp || asleep || panelOpen}
        onOpenStatus={openStatus}
        onOpenNotice={(n) => {
          // Mensagem (mm3d-33): "Responder" abre a conversa no chat do jogo.
          if (n.kind === "dm") {
            if (n.data.conversationId) showChat({ tab: "thread", conversationId: n.data.conversationId, title: n.data.from ?? t("chDms", "Conversas") })
            return
          }
          setInbox(n.mailId ? { view: "mail", tab: n.kind === "gift" ? "gift" : n.kind === "promo" ? "promo" : n.kind === "purchase" ? "receipt" : "official", open: n.mailId } : { view: "notices" })
        }}
      />
      {!overlayOpen && (
        <HudInbox
          counts={counts}
          onBell={() => setInbox({ view: "notices" })}
          onMail={() => setInbox({ view: "mail", tab: counts?.gifts ? "gift" : "official" })}
          chat={chatBadge}
          onChat={() => openChat()}
        />
      )}

      {/* Perfil de outro jogador (mm3d-31): fica até ser dispensado; some sob painéis e transições */}
      {playerCard && !overlayOpen && (
        <PlayerCard
          key={playerCard.tap.sessionId}
          tap={playerCard.tap}
          gone={playerCard.gone}
          dismiss={playerCard.dismiss}
          onClose={closePlayerCard}
          onMessage={(p) => {
            // Pelo perfil-conta quando há (vale mesmo se o jogador saiu da cena).
            if (p.viewerProfileId) adoptActor(p.viewerProfileId)
            setPlayerCard(null)
            void openDirect({ profileId: p.profileId, session: playerCard.gone ? null : p.sessionId }, p.displayName || p.name || playerCard.tap.name)
          }}
        />
      )}

      {statusBody && (
        <StatusScreen name={scene.me.name} body={statusBody} lifeTick={lifeTick} onClose={() => setStatusBody(null)} onOpenPolens={() => setPolensOpen(true)} />
      )}

      {inbox && (
        <InboxPanel
          initial={inbox}
          body={avatar}
          counts={counts}
          onCounts={onCounts}
          onClose={() => setInbox(null)}
          onOpenStatus={openStatus}
          onClaimed={lifeChanged}
          onOpenConversation={(id, title) => {
            setInbox(null)
            showChat({ tab: "thread", conversationId: id, title })
          }}
        />
      )}
      {chatView && (
        <ChatPanel
          token={getToken()}
          view={chatView}
          setView={showChat}
          lines={chatLines}
          actorId={actorId}
          actorFailed={actorFailed}
          onRetryActor={ensureActor}
          errLabel={dmErr}
          globalUnread={chatUnread}
          dmUnread={dmUnread}
          onSendGlobal={sendGlobal}
          onReport={reportLine}
          onDirectTo={(l) => void openDirect({ profileId: l.profileId, session: l.session }, l.name)}
          onClose={() => showChat(null)}
        />
      )}
      {itemsOpen && <ItemsPanel onClose={() => setItemsOpen(false)} onChanged={lifeChanged} />}
      {polensOpen && <PolensSheet onClose={() => setPolensOpen(false)} />}
      <PolensReturn onPaid={() => void refreshCounts()} />

      {/* Faixa da visita (convite enviado ou visita em andamento) */}
      {(active || outgoing) && !busy && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
          style={{ top: "max(12px, env(safe-area-inset-top))" }}
        >
          <Chamfer cut={14} fill={MM.surface} border={MM.rubyBorder} className="pointer-events-auto max-w-full" style={{ boxShadow: MM.shadow }}>
            <div className={`${archivo.className} flex flex-wrap items-center gap-2 py-1 pl-3.5 pr-1 text-[14px] font-semibold leading-tight max-[759px]:gap-1.5 max-[759px]:pl-2.5 max-[759px]:text-[13px]`} style={{ color: EVO.branco }}>
              {active ? (
                active.role === "host" ? (
                  <>
                    <Home className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                    <span>{t("visitHostLine", "Visita de {name}").replace("{name}", active.guestName)}</span>
                    <EvoButton variant="ghost" size="sm" onClick={() => endVisit(active.id, false)}>
                      {t("endVisit", "Encerrar visita")}
                    </EvoButton>
                  </>
                ) : (
                  <>
                    <DoorOpen className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                    <span>{t("visitingName", "Visitando {name}").replace("{name}", active.hostName)}</span>
                    <EvoButton variant="primary" size="sm" onClick={() => endVisit(active.id, true)}>
                      {t("backHome", "Voltar para casa")}
                    </EvoButton>
                  </>
                )
              ) : outgoing ? (
                <>
                  <Send className="h-4 w-4" style={{ color: EVO.douradoClaro }} />
                  <span>
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
          width="max-w-sm"
          footer={
            <>
              <EvoButton variant="primary" className="flex-1" autoFocus onClick={() => accept(incoming.id)}>
                {t("accept", "Aceitar")}
              </EvoButton>
              <EvoButton variant="gold" className="flex-1" onClick={() => void decline(incoming.id)}>
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
        <div className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          <EvoToast>{notice}</EvoToast>
        </div>
      )}

      {/* Transição: por cima do ambiente atual, que só sai quando o próximo chega */}
      {busy && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(8,10,14,0.86)" }}>
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
      <div className="mt-3 max-h-48 overflow-y-auto rounded-[14px]" style={{ border: `1px solid ${MM.border}`, background: MM.card }}>
        {list === null ? (
          <div className={`${archivo.className} flex items-center gap-2 p-3 text-[14px] font-semibold max-[759px]:p-2.5 max-[759px]:text-[13px]`}>
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
              className="flex w-full items-center justify-between border-b px-3 py-2 text-left disabled:opacity-40 max-[759px]:min-h-9 max-[759px]:py-1.5"
              style={{ borderColor: EVO.linha, background: pick === c.name ? MM.rubySoft : undefined }}
            >
              <span className="font-bold">@{c.name}</span>
              {!c.available && <span className={`${archivo.className} text-[12px] font-semibold max-[759px]:text-[11px]`}>{t("inVisit", "Em visita")}</span>}
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
        className="mt-2 h-11 w-full rounded-[12px] px-3 text-sm outline-none placeholder:text-[#8d939c] focus-visible:ring-2 focus-visible:ring-[#E5BE70]"
        style={{ background: "rgba(0,0,0,0.35)", color: EVO.branco, border: `1px solid ${MM.border}` }}
      />
      {error && (
        <div className="mt-2 text-xs font-bold" style={{ color: EVO.perigo }}>
          {error}
        </div>
      )}
    </EvoDialog>
  )
}
