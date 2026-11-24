"use client"

// "MORO EM CONDOMÍNIO" para quem ainda não está em nenhum: achar o prédio.
//
// A busca é a MESMA porta pública da vitrine de comunidades
// (`GET /communities?kind=condo&q=`), que procura por nome, bairro e cidade —
// rua e número nunca entram na busca (privacidade do endereço, mig 196).
// Escolher um resultado só ABRE o condomínio (a página de sempre, embutida):
// quem decide se a pessoa entra é a planta, pelo pedido do apartamento.
//
// Não achou? Cadastra — pelo cadastro de condomínio que já existe.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Building2, Loader2, Plus, Search } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"

type CondoHit = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  condo_neighborhood?: string | null
  municipio?: string | null
  estado?: string | null
}

export function CondoFinder({ onOpen }: { onOpen: (id_profile: string) => void }) {
  const t = useTranslations("City")
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<CondoHit[]>([])
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  // Só a ÚLTIMA busca pinta a lista: digitar rápido dispara várias, e uma
  // resposta atrasada não pode trocar o resultado do que a pessoa digitou depois.
  const seq = useRef(0)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      seq.current++
      setHits([])
      setState("idle")
      return
    }
    const my = ++seq.current
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setState("loading")
      const sp = new URLSearchParams({ kind: "condo", q: term, limit: "20" })
      fetch(`${getPublicBackendUrl()}/communities?${sp.toString()}`, { signal: ctrl.signal })
        .then(async (r) => {
          const d = await r.json().catch(() => null)
          if (my !== seq.current) return
          if (!r.ok) throw new Error("search")
          setHits(Array.isArray(d?.communities) ? d.communities : [])
          setState("done")
        })
        .catch((e) => {
          if (my !== seq.current || (e instanceof DOMException && e.name === "AbortError")) return
          setState("error")
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [q])

  return (
    <div className="w-full max-w-3xl space-y-4 px-3 md:px-0">
      <section className="border-2 border-[#0B0B0D] bg-[#15120E] p-4" style={{ boxShadow: "4px 4px 0 0 #F2B705" }}>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase">
          <Building2 className="h-4 w-4" aria-hidden />
          {t("findCondoTitle", "Encontre seu condomínio")}
        </h2>
        <p className="mt-1 text-xs text-[#F5F1E8]/60">
          {t("findCondoHelp", "Busque pelo nome do condomínio, pelo bairro ou pela cidade.")}
        </p>
        <label className="mt-3 flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#0b0804] px-3 focus-within:border-[#F2B705]">
          <Search className="h-4 w-4 shrink-0 text-[#9A938A]" aria-hidden />
          <span className="sr-only">{t("findCondoLabel", "Nome, bairro ou cidade do condomínio")}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("findCondoPlaceholder", "Ex.: Residencial Jardins")}
            maxLength={80}
            className="h-11 w-full bg-transparent text-sm text-[#F5F1E8] outline-none placeholder:text-[#F5F1E8]/35"
          />
          {state === "loading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#9A938A]" aria-hidden />}
        </label>

        <div aria-live="polite" className="mt-3">
          {state === "error" ? (
            <p className="text-xs text-[#F2B705]">{t("findCondoError", "A busca falhou. Confira a conexão e tente de novo.")}</p>
          ) : state === "done" && hits.length === 0 ? (
            <p className="text-xs text-[#F5F1E8]/60">{t("findCondoEmpty", "Nenhum condomínio com esse nome ainda.")}</p>
          ) : hits.length > 0 ? (
            <ul className="space-y-2">
              {hits.map((h) => {
                const where = [h.condo_neighborhood, [h.municipio, h.estado].filter(Boolean).join("/")]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <li key={h.id_profile}>
                    <button
                      type="button"
                      onClick={() => onOpen(h.id_profile)}
                      className="flex w-full items-center gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] p-2 text-left hover:border-[#F2B705] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2B705]"
                    >
                      {h.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.avatar_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b0804] text-[#F2B705]">
                          <Building2 className="h-5 w-5" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{h.display_name}</span>
                        {where && <span className="block truncate text-[11px] text-[#F5F1E8]/60">{where}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="border-2 border-[#0B0B0D] bg-[#1D1810] p-4">
        <p className="text-sm font-bold">{t("noCondoTitle", "Seu condomínio não está aqui?")}</p>
        <p className="mt-1 text-xs text-[#F5F1E8]/60">
          {t("noCondoBody", "Cadastre o prédio: nome e endereço. Bairro e cidade aparecem na busca; rua e número só para moradores confirmados.")}
        </p>
        <Link
          href="/comunidades/criar?tipo=condo"
          className="mt-3 inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("createCondoCta", "Cadastrar meu condomínio")}
        </Link>
      </section>
    </div>
  )
}
