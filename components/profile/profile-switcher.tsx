"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { CardSwitcherModal } from "@/components/profile/card-switcher-modal"

/**
 * O troca-perfil do headcard — PEÇA ÚNICA das duas superfícies (o headcard do
 * /account e o `ProfileHeadCard` do perfil).
 *
 * Regra que ele materializa (decisão do Alex, 2026-09-04): NÃO EXISTE
 * hierarquia de perfis. O perfil que hoje carrega o rosto da pessoa e os que
 * ela comprou entram no MESMO grau, um card do lado do outro — o modal não diz
 * qual é o "principal", só marca qual está aberto agora. É por isso que o
 * perfil-conta aparece na lista como qualquer outro: separá-lo aqui seria
 * redesenhar a hierarquia que o rename de "subperfil" acabou de tirar do texto.
 *
 * O gatilho é um quadrado com "+" na quina da foto, irmão do badge de câmera
 * que já mora ali. Um botão de headcard escrito duas vezes diverge em silêncio
 * (foi assim que a foto de perfil sumiu de uma das telas), então gatilho e
 * modal vivem juntos neste arquivo e as páginas só o montam.
 *
 * O card branco com o "+" preto é a porta de comprar mais um perfil. Ele NÃO
 * abre um fluxo próprio: quem sabe criar perfil é a página /account (o modal
 * com enxame, profissão e cidade já existe lá). Quando o switcher é montado
 * dentro dela, recebe `onCreateProfile` e chama esse modal direto; fora dela,
 * navega para /account?novoPerfil=1 e a página abre o mesmo modal ao carregar.
 * Duplicar o formulário aqui criaria a segunda porta para a mesma ação.
 *
 * O MODAL é a peça `CardSwitcherModal` (2026-09-27), a mesma do "Meus pets" /
 * "Meus carros" da comunidade.
 *
 * ⚠️ O MODAL VAI POR PORTAL, e não é preciosismo: o gatilho mora dentro do
 * wrapper da foto, que é rotacionado (-3deg). Um ancestral com `transform` vira
 * o bloco de contenção de qualquer descendente `position: fixed` — o `inset-0`
 * deixa de significar "a janela" e passa a significar "a caixa da foto", de 96px
 * e torta. Era exatamente assim que o modal aparecia: espremido na largura da
 * foto e inclinado junto com ela. Mandar o overlay para o `document.body` é o
 * que devolve o `fixed` à janela. Overlay novo daqui sai pelo portal também.
 */

type SwitcherProfile = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  is_user_account?: boolean
}

type MeResponse = {
  profiles?: Array<{
    id_profile: string
    display_name: string
    avatar_url?: string | null
    is_clan?: boolean
    is_community?: boolean
    is_user_account?: boolean
    deleted_at?: string | null
  }>
}

export function ProfileSwitcher({
  currentProfileId,
  onCreateProfile,
  className,
}: {
  /** Perfil aberto agora — ganha a marca de "você está aqui". */
  currentProfileId?: string | null
  /** Só a /account passa: abre o modal de criar perfil que vive lá. */
  onCreateProfile?: () => void
  className?: string
}) {
  const t = useTranslations("Account")
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<SwitcherProfile[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      const data: MeResponse = await res.json()
      if (!res.ok) throw new Error("failed")
      // Comunidade (pet, carro, games, bairro, condomínio) mora na MESMA tabela
      // dos perfis: sem tirar `is_community` a lista ofereceria "Meu pet" como
      // se fosse um perfil. Clan é entidade coletiva e tem gestão própria.
      const rows = (data.profiles || [])
        .filter((p) => !p.is_clan && !p.is_community && !p.deleted_at)
        .map((p) => ({
          id_profile: p.id_profile,
          display_name: p.display_name,
          avatar_url: p.avatar_url ?? null,
          is_user_account: p.is_user_account,
        }))
      setProfiles(rows)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Busca ao abrir, e a cada abertura: perfil comprado noutra aba tem que
  // aparecer aqui sem recarregar a página.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const go = (profile: SwitcherProfile) => {
    setOpen(false)
    // O perfil-conta é o que a /account desenha; os outros têm página própria.
    router.push(profile.is_user_account ? "/account" : `/account/profile/${profile.id_profile}`)
  }

  const create = () => {
    setOpen(false)
    if (onCreateProfile) {
      onCreateProfile()
      return
    }
    router.push("/account?novoPerfil=1")
  }

  /** Exclui o perfil e tira o card da lista; se era o aberto, volta à conta. */
  const removeProfile = async (card: { id: string }) => {
    const token = getToken()
    if (!token) return t("deleteProfileError", "Não foi possível excluir o perfil.")
    try {
      const res = await fetch(`/api/profile/${card.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return data?.error || t("deleteProfileError", "Não foi possível excluir o perfil.")
      }
      setProfiles((list) => (list ? list.filter((p) => p.id_profile !== card.id) : list))
      if (currentProfileId && String(currentProfileId) === String(card.id)) {
        setOpen(false)
        router.push("/account")
      }
      return null
    } catch {
      return t("deleteProfileError", "Não foi possível excluir o perfil.")
    }
  }

  const label = t("switchProfile", "Meus perfis")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          "absolute -bottom-2 -left-2 z-20 inline-flex h-7 w-7 items-center justify-center",
          "border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]",
          "transition hover:bg-[#F2B705]",
          className,
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </button>

      <CardSwitcherModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={t("switchProfileEyebrow", "Sua conta")}
        title={label}
        hint={t("switchProfileHint", "Toque num perfil para abrir. Todos valem o mesmo.")}
        closeLabel={t("close", "Fechar")}
        items={
          profiles
            ? profiles.map((p) => ({
                id: p.id_profile,
                name: p.display_name,
                avatar_url: p.avatar_url,
                // O perfil que é a conta não se apaga (o backend recusa).
                undeletable: !!p.is_user_account,
              }))
            : null
        }
        currentId={currentProfileId}
        loading={loading}
        error={failed ? t("switchProfileError", "Não deu para carregar seus perfis.") : null}
        retryLabel={t("switchProfileRetry", "Tentar de novo")}
        onRetry={() => void load()}
        onPick={(card) => {
          const profile = (profiles || []).find((p) => p.id_profile === card.id)
          if (profile) go(profile)
        }}
        createLabel={t("buyProfile", "Comprar perfil")}
        onCreate={create}
        unnamedLabel={t("unnamedProfile", "Perfil sem nome")}
        onDelete={removeProfile}
        deleteCopy={{
          trashLabel: t("deleteProfileTrash", "Excluir {name}"),
          title: t("deleteProfileTitle", "Excluir perfil"),
          body: t("deleteProfileBody", "O perfil \"{name}\" será excluído, com os posts, serviços, produtos e seguidores dele."),
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
