// features/meu-mundo/engine/game.ts
//
// Ciclo de vida do Meu Mundo 3D: cria o motor, monta o bairro (ou o Centro da
// cidade, mm3d-17 — mesma física, mesma rede, outro mundo), conecta à sala,
// roda UM laço de renderização e, ao sair, desmonta tudo que criou.
//
// Esta peça não sabe nada de React nem da Freelandoo: recebe um canvas, o
// payload do bairro e callbacks. É isso que permite levar as regras do jogo
// para um aplicativo depois sem reescrever o mundo.
//
// ═══ O QUE O DESCARTE GARANTE ═══
// Ao sair: a conexão é encerrada (e reconexões pendentes canceladas), o laço
// para, os ouvintes saem (um AbortController só), o observador de tamanho
// desconecta, avatares, animações, texturas, a cena e o motor são descartados
// e nenhum callback é chamado depois disso. `liveGames()` conta quantas
// instâncias estão de pé — entrar e sair várias vezes deixa zero ou um.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildWorld } from "./world"
import { buildCenterWorld, type CenterLabels } from "./center-world"
import { Character, LocalPlayer, RemotePlayer } from "./player"
import { AvatarLibrary } from "./avatars"
import { FollowCamera } from "./camera"
import { NetClient } from "./net"
import { MOTION, RIDE_KINDS, kindOfId, lerpAngle, paceSpeeds, type Intent, type MoveState, type RideKind } from "./motion"
import { CarFleet, type CarPose } from "./cars"
import { placeRider } from "./ride"
import { STEP, MAX_STEPS, IDLE_DRIVE, createVehicle, stepVehicle, paramsFor, sanitizeTuning, type Tuning, type VehicleState } from "./vehicle"
import { CarReconciler } from "./car-sync"
import { ResolutionGovernor, resolveQuality, type QualityChoice, type QualityProfile } from "./quality"
import { attachInput, clearInput, createInputState, driveAxis, moveAxis, wantsRun, type InputState } from "./input"
import {
  BODY_IDS,
  type BodyId,
  type CenterPayload,
  type GameStats,
  type HouseVisual,
  type Interactable,
  type MultiplayerSession,
  type NeighborhoodPayload,
  type NetStatus,
} from "../types"

let live = 0
export const liveGames = () => live

/**
 * Conta mais um jogo vivo (bairro OU interior) e devolve a função que o
 * desconta. `window.__mmLiveGames()` confere que trocar de ambiente não
 * acumula motores: o número fica em 0 ou 1.
 */
export function liveGamesBump() {
  live++
  ;(window as unknown as { __mmLiveGames?: () => number }).__mmLiveGames = liveGames
  let done = false
  return () => {
    if (done) return
    done = true
    live--
  }
}
liveGamesBump.count = liveGames

export interface GameOptions {
  canvas: HTMLCanvasElement
  /** Rua de um bairro ou o Centro da cidade (mm3d-17). */
  payload: NeighborhoodPayload | CenterPayload
  exitLabel: string
  /** Centro: nomes já traduzidos para os letreiros. */
  centerLabels?: CenterLabels
  /** Teto da resolução interna (pixels de tela por pixel CSS). */
  maxPixelRatio?: number
  fetchSession: () => Promise<(MultiplayerSession & { sceneKey?: string }) | null>
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  onInteract?: (item: Interactable) => void
  onStats?: (stats: GameStats) => void
  onError?: (reason: "context-lost") => void
  onNet?: (status: NetStatus) => void
  /** Jogadores conectados neste bairro (inclui você). */
  onOnline?: (count: number) => void
  onBody?: (body: BodyId) => void
  /** Titulares do bairro (permanentes), atualizado pela sala. */
  onResidents?: (count: number) => void
  /** Casa de um lote: nível confirmado × exibido, carregamento e falha. */
  onHouseVisual?: (v: HouseVisual) => void
  /** Mensagens de visita vindas da sala (convites, fim de visita). */
  onServerMessage?: (type: string, payload: unknown) => void
  /** Entrou (lote do carro) ou saiu (0) do carro — confirmado pela sala. */
  onDriving?: (lot: number) => void
  /**
   * Montado numa bike, skate ou patins (mm3d-15): esta casa aceita a pessoa
   * entrando com ele? (a própria, ou a visitada). O carro nunca entra.
   */
  canRideInto?: (it: Interactable) => boolean
}

export interface GameHandle {
  input: InputState
  /** Joystick virtual do celular: x = direita, y = frente, módulo até 1. */
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  /** Para de desenhar (um minijogo cobre a tela, mm3d-20); a sala e a presença seguem. */
  setSuspended: (on: boolean) => void
  interact: () => void
  /** Recoloca a câmera atrás do personagem (não move o personagem). */
  recenter: () => void
  reconnect: () => void
  /** Nível confirmado pelo servidor (resposta HTTP); a sala confirma de novo. */
  applyHouseLevel: (lot: number, level: number, rev: number) => void
  retryHouse: (lot: number) => void
  houseVisual: (lot: number) => HouseVisual | null
  setStatsEnabled: (on: boolean) => void
  /** Botão de direção do celular apertado/solto (cada um com o próprio dedo). */
  setTouchDrive: (key: "left" | "right" | "gas" | "brake" | "hb", on: boolean) => void
  /** Ajuste de dirigibilidade (painel do administrador); null = padrão. */
  setTuning: (t: Tuning | null) => void
  /** Pede à sala para devolver o carro preso à vaga da casa. */
  recoverCar: () => void
  /** Descer do veículo (o E pode estar apontando para a casa). */
  leaveVehicle: () => void
  /** Qualidade gráfica escolhida na gaveta (mm3d-19). */
  setQuality: (c: QualityChoice) => void
  dispose: () => void
}

const SKY = new Color3(0.66, 0.83, 0.95)
const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

export function createMeuMundoGame(opts: GameOptions): GameHandle {
  const { canvas, payload } = opts
  const centerP = (payload as CenterPayload).scene === "center" ? (payload as CenterPayload) : null
  const nb = centerP ? null : (payload as NeighborhoodPayload).neighborhood
  const speeds = {
    walk: payload.motion?.walkSpeed ?? MOTION.WALK_SPEED,
    run: payload.motion?.runSpeed ?? MOTION.RUN_SPEED,
  }
  const limit = centerP ? centerP.center.limit : (nb!.limit ?? 70)
  const engine = new Engine(
    canvas,
    true,
    { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" },
    false,
  )
  const unlive = liveGamesBump()
  let disposed = false

  // Qualidade (mm3d-19): resolução que se ajusta ao FPS medido; neblina,
  // horizonte e detalhe dos outros jogadores pelo perfil do aparelho.
  let quality: QualityProfile = resolveQuality()
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  scene.clearColor = new Color4(SKY.r, SKY.g, SKY.b, 1)
  scene.ambientColor = new Color3(0.2, 0.2, 0.22)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = SKY
  scene.fogStart = quality.fogStart
  scene.fogEnd = quality.fogEnd
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  scene.autoClear = true

  const hemi = new HemisphericLight("mm-hemi", new Vector3(0.25, 1, 0.15), scene)
  hemi.intensity = 0.78
  hemi.groundColor = new Color3(0.5, 0.48, 0.55)
  const sun = new DirectionalLight("mm-sun", new Vector3(-0.55, -1, -0.35), scene)
  sun.intensity = 0.55

  const world = centerP
    ? buildCenterWorld(scene, centerP.center, opts.centerLabels ?? { place: (p) => p.id, portal: opts.exitLabel })
    : buildWorld(scene, nb!, opts.exitLabel, (v) => {
        if (!disposed) opts.onHouseVisual?.(v)
      })
  // Na rua, os avatares também trazem as poses de bike, skate e patins (mm3d-14).
  const lib = new AvatarLibrary(scene, false, true, quality.avatarLod)
  // Carros (mm3d-11): desenhados a partir do estado da sala.
  const fleet = new CarFleet(scene)
  /** Id do veículo que você usa (0 = a pé; mm3d-14: 1–80). Quem decide é a sala. */
  let driving = 0
  let drivingKind: RideKind = "car"
  // ── Carro previsto (mm3d-12) ──
  // A física roda aqui em passo fixo (vehicle.ts, espelho do servidor); a
  // apresentação interpola entre o passo anterior e o atual (alpha), e a
  // previsão converge suavemente para o estado da sala.
  let veh: VehicleState | null = null
  const prevPose = { x: 0, z: 0, yaw: 0 }
  let tune: Tuning | null = null
  let serverErr = 0
  const recon = new CarReconciler()
  const pose: CarPose = { x: 0, z: 0, facing: 0, sp: 0, st: 0, hb: 0, sl: 0, ax: 0, ay: 0 }
  // Só em desenvolvimento: o teste de navegador pode comandar o carro com
  // valores proporcionais a cada quadro (a física, a sala e o desenho são os
  // reais). Fora do build de produção.
  const devDrive: { current: import("./vehicle").DriveInput | null } = { current: null }
  if (process.env.NODE_ENV !== "production") {
    ;(window as unknown as { __mmDriveOverride?: (d: import("./vehicle").DriveInput | null) => void }).__mmDriveOverride = (d) => {
      devDrive.current = d
    }
  }

  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const mats = { fallback: fallbackMat, shadow: shadowMat }

  const home = centerP
    ? { x: centerP.center.arrival.x, z: centerP.center.arrival.z, rotationY: centerP.center.arrival.facing }
    : (payload as NeighborhoodPayload).me.home
  let myBody: BodyId = isBody(payload.me.body) ? payload.me.body : "normal"
  const local = new LocalPlayer(new Character(scene, lib, mats, myBody, null, true), home.x, home.z, home.rotationY)
  // Conferência (como __mmHouse): onde estou e se estou dirigindo.
  const probe = () => ({
    x: local.x,
    z: local.z,
    driving,
    car: veh ? { yaw: veh.yaw, u: veh.u, steer: veh.steer, slip: veh.slip, beta: veh.beta, hb: veh.hb, gear: veh.gear } : null,
    cars: fleet.debug(),
    fov: follow.camera.fov,
    live,
    meshes: scene.meshes.length,
    fps: engine.getFps(),
    srv: (() => {
      const c = driving ? net.cars()?.get(String(driving)) : null
      return c ? { x: c.x, z: c.z, facing: c.facing, sp: c.sp ?? 0, driver: c.driver } : null
    })(),
    serverErr,
  })
  ;(window as unknown as { __mmStreet?: typeof probe }).__mmStreet = probe
  const follow = new FollowCamera(scene)
  follow.camera.maxZ = quality.maxZ
  scene.activeCamera = follow.camera
  follow.snapBehind(home.x, home.z, home.rotationY)
  follow.update(1, local.x, local.z, world.viewBoxes)

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  // ── Rede ──────────────────────────────────────────────────────────────────
  const remotes = new Map<string, RemotePlayer>()
  let welcomed = false
  let onlineCount = -1
  // Ritmo do MEU corpo (mm3d-13), vindo da sala: cansado anda mais devagar.
  let myPace = 1
  let residentCount = nb?.residents ?? 0
  const net = new NetClient({
    onStatus: (s) => {
      if (disposed) return
      opts.onNet?.(s)
      if (s !== "online") for (const [, r] of remotes) r.dispose()
      if (s !== "online") remotes.clear()
    },
    onWelcome: (p) => {
      if (disposed) return
      // Primeira entrada: o servidor decide onde você nasce. Reconexão: só
      // corrige se a diferença for grande (a predição local já está perto).
      const far = Math.hypot(p.x - local.x, p.z - local.z) > 3
      if (!welcomed || far) {
        local.teleport(p.x, p.z, p.facing)
        if (!welcomed) follow.snapBehind(p.x, p.z, p.facing)
      }
      welcomed = true
    },
    onMoved: (p) => {
      if (disposed) return
      local.teleport(p.x, p.z, p.facing)
      if (typeof p.car === "number") {
        // Entrar, sair ou recuperar: a sala decide onde o carro está.
        if (p.car && p.car === driving) {
          veh = createVehicle(p.x, p.z, p.facing)
          Object.assign(prevPose, { x: p.x, z: p.z, yaw: p.facing })
          recon.reset()
        }
        setDriving(p.car, p)
      } else follow.snapBehind(p.x, p.z, p.facing)
    },
    fetchSession: opts.fetchSession,
    sceneKey: payload.sceneKey,
    onMessage: (type, p) => {
      if (disposed) return
      // A sala confirmou os ajustes (já limitados às faixas): a previsão usa os mesmos.
      if (type === "tuned") {
        const t = sanitizeTuning((p || {}) as Tuning)
        tune = Object.keys(t).length ? t : null
      }
      opts.onServerMessage?.(type, p)
    },
  })
  const mp = payload.multiplayer
  if (mp && "reservation" in mp) void net.connect(mp)
  else void net.retry()

  const syncNetwork = (now: number, intent: Intent) => {
    net.sendIntent(intent, now)
    const players = net.players()
    const me = net.sessionId
    if (!players || net.status !== "online") {
      if (onlineCount !== 1) {
        onlineCount = 1
        opts.onOnline?.(1)
      }
      return
    }
    // Nível das casas: a sala é a fonte (revisão maior vence; o mundo ignora
    // o que já aplicou, então ler todo quadro custa 20 comparações).
    net.houses()?.forEach((h, key) => world.applyLevel(Number(key), h.level, h.rev))
    const residents = net.residents()
    if (residents !== null && residents !== residentCount) {
      residentCount = residents
      opts.onResidents?.(residents)
    }
    const seen = new Set<string>()
    players.forEach((p, sid) => {
      if (sid === me) {
        local.setServer(p.x, p.z)
        // Tipo físico: vem da vida (a sala aplica); ninguém escolhe.
        if (isBody(p.body) && p.body !== myBody) {
          myBody = p.body
          void local.char.setBody(myBody)
          opts.onBody?.(myBody)
        }
        setDriving(p.car ?? 0, p)
        if (typeof p.pace === "number" && p.pace > 0) myPace = p.pace
        // No centro a "casa" é a vaga nesta sala: é ela que diz de quem é cada veículo.
        if (p.house) myLot = p.house
        return
      }
      seen.add(sid)
      let r = remotes.get(sid)
      const body = isBody(p.body) ? p.body : "normal"
      if (!r) {
        r = new RemotePlayer(new Character(scene, lib, mats, body, p.name, false), p.x, p.z, p.facing)
        remotes.set(sid, r)
        // Vizinho que se mudou depois que você entrou: a casa dele deixa de
        // aparecer como disponível (o banco é a fonte; a sala só confirma).
        const h = nb?.houses[p.house - 1]
        if (h && !h.isMine && !h.ownerName) h.ownerName = p.name
      } else if (r.char.body !== body) {
        void r.char.setBody(body)
      }
      // No carro o boneco some; em bike, skate e patins ele aparece montado
      // (a pose sai da modalidade e a posição, do veículo desenhado).
      const rk = p.car ? kindOfId(p.car) : null
      r.car = rk && rk !== "car" ? (p.car ?? 0) : 0
      r.char.setVisible(!p.car || rk !== "car")
      r.char.tired = (p.pace ?? 1) < 1
      r.setTarget(p.x, p.z, p.facing, (p.car ? 0 : Math.max(0, Math.min(2, p.move))) as MoveState)
    })
    for (const [sid, r] of remotes) {
      if (!seen.has(sid)) {
        r.dispose()
        remotes.delete(sid)
      }
    }
    const count = seen.size + 1
    if (count !== onlineCount) {
      onlineCount = count
      opts.onOnline?.(count)
    }
  }

  // ── Interação ─────────────────────────────────────────────────────────────
  let nearby: Interactable | null = null
  let myLot = payload.me.house || 0
  const visitor = !!(payload.me as { visitor?: boolean }).visitor
  const exitCar: Interactable = { kind: "car-exit", id: "car-exit", x: 0, z: 0, radius: 99 }
  const findNearby = () => {
    // Em um veículo: descer — ou, de bike/skate/patins perto da própria
    // casa (ou da visitada), entrar nela montado (mm3d-15). Perto do portão
    // do bairro ou do portal do centro, viajar com ele (mm3d-17).
    if (driving) {
      for (const it of world.interactables) {
        if (it.kind !== "exit" && it.kind !== "portal") continue
        if (Math.hypot(it.x - local.x, it.z - local.z) <= it.radius + 2.5) return it
      }
      if (drivingKind !== "car" && opts.canRideInto) {
        for (const it of world.interactables) {
          if (it.kind !== "house" || !opts.canRideInto(it)) continue
          if (Math.hypot(it.x - local.x, it.z - local.z) <= it.radius) return it
        }
      }
      return exitCar
    }
    let best: Interactable | null = null
    let bestD = Infinity
    // "Usar" (mm3d-14): o veículo livre mais perto. O carro é só do titular
    // da casa (visitante não); bike, skate e patins, de quem chegar.
    for (const [key, c] of fleet.latest) {
      if (c.driver) continue
      const k = RIDE_KINDS[c.kind]
      // No centro todo veículo é só de quem o trouxe.
      if ((k.ownerOnly || centerP) && (!myLot || visitor || c.lot !== myLot)) continue
      const d = Math.hypot(c.x - local.x, c.z - local.z)
      if (d <= k.enter - 0.2 && d < bestD) {
        best = { kind: "car", id: `veh-${key}`, x: c.x, z: c.z, radius: k.enter, lot: c.lot, vid: Number(key), vkind: c.kind }
        bestD = d
      }
    }
    for (const it of world.interactables) {
      const d = Math.hypot(it.x - local.x, it.z - local.z)
      if (d <= it.radius && d < bestD) {
        best = it
        bestD = d
      }
    }
    return best
  }

  /** Entrar/sair do carro é pedido à sala; a resposta chega pelo estado. */
  const interactWith = (it: Interactable) => {
    if (it.kind === "car") net.send("car", { a: "enter", id: it.vid })
    else if (it.kind === "car-exit") net.send("car", { a: "exit" })
    else opts.onInteract?.(it)
  }

  /** A sala confirmou que você subiu/desceu de um veículo (id; 0 = a pé). */
  function setDriving(lot: number, at?: { x: number; z: number; facing: number }) {
    if (lot === driving) return
    driving = lot
    drivingKind = (lot && kindOfId(lot)) || "car"
    // No carro você some; nos outros aparece montado.
    local.char.setVisible(!lot || drivingKind !== "car")
    input.driving = !!lot
    input.keys.delete("Space")
    if (lot) {
      const c = fleet.latest.get(String(lot))
      const p = at ?? c ?? { x: local.x, z: local.z, facing: local.body.facing }
      veh = createVehicle(p.x, p.z, p.facing)
      Object.assign(prevPose, { x: p.x, z: p.z, yaw: p.facing })
      recon.reset()
      follow.setChase(true, p.facing)
    } else {
      veh = null
      follow.setChase(false)
      follow.snapBehind(local.x, local.z, local.body.facing)
    }
    opts.onDriving?.(lot)
  }

  /**
   * Um quadro dirigindo: passo fixo com acumulador (MAX_STEPS por quadro —
   * aba que volta não simula o tempo perdido), reconciliação com a sala e a
   * pose interpolada para desenhar.
   */
  const driveFrame = (dt: number, boxes: typeof world.boxes, now: number) => {
    const v = veh!
    const d = devDrive.current ?? (input.blocked ? IDLE_DRIVE : driveAxis(input))
    const P = paramsFor(drivingKind, tune)
    v.acc = Math.min(v.acc + dt, STEP * MAX_STEPS)
    while (v.acc >= STEP) {
      prevPose.x = v.x
      prevPose.z = v.z
      prevPose.yaw = v.yaw
      stepVehicle(v, d, boxes, limit, P)
      v.acc -= STEP
    }
    net.sendDrive(d, now)

    // Reconciliação (car-sync.ts): compara a sala com o nosso passado mais
    // parecido (absorve o atraso da rede) e corrige posição, RUMO e velocidade
    // aos poucos. Corrigir só a posição deixava o carro andando de lado.
    recon.record(v, now)
    const sc = net.status === "online" ? net.cars()?.get(String(driving)) : null
    if (sc && sc.driver === net.sessionId) {
      if (recon.observe(v, sc) === "snap") Object.assign(prevPose, { x: v.x, z: v.z, yaw: v.yaw })
      recon.apply(v, dt)
      serverErr = recon.err
    }

    const a = v.acc / STEP
    pose.x = prevPose.x + (v.x - prevPose.x) * a
    pose.z = prevPose.z + (v.z - prevPose.z) * a
    pose.facing = lerpAngle(prevPose.yaw, v.yaw, a)
    pose.sp = v.u
    pose.st = v.steer
    pose.hb = v.hb
    pose.sl = v.slip
    pose.ax = v.ax
    pose.ay = v.ay
    // O jogador "está" no carro (interação, painel, câmera).
    local.body.x = pose.x
    local.body.z = pose.z
    local.body.facing = pose.facing
  }


  let instr: SceneInstrumentation | null = null
  let statsTimer = 0

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    let intent: Intent = { x: 0, z: 0, run: false }
    if (!input.blocked) {
      if (input.camDX || input.camDY) {
        follow.rotate(input.camDX * 0.006, input.camDY * 0.004)
        input.camDX = 0
        input.camDY = 0
      }
      if (input.zoom) {
        follow.zoom(input.zoom * 1.1)
        input.zoom = 0
      }
      const axis = moveAxis(input)
      const f = follow.forward()
      // direita = cima × frente (mão esquerda): (f.z, -f.x)
      intent = {
        x: f.x * axis.y + f.z * axis.x,
        z: f.z * axis.y - f.x * axis.x,
        run: wantsRun(input),
      }
      if (Math.hypot(intent.x, intent.z) < 0.05) intent = { x: 0, z: 0, run: intent.run }
    }
    const carBoxes = fleet.boxes(driving)
    const boxes = carBoxes.length ? world.boxes.concat(carBoxes) : world.boxes
    const now = performance.now()
    // O carro usa o tempo REAL do quadro (o teto de passos de vehicle.ts
    // segura abas que voltam): cortar em 0,1 s deixava a previsão para trás
    // do servidor em aparelhos lentos.
    if (driving && veh) driveFrame(Math.min(engine.getDeltaTime() / 1000, 0.25), boxes, now)
    else {
      local.char.tired = myPace < 1
      local.update(dt, intent, boxes, limit, paceSpeeds(myPace, speeds))
    }
    // Dirigindo, a intenção a pé é zero (o controle a pé não age).
    syncNetwork(now, driving ? { x: 0, z: 0, run: false } : intent)
    fleet.sync(net.cars(), dt, driving, driving && veh ? pose : null)
    if (driving && veh && drivingKind !== "car") placeRider(fleet, local.char, String(driving), drivingKind, pose.x, pose.z, pose.facing, pose.sp, dt)
    for (const r of remotes.values()) {
      const rk = r.car ? kindOfId(r.car) : null
      const vp = rk ? fleet.poseOf(String(r.car)) : null
      if (rk && vp) {
        placeRider(fleet, r.char, String(r.car), rk, vp.x, vp.z, vp.facing, vp.sp, dt)
        // Montado, a interpolação a pé acompanha o veículo (ao descer não "desliza").
        r.x = vp.x
        r.z = vp.z
        r.facing = vp.facing
      } else r.update(dt)
      // Longe: malha leve; fora da tela ou além do corte: não anima; o nome só de perto.
      const cam = follow.camera.globalPosition
      r.char.applyDistance(Math.hypot(r.x - cam.x, r.z - cam.z), scene.frustumPlanes, quality)
    }
    governor.tick(engine.getDeltaTime())
    if (driving && veh) follow.chase(dt, pose.x, pose.z, pose.facing, veh.u, world.viewBoxes)
    else follow.update(dt, local.x, local.z, world.viewBoxes)

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (nearby && !input.blocked) interactWith(nearby)
    }

    if (instr && opts.onStats) {
      statsTimer += dt
      if (statsTimer >= 0.5) {
        statsTimer = 0
        opts.onStats({
          fps: engine.getFps(),
          frameMs: instr.frameTimeCounter.lastSecAverage || null,
          meshes: scene.meshes.length,
          activeMeshes: scene.getActiveMeshes().length,
          materials: scene.materials.length,
          drawCalls: Math.round(instr.drawCallsCounter.lastSecAverage) || null,
          webgl: engine.webGLVersion,
          liveGames: live,
          x: local.x,
          z: local.z,
          avatars: lib.live,
          quality: quality.tier,
          renderScale: governor.ratio,
          cars: fleet.count,
          houseModels: world.loadedLevels(),
          car: veh
            ? {
                kmh: veh.u * 3.6,
                gear: veh.gear,
                steerDeg: (veh.steer * 180) / Math.PI,
                slip: veh.slip,
                betaDeg: (veh.beta * 180) / Math.PI,
                drifting: Math.abs(veh.beta) > 0.2 && Math.hypot(veh.vx, veh.vz) > 4,
                // Chão plano: as quatro rodas estão sempre apoiadas.
                contacts: 4,
                handbrake: veh.hb,
                serverErr,
              }
            : null,
        })
      }
    }
  })

  // Só em desenvolvimento: câmera ortográfica de cima, para conferir o layout
  // com escala real (1 unidade = 1 m). Fora do build de produção.
  if (process.env.NODE_ENV !== "production") {
    const w = window as unknown as { __mmTopView?: (cx: number, cz: number, span: number) => void }
    w.__mmTopView = (cx, cz, span) => {
      const top = new TargetCamera("mm-top", new Vector3(cx, 300, cz - 0.001), scene)
      top.mode = TargetCamera.ORTHOGRAPHIC_CAMERA
      const aspect = engine.getRenderWidth() / engine.getRenderHeight()
      top.orthoTop = span / 2
      top.orthoBottom = -span / 2
      top.orthoLeft = (-span / 2) * aspect
      top.orthoRight = (span / 2) * aspect
      top.minZ = 1
      top.maxZ = 400
      top.setTarget(new Vector3(cx, 0, cz))
      scene.fogMode = Scene.FOGMODE_NONE
      scene.activeCamera = top
    }
    // Vitrine de conferência (mm3d-18): câmera livre, avatar ao lado do
    // prédio e o custo da cena (triângulos visíveis, recursos vivos).
    let look: TargetCamera | null = null
    const dev = window as unknown as {
      __mmLookFrom?: (px: number, py: number, pz: number, tx: number, ty: number, tz: number, fov?: number) => void
      __mmFollow?: () => void
      __mmTeleport?: (x: number, z: number, facing: number) => void
      __mmPerf?: () => Record<string, number | null>
    }
    dev.__mmLookFrom = (px, py, pz, tx, ty, tz, fov = 0.9) => {
      look?.dispose()
      look = new TargetCamera("mm-look", new Vector3(px, py, pz), scene)
      look.fov = fov
      look.minZ = 0.3
      look.maxZ = 600
      look.setTarget(new Vector3(tx, ty, tz))
      scene.activeCamera = look
    }
    dev.__mmFollow = () => {
      look?.dispose()
      look = null
      scene.activeCamera = follow.camera
    }
    dev.__mmTeleport = (x, z, facing) => {
      local.teleport(x, z, facing)
      follow.snapBehind(x, z, facing)
    }
    dev.__mmPerf = () => ({
      triangles: Math.round(scene.getActiveIndices() / 3),
      activeMeshes: scene.getActiveMeshes().length,
      meshes: scene.meshes.length,
      materials: scene.materials.length,
      textures: scene.textures.length,
      geometries: scene.getGeometries().length,
      drawCalls: instr ? Math.round(instr.drawCallsCounter.current) : null,
      frameMs: instr ? instr.frameTimeCounter.lastSecAverage : null,
      fps: engine.getFps(),
      live,
      renderScale: governor.ratio,
      avatarsAnimated: [...remotes.values()].filter((r) => r.char.animating).length,
      avatarsLod: [...remotes.values()].filter((r) => r.char.usingLod(scene.activeCamera ?? follow.camera)).length,
    })
    ;(dev as { __mmMeshes?: () => [string, number][] }).__mmMeshes = () =>
      scene.meshes.filter((m) => m.isEnabled()).map((m) => [m.name, Math.round(m.getTotalIndices() / 3)])
  }

  scene.executeWhenReady(() => {
    if (!disposed) opts.onReady?.()
  })

  let suspended = false
  engine.runRenderLoop(() => {
    if (!disposed && !suspended) scene.render()
  })

  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)

  const lost = engine.onContextLostObservable.add(() => {
    if (!disposed) opts.onError?.("context-lost")
  })

  const handle: GameHandle = {
    input,
    setJoystick(x, y) {
      input.joyX = x
      input.joyY = y
    },
    setRun(on) {
      input.runToggle = on
    },
    setSuspended(on) {
      suspended = on
      if (on) clearInput(input)
    },
    setBlocked(blocked) {
      input.blocked = blocked
      clearInput(input)
    },
    interact() {
      if (nearby && !input.blocked) interactWith(nearby)
    },
    recenter() {
      follow.snapBehind(local.x, local.z, local.body.facing)
    },
    reconnect() {
      void net.retry()
    },
    applyHouseLevel(lot, level, rev) {
      if (!disposed) world.applyLevel(lot, level, rev)
    },
    retryHouse(lot) {
      if (!disposed) world.retryVisual(lot)
    },
    houseVisual(lot) {
      return world.visual(lot)
    },
    setTouchDrive(key, on) {
      input.touchDrive[key] = on
    },
    setTuning(t) {
      const clean = t ? sanitizeTuning(t) : null
      tune = clean && Object.keys(clean).length ? clean : null
      net.send("tune", clean ?? { reset: true })
    },
    recoverCar() {
      if (driving) net.send("car", { a: "recover" })
    },
    leaveVehicle() {
      if (driving) net.send("car", { a: "exit" })
    },
    setQuality(c) {
      quality = resolveQuality(c)
      governor.setProfile(quality)
      scene.fogStart = quality.fogStart
      scene.fogEnd = quality.fogEnd
      follow.camera.maxZ = quality.maxZ
      lib.lodDistance = quality.avatarLod
    },
    setStatsEnabled(on) {
      if (on && !instr) {
        instr = new SceneInstrumentation(scene)
        instr.captureFrameTime = true
        statsTimer = 1
      } else if (!on && instr) {
        instr.dispose()
        instr = null
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      const w = window as unknown as { __mmStreet?: typeof probe }
      if (w.__mmStreet === probe) delete w.__mmStreet
      net.dispose()
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      instr?.dispose()
      instr = null
      for (const r of remotes.values()) r.dispose()
      remotes.clear()
      local.dispose()
      fleet.dispose()
      lib.dispose()
      world.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
  return handle
}
