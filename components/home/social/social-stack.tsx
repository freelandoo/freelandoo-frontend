"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"
import {
  ChipRow,
  fadeUp,
  GhostBorder,
  SectionTitle,
  SectionWrap,
  SPRING,
  stagger,
} from "./shared"

/* ───────────────────────── PORTFÓLIO QUE TRABALHA POR VOCÊ ──────────────── */

export function PortfolioWorksSection() {
  const reduce = useReducedMotion()
  const cards = [
    {
      title: "Publique trabalhos",
      desc: "Imagens, vídeos e cases vão direto para o seu portfólio profissional.",
      icon: Sparkles,
    },
    {
      title: "Ganhe visibilidade",
      desc: "Cada post entra no feed e no seu enxame, na frente de quem busca o que você faz.",
      icon: Eye,
    },
    {
      title: "Receba contatos",
      desc: "Curtidas e compartilhamentos viram conversas reais — direto na sua caixa de mensagens.",
      icon: MessageCircle,
    },
  ]
  return (
    <SectionWrap id="portfolio-works" bg="lift">
      <SectionTitle
        eyebrow="portfólio · feed · contato"
        title={<>Seu portfólio agora trabalha por você.</>}
        desc="Na Freelandoo, seu trabalho não fica parado em uma página escondida. Cada post de portfólio pode aparecer no feed, receber curtidas, compartilhamentos, mensagens e gerar novas oportunidades."
      />

      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger(0.05, 0.1)}
        className="mt-12 grid gap-4 md:grid-cols-12"
      >
        {/* Card grande à esquerda */}
        <motion.article
          variants={fadeUp}
          className="md:col-span-7"
        >
          <GhostBorder className="h-full p-8 md:p-10">
            <div className="flex h-full flex-col gap-6">
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(242,196,9,0.12), rgba(14,165,233,0.10) 60%, rgba(255,255,255,0.02))",
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 80% at 30% 20%, rgba(242,196,9,0.18), transparent 70%), radial-gradient(40% 60% at 80% 90%, rgba(14,165,233,0.16), transparent 70%)",
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                    Post de portfólio
                  </p>
                  <p className="mt-2 max-w-md text-xl font-semibold leading-snug text-white">
                    Identidade visual completa — Casa Áurea Studio
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/65">
                    <span className="inline-flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-primary" /> 412 curtidas
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" /> 27 compartilhamentos
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> 9 conversas
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/65">
                Um único post pode ser visto por quem busca o seu enxame, sua profissão e
                a sua cidade — e cada interação é uma oportunidade direta de fechar serviço.
              </p>
            </div>
          </GhostBorder>
        </motion.article>

        {/* Pilha de 3 cards bento à direita */}
        <div className="grid gap-4 md:col-span-5">
          {cards.map((c) => (
            <motion.article key={c.title} variants={fadeUp}>
              <GhostBorder className="p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">{c.desc}</p>
                  </div>
                </div>
              </GhostBorder>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </SectionWrap>
  )
}

/* ───────────────────────── FEED PROFISSIONAL ────────────────────────────── */

export function FeedShowcaseSection() {
  const reduce = useReducedMotion()
  const posts = [
    {
      name: "Camila Borba",
      role: "Editora de cortes",
      city: "São Paulo, SP",
      machine: "Views",
      tint: "linear-gradient(135deg, rgba(242,196,9,0.18), rgba(217,70,239,0.14))",
      caption: "3 cortes virais para o canal Sertão Studio · 1,4M views",
      likes: 248,
      shares: 31,
      conversations: 12,
    },
    {
      name: "Rafael Tibúrcio",
      role: "Pintor & acabamentos",
      city: "Olinda, PE",
      machine: "Construção",
      tint: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(245,158,11,0.14))",
      caption: "Reforma sala + cozinha · entrega em 9 dias",
      likes: 87,
      shares: 6,
      conversations: 4,
    },
    {
      name: "Ana Lucena",
      role: "Designer de sobrancelhas",
      city: "Rio Formoso, PE",
      machine: "Saúde e Beleza",
      tint: "linear-gradient(135deg, rgba(217,70,239,0.18), rgba(236,72,153,0.14))",
      caption: "Antes/depois · técnica brow lamination",
      likes: 162,
      shares: 9,
      conversations: 7,
    },
  ]
  return (
    <SectionWrap id="feed-showcase">
      <SectionTitle
        eyebrow="feed · descoberta"
        title={<>Um feed profissional para descobrir quem resolve.</>}
        desc="Role o feed, veja trabalhos reais e encontre profissionais por enxame, profissão e cidade."
      />

      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger(0.06, 0.08)}
        className="mt-12 grid gap-4 md:grid-cols-12"
      >
        {/* Coluna principal: 2 mocks de post empilhados (variance: tamanhos diferentes) */}
        <div className="space-y-4 md:col-span-7">
          {posts.slice(0, 2).map((p, i) => (
            <motion.article key={p.name} variants={fadeUp}>
              <GhostBorder className="overflow-hidden">
                <div className="flex items-center gap-3 px-5 pt-5">
                  <div
                    className="h-10 w-10 shrink-0 rounded-full"
                    style={{ background: p.tint }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                    <p className="truncate text-[11px] text-white/55">
                      {p.role} · {p.city}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                    {p.machine}
                  </span>
                </div>
                <div
                  className="relative mx-5 mt-4 overflow-hidden rounded-2xl"
                  style={{
                    aspectRatio: i === 0 ? "16/10" : "16/9",
                    background: p.tint + ", #0c0c0e",
                  }}
                >
                  <div className="absolute inset-0 flex items-end p-5">
                    <p className="max-w-md text-base font-medium leading-snug text-white">
                      {p.caption}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-5 pb-5 pt-4">
                  <div className="flex items-center gap-4 text-xs text-white/65">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {p.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="h-3.5 w-3.5" /> {p.shares}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary/80">
                      <MessageCircle className="h-3.5 w-3.5" /> {p.conversations} conversas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-white/25">
                      Ver perfil
                    </button>
                    <button className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition active:scale-[0.97]">
                      Enviar mensagem
                    </button>
                  </div>
                </div>
              </GhostBorder>
            </motion.article>
          ))}
        </div>

        {/* Coluna lateral com filtro + 1 post compacto */}
        <div className="space-y-4 md:col-span-5">
          <motion.div variants={fadeUp}>
            <GhostBorder className="p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Filtros do feed</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Enxame", value: "Marketing" },
                  { label: "Profissão", value: "Editor de Vídeo" },
                  { label: "Cidade", value: "São Paulo, SP" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-white/50">{f.label}</span>
                    <span className="rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 text-xs font-medium text-primary">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </GhostBorder>
          </motion.div>

          <motion.article variants={fadeUp}>
            <GhostBorder className="overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-5">
                <div
                  className="h-10 w-10 shrink-0 rounded-full"
                  style={{ background: posts[2].tint }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{posts[2].name}</p>
                  <p className="truncate text-[11px] text-white/55">
                    {posts[2].role} · {posts[2].city}
                  </p>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  {posts[2].machine}
                </span>
              </div>
              <div
                className="relative mx-5 mt-4 aspect-[4/5] overflow-hidden rounded-2xl"
                style={{ background: posts[2].tint + ", #0c0c0e" }}
              >
                <div className="absolute inset-0 flex items-end p-5">
                  <p className="text-sm font-medium leading-snug text-white">{posts[2].caption}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-5 pb-5 pt-4">
                <span className="inline-flex items-center gap-1 text-xs text-white/65">
                  <Heart className="h-3.5 w-3.5" /> {posts[2].likes}
                </span>
                <button className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                  WhatsApp
                </button>
              </div>
            </GhostBorder>
          </motion.article>
        </div>
      </motion.div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <ChipRow
          items={[
            "Posts em alta",
            "Cortes",
            "Reforma",
            "Diaristas próximas",
            "Beleza no bairro",
            "Pet care",
          ]}
        />
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:translate-x-0.5"
        >
          Abrir o feed completo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionWrap>
  )
}

/* ───────────────────────── MENSAGENS ────────────────────────────────────── */

export function MessagesSection() {
  const reduce = useReducedMotion()
  return (
    <SectionWrap id="mensagens" bg="lift">
      <div className="grid gap-12 md:grid-cols-12 md:items-center md:gap-14">
        <div className="md:col-span-5">
          <SectionTitle
            eyebrow="mensagens internas"
            title={<>Converse, negocie e mantenha o histórico.</>}
            desc="Perfis e clans podem trocar mensagens dentro da Freelandoo. Converse, negocie, tire dúvidas e mantenha o histórico organizado — sem misturar com WhatsApp pessoal."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {["Subperfil → Subperfil", "Subperfil → Clan", "Histórico permanente"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          variants={fadeUp}
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="md:col-span-7"
        >
          <GhostBorder className="overflow-hidden bg-zinc-950/60">
            <div className="grid grid-cols-[260px_1fr]">
              {/* Lista de conversas */}
              <aside className="border-r border-white/[0.06] bg-zinc-950/60">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold text-white">Mensagens</p>
                  <span className="text-[10px] uppercase tracking-wider text-white/45">5</span>
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {[
                    { name: "Camila Borba", role: "Editora · Views", last: "Cabe sim. Te mando o briefing.", unread: 0, active: true },
                    { name: "Casa Áurea Studio", role: "Clan · Edição", last: "Topa fazer parceria nos cortes?", unread: 2 },
                    { name: "Rafael Tibúrcio", role: "Pintor · Construção", last: "Posso passar segunda 9h?", unread: 0 },
                  ].map((c) => (
                    <li
                      key={c.name}
                      className={
                        "flex items-start gap-3 px-4 py-3 " + (c.active ? "bg-white/[0.04]" : "")
                      }
                    >
                      <div
                        className="h-9 w-9 shrink-0 rounded-full"
                        style={{
                          background: "linear-gradient(135deg, rgba(242,196,9,0.5), rgba(217,70,239,0.4))",
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{c.name}</p>
                        <p className="truncate text-[11px] text-white/45">{c.role}</p>
                        <p className="mt-1 truncate text-xs text-white/60">{c.last}</p>
                      </div>
                      {c.unread > 0 && (
                        <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Thread */}
              <div className="flex min-h-[360px] flex-col bg-zinc-900/40">
                <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ background: "linear-gradient(135deg,#f2c409,#d97706)" }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Camila Borba</p>
                    <p className="text-[11px] text-white/50">Editora · Views</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 px-5 py-5">
                  <p className="my-1 text-center text-[10px] uppercase tracking-[0.22em] text-white/35">
                    Hoje
                  </p>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3.5 py-2 text-sm text-white/90">
                    Vi seu portfólio com os cortes do Sertão Studio. Tem espaço pra um teste pago de 3 cortes?
                  </div>
                  <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground">
                    Tenho. Mando minha agenda hoje à noite.
                  </div>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3.5 py-2 text-sm text-white/90">
                    Fechado. Orçamento de R$ 480 pelo lote.
                  </div>
                </div>
                <div className="border-t border-white/[0.06] p-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/60 px-4 py-2">
                    <span className="flex-1 text-xs text-white/45">Escrever mensagem</span>
                    <Send className="h-4 w-4 text-white/45" />
                  </div>
                </div>
              </div>
            </div>
          </GhostBorder>
        </motion.div>
      </div>
    </SectionWrap>
  )
}

/* ───────────────────────── ACOMPANHAR + CLANS ───────────────────────────── */

export function AcompanharClansSection() {
  const reduce = useReducedMotion()
  const profiles = [
    { name: "Pedro Alencar", tag: "Editor · Views", followers: 412, color: "linear-gradient(135deg,#a78bfa,#6d28d9)" },
    { name: "Marina Cordeiro", tag: "Diarista · Limpeza", followers: 96, color: "linear-gradient(135deg,#34d399,#059669)" },
    { name: "Inês Cabral", tag: "Maquiadora · Beleza", followers: 318, color: "linear-gradient(135deg,#e879f9,#d946ef)" },
  ]
  return (
    <SectionWrap id="acompanhar-clans">
      <div className="grid gap-12 md:grid-cols-12 md:items-start md:gap-14">
        {/* Acompanhar */}
        <motion.div
          variants={fadeUp}
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="md:col-span-7"
        >
          <SectionTitle
            eyebrow="acompanhar · acompanhados"
            title={<>Acompanhe quem faz acontecer.</>}
            desc="Acompanhe perfis e clans para seguir trabalhos, novidades e oportunidades. Aqui não tem 'seguidores' — tem profissionais que acompanham profissionais."
          />
          <div className="mt-8 grid gap-3">
            {profiles.map((p) => (
              <GhostBorder key={p.name} className="flex items-center gap-4 p-4">
                <div
                  className="h-11 w-11 shrink-0 rounded-full"
                  style={{ background: p.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                  <p className="truncate text-[11px] text-white/55">{p.tag}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Acompanham</p>
                  <p className="text-sm font-semibold tabular-nums text-white/85">{p.followers}</p>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15">
                  <UserPlus className="h-3.5 w-3.5" />
                  Acompanhar
                </button>
              </GhostBorder>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Acompanhando", "Acompanham este perfil", "Acompanham este clan", "Acompanhados"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/55"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Clans */}
        <motion.div
          variants={fadeUp}
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="md:col-span-5 md:pt-16"
        >
          <SectionTitle
            eyebrow="clans · reputação coletiva"
            title={<>Clans: reputação coletiva para profissionais.</>}
            desc="Monte grupos, participe de equipes e construa presença com outros profissionais. Clans publicam, conversam, acompanham e são acompanhados."
          />
          <div className="mt-8">
            <GhostBorder className="p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/[0.08] text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Casa Áurea Studio</p>
                  <p className="text-[11px] text-white/55">Edição & motion · 6 perfis</p>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  ativo
                </span>
              </div>

              <div className="mt-5 flex -space-x-2">
                {["#f2c409", "#0ea5e9", "#fb7185", "#34d399", "#a78bfa"].map((c) => (
                  <span
                    key={c}
                    className="h-9 w-9 rounded-full ring-2 ring-zinc-950"
                    style={{ background: c }}
                    aria-hidden
                  />
                ))}
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70 ring-2 ring-zinc-950">
                  +1
                </span>
              </div>

              <dl className="mt-6 grid grid-cols-3 divide-x divide-white/[0.06]">
                <div className="pr-4">
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Posts</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">128</dd>
                </div>
                <div className="px-4">
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Acompanham</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">2.144</dd>
                </div>
                <div className="pl-4">
                  <dt className="text-[10px] uppercase tracking-wider text-white/40">Mensagens</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-white">37</dd>
                </div>
              </dl>

              <div className="mt-6 flex items-center gap-2">
                <button className="flex-1 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15">
                  Acompanhar clan
                </button>
                <button className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 transition hover:border-white/25 hover:text-white">
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </GhostBorder>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-white/55">
              <MapPin className="h-3.5 w-3.5 text-white/40" />
              Convide membros por @username · agendas e ranking próprios.
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrap>
  )
}
