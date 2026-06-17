"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { machineDescription } from "@/lib/constants/machine-descriptions"
import { checkPassword, isPasswordStrong, isAdult, isValidEmail, calculateAge } from "@/lib/validation/signup"
import { Check, X, ArrowLeft, ArrowRight, Info, ShieldCheck, Search, TrendingUp } from "lucide-react"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { PageShell } from "@/components/tabloide"

interface Category {
  id_category: number
  desc_category: string
  is_active: boolean
}

interface Machine {
  id_machine: number
  name: string
  slug: string
  color_glow: string
  color_ring: string
  color_accent: string
  color_text: string
  is_active: boolean
  categories: Category[]
}

interface Region {
  id_region: number
  name: string
}

// intent → identity → access → (profile, só vendedor)
type Step = "intent" | "identity" | "access" | "profile"
type Track = "buyer" | "seller"

export default function CadastroPage() {
  const router = useRouter()
  // Destino interno opcional (ex.: vindo da Casa Views via /cadastro?next=...).
  const [nextParam, setNextParam] = useState<string | null>(null)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("next")
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) setNextParam(raw)
  }, [])
  const loginHref = nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"
  const t = useTranslations("Signup")
  const tAuth = useTranslations("Auth")
  const [step, setStep] = useState<Step>("intent")
  const [track, setTrack] = useState<Track | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Dados da conta
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    email: "",
    dataNascimento: "",
    sexo: "",
    senha: "",
    confirmarSenha: "",
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Conta supervisionada (menor de idade)
  const [responsibleCode, setResponsibleCode] = useState("")
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle")
  const [codeMsg, setCodeMsg] = useState("")
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [usernameMsg, setUsernameMsg] = useState("")
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Perfil (vendedor)
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [hoveredMachineId, setHoveredMachineId] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [profileData, setProfileData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    estado: "",
    id_region: "",
  })
  const [regions, setRegions] = useState<Region[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const estados = ESTADOS_BRASIL

  // Live password validation
  const passwordChecks = useMemo(() => checkPassword(formData.senha), [formData.senha])
  const passwordStrong = isPasswordStrong(formData.senha)
  const passwordsMatch = formData.senha.length > 0 && formData.senha === formData.confirmarSenha

  // Validade por etapa
  const userAge = calculateAge(formData.dataNascimento)
  const isAdultBirth = !formData.dataNascimento || isAdult(formData.dataNascimento)
  const isMinorBirth = !!formData.dataNascimento && userAge != null && userAge < 18
  const dateOk = !!formData.dataNascimento && userAge != null
  const emailOk = !formData.email || isValidEmail(formData.email)
  const emailBlocked = !!formData.email && !emailOk

  const identityValid =
    !!formData.nome.trim() &&
    !!formData.username &&
    usernameStatus === "available" &&
    !!formData.email &&
    emailOk

  const accessValid =
    dateOk &&
    (isAdultBirth || (isMinorBirth && codeStatus === "valid")) &&
    passwordStrong &&
    passwordsMatch &&
    acceptedTerms

  // Primeiro requisito não satisfeito, na ordem do formulário — botão nunca fica
  // "morto" sem explicação.
  const identityBlockReason = (() => {
    if (!formData.nome.trim()) return t("blockNome", "Preencha seu nome completo.")
    if (!formData.email || !emailOk) return t("blockEmail", "Digite um email válido.")
    if (!formData.username) return t("blockUsername", "Escolha um nome de usuário.")
    if (usernameStatus === "checking") return t("blockUsernameChecking", "Verificando o nome de usuário...")
    if (usernameStatus !== "available") return t("blockUsernameUnavailable", "Confirme um nome de usuário disponível.")
    return ""
  })()

  const accessBlockReason = (() => {
    if (!dateOk) return t("blockBirth", "Informe sua data de nascimento.")
    if (isMinorBirth && codeStatus !== "valid") return t("blockCode", "Informe um código de responsável válido.")
    if (!passwordStrong) return t("blockPassword", "Sua senha não atende a todos os requisitos.")
    if (!passwordsMatch) return t("blockPasswordMatch", "As senhas não coincidem.")
    if (!acceptedTerms) return t("blockTerms", "Aceite os termos de uso para continuar.")
    return ""
  })()

  const checkUsername = useCallback(async (u: string) => {
    if (u.length < 3) {
      setUsernameStatus("invalid")
      setUsernameMsg(t("usernameMinChars", "Mínimo 3 caracteres"))
      return
    }
    setUsernameStatus("checking")
    try {
      const res = await fetch(`/api/check-username?u=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (data.available) {
        setUsernameStatus("available")
        setUsernameMsg(t("usernameAvailable", "Disponível ✓"))
      } else {
        setUsernameStatus("taken")
        setUsernameMsg(t("usernameTaken", "Este nome já está em uso"))
      }
    } catch {
      setUsernameStatus("idle")
      setUsernameMsg("")
    }
  }, [t])

  const handleUsernameChange = (raw: string) => {
    const u = raw.toLowerCase().replace(/[^a-z0-9_.]/g, "")
    setFormData((prev) => ({ ...prev, username: u }))
    setUsernameStatus("idle")
    setUsernameMsg("")
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (u.length >= 3) {
      usernameTimer.current = setTimeout(() => checkUsername(u), 400)
    }
  }

  const validateResponsibleCode = useCallback(async (raw: string) => {
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
      setCodeMsg(t("codeFailed", "Falha ao validar — tente novamente."))
    }
  }, [t])

  const handleResponsibleCodeChange = (raw: string) => {
    const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "")
    setResponsibleCode(code)
    setCodeStatus("idle")
    setCodeMsg("")
    if (codeTimer.current) clearTimeout(codeTimer.current)
    if (code.length >= 6) {
      codeTimer.current = setTimeout(() => validateResponsibleCode(code), 400)
    }
  }

  // Reseta estado do código se a data muda para adulto
  useEffect(() => {
    if (!isMinorBirth && responsibleCode) {
      setResponsibleCode("")
      setCodeStatus("idle")
      setCodeMsg("")
    }
  }, [isMinorBirth, responsibleCode])

  const handleEstadoChange = async (uf: string) => {
    setProfileData((prev) => ({ ...prev, estado: uf, id_region: "" }))
    setRegions([])
    if (!uf) return
    setLoadingRegions(true)
    try {
      const res = await fetch(`/api/regions?uf=${encodeURIComponent(uf)}`)
      if (res.ok) {
        const data = await res.json()
        setRegions(Array.isArray(data?.regions) ? data.regions : [])
      }
    } catch {
      // silencioso
    } finally {
      setLoadingRegions(false)
    }
  }

  useEffect(() => {
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((data) => setMachines(Array.isArray(data) ? data : data.enxames || data.machines || []))
      .catch(() => {})
  }, [])

  const selectedMachine = machines.find((m) => m.id_machine === selectedMachineId) ?? null
  const hoveredOrSelectedMachine =
    machines.find((m) => m.id_machine === hoveredMachineId) ?? selectedMachine

  const submitSignup = async (asSeller: boolean) => {
    setSubmitError(null)
    if (asSeller) {
      if (!selectedMachineId || !selectedCategoryId) {
        setSubmitError(t("errSelectMachine", "Selecione enxame e profissão."))
        return
      }
      if (!profileData.estado || !profileData.id_region) {
        setSubmitError(t("errSelectLocation", "Selecione o estado e a região do perfil."))
        return
      }
      if (!profileData.display_name.trim()) {
        setSubmitError(t("errDisplayName", "Defina o nome de exibição do perfil."))
        return
      }
    }
    setIsSubmitting(true)
    const payload: Record<string, unknown> = {
      nome: formData.nome.trim(),
      username: formData.username,
      email: formData.email.trim(),
      data_nascimento: formData.dataNascimento,
      sexo: formData.sexo || null,
      senha: formData.senha,
    }
    if (isMinorBirth) {
      payload.responsible_code = responsibleCode
    }
    if (asSeller) {
      payload.id_machine = selectedMachineId
      payload.id_category = selectedCategoryId
      payload.display_name = profileData.display_name.trim()
      payload.bio = profileData.bio.trim() || null
      payload.avatar_url = profileData.avatar_url.trim() || null
      payload.estado = profileData.estado
      payload.id_region = Number(profileData.id_region)
    }
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (response.ok) {
        router.push("/verify-email")
      } else {
        setSubmitError(data.error || data.message || t("errSignupFailed", "Erro ao criar cadastro. Tente novamente."))
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error(error)
      setSubmitError(t("errServer", "Erro ao conectar com o servidor. Tente novamente."))
      setIsSubmitting(false)
    }
  }

  // Progresso: intent(1) → identity(2) → access(3) → profile(4, só vendedor)
  const totalSteps = track === "seller" ? 4 : 3
  const stepIndex: Record<Step, number> = { intent: 1, identity: 2, access: 3, profile: 4 }
  const currentStep = stepIndex[step]

  const chooseTrack = (chosen: Track) => {
    setTrack(chosen)
    if (chosen === "seller") {
      setProfileData((prev) => ({ ...prev, display_name: prev.display_name || formData.nome }))
    }
    setStep("identity")
  }

  const goIdentityNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!identityValid) return
    setStep("access")
  }

  const goAccessNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessValid) return
    if (track === "seller") {
      setProfileData((prev) => ({ ...prev, display_name: prev.display_name || formData.nome }))
      setStep("profile")
    } else {
      submitSignup(false)
    }
  }

  const PasswordRequirement = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-[#15803d]" : "text-[#8a8378]"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
      <span>{label}</span>
    </li>
  )

  return (
    <PageShell>
      {/* Barra superior leve (sem header global neste grupo) */}
      <div className="border-b border-[#F5F1E8]/8">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Freelandoo">
            <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-7 w-auto" priority />
            <span className="text-lg font-black text-[#F5F1E8]">freelandoo</span>
          </Link>
          <Link href={loginHref} className="text-sm font-bold text-[#F5F1E8]/80 transition hover:text-[#F5F1E8]">
            {t("doLogin", "Faça login")}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
        <div className="mb-7 text-center">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            {t("eyebrow", "Comece grátis")}
          </div>
          <h1 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl">{t("title", "Criar conta")}</h1>
          {/* Step pills */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const n = i + 1
              const active = n <= currentStep
              return (
                <span
                  key={n}
                  className={`h-2 rounded-full transition-all ${active ? "w-8 bg-[#F2B705]" : "w-2 bg-[#F5F1E8]/20"}`}
                />
              )
            })}
            <span className="ml-3 text-sm text-[#9A938A]">
              {t("step", "Etapa {step} de {total}")
                .replace("{step}", String(currentStep))
                .replace("{total}", String(totalSteps))}
            </span>
          </div>
        </div>

        {/* STEP — INTENÇÃO */}
        {step === "intent" && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("intentTitle", "O que traz você à Freelandoo?")}</h2>
              <p className="mt-1 text-sm text-[#5b554b]">{t("intentSubtitle", "Você pode mudar isso depois. É só pra começar do jeito certo.")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseTrack("buyer")}
                className="group flex flex-col rounded-2xl border-2 border-[#0B0B0D]/15 bg-white/50 p-6 text-left transition hover:border-[#0B0B0D] hover:shadow-[5px_5px_0_0_#0B0B0D]"
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B0B0D] text-[#F2B705]">
                  <Search className="h-6 w-6" />
                </span>
                <p className="mb-1 text-lg font-black text-[#0B0B0D]">{t("intentBuyerTitle", "Preciso resolver um problema")}</p>
                <p className="text-sm text-[#5b554b]">{t("intentBuyerDesc", "Quero encontrar e contratar profissionais para o que eu preciso.")}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0B0B0D]">
                  {t("intentBuyerCta", "Começar a buscar")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseTrack("seller")}
                className="group flex flex-col rounded-2xl border-2 border-[#F2B705] bg-[#F2B705]/10 p-6 text-left transition hover:shadow-[5px_5px_0_0_#F2B705]"
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2B705] text-[#0B0B0D]">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <p className="mb-1 text-lg font-black text-[#0B0B0D]">{t("intentSellerTitle", "Quero ganhar dinheiro")}</p>
                <p className="text-sm text-[#5b554b]">{t("intentSellerDesc", "Quero criar um perfil profissional e receber contatos e pedidos.")}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0B0B0D]">
                  {t("intentSellerCta", "Criar meu perfil")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-[#5b554b]">
              {t("alreadyHaveAccount", "Já tem uma conta?")}{" "}
              <Link href={loginHref} className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
                {t("doLogin", "Faça login")}
              </Link>
            </p>
          </div>
        )}

        {/* STEP — IDENTIDADE (nome, email, usuário) */}
        {step === "identity" && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <button type="button" onClick={() => setStep("intent")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D]">
              <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
            </button>
            <div className="mb-6">
              <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("identityTitle", "Vamos te conhecer")}</h2>
              <p className="mt-1 text-sm text-[#5b554b]">{t("identityDescription", "Comece com o básico — leva menos de um minuto.")}</p>
            </div>

            {!isMinorBirth && (
              <div className="mb-6 space-y-4">
                <GoogleSignInButton text="signup_with" redirectTo={nextParam ?? undefined} />
                <p className="text-center text-xs text-[#5b554b]">
                  {t("googleTermsPrefix", "Ao continuar com o Google, você concorda com os")}{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B0B0D] underline underline-offset-2">
                    {t("termsOfUse", "Termos de Uso")}
                  </Link>{" "}
                  {t("and", "e a")}{" "}
                  <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B0B0D] underline underline-offset-2">
                    {t("privacyPolicy", "Política de Privacidade")}
                  </Link>
                  .
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#0B0B0D]/12" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[var(--fl-paper)] px-2 font-semibold text-[#5b554b]">{t("orWithEmail", "ou com email")}</span>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={goIdentityNext}>
              <div>
                <label htmlFor="nome" className="fl-label">{t("fullName", "Nome completo")}</label>
                <input
                  id="nome"
                  className="fl-input"
                  placeholder={t("fullNamePlaceholder", "Ex: João Silva")}
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="fl-label">{tAuth("email", "E-mail")}</label>
                <input
                  id="email"
                  type="email"
                  className={`fl-input ${emailBlocked ? "fl-input-error" : ""}`}
                  placeholder={t("emailPlaceholder", "seu@email.com")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                {emailBlocked && <p className="mt-1 text-xs text-[#dc2626]">{t("invalidEmail", "Digite um email válido.")}</p>}
              </div>

              <div>
                <label htmlFor="username" className="fl-label">{tAuth("username", "Nome de usuário")}</label>
                <input
                  id="username"
                  className={`fl-input ${
                    usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "fl-input-error"
                      : usernameStatus === "available"
                        ? "fl-input-ok"
                        : ""
                  }`}
                  placeholder={t("usernamePlaceholder", "ex: joao.silva")}
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  maxLength={30}
                />
                {usernameMsg && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "text-[#dc2626]"
                        : usernameStatus === "available"
                          ? "text-[#15803d]"
                          : "text-[#5b554b]"
                    }`}
                  >
                    {usernameStatus === "checking" ? t("usernameChecking", "Verificando...") : usernameMsg}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!identityValid}
                className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {t("continue", "Continuar")} <ArrowRight className="h-4 w-4" />
              </button>
              {!identityValid && identityBlockReason && (
                <p className="-mt-2 text-center text-xs font-medium text-[#5b554b]">{identityBlockReason}</p>
              )}
            </form>
          </div>
        )}

        {/* STEP — ACESSO (nascimento, senha, termos) */}
        {step === "access" && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <button type="button" onClick={() => setStep("identity")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D]">
              <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
            </button>
            <div className="mb-6">
              <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("accessTitle", "Crie seu acesso")}</h2>
              <p className="mt-1 text-sm text-[#5b554b]">{t("accessDescription", "Uma senha forte e sua data de nascimento.")}</p>
            </div>

            <form className="space-y-5" onSubmit={goAccessNext}>
              <div>
                <label htmlFor="dataNascimento" className="fl-label">{t("birthDate", "Data de nascimento")}</label>
                <input
                  id="dataNascimento"
                  type="date"
                  className="fl-input"
                  value={formData.dataNascimento}
                  onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  required
                />
              </div>

              {/* Bloco Conta Supervisionada — aparece apenas se idade < 18 */}
              {isMinorBirth && (
                <div className="space-y-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/8 p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-700">{t("supervisedTitle", "Conta supervisionada")}</p>
                      <p className="text-xs text-[#5b554b]">
                        {t("supervisedDescription", "Para criar uma conta menor de idade, informe o código do responsável. O código é gerado por um adulto na conta dele, em Conta › Parental, e vale por 24 horas.")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="responsibleCode" className="fl-label">{t("responsibleCode", "Código do responsável")}</label>
                    <input
                      id="responsibleCode"
                      className={`fl-input ${
                        codeStatus === "invalid" && responsibleCode.length >= 6
                          ? "fl-input-error"
                          : codeStatus === "valid"
                            ? "fl-input-ok"
                            : ""
                      }`}
                      placeholder="PAR-XXXXXXXX"
                      value={responsibleCode}
                      onChange={(e) => handleResponsibleCodeChange(e.target.value)}
                      maxLength={16}
                      autoComplete="off"
                    />
                    {codeMsg && (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          codeStatus === "valid"
                            ? "text-[#15803d]"
                            : codeStatus === "checking"
                              ? "text-[#5b554b]"
                              : "text-[#dc2626]"
                        }`}
                      >
                        {codeMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="senha" className="fl-label">{tAuth("password", "Senha")}</label>
                  <input
                    id="senha"
                    type="password"
                    className="fl-input"
                    placeholder={t("passwordPlaceholder", "Mínimo 8 caracteres")}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required
                  />
                  <ul className="mt-2 space-y-1">
                    <PasswordRequirement ok={passwordChecks.min_length} label={t("passwordMinLength", "Mínimo de 8 caracteres")} />
                    <PasswordRequirement ok={passwordChecks.uppercase} label={t("passwordUppercase", "Pelo menos 1 letra maiúscula")} />
                    <PasswordRequirement ok={passwordChecks.number} label={t("passwordNumber", "Pelo menos 1 número")} />
                    <PasswordRequirement ok={passwordChecks.special_character} label={t("passwordSpecial", "Pelo menos 1 caractere especial")} />
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirmarSenha" className="fl-label">{tAuth("confirmPassword", "Confirmar senha")}</label>
                  <input
                    id="confirmarSenha"
                    type="password"
                    className={`fl-input ${formData.confirmarSenha.length > 0 && !passwordsMatch ? "fl-input-error" : ""}`}
                    placeholder={t("confirmPasswordPlaceholder", "Repita sua senha")}
                    value={formData.confirmarSenha}
                    onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    required
                  />
                  {formData.confirmarSenha.length > 0 && !passwordsMatch && (
                    <p className="mt-1 text-xs text-[#dc2626]">{t("passwordsDontMatch", "As senhas não coincidem.")}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="sexo" className="fl-label">{t("sex", "Sexo (opcional)")}</label>
                <select
                  id="sexo"
                  className="fl-input"
                  value={formData.sexo}
                  onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                >
                  <option value="">{t("selectPlaceholder", "Selecione")}</option>
                  <option value="M">{t("male", "Masculino")}</option>
                  <option value="F">{t("female", "Feminino")}</option>
                  <option value="O">{t("other", "Outro")}</option>
                </select>
              </div>

              <div className="rounded-xl border-2 border-[#F2B705]/40 bg-[#F2B705]/8 p-4">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#F2B705]"
                  />
                  <span className="text-[#3a352d]">
                    {t("acceptTermsPrefix", "Li e aceito os")}{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-[#0B0B0D] underline underline-offset-2">
                      {t("termsOfUse", "Termos de Uso")}
                    </Link>{" "}
                    {t("and", "e a")}{" "}
                    <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-bold text-[#0B0B0D] underline underline-offset-2">
                      {t("privacyPolicy", "Política de Privacidade")}
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {submitError && <p className="text-sm text-[#dc2626]">{submitError}</p>}

              <button
                type="submit"
                disabled={!accessValid || isSubmitting}
                className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isSubmitting
                  ? t("creatingAccount", "Criando conta...")
                  : track === "seller"
                    ? <>{t("continue", "Continuar")} <ArrowRight className="h-4 w-4" /></>
                    : t("finishSignup", "Finalizar cadastro")}
              </button>
              {!accessValid && accessBlockReason && (
                <p className="-mt-2 text-center text-xs font-medium text-[#5b554b]">{accessBlockReason}</p>
              )}
            </form>
          </div>
        )}

        {/* STEP — PERFIL (só vendedor) */}
        {step === "profile" && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <button type="button" onClick={() => setStep("access")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D]">
              <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
            </button>
            <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("profileTitle", "Perfil profissional")}</h2>
            <p className="mt-1 text-sm text-[#5b554b]">
              {t("profileDescription", "Seu perfil nasce aguardando ativação. Ele só aparece publicamente após você ativar o perfil.")}
            </p>

            <form
              className="mt-6 space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                submitSignup(true)
              }}
            >
              <div>
                <label htmlFor="display_name" className="fl-label">{t("displayName", "Nome de exibição")}</label>
                <input
                  id="display_name"
                  className="fl-input"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  required
                />
              </div>

              {/* Machines — chips com a cor do enxame (identidade preservada) */}
              {machines.length > 0 && (
                <div className="space-y-3">
                  <label className="fl-label">{t("chooseMachine", "Escolha seu enxame")}</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {machines.map((m) => {
                      const isSelected = selectedMachineId === m.id_machine
                      return (
                        <button
                          key={m.id_machine}
                          type="button"
                          onClick={() => {
                            setSelectedMachineId(m.id_machine)
                            setSelectedCategoryId(null)
                          }}
                          onMouseEnter={() => setHoveredMachineId(m.id_machine)}
                          onMouseLeave={() => setHoveredMachineId(null)}
                          onFocus={() => setHoveredMachineId(m.id_machine)}
                          onBlur={() => setHoveredMachineId(null)}
                          title={machineDescription(m.slug)}
                          style={
                            isSelected
                              ? { boxShadow: `0 0 18px ${m.color_glow}, 0 0 6px ${m.color_ring}`, borderColor: m.color_ring }
                              : {}
                          }
                          className={`rounded-lg border-2 bg-[#15120E] px-3 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 ${
                            isSelected ? "" : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                  {hoveredOrSelectedMachine && machineDescription(hoveredOrSelectedMachine.slug) && (
                    <div className="flex items-start gap-2 rounded-md border-2 border-[#0B0B0D]/12 bg-white/50 p-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0B0B0D]" />
                      <div className="text-sm">
                        <p className="font-bold text-[#0B0B0D]">{hoveredOrSelectedMachine.name}</p>
                        <p className="text-[#5b554b]">{machineDescription(hoveredOrSelectedMachine.slug)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profession */}
              {selectedMachine && (
                <div className="space-y-3">
                  <label className="fl-label">{t("chooseProfession", "Escolha sua profissão")}</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedMachine.categories
                      .filter((c) => c.is_active)
                      .map((c) => {
                        const isSelected = selectedCategoryId === c.id_category
                        return (
                          <button
                            key={c.id_category}
                            type="button"
                            onClick={() => setSelectedCategoryId(c.id_category)}
                            style={
                              isSelected
                                ? { boxShadow: `0 0 14px ${selectedMachine.color_glow}`, borderColor: selectedMachine.color_ring, color: selectedMachine.color_text }
                                : {}
                            }
                            className={`rounded-lg border-2 bg-[#15120E] px-3 py-2 text-sm text-white transition-all duration-200 hover:brightness-110 ${
                              isSelected ? "" : "border-white/10 hover:border-white/30"
                            }`}
                          >
                            {c.desc_category}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="bio" className="fl-label">{t("bioOptional", "Bio (opcional)")}</label>
                <textarea
                  id="bio"
                  rows={3}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="fl-input resize-none"
                />
              </div>

              <div>
                <label htmlFor="avatar_url" className="fl-label">{t("avatarUrlOptional", "URL do avatar (opcional)")}</label>
                <input
                  id="avatar_url"
                  type="url"
                  className="fl-input"
                  placeholder="https://..."
                  value={profileData.avatar_url}
                  onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="estado" className="fl-label">{t("stateLabel", "Estado")}</label>
                  <select id="estado" className="fl-input" value={profileData.estado} onChange={(e) => handleEstadoChange(e.target.value)}>
                    <option value="">{t("selectPlaceholder", "Selecione")}</option>
                    {estados.map((e) => (
                      <option key={e.uf} value={e.uf}>{e.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="id_region" className="fl-label">{t("regionLabel", "Região")}</label>
                  <select
                    id="id_region"
                    className="fl-input"
                    value={profileData.id_region}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, id_region: e.target.value }))}
                    disabled={!profileData.estado || loadingRegions}
                  >
                    <option value="">
                      {loadingRegions
                        ? t("loading", "Carregando...")
                        : !profileData.estado
                          ? t("regionSelectStateFirst", "Selecione o estado primeiro")
                          : t("regionPlaceholder", "Selecione sua região")}
                    </option>
                    {regions.map((r) => (
                      <option key={r.id_region} value={r.id_region}>{r.name}</option>
                    ))}
                  </select>
                  {profileData.estado && !loadingRegions && regions.length === 0 && (
                    <p className="mt-1 text-xs text-[#5b554b]">{t("regionEmpty", "Nenhuma região disponível para este estado ainda.")}</p>
                  )}
                </div>
              </div>

              {submitError && <p className="text-sm text-[#dc2626]">{submitError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
              >
                {isSubmitting ? t("creatingAccount", "Criando conta...") : t("finishSignup", "Finalizar cadastro")}
              </button>
            </form>
          </div>
        )}
      </div>
    </PageShell>
  )
}
