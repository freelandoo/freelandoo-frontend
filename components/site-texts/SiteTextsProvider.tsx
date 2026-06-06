"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { Pencil, Check } from "lucide-react"
import { getStoredUser } from "@/lib/auth"

interface ActiveEdit {
  slot: string
  value: string
}

interface SiteTextsValue {
  texts: Record<string, string>
  admin: boolean
  editMode: boolean
  requestEdit: (slot: string, currentValue: string) => void
}

const Ctx = createContext<SiteTextsValue | null>(null)

export function useSiteTexts() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSiteTexts fora do SiteTextsProvider")
  return v
}

export function SiteTextsProvider({ children }: { children: React.ReactNode }) {
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [active, setActive] = useState<ActiveEdit | null>(null)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u = getStoredUser()
    setAdmin(!!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator")))
  }, [])

  useEffect(() => {
    fetch("/api/site-texts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.texts) setTexts(d.texts)
      })
      .catch(() => {})
  }, [])

  const requestEdit = useCallback((slot: string, currentValue: string) => {
    setActive({ slot, value: currentValue })
    setDraft(currentValue)
  }, [])

  async function save() {
    if (!active) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/site-texts/${active.slot}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.text?.content != null) {
        setTexts((prev) => ({ ...prev, [active.slot]: data.text.content }))
        setActive(null)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Ctx.Provider value={{ texts, admin, editMode, requestEdit }}>
      {children}

      {/* Toggle flutuante — só admin */}
      {admin && (
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="fixed bottom-5 right-5 z-[125] inline-flex items-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-bold text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
        >
          {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editMode ? "Concluir edição" : "Editar textos"}
        </button>
      )}

      {/* Modal de edição (único) */}
      {active && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          role="presentation"
        >
          <div
            className="fl-root fl-paper-card w-full max-w-md rounded-2xl border-2 border-[#0B0B0D] p-5 shadow-[10px_10px_0_0_#0B0B0D]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-2 text-base font-bold text-[#0B0B0D]">Editar texto</h2>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-y border-2 border-[#0B0B0D] bg-white p-2 text-sm text-[#0B0B0D] outline-none focus:border-[#E0A500]"
            />
            <p className="mt-1 text-[11px] text-[#5b554b]">
              Use *asteriscos* para destacar uma palavra em amarelo.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full border-2 border-[#0B0B0D] px-3 py-1.5 text-xs font-bold text-[#0B0B0D] transition hover:bg-[#0B0B0D]/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !draft.trim()}
                className="rounded-full bg-[#F2B705] px-4 py-1.5 text-xs font-bold text-[#1A1505] transition hover:brightness-105 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
