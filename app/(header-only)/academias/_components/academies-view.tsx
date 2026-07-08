"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Dumbbell, Loader2, MapPin, Plus, Search, Users, X, PlugZap } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

type Academy = {
  id_academy: string
  nome: string
  slug: string
  descricao: string | null
  cidade: string | null
  avatar_url: string | null
  member_count: number
}

export function AcademiesView() {
  const t = useTranslations("Academies")
  const enabled = useFeature("fitness_academias")

  const [academies, setAcademies] = useState<Academy[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [q, setQ] = useState("")
  const [city, setCity] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ nome: "", cidade: "", descricao: "", api_base_url: "", api_token: "" })

  const load = useCallback(async () => {
    setState("loading")
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (city.trim()) params.set("city", city.trim())
      const res = await fetch(`/api/academies?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAcademies(Array.isArray(data.academies) ? data.academies : [])
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [q, city])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  const create = useCallback(async () => {
    const token = getToken()
    if (!token) {
      toast.error(t("loginRequired", "Entre na sua conta para cadastrar uma academia."))
      return
    }
    if (!form.nome.trim() || !form.api_base_url.trim() || !form.api_token.trim()) {
      toast.error(t("createMissing", "Preencha nome, URL da API e token."))
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/academies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("createOk", "Academia cadastrada!"))
      setCreateOpen(false)
      setForm({ nome: "", cidade: "", descricao: "", api_base_url: "", api_token: "" })
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("createError", "Erro ao cadastrar academia"))
    } finally {
      setCreating(false)
    }
  }, [form, load, t])

  if (!enabled) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <Dumbbell className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">{t("disabled", "Recurso indisponível no momento.")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
      {/* Masthead tabloide */}
      <header className="border-b-2 border-[#0B0B0D] pb-4">
        <p className="inline-block -rotate-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0B0B0D]">
          {t("eyebrow", "Fitness · Freelandoo")}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-4xl font-black uppercase leading-none tracking-tight">
            {t("title", "Academias")}
          </h1>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
          >
            <Plus className="h-4 w-4" />
            {t("registerCta", "Cadastrar minha academia")}
          </button>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-[#9A938A]">
          {t(
            "subtitle",
            "Vincule sua matrícula pelo CPF e acompanhe frequência, treinos e calorias no seu painel fitness."
          )}
        </p>
      </header>

      {/* Busca */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2">
          <Search className="h-4 w-4 text-[#9A938A]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder={t("searchPlaceholder", "Buscar academia pelo nome")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#9A938A]"
          />
        </label>
        <label className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 sm:w-56">
          <MapPin className="h-4 w-4 text-[#9A938A]" />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder={t("cityPlaceholder", "Cidade")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#9A938A]"
          />
        </label>
        <button
          onClick={() => void load()}
          className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-xs font-extrabold uppercase text-[#F5F1E8] hover:bg-[#241d12]"
        >
          {t("searchCta", "Buscar")}
        </button>
      </div>

      {/* Lista */}
      {state === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
        </div>
      )}
      {state === "error" && (
        <div className="mt-8 border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-center text-sm text-[#9A938A]">
          {t("loadError", "Erro ao carregar as academias. Tente novamente.")}
        </div>
      )}
      {state === "loaded" && academies.length === 0 && (
        <div className="mt-8 border-2 border-dashed border-[#9A938A]/40 bg-[#15120E] p-10 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-[#9A938A]" />
          <p className="mt-3 text-sm text-[#9A938A]">
            {t("empty", "Nenhuma academia encontrada. Cadastre a sua ou ajuste a busca.")}
          </p>
        </div>
      )}
      {state === "loaded" && academies.length > 0 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {academies.map((a) => (
            <li key={a.id_academy}>
              <Link
                href={`/academias/${a.slug}`}
                className="block border-2 border-[#0B0B0D] bg-[#15120E] p-4 transition-transform hover:-translate-y-0.5" style={{ boxShadow: "4px 4px 0 0 #F2B705" }}
              >
                <div className="flex items-start gap-3">
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" data-avatar />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center border-2 border-[#0B0B0D] bg-[#1D1810]">
                      <Dumbbell className="h-6 w-6 text-[#9A938A]" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-black uppercase leading-tight">{a.nome}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9A938A]">
                      <MapPin className="h-3 w-3 text-[#F2B705]" />
                      {a.cidade || t("cityUnknown", "Cidade não informada")}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#F2B705]">
                      <Users className="h-3 w-3" />
                      {String(a.member_count)} {t("membersSuffix", "vinculados")}
                    </p>
                  </div>
                </div>
                {a.descricao && <p className="mt-3 line-clamp-2 text-sm text-[#9A938A]">{a.descricao}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      </div>

      {/* Modal de cadastro */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setCreateOpen(false)}>
          <div
            className="fl-sharp max-h-[90vh] w-full max-w-lg overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-[#F5F1E8]" style={{ boxShadow: "8px 8px 0 0 #F2B705" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-[#0B0B0D] pb-3">
              <h2 className="text-xl font-black uppercase">{t("createTitle", "Cadastrar academia")}</h2>
              <button onClick={() => setCreateOpen(false)} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
              </button>
            </div>
            <p className="mt-3 text-xs text-[#9A938A]">
              {t(
                "createIntro",
                "Grátis. Informe a URL e o token da API do software da sua academia (Gym Provider API) — é por ela que puxamos catraca e pagamentos."
              )}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("fieldName", "Nome da academia")}</span>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("fieldCity", "Cidade")}</span>
                <input
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("fieldDescription", "Descrição")}</span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("fieldApiUrl", "URL da API (Gym Provider)")}</span>
                <input
                  value={form.api_base_url}
                  onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))}
                  placeholder="https://crm.suaacademia.com.br"
                  className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 font-mono text-sm text-[#F5F1E8] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("fieldApiToken", "Token da API")}</span>
                <input
                  value={form.api_token}
                  onChange={(e) => setForm((f) => ({ ...f, api_token: e.target.value }))}
                  type="password"
                  className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 font-mono text-sm text-[#F5F1E8] outline-none"
                />
              </label>
              <p className="flex items-start gap-2 text-[11px] text-[#9A938A]">
                <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
                {t("providerHint", "Seu software precisa expor a Gym Provider API. O Coliseu já é compatível; outros softwares podem implementar o contrato público.")}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-4">
              <button
                onClick={() => setCreateOpen(false)}
                className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-xs font-extrabold uppercase text-[#F5F1E8] hover:bg-[#241d12]"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={() => void create()}
                disabled={creating}
                className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase text-[#0B0B0D] disabled:opacity-50"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("createSubmit", "Cadastrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
