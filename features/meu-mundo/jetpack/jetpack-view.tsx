"use client"

// Tela do jetpack (mm3d-20): o HTML do jogo original (jogo.html da TENKA) em
// JSX, traduzido, por cima do centro. O motor (game.ts) só procura os ids
// dentro desta raiz e escreve o estado em data-state.

import { useEffect, useRef } from "react"
import { JetBrains_Mono } from "next/font/google"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { archivo } from "../ui/status/evo-skin"
import type { BodyId, JetpackSession } from "../types"
import { createJetpackGame, type JetpackTexts } from "./game"
import type { PartyTexts } from "./party"
import "./jetpack.css"

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" })

/**
 * `fetchParty` (mm3d-21): o local aceita jogar em grupo — pede o lugar na sala
 * do jetpack (null = sem acesso). Sem ele, só o jogo sozinho.
 */
export function JetpackView({
  body,
  look = "",
  onExit,
  fetchParty,
}: {
  body: BodyId
  /** Cores do personagem (mm3d-36). */
  look?: string
  onExit: () => void
  fetchParty?: (roomId: string | null) => Promise<JetpackSession | null>
}) {
  const t = useTranslations("MeuMundo")
  const rootRef = useRef<HTMLDivElement>(null)
  const exitRef = useRef(onExit)
  const fetchRef = useRef(fetchParty)
  useEffect(() => {
    exitRef.current = onExit
    fetchRef.current = fetchParty
  }, [onExit, fetchParty])
  const grouped = !!fetchParty

  const texts: JetpackTexts = {
    turbo: t("jpToastTurbo", "TURBO · 2X · QUEBRE AS PILASTRAS"),
    fuelAdded: t("jpToastFuel", "+{n} COMBUSTÍVEL"),
    fuelEmpty: t("jpToastEmpty", "SEM COMBUSTÍVEL"),
    phase: t("jpToastPhase", "FASE {n}"),
    menuBest: t("jpMenuBest", "Seu recorde: {n} m"),
    menuHint: t("jpMenuHint", "Segure para subir. Solte para cair."),
    hudBest: t("jpHudBest", "RECORDE {n} m"),
    overFuel: t("jpOverFuel", "{n} ({k} cápsulas)"),
    savedLocal: t("jpSavedLocal", "Recorde salvo neste aparelho."),
    noWebgl: t("jpNoWebgl", "Este aparelho ou navegador não tem suporte a gráficos 3D (WebGL 2)."),
    loadFailed: t("jpLoadFailed", "Não foi possível carregar o seu avatar. Confira a conexão e tente de novo."),
    soundOn: t("jpSoundOnTitle", "Ligar som"),
    soundOff: t("jpSoundOffTitle", "Desligar som"),
  }
  const partyTexts: PartyTexts = {
    joining: t("jpPartyJoining", "Entrando na sala…"),
    waiting: t("jpPartyWaiting", "Esperando jogadores · {n}"),
    alone: t("jpPartyAlone", "Esperando mais alguém chegar…"),
    startsIn: t("jpPartyStartsIn", "Começa em {n} s"),
    readyTag: t("jpPartyReadyTag", "PRONTO"),
    emptySlot: t("jpPartyEmptySlot", "vaga livre"),
    you: t("jpPartyYou", "VOCÊ"),
    out: t("jpPartyOut", "Você saiu · {n} m"),
    place: t("jpPartyPlace", "{n}º"),
    caps: t("jpPartyCaps", "{n} cápsulas"),
    soloFallback: t("jpPartySoloFallback", "JOGANDO SOZINHO"),
    reconnecting: t("jpPartyReconnecting", "RECONECTANDO…"),
    replaced: t("jpPartyReplaced", "ABERTO EM OUTRA JANELA"),
    ready: t("jpPartyReady", "COMEÇAR"),
    unready: t("jpPartyUnready", "CANCELAR"),
  }
  const textsRef = useRef(texts)
  const partyTextsRef = useRef(partyTexts)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const game = createJetpackGame({
      root,
      body,
      look,
      texts: textsRef.current,
      onExit: () => exitRef.current(),
      party: grouped
        ? { texts: partyTextsRef.current, fetch: (roomId) => fetchRef.current?.(roomId) ?? Promise.resolve(null) }
        : undefined,
    })
    return () => game.dispose()
  }, [body, look, grouped])

  return (
    <div
      ref={rootRef}
      className="jg fl-sharp"
      data-state="loading"
      style={{ ["--font-display" as string]: archivo.style.fontFamily, ["--font-mono" as string]: mono.style.fontFamily }}
    >
      <main className="jg-frame" id="jg-frame">
        <canvas id="jg-canvas" aria-label={t("jpTitleAria", "Jetpack")} />
        {/* Superfície de toque: segurar liga o jetpack. Fica abaixo do HUD. */}
        <div className="jg-surface" id="jg-surface" aria-hidden="true" />

        <header className="jg-hud">
          <div className="jg-dist">
            <span className="jg-lbl">{t("jpDistance", "DISTÂNCIA")}</span>
            <div className="jg-dist-num">
              <b id="jg-dist">000000</b>
              <i>m</i>
            </div>
            <small id="jg-best" />
          </div>
          <div className="jg-right">
            <div className="jg-fuel" id="jg-fuel">
              <span className="jg-lbl">
                {t("jpFuel", "COMBUSTÍVEL")} <b id="jg-fuel-pct">100%</b>
              </span>
              <div className="jg-bar">
                <i id="jg-fuel-bar" />
              </div>
            </div>
            <div className="jg-power" aria-hidden="true">
              <span className="jg-lbl">{t("jpTurbo", "TURBO")}</span>
              <div className="jg-bar">
                <i id="jg-power-bar" />
              </div>
            </div>
            <div className="jg-tools">
              <button type="button" className="jg-icon" id="jg-pause" aria-label={t("jpPause", "Pausar")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
                </svg>
              </button>
              <button type="button" className="jg-icon" data-sound aria-label={t("jpSound", "Som")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9h4l5-4v14l-5-4H4z" />
                  <path className="on" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path className="off" d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <p className="jg-hint" id="jg-hint">
          <b>{t("jpHintHold", "SEGURE")}</b> {t("jpHintHoldRest", "para ligar o jetpack")} · <b>{t("jpHintRelease", "SOLTE")}</b>{" "}
          {t("jpHintReleaseRest", "para cair")}
        </p>
        <div className="jg-toast" id="jg-toast" role="status" aria-live="polite" />

        {/* carregando */}
        <section className="jg-panel" data-panel="loading">
          <p className="jg-kicker">{t("jpKicker", "MEU MUNDO · CENTRO")}</p>
          <h1 className="jg-title">
            {t("jpTitleA", "JETPACK")}
            <br />
            <span>{t("jpTitleB", "DO CENTRO")}</span>
          </h1>
          <div className="jg-load">
            <i id="jg-progress" />
          </div>
          <p className="jg-sub">{t("jpLoading", "Preparando o jetpack…")}</p>
        </section>

        {/* menu */}
        <section className="jg-panel" data-panel="menu">
          <p className="jg-kicker">{t("jpKicker", "MEU MUNDO · CENTRO")}</p>
          <h1 className="jg-title">
            {t("jpTitleA", "JETPACK")}
            <br />
            <span>{t("jpTitleB", "DO CENTRO")}</span>
          </h1>
          <p className="jg-sub" id="jg-menu-best">
            {texts.menuHint}
          </p>
          <ul className="jg-rules">
            <li>
              <i className="c-red" />
              {t("jpRuleObstacles", "Desvie das estruturas e não encoste no chão nem no teto.")}
            </li>
            <li>
              <i className="c-fuel" />
              {t("jpRuleFuel", "Pegue cápsulas: o combustível do jetpack acaba.")}
            </li>
            <li>
              <i className="c-vulcan" />
              {t("jpRuleTurbo", "Turbo vermelho: por 5 s você voa 2x mais rápido e quebra as pilastras.")}
            </li>
          </ul>
          <button type="button" className="jg-btn" id="jg-play">
            {t("jpPlay", "JOGAR")}
          </button>
          <div className="jg-row">
            <button type="button" className="jg-link" id="jg-menu-back">
              ← {t("jpBack", "VOLTAR AO CENTRO")}
            </button>
            <button type="button" className="jg-link" data-sound>
              <span className="on">{t("jpSoundOn", "SOM: LIGADO")}</span>
              <span className="off">{t("jpSoundOff", "SOM: DESLIGADO")}</span>
            </button>
          </div>
        </section>

        {/* grupo (mm3d-21): entrando, espera, saiu, resultados */}
        <section className="jg-panel" data-panel="joining">
          <p className="jg-kicker">{t("jpPartyKicker", "JETPACK EM GRUPO · ATÉ 4")}</p>
          <p className="jg-sub">{partyTexts.joining}</p>
        </section>

        <section className="jg-panel" data-panel="lobby">
          <p className="jg-kicker">{t("jpPartyKicker", "JETPACK EM GRUPO · ATÉ 4")}</p>
          <h2 className="jg-title sm">{t("jpPartyLobby", "ESPERA")}</h2>
          <ul className="jg-slots" id="jg-lobby-list" />
          <p className="jg-sub small" id="jg-lobby-info" />
          <button type="button" className="jg-btn" id="jg-ready">
            {partyTexts.ready}
          </button>
          <button type="button" className="jg-btn ghost" id="jg-solo">
            {t("jpPartySolo", "ENTRAR SOZINHO")}
          </button>
          <div className="jg-row">
            <button type="button" className="jg-link" id="jg-lobby-back">
              ← {t("jpBack", "VOLTAR AO CENTRO")}
            </button>
          </div>
        </section>

        <p className="jg-hold" aria-hidden="true">
          {t("jpPartyHold", "SEGURE NO VAI!")}
        </p>

        <section className="jg-panel jg-banner" data-panel="spectate">
          <p className="jg-sub" id="jg-spec-text" />
          <button type="button" className="jg-link" id="jg-spec-leave">
            {t("jpPartyLeave", "SAIR")}
          </button>
        </section>

        <section className="jg-panel" data-panel="results">
          <p className="jg-kicker">{t("jpOver", "FIM DA MISSÃO")}</p>
          <h2 className="jg-title sm">{t("jpPartyResults", "RESULTADO")}</h2>
          <ol className="jg-results" id="jg-res-list" />
          <button type="button" className="jg-btn" id="jg-res-again">
            {t("jpAgain", "JOGAR DE NOVO")}
          </button>
          <div className="jg-row">
            <button type="button" className="jg-link" id="jg-res-back">
              ← {t("jpBack", "VOLTAR AO CENTRO")}
            </button>
          </div>
        </section>

        {/* pausa */}
        <section className="jg-panel" data-panel="paused">
          <p className="jg-kicker">{t("jpMission", "MISSÃO")}</p>
          <h2 className="jg-title sm">{t("jpPaused", "PAUSADO")}</h2>
          <button type="button" className="jg-btn" id="jg-resume">
            {t("jpResume", "CONTINUAR")}
          </button>
          <div className="jg-row">
            <button type="button" className="jg-link" id="jg-restart">
              {t("jpRestart", "REINICIAR")}
            </button>
            <button type="button" className="jg-link" id="jg-quit">
              {t("jpQuit", "SAIR")}
            </button>
          </div>
        </section>

        <div className="jg-count mono" id="jg-count" aria-hidden="true">
          3
        </div>

        {/* fim de partida */}
        <section className="jg-panel" data-panel="over">
          <p className="jg-kicker">{t("jpOver", "FIM DA MISSÃO")}</p>
          <p className="jg-record" id="jg-over-record" hidden>
            {t("jpNewRecord", "NOVO RECORDE")}
          </p>
          <div className="jg-big mono" id="jg-over-dist">
            0 m
          </div>
          <dl className="jg-stats">
            <div>
              <dt>{t("jpBest", "MELHOR RECORDE")}</dt>
              <dd className="mono" id="jg-over-best">
                0 m
              </dd>
            </div>
            <div>
              <dt>{t("jpFuelCollected", "COMBUSTÍVEL COLETADO")}</dt>
              <dd className="mono" id="jg-over-fuel">
                0
              </dd>
            </div>
          </dl>
          <p className="jg-sub small" id="jg-over-net" />
          <button type="button" className="jg-btn" id="jg-again">
            {t("jpAgain", "JOGAR DE NOVO")}
          </button>
          <div className="jg-row">
            <button type="button" className="jg-link" id="jg-back">
              ← {t("jpBack", "VOLTAR AO CENTRO")}
            </button>
          </div>
        </section>

        {/* erro */}
        <section className="jg-panel" data-panel="error">
          <p className="jg-kicker">{t("jpErrorKicker", "FALHA NA DECOLAGEM")}</p>
          <p className="jg-sub" id="jg-error-msg">
            {t("jpErrorDefault", "Não foi possível iniciar o jogo.")}
          </p>
          <button type="button" className="jg-btn" id="jg-retry">
            {t("jpRetry", "TENTAR DE NOVO")}
          </button>
          <button type="button" className="jg-link" id="jg-error-back">
            ← {t("jpBack", "VOLTAR AO CENTRO")}
          </button>
        </section>

        <div className="jg-flash" aria-hidden="true" />
      </main>

      <div className="jg-rotate" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 3v14h10V5z" />
        </svg>
        <p>{t("jpRotate", "Gire o celular para a vertical")}</p>
      </div>
    </div>
  )
}
