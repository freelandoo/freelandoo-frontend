"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Search, Sparkles, Users, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"

interface SubprofileOption {
  id_profile: string
  display_name: string
  avatar_url: string | null
  username: string | null
  is_clan?: boolean
  profession_name?: string | null
  municipio?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerProfileId: string | null
  onCreated: (id_conversation: string) => void
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  const parts = name.split(" ").filter(Boolean)
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "")
}

const MAX_MEMBERS = 200

export function CreateGroupModal({ open, onOpenChange, ownerProfileId, onCreated }: Props) {
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<SubprofileOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SubprofileOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (!open) {
      setName("")
      setQuery("")
      setSelected([])
      setError(null)
    }
  }, [open])

  // Search subperfis. Reusa o endpoint público de busca.
  useEffect(() => {
    if (!open) return
    const term = query.trim()
    if (term.length < 2) {
      setOptions([])
      return
    }
    let canceled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const token = getToken()
        const res = await fetch(`/api/search/profiles?q=${encodeURIComponent(term)}&limit=20`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error("search failed")
        const data = await res.json()
        const items: SubprofileOption[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []
        if (!canceled) {
          setOptions(items.filter((it) => !it.is_clan && it.id_profile !== ownerProfileId))
        }
      } catch {
        if (!canceled) setOptions([])
      } finally {
        if (!canceled) setLoading(false)
      }
    }, 250)
    return () => {
      canceled = true
      clearTimeout(t)
    }
  }, [query, open, ownerProfileId])

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id_profile)), [selected])

  const toggleSelect = useCallback((opt: SubprofileOption) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id_profile === opt.id_profile)
      if (exists) return prev.filter((p) => p.id_profile !== opt.id_profile)
      if (prev.length >= MAX_MEMBERS - 1) return prev
      return [...prev, opt]
    })
  }, [])

  const handleSubmit = async () => {
    setError(null)
    if (!ownerProfileId) {
      setError("Selecione um subperfil ator antes de criar grupo.")
      return
    }
    if (name.trim().length < 2) {
      setError("Dê um nome com pelo menos 2 caracteres.")
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch("/api/conversations/groups", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner_profile_id: ownerProfileId,
          name: name.trim(),
          member_profile_ids: selected.map((s) => s.id_profile),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Erro ao criar grupo")
        return
      }
      const id = data?.conversation?.id_conversation
      onCreated(id)
      onOpenChange(false)
    } catch {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 border-white/10 bg-gradient-to-b from-neutral-950 to-black">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base text-white">Criar grupo</DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                Convide até {MAX_MEMBERS} subperfis para conversar juntos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pt-5 pb-3 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-white/50">Nome do grupo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Equipe do projeto X"
              maxLength={120}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 focus-visible:ring-yellow-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-white/50">
                Convidar membros
              </label>
              <span className="text-[10px] tabular-nums text-white/40">
                {selected.length}/{MAX_MEMBERS - 1}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar subperfil por nome ou @username..."
                className="h-11 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-sm text-white placeholder:text-white/30 focus-visible:ring-yellow-400/40"
              />
            </div>
          </div>

          {/* Chips de selecionados */}
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((m) => (
                    <button
                      key={m.id_profile}
                      type="button"
                      onClick={() => toggleSelect(m)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/[0.08] border border-yellow-400/25 px-2 py-0.5 text-[11px] text-yellow-200 hover:bg-yellow-400/[0.15]"
                    >
                      {m.display_name}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-h-[200px] overflow-y-auto border-t border-white/[0.06] bg-black/30 px-3 py-2 [scrollbar-width:thin]">
          {query.trim().length < 2 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Users className="h-7 w-7 text-white/30 mb-2" />
              <p className="text-xs text-white/45">Digite para buscar subperfis</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-300/70" />
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Search className="h-7 w-7 text-white/30 mb-2" />
              <p className="text-xs text-white/45">Nenhum subperfil encontrado</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {options.map((opt) => {
                const isSelected = selectedIds.has(opt.id_profile)
                return (
                  <li key={opt.id_profile}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(opt)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-yellow-400/[0.08] ring-1 ring-yellow-400/30"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                        {opt.avatar_url && <AvatarImage src={opt.avatar_url} alt={opt.display_name} />}
                        <AvatarFallback className="text-xs bg-white/[0.06] text-white/70">
                          {initials(opt.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm text-white">{opt.display_name}</span>
                          {opt.username && <span className="text-[11px] text-white/40">@{opt.username}</span>}
                        </div>
                        {(opt.profession_name || opt.municipio) && (
                          <p className="text-[10px] text-white/40 truncate">
                            {opt.profession_name}{opt.profession_name && opt.municipio ? " · " : ""}{opt.municipio}
                          </p>
                        )}
                      </div>
                      <span
                        className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-yellow-400 bg-yellow-400"
                            : "border-white/20"
                        }`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 text-xs text-red-200 bg-red-500/[0.06] border-t border-red-500/20">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-black/40 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-10 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !ownerProfileId}
            className="h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 font-medium text-black hover:from-yellow-300 hover:to-amber-400 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)]"
          >
            {submitting ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Criando…</>
            ) : (
              <><Sparkles className="mr-1.5 h-4 w-4" />Criar grupo</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
