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
import {
  ShieldCheck, AlertCircle, Loader2,
  Instagram, Youtube, Facebook, Twitter, Linkedin, Music2,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

const PUBLIC_PATHS = new Set([
  "/login",
  "/cadastro",
  "/verify-email",
  "/activate",
  "/reset-password",
  "/forgot-password",
])

// Redes oferecidas no onboarding. `icon` casa com tb_social_media_type.icon no
// backend (OnboardingService). Placeholders são URLs (não traduzem).
const ONBOARDING_SOCIALS: { icon: string; label: string; Icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  { icon: "instagram", label: "Instagram", Icon: Instagram, placeholder: "instagram.com/voce" },
  { icon: "tiktok", label: "TikTok", Icon: Music2, placeholder: "tiktok.com/@voce" },
  { icon: "youtube", label: "YouTube", Icon: Youtube, placeholder: "youtube.com/@voce" },
  { icon: "twitter", label: "X", Icon: Twitter, placeholder: "x.com/voce" },
  { icon: "facebook", label: "Facebook", Icon: Facebook, placeholder: "facebook.com/voce" },
  { icon: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "linkedin.com/in/voce" },
]

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
 * não-fechável pedindo a data + (se menor) o código do responsável +
 * (opcional) as redes sociais para mais gente encontrar o perfil.
 *
 * Útil principalmente para signup pelo Google, que não captura idade.
 */
export function BirthdateGate() {
  const t = useTranslations("Onboarding")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [birthdate, setBirthdate] = useState("")
  const [responsibleCode, setResponsibleCode] = useState("")
  const [socials, setSocials] = useState<Record<string, string>>({})
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
    setCodeMsg(t("codeChecking", "Verificando..."))
    try {
      const res = await fetch("/api/supervision/codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok && data?.valid) {
        setCodeStatus("valid")
        setCodeMsg(t("codeValid", "Código válido — responsável encontrado."))
      } else {
        setCodeStatus("invalid")
        setCodeMsg(data?.error || t("codeInvalid", "Código inválido"))
      }
    } catch {
      setCodeStatus("invalid")
      setCodeMsg(t("codeFail", "Falha ao validar — tente novamente."))
    }
  }, [t])

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
      const social_links = ONBOARDING_SOCIALS
        .map((s) => ({ icon: s.icon, url: (socials[s.icon] || "").trim() }))
        .filter((s) => s.url.length > 0)
      const res = await fetch("/api/me/onboarding/birthdate", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          data_nascimento: birthdate,
          responsible_code: isMinor ? responsibleCode : undefined,
          social_links: social_links.length > 0 ? social_links : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || t("saveFail", "Falha ao salvar"))
        setSubmitting(false)
        return
      }
      window.dispatchEvent(new Event("auth:changed"))
      setOpen(false)
      // Recarrega para atualizar /account e demais views com is_minor.
      window.location.reload()
    } catch {
      setError(t("connError", "Erro de conexão. Tente novamente."))
      setSubmitting(false)
    }
  }

  if (loading || !open || isPublic) return null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-h-[88vh] max-w-md overflow-y-auto"
        // Bloqueia fechamento por ESC e click fora — onboarding obrigatório.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            {t("title", "Falta completar seu cadastro")}
          </DialogTitle>
          <DialogDescription>
            {t("description", "Informe sua data de nascimento para usar a Freelandoo. Se você for menor de 18 anos, vai precisar de um código parental de um responsável adulto.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-birthdate">{t("birthdateLabel", "Data de nascimento")}</Label>
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
                {t("ageInfo", "Você tem {age} {unit}.")
                  .replace("{age}", String(age))
                  .replace("{unit}", age === 1 ? t("yearUnit", "ano") : t("yearsUnit", "anos"))}
              </p>
            )}
          </div>

          {isMinor && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="text-xs text-amber-300">
                {t("minorNotice", "Conta supervisionada: peça ao seu responsável para gerar um código em Conta › Parental e cole abaixo.")}
              </p>
              <Label htmlFor="onboarding-code">{t("codeLabel", "Código do responsável")}</Label>
              <Input
                id="onboarding-code"
                placeholder={t("codePlaceholder", "PAR-XXXXXXXX")}
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

          {/* Redes sociais (opcional) — para mais gente te encontrar. */}
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div>
              <Label className="flex items-center gap-1.5">
                {t("socialTitle", "Coloque suas redes sociais")}
                <span className="text-[11px] font-normal text-muted-foreground">{t("optional", "(opcional)")}</span>
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("socialSubtitle", "Para mais gente te encontrar.")}</p>
            </div>
            <div className="space-y-2">
              {ONBOARDING_SOCIALS.map((s) => {
                const Icon = s.Icon
                return (
                  <div key={s.icon} className="flex items-center gap-2">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/80"
                      title={s.label}
                      aria-label={s.label}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <Input
                      value={socials[s.icon] || ""}
                      onChange={(e) => setSocials((prev) => ({ ...prev, [s.icon]: e.target.value }))}
                      placeholder={s.placeholder}
                      inputMode="url"
                      autoComplete="off"
                      className="h-9"
                    />
                  </div>
                )
              })}
            </div>
          </div>

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
                {t("saving", "Salvando...")}
              </>
            ) : (
              t("continue", "Continuar")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
