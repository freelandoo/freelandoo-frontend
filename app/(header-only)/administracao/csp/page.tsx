"use client"

// Segurança A4 (CSP): o que a política de segurança do site BLOQUEARIA se fosse ligada de verdade.
// A CSP está em modo relatório (next.config.mjs); o navegador de cada visitante manda as violações
// para o back (POST /csp-report), que guarda só a diretiva, a ORIGEM bloqueada e o CAMINHO da página.
// Com ~1 semana de relatórios, dá para fechar as fontes e ligar o enforce sem quebrar tela.
import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { getToken } from "@/lib/auth"
import { PageBackLink } from "@/components/tabloide"

interface Row {
  directive: string
  blocked: string
  hits: number
  last_seen: string
  pages: string[]
}

export default function CspReportsPage() {
  const [days, setDays] = useState(14)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setError("Entre como administrador.")
      return
    }
    setRows(null)
    setError(null)
    fetch(`/api/admin/csp-reports?days=${days}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d?.error || "Erro")
        setRows(d.items || [])
      })
      .catch((e: Error) => setError(e.message))
  }, [days])

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageBackLink href="/admin" className="mb-5" />
        <h1 className="fl-display flex items-center gap-3 text-3xl">
          <ShieldCheck className="h-7 w-7" /> Relatórios da CSP
        </h1>
        <p className="mt-2 text-sm text-[#9A938A]">
          O que a política de segurança do site bloquearia se estivesse ligada. Ela está só em modo relatório: nada é bloqueado
          hoje. Origem legítima que aparece aqui precisa entrar na política antes do enforce; o resto é ruído (extensão do
          navegador) ou ataque.
        </p>

        <div className="mt-5 flex gap-2">
          {[1, 7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`border-2 border-[#0B0B0D] px-3 py-1 text-sm ${days === d ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E]"}`}
            >
              {d === 1 ? "24 h" : `${d} dias`}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 border-2 border-[#0B0B0D] bg-[#3B1D1D] px-3 py-2 text-sm">{error}</p>}
        {!rows && !error && <Loader2 className="mt-8 h-6 w-6 animate-spin" aria-hidden />}
        {rows && rows.length === 0 && <p className="mt-8 text-sm text-[#9A938A]">Nenhuma violação no período.</p>}
        {rows && rows.length > 0 && (
          <div className="mt-6 overflow-x-auto border-2 border-[#0B0B0D] bg-[#15120E] shadow-[6px_6px_0_0_#F2B705]">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[#9A938A]">
                <tr>
                  <th className="px-3 py-2">Diretiva</th>
                  <th className="px-3 py-2">Bloqueado</th>
                  <th className="px-3 py-2 text-right">Vezes</th>
                  <th className="px-3 py-2">Páginas</th>
                  <th className="px-3 py-2">Última</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.directive}|${r.blocked}`} className="border-t border-[#2A241C] align-top">
                    <td className="px-3 py-2 font-mono text-xs">{r.directive}</td>
                    <td className="break-all px-3 py-2 font-mono text-xs">{r.blocked}</td>
                    <td className="px-3 py-2 text-right">{r.hits}</td>
                    <td className="px-3 py-2 text-xs text-[#9A938A]">{(r.pages || []).join(" · ")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-[#9A938A]">{new Date(r.last_seen).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
