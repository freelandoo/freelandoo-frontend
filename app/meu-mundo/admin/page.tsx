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
import { fetchAdminNeighborhood } from "@/features/meu-mundo/data"
import type { NeighborhoodPayload } from "@/features/meu-mundo/types"

const MeuMundoView = dynamic(() => import("@/features/meu-mundo/ui/meu-mundo-view"), {
  ssr: false,
  loading: () => <Splash />,
})

type Phase =
  | { kind: "checking" }
  | { kind: "ready"; payload: NeighborhoodPayload }
  | { kind: "forbidden" }
  | { kind: "error" }

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
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [attempt, setAttempt] = useState(0)

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
        if (r.ok) setPhase({ kind: "ready", payload: r.payload })
        else if (r.reason === "unauthenticated")
          router.replace(`/login?next=${encodeURIComponent("/meu-mundo/admin")}`)
        else if (r.reason === "forbidden") setPhase({ kind: "forbidden" })
        else setPhase({ kind: "error" })
      })
      .catch(() => {
        /* abortado ao sair da página */
      })
    return () => ac.abort()
  }, [router, attempt])

  if (phase.kind === "ready") return <MeuMundoView payload={phase.payload} />
  if (phase.kind === "checking") return <Splash />

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
