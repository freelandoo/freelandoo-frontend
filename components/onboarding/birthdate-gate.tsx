"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react"

const PUBLIC_PATHS = new Set([
  "/login",
  "/cadastro",
  "/verify-email",
  "/activate",
  "/reset-password",
  "/forgot-password",
])

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function calculateAge(birthdate: string): number | null {
  if (!birthdate) return null
  const d = new Date(birthdate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

/**
 * Componente global: ao montar em uma página autenticada, verifica em
 * /api/users/me se o usuário tem data_nascimento. Se não, abre um modal
 * não-fechável pedindo a data + (se menor) o código do responsável.
 *
 * Útil principalmente para signup pelo Google, que não captura idade.
 */
export function BirthdateGate() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [birthdate, setBirthdate] = useState("")
  const [responsibleCode, setResponsibleCode] = useState("")
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle")
  const [codeMsg, setCodeMsg] = useState("")
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const age = calculateAge(birthdate)
  const isMinor = age !== null && age < 18
  const isAdult = age !== null && age >= 18

  const isPublic =
    !pathname ||
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/freelancer/") ||
    pathname.startsWith("/cursos/") ||
    pathname === "/"

  // Carrega /me e decide se abre o modal.
  const checkMe = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) {
        setOpen(false)
        return
      }
      const res = await fetch("/api/users/me", {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        setOpen(false)
        return
      }
      const me = await res.json()
      // data_nascimento existe se for não nula. Idade também é fornecida.
      const hasBirthdate = !!me?.data_nascimento || !!me?.idade
      setOpen(!hasBirthdate)
    } catch {
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPublic) {
      setOpen(false)
      setLoading(false)
      return
    }
    checkMe()
  }, [pathname, isPublic, checkMe])

  // Refetch quando algum botão dispara "auth:changed" (login novo).
  useEffect(() => {
    const onAuth = () => checkMe()
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [checkMe])

  const validateCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase()
    if (code.length < 6) {
      setCodeStatus("invalid")
      setCodeMsg("")
      return
    }
    setCodeStatus("checking")
    setCodeMsg("Verificando...")
    try {
      const res = await fetch("/api/supervision/codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok && data?.valid) {
        setCodeStatus("valid")
        setCodeMsg("Código válido — responsável encontrado.")
      } else {
        setCodeStatus("invalid")
        setCodeMsg(data?.error || "Código inválido")
      }
    } catch {
      setCodeStatus("invalid")
      setCodeMsg("Falha ao validar — tente novamente.")
    }
  }, [])

  const handleCodeChange = (raw: string) => {
    const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "")
    setResponsibleCode(code)
    setCodeStatus("idle")
    setCodeMsg("")
    if (codeTimer.current) clearTimeout(codeTimer.current)
    if (code.length >= 6) {
      codeTimer.current = setTimeout(() => validateCode(code), 400)
    }
  }

  const canSubmit =
    !!birthdate &&
    age !== null &&
    !submitting &&
    (isAdult || (isMinor && codeStatus === "valid"))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/me/onboarding/birthdate", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          data_nascimento: birthdate,
          responsible_code: isMinor ? responsibleCode : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Falha ao salvar")
        setSubmitting(false)
        return
      }
      window.dispatchEvent(new Event("auth:changed"))
      setOpen(false)
      // Recarrega para atualizar /account e demais views com is_minor.
      window.location.reload()
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setSubmitting(false)
    }
  }

  if (loading || !open || isPublic) return null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        // Bloqueia fechamento por ESC e click fora — onboarding obrigatório.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            Falta completar seu cadastro
          </DialogTitle>
          <DialogDescription>
            Informe sua data de nascimento para usar a Freelandoo. Se você
            for menor de 18 anos, vai precisar de um <strong>código
            parental</strong> de um responsável adulto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-birthdate">Data de nascimento</Label>
            <Input
              id="onboarding-birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              autoFocus
            />
            {age !== null && age >= 0 && age <= 120 && (
              <p className="text-xs text-muted-foreground">
                Você tem <strong className="text-white">{age}</strong>{" "}
                {age === 1 ? "ano" : "anos"}.
              </p>
            )}
          </div>

          {isMinor && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="text-xs text-amber-300">
                <strong>Conta supervisionada:</strong> peça ao seu
                responsável para gerar um código em <em>Conta &rsaquo;
                Parental</em> e cole abaixo.
              </p>
              <Label htmlFor="onboarding-code">Código do responsável</Label>
              <Input
                id="onboarding-code"
                placeholder="PAR-XXXXXXXX"
                value={responsibleCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={16}
                autoComplete="off"
                className={
                  codeStatus === "invalid" && responsibleCode.length >= 6
                    ? "border-red-500 focus-visible:ring-red-500"
                    : codeStatus === "valid"
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                }
              />
              {codeMsg && (
                <p
                  className={`text-xs font-medium ${
                    codeStatus === "valid"
                      ? "text-green-500"
                      : codeStatus === "checking"
                        ? "text-muted-foreground"
                        : "text-red-500"
                  }`}
                >
                  {codeMsg}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
