"use client"

// features/meu-mundo/ui/status/certificate-doc.tsx — a CERTIDÃO DE NASCIMENTO do personagem
// (pedido do Alex, 09/11): um documento em papel, aberto pela bolinha "Certidão" do STATUS
// e pelo laboratório. Mostra quantas vezes a linha foi misturada, os dois lados da última
// mistura (personagem ou genética), a chance que cada um tinha e quem saiu, quanto de cada
// atributo veio e de quem (20% do maior), e se a personalidade mudou.
// Só leitura: o servidor grava tudo na hora da mistura (genetics.mix) e projeta o
// certificado público campo a campo (GET /meu-mundo/public/certificado/:code).

import { useEffect, useState, type ReactNode } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { useLocale } from "@/components/i18n/I18nProvider"
import { fetchCertificate } from "../../data"
import type { CertificateMix, CertificateMixSide, CharacterCertificate } from "../../types"
import { speciesName } from "../../characters/names"
import { serialText } from "../../characters/rules"
import { temperLabel, type Temper } from "../../soul"
import { archivo, cinzel, teko } from "./evo-skin"

type Tr = (key: string, fallback: string) => string

/** O papel da certidão. */
const PAPER = { bg: "#EFE3C6", edge: "#C9B286", ink: "#2B2117", soft: "#6E5B42", seal: "#9C2A24", gold: "#A37A1C", line: "rgba(43,33,23,.18)" }

const ATTRS = ["strength", "speed", "dexterity", "intelligence", "accuracy"] as const

const ORIGIN: Record<string, [string, string]> = {
  hospede: ["cdOriginGuest", "Hóspede da casa"],
  heir: ["cdOriginHeir", "Herdeiro"],
  skin: ["cdOriginSkin", "Conversão de skin"],
  fusion: ["cdOriginFusion", "Mistura no laboratório"],
  prize: ["cdOriginPrize", "Prêmio"],
  market: ["cdOriginMarket", "Mercado"],
  gift: ["cdOriginGift", "Presente"],
  admin_test: ["cdOriginTest", "Teste"],
  lab: ["cdOriginLab", "Embrião do laboratório"],
}

export function CertificateDoc({ code, t, compact = false }: { code: string | null; t: Tr; compact?: boolean }) {
  const locale = useLocale()
  const [cert, setCert] = useState<CharacterCertificate | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!code) return
    let alive = true
    setCert(null)
    setMissing(false)
    void fetchCertificate(code).then((c) => {
      if (!alive) return
      if (c) setCert(c)
      else setMissing(true)
    })
    return () => {
      alive = false
    }
  }, [code])

  if (!code || missing) {
    return (
      <p className={`${archivo.className} p-6 text-center text-[14px]`} style={{ color: "#cfc6b4" }}>
        {t("cdMissing", "A certidão ainda não está pronta.")}
      </p>
    )
  }
  if (!cert) return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: "#cfc6b4" }} />

  const attrName: Record<string, string> = {
    strength: t("atStrength", "Força"),
    speed: t("atSpeed", "Velocidade"),
    dexterity: t("attrDexterity", "Destreza"),
    intelligence: t("atIntelligence", "Inteligência"),
    accuracy: t("attrAccuracy", "Acurácia"),
  }
  const temper = (x: string | null | undefined) => (x ? (temperLabel(x as Temper, t) ?? x) : "—")
  const date = (v: string | null) => (v ? new Date(v).toLocaleDateString(locale) : "—")
  // certidões das primeiras horas (09/11) vieram do sorteio: `drawn` no lugar de `species` e `temper` em objeto
  const old = (cert.genetics.mix ?? null) as (CertificateMix & { drawn?: "a" | "b"; temper: unknown }) | null
  const mix: CertificateMix | null = old
    ? {
        ...old,
        species: old.species ?? old.drawn ?? "a",
        temper: typeof old.temper === "object" && old.temper ? ((old.temper as { result?: string | null }).result ?? null) : ((old.temper as string | null) ?? null),
      }
    : null
  const origin = ORIGIN[cert.origin] ?? [`cdOrigin_${cert.origin}`, cert.origin]
  const sideName = (s: CertificateMixSide) =>
    s.kind === "genetics" ? t("cdGeneOf", "Genética de {s}").replace("{s}", speciesName(s.species, t)) : s.name || speciesName(s.species, t)
  const who = (k: "a" | "b") => (mix ? sideName(mix[k]) : "")

  const field = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: PAPER.soft }}>
        {label}
      </div>
      <div className="truncate text-[15px] font-semibold" style={{ color: PAPER.ink }}>
        {value}
      </div>
    </div>
  )
  const heading = (txt: string) => (
    <h3 className={`${cinzel.className} mt-5 border-b pb-1 text-[14px] font-bold uppercase tracking-[0.14em]`} style={{ color: PAPER.ink, borderColor: PAPER.line }}>
      {txt}
    </h3>
  )

  const side = (k: "a" | "b") => {
    if (!mix) return null
    const s = mix[k]
    const first = k === "a"
    const gaveSpecies = mix.species === k
    return (
      <div className="relative min-w-0 flex-1 p-3" style={{ border: `1.5px solid ${first ? PAPER.seal : PAPER.line}`, background: first ? "rgba(156,42,36,.06)" : "transparent" }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: PAPER.soft }}>
          {s.kind === "genetics" ? t("cdSideGene", "Genética comprada") : s.serialText || serialText(s.serial)}
        </div>
        <div className={`${teko.className} mt-0.5 truncate text-[22px] uppercase leading-none`} style={{ color: PAPER.ink }}>
          {sideName(s)}
        </div>
        <div className="mt-1 text-[12px]" style={{ color: PAPER.soft }}>
          {speciesName(s.species, t)}
          {s.kind === "character" && ` · ${t("cdTemper", "Personalidade")}: ${temper(s.temper)}`}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {first && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold" style={{ background: PAPER.ink, color: PAPER.bg }}>
              {t("cdFirstTag", "1º · personalidade e atributos")}
            </span>
          )}
          {gaveSpecies && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold" style={{ border: `1px solid ${PAPER.gold}`, color: PAPER.gold }}>
              {t("cdSpeciesTag", "Espécie")}
            </span>
          )}
        </div>
        {s.kind === "character" && s.certCode && (
          <a href={`/meu-mundo/certificado/${s.certCode}`} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold underline" style={{ color: PAPER.soft }}>
            {t("cdParentCert", "Certidão dele")} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  return (
    <article
      className={`${archivo.className} relative mx-auto w-full max-w-[640px] ${compact ? "p-4" : "p-6"}`}
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, #F6EDD5 0%, ${PAPER.bg} 55%, #E2D2AC 100%)`,
        color: PAPER.ink,
        boxShadow: `inset 0 0 0 1px ${PAPER.edge}, inset 0 0 0 6px ${PAPER.bg}, inset 0 0 0 7px ${PAPER.edge}, 0 10px 30px rgba(0,0,0,.45)`,
      }}
    >
      {/* cabeçalho */}
      <div className="text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: PAPER.soft }}>
          {t("cdIssuer", "Laboratório de Criogenia de Lúmen")}
        </div>
        <h2 className={`${cinzel.className} mt-1 text-[24px] font-extrabold uppercase leading-tight tracking-[0.1em] max-[759px]:text-[19px]`}>
          {t("cdTitle", "Certidão de Nascimento")}
        </h2>
        <div className="mt-1 font-mono text-[20px] font-black tracking-[0.08em]" style={{ color: PAPER.seal }}>
          {cert.serialText}
        </div>
        <div className={`${teko.className} text-[28px] uppercase leading-none`}>{cert.name || speciesName(cert.species, t)}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {field(t("ctSpecies", "Espécie"), speciesName(cert.species, t))}
        {field(t("ctSex", "Sexo"), cert.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho"))}
        {field(t("ctBorn", "Nascimento"), date(cert.bornAt))}
        {field(t("ctOrigin", "Origem"), t(origin[0], origin[1]))}
        {field(t("ctLineage", "Geração da linhagem"), cert.lineage)}
        {field(t("ctBirthHeight", "Altura ao nascer"), `${cert.genetics.birthHeight.toFixed(2).replace(".", ",")} m`)}
      </div>

      {/* misturas */}
      {heading(t("cdMixes", "Misturas"))}
      <p className="mt-2 text-[14px]">
        {mix
          ? mix.count === 1
            ? t("cdMixedOnce", "Misturado 1 vez na linhagem.")
            : t("cdMixedN", "Misturado {n} vezes na linhagem.").replace("{n}", String(mix.count))
          : t("cdNeverMixed", "Nunca foi misturado: nasceu sem pais de laboratório.")}
      </p>

      {mix && (
        <>
          <div className="mt-3 flex items-stretch gap-2 max-[480px]:flex-col">
            {side("a")}
            <div className={`${cinzel.className} self-center text-[22px] font-extrabold`} style={{ color: PAPER.soft }} aria-hidden>
              ×
            </div>
            {side("b")}
          </div>
          <p className="mt-2 text-[13px]" style={{ color: PAPER.soft }}>
            {t("cdSpeciesLine", "Espécie escolhida: {s} (de {w}).").replace("{s}", speciesName(mix[mix.species].species, t)).replace("{w}", who(mix.species))}
          </p>

          {heading(t("cdInheritFirst", "Herança: 20% de cada atributo do primeiro"))}
          <ul className="mt-2 grid gap-1 text-[14px]">
            {ATTRS.map((k) => {
              const v = Math.round((cert.genetics.inherited?.[k] ?? 0) * 10) / 10
              return (
                <li key={k} className="flex items-baseline justify-between gap-3 border-b pb-1" style={{ borderColor: PAPER.line }}>
                  <span>{attrName[k]}</span>
                  <span className="text-right">
                    <b>+{v.toLocaleString(locale)}</b>{" "}
                    <span className="text-[12px]" style={{ color: PAPER.soft }}>
                      {v > 0 ? t("cdFrom", "de {s}").replace("{s}", who("a")) : t("cdNothing", "nada a herdar")}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          {heading(t("cdPersonality", "Personalidade"))}
          <p className="mt-2 text-[14px]">
            {t("cdKeptFirst", "Herdou {a} de {s}, o primeiro da mistura.").replace("{a}", temper(mix.temper)).replace("{s}", who("a"))}
          </p>
        </>
      )}

      {/* genética de nascença */}
      {heading(t("ctGenetics", "Genética de nascença"))}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
        {field(t("ctTemper", "Temperamento"), temper(cert.genetics.temper))}
        {field(t("ctSeed", "Semente"), <span className="font-mono">{cert.genetics.seed}</span>)}
        {field(t("ctActiveDays", "Idade ativa"), t("chDays", "{n} dias de vida").replace("{n}", String(cert.activeDays)))}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <a href={`/meu-mundo/certificado/${code}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[12px] font-semibold underline" style={{ color: PAPER.soft }}>
          {t("cdPublic", "Ver a certidão pública")} <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {/* o selo */}
        <div
          className={`${cinzel.className} grid h-16 w-16 shrink-0 rotate-[-12deg] place-items-center rounded-full text-center text-[9px] font-extrabold uppercase leading-tight`}
          style={{ border: `2px solid ${PAPER.seal}`, color: PAPER.seal, boxShadow: `inset 0 0 0 3px ${PAPER.bg}, inset 0 0 0 4px ${PAPER.seal}` }}
          aria-hidden
        >
          {t("cdSeal", "Lúmen")}
          <br />
          {cert.serialText.slice(-4)}
        </div>
      </div>
    </article>
  )
}
