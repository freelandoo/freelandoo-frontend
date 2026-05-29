'use client'

import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { TABLOID_ACTION_CLASSES } from '@/components/tabloide'

export default function FailurePage() {
  const router = useRouter()

  return (
    <main className="fl-root flex flex-1 items-center justify-center bg-[#141009] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="fl-card fl-hard rounded-[6px] p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-red-500/15 text-red-700">
            <XCircle className="h-9 w-9" />
          </span>
          <p className="fl-marker text-xl font-bold leading-none text-[#0B0B0D]/55">Pagamento</p>
          <h1 className="fl-display mt-1 text-5xl leading-[0.9] text-[#0B0B0D]">RECUSADO.</h1>
          <p className="mx-auto mt-4 max-w-xs text-sm font-bold leading-relaxed text-[#5b554b]">
            Não conseguimos processar sua transação.
          </p>

          <div className="my-6 space-y-2 border-y-2 border-dashed border-[#0B0B0D]/20 py-4 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold uppercase tracking-[0.1em] text-[#8a8275]">Status</span>
              <span className="font-black text-red-700">Recusado</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold uppercase tracking-[0.1em] text-[#8a8275]">Data</span>
              <span className="font-black text-[#0B0B0D]">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => router.back()} className={`w-full ${TABLOID_ACTION_CLASSES}`}>
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex w-full items-center justify-center border-2 border-[#0B0B0D] bg-transparent px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
            >
              Voltar para home
            </button>
          </div>

          <p className="mt-4 text-xs font-bold text-[#9A938A]">
            Se o problema persistir, entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </main>
  )
}
