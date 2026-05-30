"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { DeckPanel } from "./deck-panel"
import { ProgressRail } from "./progress-rail"
import {
  V01EngineCore,
  V02ParticipantRanking,
  V03AudienceRanking,
  V04Caixinha,
  V05Saboteurs,
  V06Podcast,
  V07Mafia,
  V08Bunker,
  V09Quiz,
  V10President,
  V11Debate,
  V12Final,
} from "./deck-visuals"

type Accent = "fuchsia" | "cyan" | "violet" | "amber"

interface Panel {
  kicker: string
  title: string
  headline: string
  explanation: string
  howItWorks: string
  whyContent: string
  microcopy: string
  visual: React.ReactNode
  accent: Accent
}

const PANELS: Panel[] = [
  {
    kicker: "Motor central",
    title: "R$ 1.000 por dia em Saldo Secreto",
    headline: "Todo dia alguém recebe. Todo mundo vira suspeito.",
    explanation:
      "A cada dia, R$ 1.000 são entregues secretamente para um participante aleatório. A casa sabe que o dinheiro entrou no jogo, mas não sabe quem recebeu. Ao longo de 7 dias, R$ 7.000 circulam dentro do reality.",
    howItWorks:
      "Depois da distribuição secreta, acontece uma votação. Quem votar corretamente em quem está com o saldo captura esse valor para si.",
    whyContent:
      "O dinheiro cria paranoia. Quem recebeu precisa disfarçar. Quem não recebeu precisa observar. Qualquer gesto vira teoria, acusação ou corte.",
    microcopy: "Quem esconde bem sobrevive. Quem descobre certo enriquece.",
    visual: <V01EngineCore />,
    accent: "amber",
  },
  {
    kicker: "Ranking · Participantes",
    title: "Ranking dos Participantes",
    headline: "Postou, performou, pontuou.",
    explanation:
      "Cada participante pontua pelo desempenho dos próprios posts. Visualizações, likes e comentários definem quem está gerando mais atenção real.",
    howItWorks:
      "A produção acompanha a performance dos conteúdos publicados e transforma engajamento em posição no ranking.",
    whyContent:
      "Os participantes precisam jogar dentro da casa e performar nas plataformas ao mesmo tempo.",
    microcopy: "Quem domina o post domina a casa.",
    visual: <V02ParticipantRanking />,
    accent: "fuchsia",
  },
  {
    kicker: "Ranking · Audiência",
    title: "Ranking da Audiência",
    headline: "Não vence quem comenta mais. Vence quem faz a conversa crescer.",
    explanation:
      "O Ranking da Audiência é baseado em comentários relevantes: comentários que recebem respostas, curtidas e movimentam discussões reais.",
    howItWorks:
      "Comentários com mais likes, respostas e valor narrativo ganham mais peso no ranking.",
    whyContent:
      "O público passa a criar teorias, defender participantes, acusar suspeitos e manter o reality vivo nos comentários.",
    microcopy: "A melhor teoria também joga.",
    visual: <V03AudienceRanking />,
    accent: "cyan",
  },
  {
    kicker: "Caixinha",
    title: "Caixinha de Segredos",
    headline: "A fofoca vem de dentro da casa.",
    explanation:
      "Todos os dias, os próprios participantes escrevem mensagens anônimas sobre alguém da casa. Acusações, suspeitas, indiretas, elogios venenosos, revelações e comentários estratégicos.",
    howItWorks:
      "A produção recolhe os bilhetes, escolhe os mais fortes e lê para todos. Ninguém sabe quem escreveu.",
    whyContent:
      "Uma frase anônima pode destruir uma aliança, gerar confronto, revelar incômodo ou levantar uma suspeita.",
    microcopy: "Todo dia, alguém escreve algo sobre alguém.",
    visual: <V04Caixinha />,
    accent: "fuchsia",
  },
  {
    kicker: "Sabotadores",
    title: "Dois Sabotadores",
    headline: "Um em cada grupo. Ambos têm algo a perder.",
    explanation:
      "Um participante do grupo dos homens e uma participante do grupo das mulheres recebem missões secretas de sabotagem.",
    howItWorks:
      "Eles precisam atrapalhar o próprio grupo sem serem descobertos. Se não cumprirem a missão, perdem o próprio saldo.",
    whyContent:
      "Quando um grupo erra, ninguém sabe se foi falha ou sabotagem. Isso cria suspeita interna.",
    microcopy: "O caos pode ter sido planejado.",
    visual: <V05Saboteurs />,
    accent: "fuchsia",
  },
  {
    kicker: "Dia 01 · Podcast",
    title: "Podcast dos Arquétipos",
    headline: "Antes da disputa, nasce o personagem.",
    explanation:
      "No primeiro dia, os participantes passam por um podcast para revelar profissão, história, ambição, medo, defeitos e estilo de jogo.",
    howItWorks:
      "A produção conduz perguntas para criar leitura psicológica e narrativa de cada participante.",
    whyContent: "O público começa a entender quem amar, odiar, defender ou desconfiar.",
    microcopy: "Personagem forte cria torcida forte.",
    visual: <V06Podcast />,
    accent: "cyan",
  },
  {
    kicker: "Dia 02 · Máfia",
    title: "Máfia Views",
    headline: "O jogo que revela quem sabe mentir.",
    explanation:
      "Os participantes recebem papéis secretos e precisam blefar, acusar, defender e manipular.",
    howItWorks:
      "Durante a noite, papéis secretos agem. Durante o dia, todos debatem quem está mentindo.",
    whyContent:
      "A Máfia revela frieza, desespero, improviso, leitura corporal e poder de convencimento.",
    microcopy: "Quem mente bem no jogo pode esconder dinheiro na casa.",
    visual: <V07Mafia />,
    accent: "violet",
  },
  {
    kicker: "Dia 03 · Bunker",
    title: "Bunker Views",
    headline: "Quem merece sobreviver?",
    explanation:
      "Os participantes enfrentam uma situação fictícia em que nem todos cabem no bunker. Cada um precisa provar por que merece ficar.",
    howItWorks:
      "Profissão, fraquezas, habilidades e segredos são revelados por rodada. A casa decide quem entra e quem fica fora.",
    whyContent: "O Bunker gera ataques diretos, defesas fortes e frases de impacto.",
    microcopy: "Quando falta espaço, todo mundo mostra quem realmente é.",
    visual: <V08Bunker />,
    accent: "amber",
  },
  {
    kicker: "Dia 04 · Quiz Líquido",
    title: "Quiz Líquido",
    headline: "Errou, molhou. Reagiu, viralizou.",
    explanation:
      "Um quadro visual, leve e fácil de cortar. Os participantes respondem perguntas e recebem punições líquidas quando erram.",
    howItWorks: "Cada erro gera uma reação física, engraçada ou constrangedora.",
    whyContent:
      "É o respiro cômico da temporada e gera cortes rápidos para redes sociais.",
    microcopy: "Humor também é motor de retenção.",
    visual: <V09Quiz />,
    accent: "cyan",
  },
  {
    kicker: "Dia 05 · President",
    title: "President Views",
    headline: "Todo mundo promete. Poucos conseguem mandar.",
    explanation:
      "Os participantes disputam o cargo simbólico de presidente da casa em uma campanha política cômica.",
    howItWorks:
      "Eles fazem promessas, discursos, ataques, alianças e tentam convencer a casa e o público.",
    whyContent:
      "Campanha, promessa, traição e disputa de liderança geram cortes fortes e humor político dentro do reality.",
    microcopy: "Poder muda o tom da casa.",
    visual: <V10President />,
    accent: "amber",
  },
  {
    kicker: "Dia 06 · Debate",
    title: "Debate",
    headline: "Quem convence o público muda o jogo.",
    explanation:
      "Os participantes se enfrentam em um debate com temas provocativos e argumentos diretos.",
    howItWorks: "Cada lado defende sua posição. O público vota no vencedor.",
    whyContent:
      "O debate transforma opinião, rivalidade e discurso em competição pública.",
    microcopy: "A palavra certa pode valer mais que uma prova.",
    visual: <V11Debate />,
    accent: "fuchsia",
  },
  {
    kicker: "Dia 07 · Final",
    title: "Final Criador de Conteúdo",
    headline: "Dinheiro leva à final. Views decidem o campeão.",
    explanation:
      "No último dia, os 3 participantes com maior saldo disputam a final criando um conteúdo original.",
    howItWorks:
      "Cada finalista recebe um desafio criativo, publica o conteúdo e disputa pelo maior número de visualizações.",
    whyContent:
      "A final conecta o reality diretamente ao mercado creator. Vence quem entende atenção, narrativa e plataforma.",
    microcopy: "No fim, vence quem transforma saldo em views.",
    visual: <V12Final />,
    accent: "fuchsia",
  },
]

const TRANSITION_DURATION = 0.6
const EDGE_RELEASE_MS = 700

export default function HorizontalGameDeckSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)
  const animatingRef = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  const gotoRef = useRef<(idx: number) => void>(() => {})

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    if (typeof window === "undefined") return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let cleanup: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      const [{ gsap }, stMod, obsMod] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/Observer"),
      ])
      if (cancelled) return

      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default
      const Observer = obsMod.Observer ?? obsMod.default
      gsap.registerPlugin(ScrollTrigger, Observer)

      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track) return

      const goto = (next: number) => {
        if (animatingRef.current) return
        if (next === indexRef.current) return
        if (next < 0 || next >= PANELS.length) return
        animatingRef.current = true
        indexRef.current = next
        setCurrentIndex(next)
        gsap.to(track, {
          xPercent: -(100 / PANELS.length) * next,
          duration: prefersReduced ? 0 : TRANSITION_DURATION,
          ease: "power3.inOut",
          onComplete: () => {
            animatingRef.current = false
          },
        })
      }

      gotoRef.current = goto

      gsap.set(track, { xPercent: 0 })

      const observer = Observer.create({
        target: section,
        type: "wheel,touch,pointer",
        tolerance: 12,
        wheelSpeed: -1,
        preventDefault: true,
        onUp: () => {
          if (indexRef.current >= PANELS.length - 1) {
            observer.disable()
            setTimeout(() => observer.enable(), EDGE_RELEASE_MS)
            return
          }
          goto(indexRef.current + 1)
        },
        onDown: () => {
          if (indexRef.current <= 0) {
            observer.disable()
            setTimeout(() => observer.enable(), EDGE_RELEASE_MS)
            return
          }
          goto(indexRef.current - 1)
        },
      })

      observer.disable()

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=100%",
        pin: true,
        anticipatePin: 1,
        onEnter: () => observer.enable(),
        onLeave: () => observer.disable(),
        onEnterBack: () => observer.enable(),
        onLeaveBack: () => observer.disable(),
      })

      const onKey = (e: KeyboardEvent) => {
        const rect = section.getBoundingClientRect()
        const inView = rect.top <= 10 && rect.bottom >= window.innerHeight - 10
        if (!inView) return
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault()
          goto(indexRef.current + 1)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault()
          goto(indexRef.current - 1)
        }
      }
      window.addEventListener("keydown", onKey)

      cleanup = () => {
        observer.kill()
        st.kill()
        window.removeEventListener("keydown", onKey)
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isDesktop])

  useEffect(() => {
    if (isDesktop) return
    const track = mobileTrackRef.current
    if (!track) return
    const onScroll = () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth)
      setCurrentIndex(Math.min(Math.max(idx, 0), PANELS.length - 1))
    }
    track.addEventListener("scroll", onScroll, { passive: true })
    return () => track.removeEventListener("scroll", onScroll)
  }, [isDesktop])

  const onPrev = () => {
    if (isDesktop) {
      gotoRef.current?.(currentIndex - 1)
    } else {
      mobileTrackRef.current?.scrollTo({
        left: (currentIndex - 1) * mobileTrackRef.current.clientWidth,
        behavior: "smooth",
      })
    }
  }

  const onNext = () => {
    if (isDesktop) {
      gotoRef.current?.(currentIndex + 1)
    } else {
      mobileTrackRef.current?.scrollTo({
        left: (currentIndex + 1) * mobileTrackRef.current.clientWidth,
        behavior: "smooth",
      })
    }
  }

  return (
    <section
      ref={sectionRef}
      id="maquina"
      className="relative overflow-hidden bg-[#06060c] lg:h-screen"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,121,249,0.07),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.05),transparent_55%)]" />

      <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#06060c]/70 px-6 py-4 backdrop-blur-xl md:px-10 md:py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
            <span className="h-px w-10 bg-fuchsia-400/60" />
            <span>A Máquina do Jogo</span>
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 md:block">
            Agora que a tese está clara, entenda como o jogo funciona por dentro.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <ProgressRail total={PANELS.length} current={currentIndex} className="w-full max-w-sm" />
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex === 0}
              aria-label="Painel anterior"
              className="rounded-full bg-white/[0.04] p-2 text-slate-300 ring-1 ring-white/10 transition-all hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex === PANELS.length - 1}
              aria-label="Próximo painel"
              className="rounded-full bg-white/[0.04] p-2 text-slate-300 ring-1 ring-white/10 transition-all hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="relative h-[calc(100vh-92px)] overflow-hidden">
          <div
            ref={trackRef}
            className="flex h-full will-change-transform"
            style={{ width: `${PANELS.length * 100}vw` }}
          >
            {PANELS.map((p, i) => (
              <div
                key={i}
                className="relative h-full w-screen shrink-0 border-l border-white/[0.04]"
              >
                <DeckPanel
                  index={i}
                  total={PANELS.length}
                  kicker={p.kicker}
                  title={p.title}
                  headline={p.headline}
                  explanation={p.explanation}
                  howItWorks={p.howItWorks}
                  whyContent={p.whyContent}
                  microcopy={p.microcopy}
                  visual={p.visual}
                  accent={p.accent}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            ← → use as setas · um scroll = um painel
          </div>
        </div>
      </div>

      <div
        ref={mobileTrackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden lg:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {PANELS.map((p, i) => (
          <div
            key={i}
            className="relative w-screen shrink-0 snap-center border-l border-white/[0.04]"
          >
            <DeckPanel
              index={i}
              total={PANELS.length}
              kicker={p.kicker}
              title={p.title}
              headline={p.headline}
              explanation={p.explanation}
              howItWorks={p.howItWorks}
              whyContent={p.whyContent}
              microcopy={p.microcopy}
              visual={p.visual}
              accent={p.accent}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
