"use client"

// Modal de aceite da conta criada pela academia (API de parceiro, mig 296 do
// backend; decisão Q19 da spec Coliseu ↔ Freelandoo). A conta nasce
// 'aguardando_aceite' — invisível na vitrine, no ranking e no perfil público —
// e só vira 'ativa' quando o aluno aceita aqui os termos, a privacidade e o
// vínculo com a academia. A foto do cadastro na academia só vira foto de
// perfil se ele marcar a caixa. Recusar apaga a conta.
//
// NÃO-FECHÁVEL (ESC e clique fora bloqueados), como o BirthdateGate — que
// espera este aceite antes de abrir. Chamadas direto no backend
// (getPublicBackendUrl): poucas, uma vez na vida de cada aluno.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { TABLOID_ACTION_CLASSES, TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { clearSession, getStoredUser, getToken, setStoredUser } from "@/lib/auth"

type Estado = {
  estado: "aguardando_aceite" | "ativa" | null
  academia: { nome: string; slug: string; logo: string | null } | null
  tem_foto: boolean
}

// A página de primeiro acesso cria a senha e só então leva ao app; o modal
// abre na primeira tela logada depois dela.
const SKIP_PREFIXES = ["/academia/", "/login", "/cadastro", "/terms", "/privacy-policy"]

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function AcademyConsentGate() {
  const t = useTranslations("AcademyConsent")
  const pathname = usePathname() || "/"
  const [info, setInfo] = useState<Estado | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [aceito, setAceito] = useState(false)
  const [usarFoto, setUsarFoto] = useState(false)
  const [confirmandoRecusa, setConfirmandoRecusa] = useState(false)
  const [enviando, setEnviando] = useState<"aceite" | "recusa" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const skip = SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))

  const check = useCallback(async () => {
    // O login já devolve o estado: conta comum (null) nem chega a consultar.
    const user = getStoredUser()
    if (!getToken() || user?.academy_onboarding_state !== "aguardando_aceite") {
      setInfo(null)
      return
    }
    try {
      const res = await fetch(`${getPublicBackendUrl()}/academy-onboarding`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) return setInfo(null)
      const data = (await res.json()) as Estado
      if (data.estado !== "aguardando_aceite") {
        // Aceitou em outro aparelho: só corrige o cache local.
        if (user) setStoredUser({ ...user, academy_onboarding_state: data.estado })
        return setInfo(null)
      }
      setInfo(data)
    } catch {
      setInfo(null)
    }
  }, [])

  useEffect(() => {
    if (skip) return
    check()
  }, [skip, check])

  useEffect(() => {
    const onAuth = () => check()
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [check])

  // A foto é dado privado até o aceite: vem autenticada e vira object URL.
  useEffect(() => {
    if (!info?.tem_foto) return
    let alive = true
    let url: string | null = null
    fetch(`${getPublicBackendUrl()}/academy-onboarding/foto`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!alive || !blob) return
        url = URL.createObjectURL(blob)
        setFotoUrl(url)
      })
      .catch(() => {})
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [info?.tem_foto])

  const aceitar = async () => {
    if (!aceito || enviando) return
    setEnviando("aceite")
    setError(null)
    try {
      const res = await fetch(`${getPublicBackendUrl()}/academy-onboarding/aceite`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ foto: !!info?.tem_foto && usarFoto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && data?.reason !== "nada_pendente") {
        setError(typeof data?.error === "string" ? data.error : t("acceptFail", "Não foi possível registrar o aceite. Tente de novo."))
        return
      }
      const user = getStoredUser()
      if (user) {
        setStoredUser({
          ...user,
          academy_onboarding_state: "ativa",
          ...(data?.avatar_url ? { avatar: data.avatar_url } : {}),
        })
      }
      setInfo(null)
    } catch {
      setError(t("network", "Erro de conexão. Tente novamente."))
    } finally {
      setEnviando(null)
    }
  }

  const recusar = async () => {
    if (enviando) return
    setEnviando("recusa")
    setError(null)
    try {
      const res = await fetch(`${getPublicBackendUrl()}/academy-onboarding/recusa`, {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data?.error === "string" ? data.error : t("refuseFail", "Não foi possível apagar a conta. Tente de novo."))
        return
      }
      clearSession()
      window.location.replace("/")
    } catch {
      setError(t("network", "Erro de conexão. Tente novamente."))
    } finally {
      setEnviando(null)
    }
  }

  if (skip || !info) return null

  const academia = info.academia?.nome || t("academyFallback", "sua academia")

  return (
    <TabloidDialog
      open
      onOpenChange={() => {}}
      dismissible={false}
      size="sm"
      eyebrow={academia}
      title={confirmandoRecusa ? t("refuseTitle", "Apagar sua conta?") : t("title", "Bem-vindo à Freelandoo")}
      description={
        confirmandoRecusa
          ? t(
              "refuseBody",
              "Sua conta na Freelandoo e o vínculo com a {academy} serão apagados. Sua matrícula na academia continua igual.",
            ).replace("{academy}", academia)
          : t(
              "description",
              "A {academy} criou esta conta para você acompanhar seus treinos. Para continuar, confirme que leu e aceita os termos.",
            ).replace("{academy}", academia)
      }
    >
      {confirmandoRecusa ? (
        <div className="space-y-4">
          {error && <Erro texto={error} />}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 border-2 border-[#0B0B0D] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition hover:bg-[#0B0B0D]/5 disabled:opacity-55"
              onClick={() => setConfirmandoRecusa(false)}
              disabled={!!enviando}
            >
              {t("back", "Voltar")}
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#dc2626] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_0_#0B0B0D] disabled:opacity-55"
              onClick={recusar}
              disabled={!!enviando}
            >
              {enviando === "recusa" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("refuseConfirm", "Apagar conta")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0B0B0D]"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
            />
            <span>
              {t("acceptPrefix", "Li e aceito os")}{" "}
              <Link href="/terms" target="_blank" className="font-bold underline underline-offset-2">
                {t("terms", "Termos de uso")}
              </Link>
              , {t("and", "a")}{" "}
              <Link href="/privacy-policy" target="_blank" className="font-bold underline underline-offset-2">
                {t("privacy", "Política de privacidade")}
              </Link>{" "}
              {t("acceptSuffix", "e o vínculo com a {academy}.").replace("{academy}", academia)}
            </span>
          </label>

          {info.tem_foto && (
            <label className="flex cursor-pointer items-center gap-3 border-2 border-[#0B0B0D] bg-white/40 p-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-[#0B0B0D]"
                checked={usarFoto}
                onChange={(e) => setUsarFoto(e.target.checked)}
              />
              {fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- object URL da foto privada
                <img src={fotoUrl} alt="" className="h-12 w-12 shrink-0 border-2 border-[#0B0B0D] object-cover" />
              )}
              <span>
                {t("usePhoto", "Usar a foto do meu cadastro na academia como foto de perfil")}
                <span className="block text-xs text-[#5b554b]">{t("optional", "Opcional. Dá para trocar depois.")}</span>
              </span>
            </label>
          )}

          {error && <Erro texto={error} />}

          <button type="button" className={`${TABLOID_ACTION_CLASSES} w-full`} onClick={aceitar} disabled={!aceito || !!enviando}>
            {enviando === "aceite" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("accept", "Aceitar e continuar")}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setConfirmandoRecusa(true)
            }}
            disabled={!!enviando}
            className="w-full text-center text-xs font-semibold text-[#5b554b] underline-offset-2 hover:text-[#b91c1c] hover:underline"
          >
            {t("refuse", "Recusar e apagar minha conta")}
          </button>
        </div>
      )}
    </TabloidDialog>
  )
}

function Erro({ texto }: { texto: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{texto}</span>
    </div>
  )
}
