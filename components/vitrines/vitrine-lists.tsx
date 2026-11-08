"use client"

// A2 + A4 (mig 338): as abas EMPREGOS e DÍVIDAS da comunidade.
//
// Empregos mostra SÓ quem procura (decisão do Alex): quem ligou "Preciso de
// emprego" aparece sozinho, e quem quer contratar chama pela mensagem. O
// alcance só ORDENA (mesma cidade → área → região → estado → Brasil), nunca
// esconde — a ordem vem pronta do servidor.
//
// Dívidas é o feed de boletos recortado pela comunidade (sem membresia = Brasil).

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Loader2, MapPin, MessageCircle, Receipt } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { vitrinesApi, type DebtBill, type JobSeeker } from "@/lib/vitrines-api"
import { DebtBillCard, DebtDisclaimer, VITRINE_CARD } from "./debt-bill-card"

function useLoader<T>(load: (offset: number) => Promise<T[]>, page = 30) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchPage = useCallback(
    async (offset: number) => {
      setLoading(true)
      setError(null)
      try {
        const rows = await load(offset)
        setItems((cur) => (offset ? [...cur, ...rows] : rows))
        setMore(rows.length >= page)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [load, page]
  )
  useEffect(() => {
    void fetchPage(0)
  }, [fetchPage])
  return { items, loading, more, error, reload: () => fetchPage(0), next: () => fetchPage(items.length) }
}

function MoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const t = useTranslations("Vitrines")
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="fl-sharp mx-auto mt-4 flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {t("loadMore", "Carregar mais")}
    </button>
  )
}

export function CommunityJobs({ communityId, accent = "#F2B705" }: { communityId: string; accent?: string }) {
  const t = useTranslations("Vitrines")
  const load = useCallback((offset: number) => vitrinesApi.communityJobs(communityId, offset).then((r) => r.people), [communityId])
  const { items, loading, more, error, next } = useLoader<JobSeeker>(load)

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-[#9A938A]">
          {t("jobsIntro", "Pessoas que procuram trabalho. Quem está perto aparece primeiro. Para contratar, mande uma mensagem.")}
        </p>
        <Link
          href="/account#preciso"
          className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
        >
          <Briefcase className="h-3.5 w-3.5" /> {t("jobsMeToo", "Também procuro emprego")}
        </Link>
      </div>
      {error && <p className="text-sm text-[#F2B705]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className={`${VITRINE_CARD} text-sm text-[#9A938A]`}>{t("jobsEmpty", "Ninguém procurando emprego aqui por enquanto.")}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => {
          const name = p.display_name || p.username || t("someone", "Alguém")
          const href = `/freelancer/${p.id_profile}`
          const place = [p.city_name, p.uf].filter(Boolean).join(" · ")
          return (
            <article key={p.id_profile} className={VITRINE_CARD}>
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-[#1D1810]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#F5F1E8]">{name}</p>
                  {p.profession && <p className="truncate text-xs" style={{ color: accent }}>{p.profession}</p>}
                  {place && (
                    <p className="flex items-center gap-1 truncate text-[11px] text-[#9A938A]">
                      <MapPin className="h-3 w-3 shrink-0" /> {place}
                    </p>
                  )}
                </div>
              </div>
              {p.job_pitch && <p className="mt-3 text-sm leading-relaxed text-[#C9C2B6]">{p.job_pitch}</p>}
              {!p.mine && href && (
                <div className="mt-3 flex gap-2">
                  <Link
                    href={href}
                    className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                    style={{ background: accent }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {t("jobsContact", "Ver perfil e chamar")}
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </div>
      {loading && <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-[#9A938A]" />}
      {more && !loading && <MoreButton onClick={next} loading={loading} />}
    </section>
  )
}

/** Lista de boletos — serve a aba Dívidas da comunidade e o feed nacional. */
export function DebtList({ load, accent = "#F2B705" }: { load: (offset: number) => Promise<DebtBill[]>; accent?: string }) {
  const t = useTranslations("Vitrines")
  const { items, loading, more, error, next, reload } = useLoader<DebtBill>(load)
  return (
    <section className="space-y-3">
      <DebtDisclaimer />
      {error && <p className="text-sm text-[#F2B705]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className={`${VITRINE_CARD} text-sm text-[#9A938A]`}>{t("dbEmpty", "Nenhum boleto esperando ajuda agora.")}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((b) => (
          <DebtBillCard key={b.id_bill} bill={b} accent={accent} onChanged={reload} />
        ))}
      </div>
      {loading && <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-[#9A938A]" />}
      {more && !loading && <MoreButton onClick={next} loading={loading} />}
    </section>
  )
}

export function CommunityDebts({ communityId, accent = "#F2B705" }: { communityId: string; accent?: string }) {
  const t = useTranslations("Vitrines")
  const load = useCallback((offset: number) => vitrinesApi.communityDebts(communityId, offset).then((r) => r.bills), [communityId])
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-[#9A938A]">
          {t("debtsIntro", "Boletos de quem precisa de ajuda. Quem ajuda paga direto no app do próprio banco.")}
        </p>
        <Link
          href="/dividas"
          className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
        >
          <Receipt className="h-3.5 w-3.5" /> {t("debtsAll", "Feed do Brasil e meus boletos")}
        </Link>
      </div>
      <DebtList load={load} accent={accent} />
    </div>
  )
}
