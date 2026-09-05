"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

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

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

/** Moldura da foto do headcard: papel creme, contorno de tinta e sombra dura.
 *  A proporção acompanha a do headcard (2/3 desde 2026-09-05) — estes cards
 *  SÃO a foto de cada perfil, e num formato diferente deixariam de ser. */
const CARD_FRAME =
  "relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-4 border-[#F1EDE2] ring-2 ring-[#0B0B0D] shadow-[5px_5px_0_0_#F2B705]"

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

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

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

  const label = t("switchProfile", "Meus perfis")

  // O portal só existe no cliente; no primeiro render (SSR/hidratação) não há
  // `document`, então o modal entra depois que o componente monta.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const overlay = (
    <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B0B0D]/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#0B0B0D]">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6B6457]">
                  {t("switchProfileEyebrow", "Sua conta")}
                </p>
                <h2 className="fl-display text-2xl leading-none text-[#0B0B0D]">{label}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0B0B0D] transition hover:bg-[#F2B705]"
              >
                {t("close", "Fechar")}
              </button>
            </div>
            <p className="mb-4 text-sm font-semibold text-[#5b554b]">
              {t("switchProfileHint", "Toque num perfil para abrir. Todos valem o mesmo.")}
            </p>

            {loading && profiles === null ? (
              <div className="flex items-center justify-center py-10 text-[#5b554b]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : failed && profiles === null ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm font-bold text-[#8a1f1f]">
                  {t("switchProfileError", "Não deu para carregar seus perfis.")}
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0B0B0D]"
                >
                  {t("switchProfileRetry", "Tentar de novo")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {(profiles || []).map((profile) => {
                  const isCurrent = currentProfileId
                    ? String(profile.id_profile) === String(currentProfileId)
                    : false
                  return (
                    <button
                      key={profile.id_profile}
                      type="button"
                      onClick={() => go(profile)}
                      aria-current={isCurrent ? "true" : undefined}
                      className="group flex flex-col items-center gap-1.5 text-center"
                    >
                      <span
                        className={cn(
                          CARD_FRAME,
                          "-rotate-3 bg-[#F2B705]/15 transition-transform duration-200 group-hover:rotate-0",
                          isCurrent && "ring-4 ring-[#F2B705]",
                        )}
                      >
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-black text-[#0B0B0D]">
                            {initials(profile.display_name)}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-[#0B0B0D]">
                        {profile.display_name || t("unnamedProfile", "Perfil sem nome")}
                      </span>
                    </button>
                  )
                })}

                {/* Comprar mais um: card branco com o "+" preto, do tamanho da
                    foto de perfil — ele É um lugar vazio esperando a foto do
                    perfil novo. */}
                <button
                  type="button"
                  onClick={create}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={cn(
                      CARD_FRAME,
                      "-rotate-3 border-dashed bg-white transition-transform duration-200 group-hover:rotate-0",
                    )}
                  >
                    <Plus className="h-8 w-8 text-[#0B0B0D]" strokeWidth={3} />
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-[#0B0B0D]">
                    {t("buyProfile", "Comprar perfil")}
                  </span>
                </button>
              </div>
            )}
          </div>
    </div>
  )

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

      {open && mounted && createPortal(overlay, document.body)}
    </>
  )
}
