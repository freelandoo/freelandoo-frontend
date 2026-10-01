"use client"

// AS COLEÇÕES DA LOJA (mig 271) — a barra que agrupa os produtos da dona.
//
// Cada coleção é uma vitrine dela ("New Drop", "Chrome") e vira uma PÁGINA no
// site de quem tem tema de loja (Pinkoracats). Por isso o endereço aparece no
// formulário: renomear a coleção NÃO troca o endereço (ele é o que está no
// Google e no que as pessoas colaram), e trocar o endereço é um gesto à parte.
//
// A barra também é o FILTRO da grade de produtos: com doze sets numa loja, sem
// filtro a dona procuraria o produto rolando.
//
// ⚠️ Não é a categoria da plataforma (a obrigatória do cadastro): aquela é
// taxonomia global e moderada; esta é arrumação da vitrine.

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

export type ProductCollection = {
  id_collection: number
  name: string
  slug: string
  kicker: string | null
  description: string | null
  cover_url: string | null
  sort_order: number
  products_count?: number
}

/** `all` = todas; `none` = sem coleção; número = a coleção. */
export type CollectionFilter = "all" | "none" | number

function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = json ? { "Content-Type": "application/json" } : {}
  try {
    const token = localStorage.getItem("token")
    if (token) h.Authorization = `Bearer ${token}`
  } catch {
    /* sem armazenamento: o backend responde 401 e a tela diz */
  }
  return h
}

type Draft = { name: string; kicker: string; description: string; slug: string }

export function ProductCollectionsBar({
  profileId,
  collections,
  onChange,
  filter,
  onFilter,
  counts,
  onError,
}: {
  profileId: string
  collections: ProductCollection[]
  onChange: (next: ProductCollection[]) => void
  filter: CollectionFilter
  onFilter: (f: CollectionFilter) => void
  /** Quantos produtos cada coleção tem (`none` = sem coleção, `all` = total). */
  counts: Record<string, number>
  onError: (msg: string) => void
}) {
  const t = useTranslations("Account")
  const [editing, setEditing] = useState<ProductCollection | "new" | null>(null)
  const [draft, setDraft] = useState<Draft>({ name: "", kicker: "", description: "", slug: "" })
  const [busy, setBusy] = useState<"save" | "delete" | "cover" | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const base = `/api/profile/${profileId}/product-collections`

  const current = editing && editing !== "new" ? collections.find((c) => c.id_collection === editing.id_collection) || editing : null

  function open(c: ProductCollection | "new") {
    setEditing(c)
    setDraft(
      c === "new"
        ? { name: "", kicker: "", description: "", slug: "" }
        : { name: c.name, kicker: c.kicker || "", description: c.description || "", slug: c.slug },
    )
  }

  function replace(next: ProductCollection) {
    const exists = collections.some((c) => c.id_collection === next.id_collection)
    onChange(
      exists
        ? collections.map((c) => (c.id_collection === next.id_collection ? { ...c, ...next } : c))
        : [...collections, next],
    )
    setEditing(next)
  }

  async function save() {
    if (!draft.name.trim()) {
      onError(t("collectionNameRequired", "Dê um nome para a coleção."))
      return
    }
    setBusy("save")
    try {
      const isNew = editing === "new"
      const body: Record<string, string> = {
        name: draft.name,
        kicker: draft.kicker,
        description: draft.description,
      }
      if (!isNew && current && draft.slug && draft.slug !== current.slug) body.slug = draft.slug
      const res = await fetch(isNew ? base : `${base}/${current?.id_collection}`, {
        method: isNew ? "POST" : "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.collection) {
        onError(d.error || t("collectionSaveError", "Não foi possível salvar a coleção."))
        return
      }
      replace(d.collection as ProductCollection)
      if (isNew) setEditing(null)
    } catch {
      onError(t("connectionErrorShort", "Erro de conexão"))
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!current) return
    if (
      !confirm(
        t(
          "collectionDeleteConfirm",
          "Apagar esta coleção? Os produtos dela continuam na loja, só ficam sem coleção.",
        ),
      )
    )
      return
    setBusy("delete")
    try {
      const res = await fetch(`${base}/${current.id_collection}`, { method: "DELETE", headers: authHeaders() })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        onError(d.error || t("collectionDeleteError", "Não foi possível apagar a coleção."))
        return
      }
      onChange(collections.filter((c) => c.id_collection !== current.id_collection))
      if (filter === current.id_collection) onFilter("all")
      setEditing(null)
    } catch {
      onError(t("connectionErrorShort", "Erro de conexão"))
    } finally {
      setBusy(null)
    }
  }

  async function uploadCover(file: File) {
    if (!current) return
    setBusy("cover")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${base}/${current.id_collection}/cover`, {
        method: "POST",
        headers: authHeaders(false),
        body: fd,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.collection) {
        onError(d.error || t("collectionCoverError", "Não foi possível enviar a capa."))
        return
      }
      replace(d.collection as ProductCollection)
    } catch {
      onError(t("connectionErrorShort", "Erro de conexão"))
    } finally {
      setBusy(null)
    }
  }

  async function removeCover() {
    if (!current) return
    setBusy("cover")
    try {
      const res = await fetch(`${base}/${current.id_collection}/cover`, { method: "DELETE", headers: authHeaders() })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.collection) replace(d.collection as ProductCollection)
    } finally {
      setBusy(null)
    }
  }

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-xs font-bold transition ${
      active ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D] hover:bg-[#F2B705]/40"
    }`

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9A938A]">
          {t("collectionsTitle", "Coleções")}
        </p>
        <button
          type="button"
          onClick={() => open("new")}
          className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2.5 py-1 text-[11px] font-bold text-[#0B0B0D] hover:bg-[#F2B705]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("collectionNew", "Nova coleção")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("collectionsFilterAria", "Filtrar produtos por coleção")}>
        <button type="button" className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => onFilter("all")}>
          {t("collectionAll", "Todas")} <span className="tabular-nums opacity-60">{counts.all ?? 0}</span>
        </button>
        {collections.map((c) => (
          <span key={c.id_collection} className="inline-flex">
            <button
              type="button"
              className={chip(filter === c.id_collection)}
              aria-pressed={filter === c.id_collection}
              onClick={() => onFilter(c.id_collection)}
            >
              {c.name} <span className="tabular-nums opacity-60">{counts[String(c.id_collection)] ?? 0}</span>
            </button>
            <button
              type="button"
              onClick={() => open(c)}
              className="-ml-0.5 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-1.5 text-[#0B0B0D] hover:bg-[#F2B705]"
              aria-label={`${t("collectionEditAria", "Editar a coleção")} ${c.name}`}
            >
              <Pencil className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        {(counts.none ?? 0) > 0 ? (
          <button type="button" className={chip(filter === "none")} aria-pressed={filter === "none"} onClick={() => onFilter("none")}>
            {t("collectionNone", "Sem coleção")} <span className="tabular-nums opacity-60">{counts.none}</span>
          </button>
        ) : null}
      </div>

      <TabloidDialog
        open={editing !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setEditing(null)
        }}
        eyebrow={t("collectionsTitle", "Coleções")}
        title={editing === "new" ? t("collectionNew", "Nova coleção") : current?.name || ""}
        description={t(
          "collectionHint",
          "A coleção agrupa os produtos na vitrine e vira uma página no seu site.",
        )}
        size="md"
        className="fl-sharp"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {current ? (
              <button
                type="button"
                onClick={remove}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 border-2 border-[#b91c1c] px-3 py-2 text-xs font-bold text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white disabled:opacity-50"
              >
                {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {t("collectionDelete", "Apagar coleção")}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={!!busy}
                className="border-2 border-[#0B0B0D] px-3 py-2 text-xs font-bold"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!!busy}
                className="fl-btn-gold inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
              >
                {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t("save", "Salvar")}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-3 px-5 py-4">
          <label className="grid gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
              {t("collectionName", "Nome")}
            </span>
            <input
              className="fl-input"
              maxLength={60}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={t("collectionNamePh", "New Drop")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
              {t("collectionKicker", "Frase curta")}
            </span>
            <input
              className="fl-input"
              maxLength={40}
              value={draft.kicker}
              onChange={(e) => setDraft((d) => ({ ...d, kicker: e.target.value }))}
              placeholder={t("collectionKickerPh", "Drop 001")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
              {t("collectionDescription", "Descrição")}
            </span>
            <textarea
              className="fl-input min-h-[80px]"
              maxLength={600}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          {current ? (
            <>
              <label className="grid gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                  {t("collectionSlug", "Endereço da página")}
                </span>
                <input
                  className="fl-input font-mono"
                  maxLength={60}
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                />
                <span className="text-[10px] text-[#8a8275]">
                  {t(
                    "collectionSlugHint",
                    "Mudar o endereço quebra os links que já foram compartilhados. Renomear a coleção não muda o endereço.",
                  )}
                </span>
              </label>
              <div className="grid gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                  {t("collectionCover", "Capa")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-32 items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1d1810]">
                    {current.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={current.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-[#F2B705]/50" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-xs font-bold hover:bg-[#F2B705] disabled:opacity-50"
                    >
                      {busy === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      {current.cover_url ? t("collectionCoverChange", "Trocar capa") : t("collectionCoverAdd", "Enviar capa")}
                    </button>
                    {current.cover_url ? (
                      <button type="button" disabled={!!busy} onClick={removeCover} className="text-left text-[11px] font-bold text-[#b91c1c]">
                        {t("collectionCoverRemove", "Tirar a capa")}
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      if (f) uploadCover(f)
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-[#8a8275]">
              {t("collectionCoverAfter", "Depois de criar, você pode enviar a capa da coleção.")}
            </p>
          )}
        </div>
      </TabloidDialog>
    </div>
  )
}
