"use client"

// Painel "Equipe": quem atende pelo site (mig 221).
//
// É o análogo do "promover a professor" da academia, e por isso funciona igual:
// o líder digita um @username de quem JÁ é membro da comunidade. Publicar no
// site alguém que sequer entrou daria a ele o poder de anunciar o trabalho de
// terceiros sem que soubessem — a recusa vem do backend, com a frase pronta.
//
// ⚠️ O que esta lista faz e o que ela NÃO faz:
//   FAZ   publica a pessoa no site como quem atende, com os serviços e a agenda
//         DELA (a aba "Serviços" do /account e a agenda da conta, mig 190).
//   NÃO   dá papel na comunidade. Não modera, não edita o site, não vê o que
//         membro não vê. Papel continua sendo o de `tb_community_member`.
//
// O líder aparece sempre no topo e sem lixeira: ele atende por construção, e um
// botão de remover ali prometeria uma ação que o backend recusa.

import { useCallback, useEffect, useState } from "react"
import { Crown, Loader2, Plus, Trash2, UserRound, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import type { SiteProfessional } from "@/types/community-site"

type ListResponse = { professionals?: SiteProfessional[]; error?: string }

export function SiteTeamPanel({
  idProfile,
  accent,
  onClose,
  onChanged,
  t,
}: {
  idProfile: string
  accent: string
  onClose: () => void
  /** Avisa o construtor para recarregar o site: a vitrine muda junto. */
  onChanged: () => void
  t: (key: string, fallback: string) => string
}) {
  const [people, setPeople] = useState<SiteProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/communities/${idProfile}/site/professionals`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
        cache: "no-store",
      })
      const data: ListResponse = await res.json()
      if (!res.ok) throw new Error(data.error || "")
      setPeople(data.professionals || [])
      setError(null)
    } catch {
      setError(t("teamLoadError", "Não foi possível carregar a equipe."))
    } finally {
      setLoading(false)
    }
  }, [idProfile, t])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(async () => {
    const handle = username.trim().replace(/^@/, "")
    if (!handle || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/communities/${idProfile}/site/professionals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() || ""}`,
        },
        body: JSON.stringify({ username: handle }),
      })
      const data: ListResponse = await res.json()
      if (!res.ok) {
        // A recusa do backend é a frase que explica o motivo (não é membro, não
        // existe, já atende). Reescrevê-la aqui criaria duas versões da regra.
        setError(data.error || t("teamAddError", "Não foi possível adicionar."))
        return
      }
      setPeople(data.professionals || [])
      setUsername("")
      onChanged()
    } catch {
      setError(t("teamAddError", "Não foi possível adicionar."))
    } finally {
      setBusy(false)
    }
  }, [busy, idProfile, onChanged, t, username])

  const remove = useCallback(
    async (id_user: string) => {
      if (busy) return
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/communities/${idProfile}/site/professionals/${id_user}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${getToken() || ""}` } }
        )
        const data: ListResponse = await res.json()
        if (!res.ok) {
          setError(data.error || t("teamRemoveError", "Não foi possível remover."))
          return
        }
        setPeople(data.professionals || [])
        onChanged()
      } catch {
        setError(t("teamRemoveError", "Não foi possível remover."))
      } finally {
        setBusy(false)
      }
    },
    [busy, idProfile, onChanged, t]
  )

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(92vw,460px)] overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-4"
      style={{ boxShadow: "6px 6px 0 0 #0B0B0D" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
          {t("teamTitle", "Quem atende pelo site")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Fechar")}
          className="grid h-6 w-6 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mb-4 text-[10px] leading-relaxed text-[#9A938A]">
        {t(
          "teamHint",
          "Quem entra aqui aparece na página de agendamento com os próprios serviços e a própria agenda. Só entra quem já é membro da comunidade — e isto não dá nenhum poder dentro dela."
        )}
      </p>

      {error && (
        <div className="mb-3 border-2 border-[#0B0B0D] bg-[#2a1410] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ff8c7a]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {people.map((p) => (
            <article
              key={p.id_profile}
              className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5"
            >
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt={p.name}
                  data-avatar
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  data-avatar
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#0B0B0D] text-[#9A938A]"
                >
                  <UserRound className="h-4 w-4" />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#F5F1E8]">
                  <span className="truncate">{p.name}</span>
                  {p.is_leader && <Crown className="h-3 w-3 shrink-0" style={{ color: accent }} />}
                </span>
                <span className="block truncate text-[10px] text-[#9A938A]">
                  {p.profession || t("teamNoProfession", "Sem profissão declarada")}
                  {typeof p.service_count === "number" && (
                    <>
                      {" · "}
                      {p.service_count === 1
                        ? t("teamOneService", "1 serviço")
                        : t("teamManyServices", "{n} serviços").replace(
                            "{n}",
                            String(p.service_count)
                          )}
                    </>
                  )}
                </span>
              </span>

              {/* Sem lixeira no líder: ele atende por construção. */}
              {!p.is_leader && (
                <button
                  type="button"
                  onClick={() => remove(String(p.id_user))}
                  disabled={busy}
                  aria-label={t("teamRemove", "Tirar da equipe")}
                  title={t("teamRemove", "Tirar da equipe")}
                  className="grid h-7 w-7 shrink-0 place-items-center border-2 border-[#0B0B0D] bg-[#2a1410] text-[#ff8c7a] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </article>
          ))}

          <div className="mt-2 flex items-center gap-2 border-t-2 border-[#0B0B0D] pt-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add()
              }}
              placeholder={t("teamAddPlaceholder", "@username do membro")}
              className="min-w-0 flex-1 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-2 text-[12px] text-[#F5F1E8] outline-none"
            />
            <button
              type="button"
              onClick={add}
              disabled={busy || !username.trim()}
              className="flex shrink-0 items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-40"
              style={{ background: accent }}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t("teamAdd", "Adicionar")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
