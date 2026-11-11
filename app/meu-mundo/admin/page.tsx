"use client"

// app/meu-mundo/admin/page.tsx — Meu Mundo 3D, área administrativa.
//
// Ordem que importa: primeiro o SERVIDOR confirma o acesso (auth + papel
// Administrator em GET /meu-mundo/admin/neighborhood); só então o módulo do
// jogo — que traz o Babylon — é carregado. Quem não é admin recebe a recusa
// sem baixar o motor 3D nem o bairro.

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { fetchAdminNeighborhood, getLife } from "@/features/meu-mundo/data"
import { useServerErrors } from "@/features/meu-mundo/server-errors"
import type { ScenePayload } from "@/features/meu-mundo/types"
import type { LifeSoul } from "@/features/meu-mundo/soul"
import { TitleScreen } from "@/features/meu-mundo/ui/opening/title-screen"
import { CharacterCard } from "@/features/meu-mundo/ui/opening/character-card"
import { setHero } from "@/features/meu-mundo/ui/opening/hero"

// apresentação 13: o mesmo import que a tela de título dispara para baixar o motor por trás
const loadShell = () => import("@/features/meu-mundo/ui/meu-mundo-shell")
const MeuMundoShell = dynamic(loadShell, {
  ssr: false,
  loading: () => <Loading />,
})
// mm3d-58: escolha da classe, antes do jogo (sem Babylon).
const ClanChoice = dynamic(() => import("@/features/meu-mundo/ui/clan/clan-choice"), {
  ssr: false,
  loading: () => <Splash />,
})
// mm3d-72: apelidos (o da pessoa e o do hóspede), depois da classe e antes do jogo.
const NicknameChoice = dynamic(() => import("@/features/meu-mundo/ui/clan/nickname-choice"), {
  ssr: false,
  loading: () => <Splash />,
})

type Phase =
  | { kind: "checking" }
  | { kind: "ready"; payload: ScenePayload }
  | { kind: "clan" }
  | { kind: "nickname"; payload: ScenePayload; soul: LifeSoul }
  | { kind: "forbidden" }
  | { kind: "error" }

/** Entre a tela de título e o jogo: o cartão do personagem (o mesmo das cenas). */
function Loading() {
  const t = useTranslations("MeuMundo")
  return <CharacterCard text={t("opPreparing", "Preparando o mundo")} />
}

/** Pré-carga do que o primeiro ambiente vai pedir: o modelo do próprio personagem
 *  (corpo, animações, textura) no cache do navegador. O motor já veio com loadShell. */
async function preloadHero(payload: ScenePayload) {
  const { avatarFiles } = await import("@/features/meu-mundo/engine/avatars")
  const f = avatarFiles(payload.life?.avatar ?? payload.me.body)
  await Promise.all([f.body, f.anims, f.texture].filter((u) => u && !u.endsWith("undefined")).map((u) => fetch(u).catch(() => null)))
}

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fl-sharp fixed inset-0 flex items-center justify-center bg-[#A8D4F2] p-6 text-center">
      {children ?? (
        <div className="border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
          …
        </div>
      )}
    </div>
  )
}

export default function MeuMundoAdminPage() {
  const t = useTranslations("MeuMundo")
  useServerErrors()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [attempt, setAttempt] = useState(0)
  // apresentação 13: tela de título até o toque; a pré-carga roda por trás dela
  const [started, setStarted] = useState(false)
  const [loaded, setLoaded] = useState(0)
  const payload = phase.kind === "ready" || phase.kind === "nickname" ? phase.payload : null
  useEffect(() => {
    if (!payload) return
    setHero({ name: payload.me.name, body: payload.life?.avatar ?? payload.me.body })
    let live = true
    loadShell()
      .then(() => {
        if (live) setLoaded(1)
        return preloadHero(payload)
      })
      .catch(() => null)
      .then(() => {
        if (live) setLoaded(2)
      })
    return () => {
      live = false
    }
  }, [payload])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent("/meu-mundo/admin")}`)
      return
    }
    const ac = new AbortController()
    fetchAdminNeighborhood(token, ac.signal)
      .then((r) => {
        if (ac.signal.aborted) return
        if (r.ok) {
          // sem apelido ainda: a tela dos apelidos antes do jogo (servidor antigo/falha = entra direto)
          const payload = r.payload
          getLife(token)
            .then((l) => {
              if (ac.signal.aborted) return
              const soul = l.ok ? l.data.character.soul : undefined
              setPhase(soul && soul.nickname === null && l.ok && l.data.character.status !== "dead" ? { kind: "nickname", payload, soul } : { kind: "ready", payload })
            })
            .catch(() => !ac.signal.aborted && setPhase({ kind: "ready", payload }))
        }
        else if (r.reason === "unauthenticated")
          router.replace(`/login?next=${encodeURIComponent("/meu-mundo/admin")}`)
        else if (r.reason === "forbidden") setPhase({ kind: "forbidden" })
        else if (r.reason === "needs_clan") setPhase({ kind: "clan" })
        else setPhase({ kind: "error" })
      })
      .catch(() => {
        /* abortado ao sair da página */
      })
    return () => ac.abort()
  }, [router, attempt])

  if (!started && phase.kind !== "forbidden" && phase.kind !== "error")
    return <TitleScreen done={(phase.kind === "checking" ? 0 : 1) + loaded} total={3} onStart={() => setStarted(true)} onExit={() => router.push("/account")} />
  if (phase.kind === "ready") return <MeuMundoShell initial={phase.payload} />
  if (phase.kind === "checking") return <Loading />
  if (phase.kind === "nickname") {
    const payload = phase.payload
    return <NicknameChoice soul={phase.soul} onDone={() => setPhase({ kind: "ready", payload })} />
  }
  if (phase.kind === "clan")
    return (
      <ClanChoice
        onChosen={() => {
          setPhase({ kind: "checking" })
          setAttempt((a) => a + 1)
        }}
      />
    )

  const forbidden = phase.kind === "forbidden"
  return (
    <Splash>
      <div className="max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-left text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
        <div className="text-lg font-black uppercase">
          {forbidden ? t("forbiddenTitle", "Área restrita") : t("loadErrorTitle", "Não foi possível abrir")}
        </div>
        <p className="mt-2 text-sm">
          {forbidden
            ? t("forbiddenDesc", "O Meu Mundo ainda está em desenvolvimento e só abre para administradores.")
            : t("loadErrorDesc", "O bairro não carregou. Confira a conexão e tente de novo.")}
        </p>
        <div className="mt-4 flex gap-2">
          {!forbidden && (
            <button
              type="button"
              onClick={() => {
                setPhase({ kind: "checking" })
                setAttempt((a) => a + 1)
              }}
              className="inline-flex h-10 items-center border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 text-[11px] font-bold uppercase tracking-wider text-[#F2B705]"
            >
              {t("retry", "Tentar de novo")}
            </button>
          )}
          <Link
            href="/account"
            className="inline-flex h-10 items-center border-2 border-[#0B0B0D] px-3 text-[11px] font-bold uppercase tracking-wider"
          >
            {t("back", "Voltar ao perfil")}
          </Link>
        </div>
      </div>
    </Splash>
  )
}
