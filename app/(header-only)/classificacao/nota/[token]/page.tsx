"use client"

// A6: a nota aberta por link (visibilidade "link" ou "perfil"). Sem login.
// Voltar a nota para "privada" mata o link — aqui só aparece "não encontrada".

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { classApi } from "@/lib/classificacao-api"

type Pub = Awaited<ReturnType<typeof classApi.publicByToken>>

export default function NotaPublicaPage() {
  const t = useTranslations("Classificacao")
  const locale = useLocale()
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<Pub | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!params?.token) return
    classApi
      .publicByToken(params.token)
      .then(setData)
      .catch(() => setMissing(true))
  }, [params?.token])

  return (
    <main className="fl-sharp mx-auto min-h-[100dvh] max-w-xl px-4 pb-24 pt-6 text-[#F5F1E8]">
      <PageBackLink href="/classificacao" />
      <section className="fl-sharp mt-6 border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-center">
        {missing ? (
          <p className="text-sm text-[#9A938A]">{t("pubMissing", "Esta nota não está disponível.")}</p>
        ) : !data ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#9A938A]" />
        ) : (
          <>
            {data.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatar} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />
            )}
            <p className="mt-3 text-sm font-bold">{data.name || (data.username ? `@${data.username}` : "")}</p>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("pubLabel", "Nota na Classificação Freelandoo")}</p>
            <p className="mt-1 text-7xl font-black tabular-nums text-[#F2B705]">{Math.round(data.score)}</p>
            <p className="mt-1 text-xs text-[#9A938A]">
              {t("scoreScale", "De 0 a 100; 50 é a média.")} {t("doneAt", "Feita em {d}.").replace("{d}", new Date(data.finished_at).toLocaleDateString(locale))}
            </p>
          </>
        )}
      </section>
    </main>
  )
}
