"use client"

// A ABA DA ACADEMIA em /esportes (pedido do Alex, 2026-10-26): quem está
// conectado a uma academia ganha uma terceira aba com o nome dela, e ali mora a
// comunidade da academia — o mural, com os três botões logo abaixo do título:
// Compartilhar academia, Ranking e Postar na comunidade. Para o aluno, ESTA aba
// substituiu a página /academias/<slug> (que segue sendo da equipe e da vitrine).
//
// O mural é o MESMO `AcademyFeed` da página da academia, e postar é o mesmo
// MediaComposer com `academyId` — nenhuma segunda máquina.

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Share2, Trophy } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getStoredUser, getToken } from "@/lib/auth"
import { AcademyFeed } from "@/app/(header-only)/academias/[slug]/_components/academy-feed"
import { BTN_DARK, BTN_GOLD } from "./fitness-ui"

const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)

export type AcademyMembership = { id_academy: string; nome: string; slug: string }

export function AcademyTab({ academy, onUnlinked }: { academy: AcademyMembership; onUnlinked: () => void }) {
  const t = useTranslations("Sports")
  const router = useRouter()
  const [composerOpen, setComposerOpen] = useState(false)
  const [reload, setReload] = useState(0)
  const meId = getStoredUser()?.id_user || null

  const share = async () => {
    const url = `${window.location.origin}/academias/${academy.slug}`
    const text = t("shareText", "Treine comigo na {name}!").replace("{name}", academy.nome)
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: academy.nome, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success(t("shareCopied", "Link da academia copiado."))
    } catch {
      // cancelado pela pessoa: nada a fazer
    }
  }

  const unlink = async () => {
    if (!window.confirm(t("unlinkConfirm", "Desconectar sua matrícula desta academia?"))) return
    const res = await fetch(`/api/academies/${academy.id_academy}/link`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
    })
    if (res.ok) {
      toast.success(t("unlinked", "Academia desconectada."))
      onUnlinked()
      router.refresh()
    } else {
      toast.error(t("unlinkError", "Não deu para desconectar agora."))
    }
  }

  const btn = "flex flex-1 items-center justify-center gap-2 px-3 py-3 text-[11px]"

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 px-3 md:px-0">
        <button type="button" onClick={() => void share()} className={`${BTN_DARK} ${btn}`}>
          <Share2 className="h-4 w-4 text-[#FB923C]" />
          <span className="truncate">{t("shareAcademy", "Compartilhar academia")}</span>
        </button>
        <Link href={`/academias/${academy.slug}/ranking`} className={`${BTN_DARK} ${btn}`}>
          <Trophy className="h-4 w-4 text-[#FB923C]" />
          <span className="truncate">{t("ranking", "Ranking")}</span>
        </Link>
        <button type="button" onClick={() => setComposerOpen(true)} className={`${BTN_GOLD} ${btn}`}>
          <Plus className="h-4 w-4" />
          <span className="truncate">{t("postToAcademy", "Postar na comunidade")}</span>
        </button>
      </div>

      <AcademyFeed academyId={academy.id_academy} slug={academy.slug} reloadKey={reload} isOwner={false} meId={meId} />

      <button
        type="button"
        onClick={() => void unlink()}
        className="self-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] hover:text-[#F5F1E8]"
      >
        {t("unlink", "Desconectar academia")}
      </button>

      {composerOpen && (
        <MediaComposer
          open
          mode="post"
          academyId={academy.id_academy}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false)
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
