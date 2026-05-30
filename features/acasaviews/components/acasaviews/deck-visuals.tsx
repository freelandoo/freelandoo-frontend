import {
  Mic,
  Skull,
  ShieldAlert,
  Waves,
  Vote,
  Flame,
  PlayCircle,
  Lock,
  Heart,
  MessageCircle,
  CornerDownRight,
  FileText,
  EyeOff,
  Megaphone,
} from "lucide-react"

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

// 01 — Motor Central: R$ 1.000 + votação de captura
export function V01EngineCore() {
  return (
    <div className="flex h-full w-full flex-col justify-between gap-4">
      <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/15 to-fuchsia-500/5 p-5 ring-1 ring-amber-400/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/80">
            <Lock className="h-3 w-3" />
            Saldo Secreto · hoje
          </div>
          <span className="font-mono text-[10px] text-slate-400">dia 03 / 07</span>
        </div>
        <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-amber-200">
          R$ 1.000<span className="ml-2 text-xs text-amber-300/60">→ ???</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          entregue em segredo a um participante aleatório
        </p>
      </div>

      <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-fuchsia-400/15">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-fuchsia-300">
          <span className="flex items-center gap-2">
            <Vote className="h-3 w-3" /> Votação de captura
          </span>
          <span className="font-mono text-slate-500">aberta</span>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { p: "Mari", v: 38, c: "from-fuchsia-400 to-rose-300" },
            { p: "Caio", v: 24, c: "from-cyan-400 to-sky-300" },
            { p: "Iza", v: 19, c: "from-violet-400 to-fuchsia-300" },
          ].map((r) => (
            <div key={r.p} className="space-y-1">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-slate-200">{r.p}</span>
                <span className="font-mono tabular-nums text-slate-400">{r.v}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full bg-gradient-to-r ${r.c}`}
                  style={{ width: `${r.v * 2.6}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        Acertou → captura · Total temporada · R$ 7.000
      </p>
    </div>
  )
}

// 02 — Ranking dos Participantes
const LEADER = [
  { p: "Mari", v: "184K", l: "32K", c: "8.2K", t: "+12", trend: "up" },
  { p: "Caio", v: "162K", l: "28K", c: "6.4K", t: "+8", trend: "up" },
  { p: "Iza", v: "147K", l: "22K", c: "5.1K", t: "−3", trend: "down" },
  { p: "Théo", v: "129K", l: "19K", c: "4.0K", t: "+5", trend: "up" },
]

export function V02ParticipantRanking() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-400">
        <span>Ranking dos Participantes</span>
        <span className="font-mono text-slate-500">live</span>
      </div>
      <div className="grid grid-cols-[24px_1fr_44px_44px_44px_36px] gap-x-2 px-3 text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500">
        <span>#</span>
        <span>nome</span>
        <span className="text-right">views</span>
        <span className="text-right">likes</span>
        <span className="text-right">com.</span>
        <span className="text-right">Δ</span>
      </div>
      {LEADER.map((r, i) => (
        <div
          key={r.p}
          className={`grid grid-cols-[24px_1fr_44px_44px_44px_36px] items-center gap-x-2 rounded-lg px-3 py-2 ring-1 ${
            i === 0
              ? "bg-amber-500/10 ring-amber-400/30"
              : "bg-white/[0.025] ring-white/[0.06]"
          }`}
        >
          <span
            className={`font-mono text-[10px] tabular-nums ${
              i === 0 ? "text-amber-300" : "text-slate-400"
            }`}
          >
            #{i + 1}
          </span>
          <span className="text-xs text-slate-200">{r.p}</span>
          <span className="text-right font-mono text-[11px] tabular-nums text-slate-300">
            {r.v}
          </span>
          <span className="text-right font-mono text-[11px] tabular-nums text-slate-300">
            {r.l}
          </span>
          <span className="text-right font-mono text-[11px] tabular-nums text-slate-300">
            {r.c}
          </span>
          <span
            className={`text-right font-mono text-[10px] tabular-nums ${
              r.trend === "up" ? "text-cyan-300" : "text-rose-300"
            }`}
          >
            {r.t}
          </span>
        </div>
      ))}
    </div>
  )
}

// 03 — Ranking da Audiência (comentários relevantes)
export function V03AudienceRanking() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-400">
        <span>Comentários · top</span>
        <span className="font-mono text-slate-500">peso narrativo</span>
      </div>
      <GlassCard className="p-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="text-fuchsia-300">@bia_views</span>
          <span className="font-mono">+18 pts</span>
        </div>
        <p className="mt-1.5 text-xs leading-snug text-slate-200">
          “Vi a Mari sair do quarto às 3h — ela pegou o saldo de ontem.”
        </p>
        <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-300" /> 412
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3 text-cyan-300" /> 38 respostas
          </span>
        </div>
        <div className="mt-2 ml-4 flex items-start gap-1.5 text-[10px] text-slate-500">
          <CornerDownRight className="h-3 w-3 shrink-0 text-slate-600" />
          <span className="italic">“Faz sentido, o tom dela mudou no jantar.”</span>
        </div>
      </GlassCard>
      <GlassCard className="p-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="text-cyan-300">@theory_house</span>
          <span className="font-mono">+12 pts</span>
        </div>
        <p className="mt-1.5 text-xs leading-snug text-slate-200">
          “O sabotador é do quarto azul. Olhem o padrão de votação.”
        </p>
        <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-300" /> 287
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3 text-cyan-300" /> 22 respostas
          </span>
        </div>
      </GlassCard>
    </div>
  )
}

// 04 — Caixinha de Segredos (participantes escrevem)
export function V04Caixinha() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 self-start text-[10px] uppercase tracking-[0.22em] text-slate-400">
        <EyeOff className="h-3 w-3 text-fuchsia-300" /> Bilhetes da casa · anônimos
      </div>
      <div className="relative w-full">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2">
          <div className="h-16 w-24 rounded-t-lg bg-gradient-to-b from-fuchsia-500/40 to-fuchsia-700/40 ring-1 ring-fuchsia-400/40">
            <div className="absolute left-1/2 top-1 h-1 w-12 -translate-x-1/2 rounded-full bg-fuchsia-950 ring-1 ring-fuchsia-400/40" />
          </div>
        </div>
        <div className="mt-12 space-y-2">
          <div className="-rotate-1 rounded-lg bg-amber-100/95 px-3 py-2 text-[11px] italic leading-snug text-slate-900 shadow-2xl">
            “A Iza tá protegendo o Caio. Aliança cruzada.”
            <div className="mt-1 text-right font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">
              anônimo
            </div>
          </div>
          <div className="ml-6 rotate-1 rounded-lg bg-slate-100/95 px-3 py-2 text-[11px] italic leading-snug text-slate-900 shadow-2xl">
            “Quem pegou o saldo ontem disfarça mas a mão tremeu.”
            <div className="mt-1 text-right font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">
              anônimo
            </div>
          </div>
          <div className="-rotate-1 rounded-lg bg-rose-100/95 px-3 py-2 text-[11px] italic leading-snug text-slate-900 shadow-2xl">
            “Tem sabotador no quarto azul.”
            <div className="mt-1 text-right font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">
              anônimo
            </div>
          </div>
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        Selecionados pela produção · lidos para a casa
      </p>
    </div>
  )
}

// 05 — Sabotadores (1 por grupo, saldo em risco)
export function V05Saboteurs() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
        Missões secretas ativas
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600/30 to-slate-900 p-4 ring-1 ring-cyan-400/30">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">
            <span>Grupo ♂</span>
            <ShieldAlert className="h-3 w-3" />
          </div>
          <p className="mt-3 text-xs leading-snug text-white">
            Sabote a votação de captura sem ser descoberto.
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="font-mono text-cyan-200">EXPIRA 22:14</span>
            <span className="font-mono text-rose-300">saldo em risco</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600/30 to-slate-900 p-4 ring-1 ring-fuchsia-400/30">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-fuchsia-100/80">
            <span>Grupo ♀</span>
            <ShieldAlert className="h-3 w-3" />
          </div>
          <p className="mt-3 text-xs leading-snug text-white">
            Faça a aliança do quarto verde acusar a pessoa errada.
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="font-mono text-fuchsia-200">EXPIRA 19:42</span>
            <span className="font-mono text-rose-300">saldo em risco</span>
          </div>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 self-center rounded-full bg-rose-500/10 px-3 py-1 ring-1 ring-rose-400/30">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
          Falhar = perder o próprio saldo
        </span>
      </div>
    </div>
  )
}

// 06 — Podcast
export function V06Podcast() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <Mic className="h-14 w-14 text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
      <div className="flex h-12 items-center gap-1">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-cyan-400/40 to-fuchsia-300"
            style={{ height: `${20 + Math.sin(i * 0.7) * 40 + (i % 3) * 8}%` }}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
        Episódio 01 · arquétipos
      </p>
    </div>
  )
}

// 07 — Máfia
export function V07Mafia() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
        Cartas distribuídas
      </p>
      <div className="flex gap-2">
        {[
          { r: "Máfia", c: "from-rose-600 to-rose-800", t: "text-rose-100" },
          { r: "Detetive", c: "from-cyan-600 to-cyan-800", t: "text-cyan-100" },
          { r: "Cidadão", c: "from-slate-600 to-slate-800", t: "text-slate-100" },
        ].map((card, i) => (
          <div
            key={i}
            className={`flex h-32 w-20 flex-col justify-between rounded-xl bg-gradient-to-br ${card.c} p-3 shadow-2xl ring-1 ring-white/10`}
            style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
          >
            <Skull className={`h-4 w-4 ${card.t}`} />
            <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${card.t}`}>
              {card.r}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-slate-500">
        suspeitos · <span className="text-rose-300">02</span>
      </div>
    </div>
  )
}

// 08 — Bunker
export function V08Bunker() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <ShieldAlert className="h-12 w-12 text-amber-300" />
      <div className="grid w-full grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg ring-1 ${
              i < 4
                ? "bg-amber-500/15 ring-amber-400/40"
                : "bg-white/[0.025] ring-white/[0.06]"
            }`}
          />
        ))}
      </div>
      <div className="flex w-full items-center justify-between font-mono text-[10px] text-slate-400">
        <span>4 / 8 vagas</span>
        <span className="text-amber-300">CRONÔMETRO 02:30</span>
      </div>
    </div>
  )
}

// 09 — Quiz Líquido
export function V09Quiz() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <div className="flex items-center gap-3">
        <Waves className="h-8 w-8 text-cyan-300" />
        <div>
          <p className="text-base font-semibold text-white">Quiz Líquido</p>
          <p className="text-[11px] text-slate-400">Errou, molhou. Reagiu, viralizou.</p>
        </div>
      </div>
      <GlassCard className="p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Pergunta 03</p>
        <p className="mt-2 text-sm text-slate-100">
          Quem foi visto perto do cofre durante a madrugada?
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Mari", "Caio", "Iza", "Théo"].map((p, i) => (
            <div
              key={p}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ring-1 ${
                i === 1
                  ? "bg-rose-500/15 text-rose-200 ring-rose-400/30"
                  : "bg-white/[0.03] text-slate-300 ring-white/[0.06]"
              }`}
            >
              <span>{p}</span>
              <span className="font-mono text-[10px]">{String.fromCharCode(65 + i)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
      <div className="flex items-center gap-2 self-center rounded-full bg-cyan-500/10 px-3 py-1 ring-1 ring-cyan-400/30">
        <Waves className="h-3 w-3 text-cyan-300" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200">
          Punição líquida em 5… 4…
        </span>
      </div>
    </div>
  )
}

// 10 — President Views
export function V10President() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <div className="flex items-center gap-3">
        <Vote className="h-8 w-8 text-amber-300" />
        <div>
          <p className="text-base font-semibold text-white">President Views</p>
          <p className="text-[11px] text-slate-400">Quem comanda a casa essa semana?</p>
        </div>
      </div>
      <GlassCard className="p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300">Apuração</p>
        <div className="mt-3 space-y-3">
          {[
            { p: "Iza", v: 42, c: "from-amber-400 to-yellow-300" },
            { p: "Théo", v: 31, c: "from-fuchsia-400 to-rose-300" },
            { p: "Caio", v: 27, c: "from-cyan-400 to-sky-300" },
          ].map((c) => (
            <div key={c.p}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-slate-200">{c.p}</span>
                <span className="font-mono tabular-nums text-slate-400">{c.v}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full bg-gradient-to-r ${c.c}`}
                  style={{ width: `${c.v}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <div className="inline-flex items-center gap-2 self-center rounded-full bg-amber-500/10 px-3 py-1 ring-1 ring-amber-400/30">
        <Megaphone className="h-3 w-3 text-amber-300" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200">
          Promessas + alianças
        </span>
      </div>
    </div>
  )
}

// 11 — Debate
export function V11Debate() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <div className="flex items-center gap-3">
        <Flame className="h-8 w-8 text-fuchsia-300" />
        <div>
          <p className="text-base font-semibold text-white">Debate</p>
          <p className="text-[11px] text-slate-400">Público vota no vencedor</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">Posição A</p>
          <p className="mt-2 text-xs leading-snug text-slate-200">
            “Conteúdo só vale se gera conversa real.”
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-2xl tabular-nums text-cyan-300">38%</span>
            <FileText className="h-3 w-3 text-slate-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-300">Posição B</p>
          <p className="mt-2 text-xs leading-snug text-slate-200">
            “Conteúdo vale pelo alcance e pelo corte.”
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-2xl tabular-nums text-fuchsia-300">62%</span>
            <FileText className="h-3 w-3 text-slate-500" />
          </div>
        </GlassCard>
      </div>
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        Vencedor decidido por votos do público
      </p>
    </div>
  )
}

// 12 — Final Criador de Conteúdo
export function V12Final() {
  return (
    <div className="flex h-full w-full items-end justify-center gap-3">
      {[
        { v: "184K", c: "from-fuchsia-500/30 to-fuchsia-500/5", t: "text-fuchsia-300", h: "85%" },
        { v: "232K", c: "from-amber-500/30 to-amber-500/5", t: "text-amber-300", h: "100%" },
        { v: "168K", c: "from-cyan-500/30 to-cyan-500/5", t: "text-cyan-300", h: "75%" },
      ].map((p, i) => (
        <div
          key={i}
          className={`relative flex flex-col items-center rounded-2xl bg-gradient-to-t ${p.c} px-4 ring-1 ring-white/[0.08]`}
          style={{ height: p.h, width: "30%" }}
        >
          <PlayCircle className={`mt-3 h-5 w-5 ${p.t}`} />
          <span className="absolute bottom-3 font-mono text-xs tabular-nums text-white">
            {p.v}
          </span>
        </div>
      ))}
    </div>
  )
}
