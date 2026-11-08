"use client"

// app/meu-mundo/certificado/[code]/page.tsx — B3 (mig 340): o CERTIFICADO público de um
// personagem do Meu Mundo, por link (código de 12 caracteres, não o número de série).
// Mostra número de série, espécie, sexo, nascimento, genética (semente, personalidade,
// temperamento, atributos e altura de nascença), pais e avós, geração, idade ativa e
// picos. Do dono, só o apelido do jogo (o servidor projeta campo a campo).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { fetchCertificate } from "@/features/meu-mundo/data"
import type { CertificateParent, CharacterCertificate } from "@/features/meu-mundo/types"
import { speciesName } from "@/features/meu-mundo/characters/names"

const ATTR_KEYS = ["strength", "speed", "dexterity", "intelligence", "accuracy"] as const

export default function CertificadoPage() {
  const t = useTranslations("MeuMundo")
  const locale = useLocale()
  const params = useParams<{ code: string }>()
  const [cert, setCert] = useState<CharacterCertificate | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!params?.code) return
    void fetchCertificate(params.code).then((c) => (c ? setCert(c) : setMissing(true)))
  }, [params?.code])

  const attrName: Record<string, string> = {
    strength: t("atStrength", "Força"),
    speed: t("atSpeed", "Velocidade"),
    dexterity: t("attrDexterity", "Destreza"),
    intelligence: t("atIntelligence", "Inteligência"),
    accuracy: t("attrAccuracy", "Acurácia"),
  }
  const date = (v: string | null) => (v ? new Date(v).toLocaleDateString(locale) : "—")
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-[#2A241B] py-1.5 text-sm">
      <span className="text-[#9A938A]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
  const parentLine = (p: CertificateParent) => (
    <Link href={`/meu-mundo/certificado/${p.certCode}`} className="text-[#F2B705] hover:underline">
      {p.serialText} · {speciesName(p.species, t)}
    </Link>
  )

  return (
    <main className="fl-sharp mx-auto min-h-[100dvh] max-w-xl overflow-y-auto bg-[#0b0804] px-4 pb-24 pt-6 text-[#F5F1E8]">
      <PageBackLink href="/meu-mundo/admin" />
      {missing ? (
        <p className="mt-10 text-center text-sm text-[#9A938A]">{t("ctMissing", "Certificado não encontrado.")}</p>
      ) : !cert ? (
        <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-[#9A938A]" />
      ) : (
        <section className="fl-sharp mt-6 border-2 border-[#F2B705] bg-[#15120E] p-5">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#9A938A]">{t("ctTitle", "Certificado de personagem · Meu Mundo")}</p>
          <p className="mt-2 text-center font-mono text-2xl font-black text-[#F2B705]">{cert.serialText}</p>
          <p className="mt-1 text-center text-lg font-bold">{cert.name || speciesName(cert.species, t)}</p>
          <div className="mt-5">
            {row(t("ctSpecies", "Espécie"), speciesName(cert.species, t))}
            {row(t("ctSex", "Sexo"), cert.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho"))}
            {row(t("ctBorn", "Nascimento"), date(cert.bornAt))}
            {row(t("ctOrigin", "Origem"), cert.origin)}
            {row(t("ctLineage", "Geração da linhagem"), cert.lineage)}
            {row(t("ctActiveDays", "Idade ativa"), t("chDays", "{n} dias de vida").replace("{n}", String(cert.activeDays)))}
            {row(t("ctHeight", "Altura"), `${cert.height.toFixed(2).replace(".", ",")} m`)}
            {row(t("ctStatus", "Situação"), cert.status === "dead" ? `${t("ctDead", "Morreu")} ${date(cert.diedAt)}` : cert.status === "fused" ? t("ctFused", "Fundido") : t("ctAlive", "Vivo"))}
            {cert.owner && row(t("ctOwner", "Dono (apelido no jogo)"), cert.owner)}
          </div>

          <h2 className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("ctGenetics", "Genética de nascença")}</h2>
          <div className="mt-1">
            {row(t("ctSeed", "Semente"), <span className="font-mono">{cert.genetics.seed}</span>)}
            {row(t("ctTemper", "Temperamento"), cert.genetics.temper || "—")}
            {row(t("ctBirthHeight", "Altura ao nascer"), `${cert.genetics.birthHeight.toFixed(2).replace(".", ",")} m`)}
            {ATTR_KEYS.map((k) => row(attrName[k], Math.round(cert.genetics.attrs?.[k] ?? 0)))}
          </div>

          <h2 className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("ctPeaks", "Picos")}</h2>
          <div className="mt-1">{ATTR_KEYS.map((k) => row(attrName[k], cert.peaks?.[k] ?? 0))}</div>

          <h2 className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("ctParents", "Pais e avós")}</h2>
          {cert.parents.length === 0 ? (
            <p className="mt-1 text-sm text-[#9A938A]">{t("ctNoParents", "Primeira geração: sem pais registrados.")}</p>
          ) : (
            <ul className="mt-1 space-y-2 text-sm">
              {cert.parents.map((p) => (
                <li key={p.certCode}>
                  {parentLine(p)}
                  {p.parents.length > 0 && (
                    <ul className="ml-4 mt-1 space-y-1 text-xs">
                      {p.parents.map((g) => (
                        <li key={g.certCode}>{parentLine(g)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
