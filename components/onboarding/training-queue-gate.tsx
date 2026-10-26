"use client"

// Fila de treinos do professor (mig 305 do backend). Pedido do Alex: o Coliseu
// ganhou a aba Treinos (vencidos, vencendo, sem treino) e "o professor da
// academia recebe um modal na Freelandoo para atualizar os treinos".
//
// Abre sozinho quando o professor entra e há fila. "Agora não" dispensa até o
// dia seguinte — a menos que a academia aperte "Avisar professores" no Coliseu
// depois disso (`reminder_at`), que reabre o modal: na hora, para quem está com
// o app aberto (evento `training-queue:remind`), ou na próxima entrada.
//
// Cada aluno leva a `/academias/<slug>/membros?aba=treinos&aluno=<id_member>`,
// que abre a ficha dele direto no editor. Nas páginas da academia o modal não
// aparece: ali o professor já está atualizando e o modal cobriria o editor.
//
// Só professor recebe (o backend decide): o dono vê a mesma fila na página da
// academia. Conta sem academia nenhuma volta `academias: []` e nada acontece.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TABLOID_ACTION_CLASSES, TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { getStoredUser, getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"

type Situacao = "vencido" | "vencendo" | "sem_treino"

type Item = {
  id_member: string
  nome: string
  situacao: Situacao
  treino_nome: string | null
  dias_restantes: number | null
}

type Academia = {
  id_academy: string
  slug: string
  nome: string
  reminder_at: string | null
  itens: Item[]
}

const SKIP_PREFIXES = ["/academias/", "/academia/", "/login", "/cadastro", "/terms", "/privacy-policy"]

const SITUACAO_COR: Record<Situacao, string> = {
  vencido: "border-[#E5484D] bg-[#E5484D]/20 text-[#FF8A8D]",
  vencendo: "border-[#F2B705] bg-[#F2B705]/15 text-[#F2B705]",
  sem_treino: "border-[#F1EDE2]/30 bg-transparent text-[#F1EDE2]/70",
}

function chaveDispensa(): string | null {
  const user = getStoredUser()
  return user?.id_user ? `fl_fila_treinos_dispensado:${user.id_user}` : null
}

function lerDispensa(): Date | null {
  const k = chaveDispensa()
  if (!k) return null
  try {
    const v = localStorage.getItem(k)
    const d = v ? new Date(v) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  } catch {
    return null
  }
}

/** Dispensado hoje e sem aviso da academia depois disso = fica fechado. */
function dispensadoAinda(academias: Academia[]): boolean {
  const d = lerDispensa()
  if (!d) return false
  if (d.toDateString() !== new Date().toDateString()) return false
  return !academias.some((a) => a.reminder_at && new Date(a.reminder_at) > d)
}

export function TrainingQueueGate() {
  const t = useTranslations("TrainingQueue")
  const pathname = usePathname() || "/"
  const [academias, setAcademias] = useState<Academia[]>([])
  const [aberto, setAberto] = useState(false)

  const skip = SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))

  const carregar = useCallback(async (forcar: boolean) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${getPublicBackendUrl()}/me/training-queue`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) return
      const data = (await res.json()) as { academias?: Academia[] }
      const lista = Array.isArray(data.academias) ? data.academias.filter((a) => a.itens.length > 0) : []
      setAcademias(lista)
      setAberto(lista.length > 0 && (forcar || !dispensadoAinda(lista)))
    } catch {
      // sem rede: tenta de novo na próxima entrada
    }
  }, [])

  useEffect(() => {
    void carregar(false)
    const onAuth = () => void carregar(false)
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [carregar])

  // "Avisar professores" no Coliseu: reabre na hora, mesmo dispensado hoje.
  useEffect(() => onRealtime("training-queue:remind", () => void carregar(true)), [carregar])

  const dispensar = () => {
    const k = chaveDispensa()
    if (k) {
      try {
        localStorage.setItem(k, new Date().toISOString())
      } catch {}
    }
    setAberto(false)
  }

  if (skip || !aberto || academias.length === 0) return null

  const total = academias.reduce((n, a) => n + a.itens.length, 0)
  const rotulo = (i: Item): string => {
    if (i.situacao === "sem_treino") return t("semTreino", "Sem treino")
    const dias = Math.abs(i.dias_restantes ?? 0)
    if (i.situacao === "vencido") {
      return dias === 0 ? t("venceuHoje", "Venceu hoje") : t("vencidoHa", "Vencido há {n} dias").replace("{n}", String(dias))
    }
    return t("venceEm", "Vence em {n} dias").replace("{n}", String(dias))
  }

  return (
    <TabloidDialog
      open
      onOpenChange={(o) => {
        if (!o) dispensar()
      }}
      size="lg"
      eyebrow={academias.length === 1 ? academias[0].nome : t("eyebrow", "Suas academias")}
      title={t("title", "Treinos para atualizar")}
      description={t("description", "{n} aluno(s) precisam de treino novo. Toque em um aluno para montar a ficha.").replace(
        "{n}",
        String(total)
      )}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={dispensar} className="px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-70 hover:opacity-100">
            {t("later", "Agora não")}
          </button>
          <Link href={`/academias/${academias[0].slug}/membros?aba=treinos`} onClick={() => setAberto(false)} className={TABLOID_ACTION_CLASSES}>
            {t("openAcademy", "Abrir treinos da academia")}
          </Link>
        </div>
      }
    >
      <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
        {academias.map((a) => (
          <section key={a.id_academy}>
            {academias.length > 1 && (
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-70">{a.nome}</h3>
            )}
            <ul className="flex flex-col gap-1.5">
              {a.itens.map((i) => (
                <li key={i.id_member}>
                  <Link
                    href={`/academias/${a.slug}/membros?aba=treinos&aluno=${encodeURIComponent(i.id_member)}`}
                    onClick={() => setAberto(false)}
                    className="flex items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 transition hover:border-[#F2B705]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{i.nome}</span>
                      {i.treino_nome && <span className="block truncate text-xs opacity-60">{i.treino_nome}</span>}
                    </span>
                    <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${SITUACAO_COR[i.situacao]}`}>
                      {rotulo(i)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </TabloidDialog>
  )
}
