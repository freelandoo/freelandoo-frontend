"use client"

// A6 CLASSIFICAÇÃO (migs 395/396).
//
//   PROVA: 20 perguntas escolhidas uma a uma pelo nível da pessoa (TRI 2PL),
//   economia e finanças com peso maior. Nota 0–100 (50 = média). O gabarito
//   nunca sai do servidor. Refaz a cada 30 dias; prova aberta fecha sozinha
//   em 60 min com o que foi respondido.
//
//   NOTA: privada (padrão), por link ou no perfil. Voltar a privada mata o link.
//
//   PERSONALIDADE (Big Five, IPIP-50): PERFIL, não diagnóstico. Só com
//   consentimento explícito (LGPD, dado sensível), guardada selada, NUNCA
//   visível a terceiros, apagável a qualquer momento.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Copy, Loader2, Lock, Trash2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { classApi, type Attempt, type ClassMe, type Traits, type Visibility } from "@/lib/classificacao-api"
import { IPIP50, TRAIT_ORDER } from "@/features/classificacao/ipip50"

const CARD = "fl-sharp border-2 border-[#0B0B0D] bg-[#15120E] p-5"
const BTN = "fl-sharp inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] disabled:opacity-50"
const GOLD = "#F2B705"

export default function ClassificacaoPage() {
  const t = useTranslations("Classificacao")
  const [me, setMe] = useState<ClassMe | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    classApi
      .me()
      .then((r) => {
        setMe(r)
        setAttempt(r.open)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(reload, [reload])

  return (
    <main className="fl-sharp mx-auto min-h-[100dvh] max-w-3xl px-4 pb-28 pt-6 text-[#F5F1E8]">
      <PageBackLink href="/account" />
      <h1 className="fl-display mt-4 text-3xl md:text-4xl">{t("title", "Classificação")}</h1>
      <p className="mt-1 text-sm text-[#9A938A]">
        {t("subtitle", "Uma prova de economia, finanças, história, geografia e conhecimentos gerais. A nota vai de 0 a 100 e só aparece para quem você quiser.")}
      </p>
      {error && <p className="mt-4 text-sm text-[#F2B705]">{error}</p>}
      {!me && !error && <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-[#9A938A]" />}
      {me && (
        <div className="mt-6 space-y-6">
          {attempt && attempt.status === "open" ? (
            <TestRunner
              attempt={attempt}
              onUpdate={(a) => {
                setAttempt(a)
                if (a.status !== "open") reload()
              }}
            />
          ) : (
            <ScoreCard me={me} onStart={setAttempt} onChanged={reload} />
          )}
          <PersonalitySection initial={me.personality} />
        </div>
      )}
    </main>
  )
}

function ScoreCard({ me, onStart, onChanged }: { me: ClassMe; onStart: (a: Attempt) => void; onChanged: () => void }) {
  const t = useTranslations("Classificacao")
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const r = me.result
  const canStart = !me.next_at || new Date(me.next_at).getTime() <= Date.now()

  const start = async () => {
    setBusy(true)
    setMsg(null)
    try {
      onStart((await classApi.start(locale)).attempt)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const setVis = async (v: Visibility) => {
    setBusy(true)
    setMsg(null)
    try {
      await classApi.visibility(v)
      onChanged()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const link = r?.share_token && typeof window !== "undefined" ? `${window.location.origin}/classificacao/nota/${r.share_token}` : null

  return (
    <section className={CARD}>
      {r ? (
        <>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("yourScore", "Sua nota")}</p>
          <p className="mt-1 text-6xl font-black tabular-nums" style={{ color: GOLD }}>
            {Math.round(r.score)}
          </p>
          <p className="text-xs text-[#9A938A]">
            {t("scoreScale", "De 0 a 100; 50 é a média.")} {t("doneAt", "Feita em {d}.").replace("{d}", new Date(r.finished_at).toLocaleDateString(locale))}
          </p>
          {r.areas && <AreaBars areas={r.areas} />}

          <div className="mt-5">
            <p className="text-xs font-bold text-[#C9C2B6]">{t("whoSees", "Quem vê a sua nota")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["private", t("visPrivate", "Só eu")],
                  ["link", t("visLink", "Quem tiver o link")],
                  ["profile", t("visProfile", "No meu perfil")],
                ] as [Visibility, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  onClick={() => v !== r.visibility && setVis(v)}
                  className={`${BTN} ${r.visibility === v ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {link && (
              <div className="mt-3 flex items-stretch gap-2">
                <code className="min-w-0 flex-1 truncate border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-[11px]">{link}</code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1800)
                    } catch {
                      /* o link está na tela */
                    }
                  }}
                  className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
                  aria-label={t("copyLink", "Copiar link")}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[#C9C2B6]">
            {t("intro", "São {n} perguntas, uma de cada vez, escolhidas pelo seu nível. Você tem {m} minutos. Dá para refazer a cada {d} dias.")
              .replace("{n}", String(me.test_length))
              .replace("{m}", String(me.minutes))
              .replace("{d}", String(me.retake_days))}
          </p>
        </>
      )}
      <div className="mt-5">
        {canStart ? (
          <button type="button" disabled={busy} onClick={start} className={`${BTN} bg-[#F2B705] text-[#0B0B0D]`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {r ? t("retake", "Refazer a prova") : t("start", "Começar a prova")}
          </button>
        ) : (
          <p className="text-xs text-[#9A938A]">
            {t("nextAt", "Você pode refazer a partir de {d}.").replace("{d}", new Date(me.next_at!).toLocaleDateString(locale))}
          </p>
        )}
      </div>
      {msg && <p className="mt-3 text-xs text-[#F2B705]">{msg}</p>}
    </section>
  )
}

function AreaBars({ areas }: { areas: Record<string, { n: number; ok: number }> }) {
  const t = useTranslations("Classificacao")
  const names: Record<string, string> = {
    economia: t("areaEconomia", "Economia"),
    financas: t("areaFinancas", "Finanças"),
    historia: t("areaHistoria", "História"),
    geografia: t("areaGeografia", "Geografia"),
    gerais: t("areaGerais", "Conhecimentos gerais"),
  }
  return (
    <div className="mt-4 space-y-1.5">
      {Object.entries(areas).map(([k, v]) => (
        <div key={k} className="flex items-center gap-3 text-xs">
          <span className="w-40 shrink-0 text-[#C9C2B6]">{names[k] || k}</span>
          <span className="tabular-nums text-[#9A938A]">
            {t("rightOf", "{ok} de {n}").replace("{ok}", String(v.ok)).replace("{n}", String(v.n))}
          </span>
        </div>
      ))}
    </div>
  )
}

function TestRunner({ attempt, onUpdate }: { attempt: Attempt; onUpdate: (a: Attempt) => void }) {
  const t = useTranslations("Classificacao")
  const [choice, setChoice] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, new Date(attempt.expires_at).getTime() - now)
  const item = attempt.item

  const send = async () => {
    if (!item || choice == null) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await classApi.answer(attempt.id_attempt, item.id, choice)
      setChoice(null)
      onUpdate(r.attempt)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between text-xs text-[#9A938A]">
        <span>
          {t("progress", "Pergunta {i} de {n}").replace("{i}", String(attempt.answered + 1)).replace("{n}", String(attempt.total))}
        </span>
        <span className="tabular-nums">
          {String(Math.floor(left / 60000)).padStart(2, "0")}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-[#0B0B0D]">
        <div className="h-full" style={{ width: `${(attempt.answered / attempt.total) * 100}%`, background: GOLD }} />
      </div>
      {item ? (
        <>
          <p className="mt-5 text-lg font-bold leading-snug">{item.stem}</p>
          <div className="mt-4 space-y-2">
            {item.options.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setChoice(i)}
                className={`fl-sharp block w-full border-2 px-3 py-2.5 text-left text-sm ${choice === i ? "border-[#F2B705] bg-[#2A2208]" : "border-[#0B0B0D] bg-[#1D1810]"}`}
              >
                <span className="mr-2 font-black text-[#9A938A]">{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            ))}
          </div>
          {item.attribution && <p className="mt-3 text-[10px] text-[#9A938A]">{item.attribution}</p>}
          <button type="button" disabled={busy || choice == null} onClick={send} className={`${BTN} mt-5 bg-[#F2B705] text-[#0B0B0D]`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("answer", "Responder")}
          </button>
        </>
      ) : (
        <p className="mt-5 text-sm text-[#9A938A]">{t("closing", "Fechando a prova…")}</p>
      )}
      {msg && <p className="mt-3 text-xs text-[#F2B705]">{msg}</p>}
    </section>
  )
}

function PersonalitySection({ initial }: { initial: ClassMe["personality"] }) {
  const t = useTranslations("Classificacao")
  const locale = useLocale()
  const [consent, setConsent] = useState(initial.consent)
  const [traits, setTraits] = useState<Traits | null>(null)
  const [answers, setAnswers] = useState<number[]>(() => Array(50).fill(0))
  const [taking, setTaking] = useState(false)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const texts = useMemo(() => IPIP50[(locale as keyof typeof IPIP50) in IPIP50 ? (locale as keyof typeof IPIP50) : "pt-BR"], [locale])

  useEffect(() => {
    if (!initial.has_profile) return
    classApi
      .personality()
      .then((r) => setTraits(r.profile?.traits ?? null))
      .catch(() => {})
  }, [initial.has_profile])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const traitName: Record<string, string> = {
    extraversion: t("trExtraversion", "Extroversão"),
    agreeableness: t("trAgreeableness", "Amabilidade"),
    conscientiousness: t("trConscientiousness", "Conscienciosidade"),
    stability: t("trStability", "Estabilidade emocional"),
    openness: t("trOpenness", "Abertura"),
  }
  const scale = [
    t("lk1", "Discordo totalmente"),
    t("lk2", "Discordo"),
    t("lk3", "Neutro"),
    t("lk4", "Concordo"),
    t("lk5", "Concordo totalmente"),
  ]

  return (
    <section className={CARD}>
      <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        <Lock className="h-3.5 w-3.5" /> {t("pTitle", "Perfil de personalidade (só você vê)")}
      </p>
      <p className="mt-2 text-sm text-[#C9C2B6]">
        {t("pIntro", "50 afirmações do Big Five (IPIP, domínio público). É um perfil para você se conhecer, não um diagnóstico. Fica guardado criptografado, ninguém mais vê, e você apaga quando quiser.")}
      </p>

      {traits && !taking && (
        <div className="mt-4 space-y-2">
          {TRAIT_ORDER.map((k) => (
            <div key={k}>
              <div className="flex justify-between text-xs">
                <span>{traitName[k]}</span>
                <span className="tabular-nums text-[#9A938A]">{traits[k]}</span>
              </div>
              <div className="mt-1 h-1.5 bg-[#0B0B0D]">
                <div className="h-full" style={{ width: `${traits[k]}%`, background: GOLD }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!consent ? (
        <div className="mt-4 space-y-3">
          <p className="fl-sharp border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-relaxed text-[#C9C2B6]">
            {t(
              "pConsentText",
              "Autorizo a Freelandoo a guardar minhas respostas e o resultado deste perfil de personalidade, que é dado pessoal sensível (LGPD, art. 11), só para eu mesmo(a) ver. Ele não é mostrado a ninguém, não é usado para anúncios nem decisões sobre mim, e posso apagar tudo e retirar esta autorização a qualquer momento."
            )}
          </p>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            {t("pAgree", "Li e autorizo.")}
          </label>
          <button
            type="button"
            disabled={!agree || busy}
            onClick={() =>
              run(async () => {
                await classApi.consent(initial.consent_version)
                setConsent(true)
                setTaking(true)
              })
            }
            className={`${BTN} bg-[#F2B705] text-[#0B0B0D]`}
          >
            {t("pGrant", "Autorizar e responder")}
          </button>
        </div>
      ) : taking ? (
        <div className="mt-4 space-y-4">
          {texts.map((txt, i) => (
            <div key={i} className="border-b border-[#2A241B] pb-3">
              <p className="text-sm">
                <span className="mr-2 text-[#9A938A]">{i + 1}.</span>
                {t(`ipip${i + 1}`, txt)}
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1">
                {scale.map((label, v) => (
                  <button
                    key={v}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? v + 1 : x)))}
                    className={`fl-sharp border-2 py-1.5 text-[10px] leading-tight ${answers[i] === v + 1 ? "border-[#F2B705] bg-[#2A2208] text-[#F5F1E8]" : "border-[#0B0B0D] bg-[#1D1810] text-[#9A938A]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={busy || answers.some((a) => a < 1)}
            onClick={() =>
              run(async () => {
                const r = await classApi.savePersonality(answers)
                setTraits(r.profile.traits)
                setTaking(false)
              })
            }
            className={`${BTN} bg-[#F2B705] text-[#0B0B0D]`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("pSave", "Ver meu perfil")} ({answers.filter((a) => a > 0).length}/50)
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setTaking(true)} className={`${BTN} bg-[#F2B705] text-[#0B0B0D]`}>
            {traits ? t("pRedo", "Responder de novo") : t("pStart", "Responder")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await classApi.deletePersonality()
                setTraits(null)
                setConsent(false)
                setAgree(false)
                setAnswers(Array(50).fill(0))
                setMsg(t("pDeleted", "Apagado. A autorização também foi retirada."))
              })
            }
            className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
          >
            <Trash2 className="h-4 w-4" /> {t("pDelete", "Apagar e retirar autorização")}
          </button>
        </div>
      )}
      {msg && <p className="mt-3 text-xs text-[#F2B705]">{msg}</p>}
    </section>
  )
}
