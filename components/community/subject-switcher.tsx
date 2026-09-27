"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { CardSwitcherModal, type SwitcherCard } from "@/components/profile/card-switcher-modal"

/**
 * O "+" da foto do PET e do CARRO (pedido do Alex, 2026-09-27): *"precisa ter o
 * mesmo comportamento do mais do perfil principal"*. Abre o MESMO modal do
 * troca-perfil (`CardSwitcherModal`), com o header "Meus pets" / "Meus carros",
 * um card por pet/carro da pessoa (foto e nome) e o card branco para adicionar
 * outro — a ÚNICA porta de adicionar, já que o menu da foto de perfil só abre o
 * padrão.
 *
 * Mesmo lugar do "+" do headcard do perfil: a quina de baixo, à esquerda (a
 * câmera fica na da direita).
 *
 * A lista sai de `/me/spaces`, só o que a pessoa LIDERA — quem ainda tem uma
 * membresia antiga no pet de outra pessoa não o vê aqui como "meu". Sem foto
 * própria, o card herda a do dono (`fallbackAvatar`), como o headcard.
 */

type SpaceRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  role: string | null
}

export function SubjectSwitcher({
  kind,
  currentId,
  fallbackAvatar,
}: {
  kind: "pet" | "car"
  currentId: string
  fallbackAvatar: string | null
}) {
  const t = useTranslations("Community")
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<SwitcherCard[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch("/api/me/spaces", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error("failed")
      const rows: SpaceRow[] = json?.spaces?.[kind] || []
      setItems(
        rows
          .filter((r) => r.role === "leader")
          .map((r) => ({ id: r.id_profile, name: r.display_name, avatar_url: r.avatar_url || fallbackAvatar })),
      )
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [kind, fallbackAvatar])

  // A cada abertura: um pet criado noutra aba tem que aparecer aqui.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  /** Cria outro vazio (rascunho, mig 219) e abre a página dele, já editável. */
  const create = async () => {
    const token = getToken()
    if (!token || creating) return
    setCreating(true)
    try {
      const res = await fetch(kind === "pet" ? "/api/pets" : "/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.community?.id_profile) {
        toast.error(json?.error || t("addSubjectError", "Não foi possível adicionar agora."))
        return
      }
      setOpen(false)
      router.push(`/comunidades/${json.community.id_profile}`)
    } catch {
      toast.error(t("addSubjectError", "Não foi possível adicionar agora."))
    } finally {
      setCreating(false)
    }
  }

  /** Exclui o pet/carro; se era o aberto, cai no próximo que sobrou (ou na conta). */
  const remove = async (card: SwitcherCard) => {
    const token = getToken()
    if (!token) return t("deleteSubjectError", "Não foi possível excluir.")
    try {
      const res = await fetch(`/api/${kind === "pet" ? "pets" : "cars"}/${card.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return data?.error || t("deleteSubjectError", "Não foi possível excluir.")
      }
      const rest = (items || []).filter((i) => i.id !== card.id)
      setItems(rest)
      if (String(card.id) === String(currentId)) {
        setOpen(false)
        router.push(rest[0] ? `/comunidades/${rest[0].id}` : "/account")
      }
      return null
    } catch {
      return t("deleteSubjectError", "Não foi possível excluir.")
    }
  }

  const title = kind === "pet" ? t("myPets", "Meus pets") : t("myCars", "Meus carros")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title}
        title={title}
        className="absolute -bottom-2 -left-2 z-20 inline-flex h-8 w-8 items-center justify-center border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705]"
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </button>

      <CardSwitcherModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={t("subjectSwitchEyebrow", "Seus espaços")}
        title={title}
        hint={
          kind === "pet"
            ? t("petSwitchHint", "Toque num pet para abrir, ou adicione outro.")
            : t("carSwitchHint", "Toque num carro para abrir, ou adicione outro.")
        }
        closeLabel={t("close", "Fechar")}
        items={items}
        currentId={currentId}
        loading={loading}
        error={failed ? t("subjectSwitchError", "Não deu para carregar a lista.") : null}
        retryLabel={t("subjectSwitchRetry", "Tentar de novo")}
        onRetry={() => void load()}
        onPick={(card) => {
          setOpen(false)
          if (String(card.id) !== String(currentId)) router.push(`/comunidades/${card.id}`)
        }}
        createLabel={kind === "pet" ? t("addAnotherPet", "Adicionar outro pet") : t("addAnotherCar", "Adicionar outro carro")}
        onCreate={() => void create()}
        creating={creating}
        unnamedLabel={kind === "pet" ? t("kindPet", "Pet") : t("kindCar", "Carro")}
        onDelete={remove}
        deleteCopy={{
          trashLabel: t("deleteSubjectTrash", "Excluir {name}"),
          title: kind === "pet" ? t("deletePetTitle", "Excluir pet") : t("deleteCarTitle", "Excluir carro"),
          body:
            kind === "pet"
              ? t("deletePetBody", "\"{name}\" será excluído e o feed dele deixa de existir. Seus posts continuam no seu perfil.")
              : t("deleteCarBody", "\"{name}\" será excluído e o feed dele deixa de existir. Seus posts continuam no seu perfil."),
          disclaimer: t(
            "deleteDisclaimer",
            "Esta ação é definitiva e não tem volta. A Freelandoo não se responsabiliza por nada que se perca com a exclusão — conteúdo, contatos, vendas ou alcance.",
          ),
          acceptLabel: t("deleteAccept", "Entendo que não tem volta e isento a Freelandoo de qualquer responsabilidade."),
          confirmLabel: t("deleteConfirm", "Excluir definitivamente"),
          cancelLabel: t("deleteCancel", "Cancelar"),
        }}
      />
    </>
  )
}
