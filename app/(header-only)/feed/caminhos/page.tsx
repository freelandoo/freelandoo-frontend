"use client"

// /feed/caminhos — MINHAS HISTÓRIAS COM CAMINHOS (Feed Interativo F5).
// Lista, cria (nasce com o começo e abre o editor) e mostra quantos começaram.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { GitBranch, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { pathsApi, type PathGraph, type PathSummary } from "@/lib/feed-fx/paths"

export default function CaminhosPage() {
  const t = useTranslations("FeedFx")
  const router = useRouter()
  const [list, setList] = useState<PathSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [logged, setLogged] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    installFeedFx()
    if (!getToken()) {
      setLogged(false)
      setLoading(false)
      return
    }
    pathsApi<{ stories: PathSummary[] }>("")
      .then((r) => setList(r.stories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const create = async () => {
    setCreating(true)
    try {
      const r = await pathsApi<{ story: PathGraph }>("", { method: "POST", body: { title: t("pathNewStory", "Nova história") } })
      fx("caminho-botoes")
      router.push(`/feed/caminhos/${r.story.id_story}`)
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      setCreating(false)
    }
  }

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <div className="max-w-2xl">
          <PageBackLink href="/feed" className="mb-5" />
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <GitBranch className="h-3.5 w-3.5" />
            {t("panelEyebrow", "Feed interativo")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">{t("pathsTitle", "Histórias com caminhos")}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            {t("pathsLead", "Monte uma história em que quem assiste escolhe o que acontece: \"Abrir a porta\" leva para um lado, \"Fugir\" para outro. Serve para aventura, quiz e tutorial.")}
          </p>

          {!logged ? (
            <p className="mt-10 font-bold text-[#F2B705]">{t("needLogin", "Entre na sua conta para usar.")}</p>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={create}
                disabled={creating}
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-[#F2B705] text-base font-black uppercase tracking-wider text-black shadow-[6px_6px_0_#000] disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                {t("pathNewStory", "Nova história")}
              </motion.button>
              {loading ? (
                <Loader2 className="mt-8 h-6 w-6 animate-spin text-[#9A938A]" />
              ) : list.length === 0 ? (
                <p className="mt-8 text-sm text-[#9A938A]">{t("pathsEmpty", "Você ainda não montou nenhuma.")}</p>
              ) : (
                <ul className="mt-8 space-y-2">
                  {list.map((s, i) => (
                    <motion.li key={s.id_story} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link
                        href={`/feed/caminhos/${s.id_story}`}
                        className="flex items-center gap-3 border-2 border-[#F5F1E8]/12 bg-[#1D1810] p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition hover:border-[#F2B705]"
                      >
                        <GitBranch className={"h-5 w-5 shrink-0 " + (s.status === "published" ? "text-[#F2B705]" : "text-[#9A938A]")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-black text-[#F5F1E8]">{s.title}</span>
                          <span className="block text-xs text-[#9A938A]">
                            {s.status === "published" ? t("pathStatusPublished", "Publicada") : t("pathStatusDraft", "Rascunho")} ·{" "}
                            {t("pathSteps", "{n}/{max} passos").replace("{n}", String(s.nodes_count)).replace("{max}", "40")} ·{" "}
                            {t("pathPlays", "{n} começaram").replace("{n}", String(s.plays_count))}
                          </span>
                        </span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Section>
    </PageShell>
  )
}
