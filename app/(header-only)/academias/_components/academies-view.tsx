"use client"

// A VITRINE DE ACADEMIAS — a porta do pill laranja do /fitness.
//
// ⚠️ ELA MORA NA CASCA DA PLATAFORMA FITNESS (pedido do Alex, 2026-09-10:
// "deixa a identidade visual a mesma que você fez anterior ali da página do
// fitness"). A pele laranja, o fundo e o gate da flag `fitness_academias`
// vêm da `FitnessShell` — a tela não repete nada disso.
//
// ⚠️ CADA ACADEMIA É UM MINI-HEADCARD: o card tem um banner desenhado em
// cima, e a FOTO é um cartão 2/3 (a mesma proporção do card de foto dos
// perfis e das plataformas) que MORDE a borda do banner — metade sobre o
// banner, metade sobre o papel, como no headcard de sempre. O nome fica ao
// lado da foto e a descrição embaixo. O card inteiro é o link.
//
// Segue a regra das cascas: container `px-0 md:px-10` (as seções vão de
// ponta a ponta no celular) e as sombras duras de 8px são recortadas pelo
// `overflow-x-clip` da casca.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Dumbbell, Loader2, MapPin, Plus, Search, Users } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "@/app/(header-only)/fitness/_components/fitness-shell"
import {
  BTN_DARK,
  BTN_GOLD,
  EMBER,
  EMBER_GLOW,
  INNER,
  PANEL,
  StateBox,
  initialsOf,
} from "@/app/(header-only)/fitness/_components/fitness-ui"

type Academy = {
  id_academy: string
  nome: string
  slug: string
  descricao: string | null
  cidade: string | null
  uf: string | null
  avatar_url: string | null
  member_count: number
}

export function AcademiesView() {
  return (
    <FitnessShell>
      <AcademiesBody />
    </FitnessShell>
  )
}

/** O banner DESENHADO do ambiente — a grade e o brilho laranja do headcard do /fitness. */
const BANNER_LAYERS = [
  "radial-gradient(70% 120% at 18% 0%, rgba(194, 65, 12, 0.45), transparent 65%)",
  "radial-gradient(60% 120% at 88% 10%, rgba(245, 158, 11, 0.22), transparent 68%)",
  "repeating-linear-gradient(to right, rgba(251, 146, 60, 0.10) 0 1px, transparent 1px 40px)",
  "repeating-linear-gradient(to bottom, rgba(251, 146, 60, 0.07) 0 1px, transparent 1px 40px)",
].join(",")

function AcademiesBody() {
  const t = useTranslations("Academies")

  const [academies, setAcademies] = useState<Academy[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [q, setQ] = useState("")
  const [city, setCity] = useState("")

  // O cadastro de academia mora no formulário de criação
  // (/comunidades/criar?tipo=academy) — esta página é vitrine/busca e a porta
  // para ele.

  const load = useCallback(async () => {
    setState("loading")
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (city.trim()) params.set("city", city.trim())
      const res = await fetch(`/api/academies?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAcademies(Array.isArray(data.academies) ? data.academies : [])
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [q, city])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      {/* Top bar — a saída à esquerda, como no headcard das salas do fitness. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 pt-6 md:px-10">
        <Link
          href="/fitness"
          className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9A938A] transition hover:text-[#F5F1E8]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToFitness", "Voltar pro painel fitness")}
        </Link>
      </div>

      {/* Masthead — o banner do ambiente com o chip e o selo, o título gigante
          embaixo e o CTA de cadastro no canto, na silhueta do headcard. */}
      <header className="relative mx-auto mt-4 max-w-5xl px-0 md:px-10">
        <div
          className="relative overflow-hidden border-2 border-[#0B0B0D]"
          style={{ boxShadow: `0 0 30px rgba(249, 115, 22, 0.22), 8px 8px 0 0 rgba(110, 42, 15, 0.9)` }}
        >
          <div className="relative h-40 bg-[#1D1810] md:h-48">
            <div aria-hidden className="absolute inset-0" style={{ backgroundImage: BANNER_LAYERS }} />
            <Dumbbell
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-6 h-56 w-56 select-none md:h-72 md:w-72"
              strokeWidth={1}
              style={{ color: "rgba(251, 146, 60, 0.10)" }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 40%, #150703cc 100%)" }}
            />
            <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
              {t("eyebrow", "Fitness · Freelandoo")}
            </span>
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">{t("platformLabel", "Plataforma")}</span>
              <Dumbbell className="h-6 w-6" style={{ color: EMBER_GLOW }} />
            </span>
            <h1 className="fl-display absolute bottom-3 left-4 z-20 text-5xl leading-[0.85] text-[#F5F1E8] md:bottom-4 md:text-7xl">
              {t("title", "Academias")}
            </h1>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 px-3 md:px-0">
          <p className="max-w-2xl text-sm text-[#9A938A]">
            {t(
              "subtitle",
              "Vincule sua matrícula pelo CPF e acompanhe frequência, treinos e calorias no seu painel fitness."
            )}
          </p>
          {/* O cadastro de academia continua no formulário de criação (ela
              precisa de URL e token da API dela antes de existir), mas a
              comunidade comum saiu de lá (mig 219) — então a vitrine da
              academia é a porta dele. */}
          <Link href="/comunidades/criar?tipo=academy" className={`${BTN_GOLD} px-3 py-2 text-[11px]`}>
            <Plus className="h-4 w-4" />
            {t("registerCta", "Cadastrar academia")}
          </Link>
        </div>
      </header>

      {/* Busca */}
      <section className="mx-auto mt-6 w-full max-w-5xl px-0 md:px-10">
        <div className={`flex flex-col gap-2 ${PANEL} p-3 sm:flex-row`}>
          <label className={`flex flex-1 items-center gap-2 ${INNER} px-3 py-2`}>
            <Search className="h-4 w-4 text-[#9A938A]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
              placeholder={t("searchPlaceholder", "Buscar academia pelo nome")}
              className="w-full bg-transparent text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
          </label>
          <label className={`flex items-center gap-2 ${INNER} px-3 py-2 sm:w-56`}>
            <MapPin className="h-4 w-4 text-[#9A938A]" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
              placeholder={t("cityPlaceholder", "Cidade")}
              className="w-full bg-transparent text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
          </label>
          <button onClick={() => void load()} className={`${BTN_DARK} px-4 py-2 text-xs`}>
            {t("searchCta", "Buscar")}
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="mx-auto mt-6 w-full max-w-5xl px-0 md:px-10">
        {state === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
          </div>
        )}
        {state === "error" && (
          <StateBox
            icon={<Dumbbell className="h-6 w-6" />}
            title={t("loadFailedTitle", "Não deu pra carregar.")}
            desc={t("loadError", "Erro ao carregar as academias. Tente novamente.")}
            accent={EMBER}
          />
        )}
        {state === "loaded" && academies.length === 0 && (
          <StateBox
            icon={<Dumbbell className="h-6 w-6" />}
            title={t("title", "Academias")}
            desc={t("emptySearch", "Nenhuma academia encontrada. Ajuste a busca.")}
            accent={EMBER}
          />
        )}
        {state === "loaded" && academies.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 md:gap-8">
            {academies.map((a) => (
              <li key={a.id_academy}>
                <AcademyCard academy={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/**
 * O MINI-HEADCARD de uma academia: banner desenhado em cima, a foto num
 * cartão 2/3 mordendo a borda do banner (metade em cima, metade embaixo) e o
 * nome ao lado. É a silhueta do headcard das plataformas, em miniatura.
 *
 * ⚠️ A CONTA DO RECUO: a foto tem `w-24` (96px, logo 144px de altura) no
 * celular e `w-28` (112px → 168px) no md; o recuo é METADE da altura
 * (`-mt-[72px]` / `md:-mt-[84px]`). Mexeu na largura da foto? Refazer.
 */
function AcademyCard({ academy: a }: { academy: Academy }) {
  const t = useTranslations("Academies")
  const cityLabel = a.cidade ? `${a.cidade}${a.uf ? ` · ${a.uf}` : ""}` : t("cityUnknown", "Cidade não informada")

  return (
    <Link
      href={`/academias/${a.slug}`}
      className={`group block ${PANEL} transition-transform hover:-translate-y-0.5`}
      style={{ boxShadow: `8px 8px 0 0 ${EMBER}` }}
    >
      {/* `z-0` tranca o banner debaixo da linha da foto. */}
      <div className="relative z-0 h-28 overflow-hidden border-b-2 border-[#0B0B0D] bg-[#1D1810]">
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: BANNER_LAYERS }} />
        <Dumbbell
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-4 h-36 w-36 select-none"
          strokeWidth={1}
          style={{ color: "rgba(251, 146, 60, 0.10)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 40%, #150703cc 100%)" }}
        />
        {/* O chip do card diz a CIDADE — é o que separa uma academia da outra
            numa vitrine em que todas dividem o mesmo banner. */}
        <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]">
          <MapPin className="h-3 w-3" style={{ color: EMBER_GLOW }} />
          {cityLabel}
        </span>
      </div>

      {/* A linha da foto: o cartão 2/3 sobreposto ao banner e o nome ao lado. */}
      <div className="relative z-20 -mt-[72px] flex items-end gap-3 px-3 md:-mt-[84px]">
        <div
          className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:w-28"
          style={{ outline: `2px solid ${EMBER_GLOW}`, outlineOffset: "2px" }}
        >
          {a.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center fl-display text-3xl text-[#F5F1E8]/40">
              {initialsOf(a.nome)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h2 className="fl-display text-3xl leading-[0.9] text-[#F5F1E8] transition-colors group-hover:text-[#F2B705] md:text-4xl">
            {a.nome}
          </h2>
          <p className="mt-2 inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F2B705]">
            <Users className="h-3 w-3" />
            {String(a.member_count)} {t("membersSuffix", "vinculados")}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 px-3 pb-4 pt-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-[#9A938A]">{a.descricao || ""}</p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] transition-colors group-hover:text-[#F5F1E8]">
          {t("openAcademy", "Abrir")}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
