"use client"

// A2 (mig 338): as duas chaves da pessoa, no /account.
//
//   "Preciso de emprego"    → o perfil-conta aparece sozinho na aba Empregos
//                             das comunidades (16+), com uma frase opcional.
//   "Preciso pagar dívidas" → libera postar boletos no feed (CPF + 18+).
//
// Desligar vale na hora: some da aba e os boletos saem do feed.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Loader2, Receipt } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { vitrinesApi, type Needs } from "@/lib/vitrines-api"

function Switch({ on, disabled, onClick, label }: { on: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`fl-sharp relative h-7 w-12 shrink-0 border-2 border-[#0B0B0D] transition-colors disabled:opacity-50 ${on ? "bg-[#F2B705]" : "bg-[#2A241B]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 border-2 border-[#0B0B0D] bg-[#F5F1E8] transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  )
}

export function NeedsSection() {
  const t = useTranslations("Vitrines")
  const [needs, setNeeds] = useState<Needs | null>(null)
  const [pitch, setPitch] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    vitrinesApi
      .needs()
      .then((r) => {
        setNeeds(r.needs)
        setPitch(r.needs.job_pitch || "")
      })
      .catch(() => setNeeds(null))
  }, [])

  const save = async (key: string, patch: Parameters<typeof vitrinesApi.updateNeeds>[0]) => {
    setBusy(key)
    setMsg(null)
    try {
      const r = await vitrinesApi.updateNeeds(patch)
      setNeeds(r.needs)
      if (key === "pitch") setMsg(t("ndSaved", "Salvo."))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (!needs) return null

  return (
    <section id="preciso" className="mb-20 scroll-mt-24">
      <h2 className="fl-display text-2xl text-[#F5F1E8] md:text-3xl">{t("ndTitle", "Preciso de ajuda")}</h2>
      <p className="mt-1 text-sm text-[#9A938A]">
        {t("ndSubtitle", "Ligue o que você precisa. Dá para desligar a qualquer momento.")}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="fl-sharp border-2 border-[#0B0B0D] bg-[#15120E] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-[#F5F1E8]">
                <Briefcase className="h-4 w-4 text-[#F2B705]" /> {t("ndJob", "Preciso de emprego")}
              </p>
              <p className="mt-1 text-xs text-[#9A938A]">
                {t("ndJobText", "Seu perfil aparece na aba Empregos das comunidades. Quem quer contratar te chama por mensagem.")}
              </p>
            </div>
            <Switch
              label={t("ndJob", "Preciso de emprego")}
              on={needs.needs_job}
              disabled={!!busy || (!needs.needs_job && !needs.job_allowed)}
              onClick={() => save("job", { needs_job: !needs.needs_job })}
            />
          </div>
          {!needs.job_allowed && (
            <p className="mt-2 text-[11px] text-[#C9A227]">{t("ndJobAge", "Disponível a partir dos 16 anos (confira sua data de nascimento).")}</p>
          )}
          {needs.needs_job && (
            <div className="mt-3">
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder={t("ndPitchPh", "Em uma frase: o que você faz e o que procura.")}
                className="fl-sharp w-full border-2 border-[#0B0B0D] bg-[#0B0B0D] p-2 text-sm text-[#F5F1E8]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#9A938A]">{pitch.length}/280</span>
                <button
                  type="button"
                  disabled={!!busy || pitch === (needs.job_pitch || "")}
                  onClick={() => save("pitch", { job_pitch: pitch })}
                  className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] disabled:opacity-50"
                >
                  {busy === "pitch" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("ndSave", "Salvar")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="fl-sharp border-2 border-[#0B0B0D] bg-[#15120E] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-[#F5F1E8]">
                <Receipt className="h-4 w-4 text-[#F2B705]" /> {t("ndDebt", "Preciso pagar dívidas")}
              </p>
              <p className="mt-1 text-xs text-[#9A938A]">
                {t("ndDebtText", "Libera postar boletos no feed de ajuda. Quem quiser ajudar paga direto no app do banco.")}
              </p>
            </div>
            <Switch
              label={t("ndDebt", "Preciso pagar dívidas")}
              on={needs.needs_debt_help}
              disabled={!!busy}
              onClick={() => save("debt", { needs_debt_help: !needs.needs_debt_help })}
            />
          </div>
          {needs.needs_debt_help && (!needs.has_cpf || !needs.adult) && (
            <p className="mt-2 text-[11px] text-[#C9A227]">
              {t("ndDebtReq", "Para postar boletos é preciso ter 18 anos ou mais e o CPF cadastrado.")}
            </p>
          )}
          <Link href="/dividas" className="mt-3 inline-block text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F2B705] hover:underline">
            {t("ndDebtFeed", "Abrir o feed de boletos")}
          </Link>
          {needs.helped > 0 && (
            <p className="mt-2 text-[11px] text-[#7BD88F]">
              {t("ndHelped", "Você já ajudou {n} pessoa(s).").replace("{n}", String(needs.helped))}
            </p>
          )}
        </div>
      </div>
      {msg && <p className="mt-3 text-xs text-[#F2B705]">{msg}</p>}
    </section>
  )
}
