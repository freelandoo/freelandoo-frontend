"use client"

/**
 * Contabilidade (admin, mig 277) — o painel onde os admins acompanham a
 * contabilidade das próprias empresas: guias vencidas e a vencer, livro caixa,
 * estimativa de DAS e de multa+juros.
 *
 * Ele NÃO transmite nada a órgão nenhum: organiza, calcula e lembra. Quem
 * declara e paga é o admin, nos portais oficiais — o comprovante volta para cá.
 *
 * Admin = pt-only, dark utilitário, cantos retos (.fl-sharp).
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Calculator, Plus, Pencil, Trash2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide"
import {
  api, formatCnpj, REGIME_LABEL, BTN_PRIMARY, BTN_GHOST, INPUT, Notice, type Company,
} from "./_components/accounting-ui"
import { ObligationsTab } from "./_components/obligations-tab"
import { LedgerTab } from "./_components/ledger-tab"
import { DashboardTab, DasTab, SelicTab, CompanyForm } from "./_components/panels"

type Tab = "dashboard" | "obligations" | "ledger" | "das" | "selic"

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Painel" },
  { id: "obligations", label: "Guias e obrigações" },
  { id: "ledger", label: "Livro caixa" },
  { id: "das", label: "Calcular DAS" },
  { id: "selic", label: "Selic" },
]

const LAST_COMPANY_KEY = "fl_acct_company"

export default function ContabilidadePage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("dashboard")
  const [editing, setEditing] = useState<Company | "new" | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Sobe quando algo muda numa aba, para o Painel e o contador de atraso
  // recarregarem sem cada aba conhecer as outras.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdmin =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  const loadCompanies = useCallback(() => {
    api<{ companies: Company[] }>("companies")
      .then((d) => {
        const list = d.companies || []
        setCompanies(list)
        setSelectedId((cur) => {
          if (cur && list.some((c) => c.id_company === cur)) return cur
          let saved: string | null = null
          try { saved = localStorage.getItem(LAST_COMPANY_KEY) } catch { /* sem storage */ }
          if (saved && list.some((c) => c.id_company === saved)) return saved
          return list[0]?.id_company ?? null
        })
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => { if (!checkingAuth) loadCompanies() }, [checkingAuth, loadCompanies, version])

  useEffect(() => {
    if (!selectedId) return
    try { localStorage.setItem(LAST_COMPANY_KEY, selectedId) } catch { /* sem storage */ }
  }, [selectedId])

  const company = companies?.find((c) => c.id_company === selectedId) || null
  const bump = () => setVersion((v) => v + 1)

  async function removeCompany(c: Company) {
    if (!confirm(`Remover a empresa "${c.name}" do painel? Guias e lançamentos ficam guardados no banco.`)) return
    try {
      await api(`companies/${c.id_company}`, { method: "DELETE" })
      setSelectedId(null)
      bump()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-screen bg-background">
      <main className="container mx-auto space-y-6 px-4 py-8">
        <PageBackLink href="/admin" />

        <div className="flex flex-wrap items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contabilidade</h1>
            <p className="text-sm text-muted-foreground">
              Guias, livro caixa e estimativas — o painel organiza e calcula; a declaração e o pagamento são feitos nos portais oficiais.
            </p>
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {companies === null ? (
          <div className="flex justify-center border border-border bg-card py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : companies.length === 0 ? (
          <div className="space-y-3 border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
            <button className={BTN_PRIMARY} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Cadastrar empresa
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border border-border bg-card p-3">
              <select
                className={`${INPUT} w-auto min-w-[16rem]`}
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id_company} value={c.id_company}>
                    {c.name}{c.overdue_count ? ` — ${c.overdue_count} em atraso` : ""}
                  </option>
                ))}
              </select>
              {company && (
                <p className="text-xs text-muted-foreground">
                  {REGIME_LABEL[company.regime]}
                  {company.simples_anexo && ` · Anexo ${company.simples_anexo.replace("_", "/")}`}
                  {company.cnpj && ` · ${formatCnpj(company.cnpj)}`}
                  {company.municipio && ` · ${company.municipio}${company.uf ? `/${company.uf}` : ""}`}
                </p>
              )}
              <div className="ml-auto flex gap-2">
                {company && (
                  <>
                    <button className={BTN_GHOST} onClick={() => setEditing(company)} aria-label="Editar empresa">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className={BTN_GHOST} onClick={() => removeCompany(company)} aria-label="Remover empresa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button className={BTN_PRIMARY} onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" /> Empresa
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-border">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-semibold ${
                    tab === t.id
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {company && tab === "dashboard" && <DashboardTab company={company} version={version} onGoTo={setTab} />}
            {company && tab === "obligations" && <ObligationsTab company={company} onChanged={bump} />}
            {company && tab === "ledger" && <LedgerTab company={company} onChanged={bump} />}
            {company && tab === "das" && <DasTab key={company.id_company} company={company} />}
            {tab === "selic" && <SelicTab onChanged={bump} />}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Estimativas não substituem o cálculo oficial. Guia vencida: gere a guia recalculada no portal antes de pagar.
        </p>
      </main>

      {editing && (
        <CompanyForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => { setEditing(null); setSelectedId(c.id_company); bump() }}
        />
      )}
    </div>
  )
}
