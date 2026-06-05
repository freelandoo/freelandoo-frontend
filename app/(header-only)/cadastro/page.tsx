"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { machineDescription } from "@/lib/constants/machine-descriptions"
import { checkPassword, isPasswordStrong, isAdult, isValidEmail, calculateAge } from "@/lib/validation/signup"
import { Check, X, ArrowLeft, User, Briefcase, Info, ShieldCheck } from "lucide-react"
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

type Step = 1 | 2 | 3
type UserType = "client" | "freelancer"

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
  const [step, setStep] = useState<Step>(1)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Step 1 — account
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    email: "",
    dataNascimento: "",
    sexo: "",
    senha: "",
    confirmarSenha: "",
  })
  const [openTermosModal, setOpenTermosModal] = useState(false)
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

  // Step 3 — profile
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [hoveredMachineId, setHoveredMachineId] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [profileData, setProfileData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    estado: "",
    municipio: "",
  })
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const estados = ESTADOS_BRASIL

  // Live password validation
  const passwordChecks = useMemo(() => checkPassword(formData.senha), [formData.senha])
  const passwordStrong = isPasswordStrong(formData.senha)
  const passwordsMatch = formData.senha.length > 0 && formData.senha === formData.confirmarSenha

  // Step 1 derived validity
  const userAge = calculateAge(formData.dataNascimento)
  const isAdultBirth = !formData.dataNascimento || isAdult(formData.dataNascimento)
  const isMinorBirth = !!formData.dataNascimento && userAge != null && userAge < 18
  const dateOk = !!formData.dataNascimento && userAge != null
  const emailOk = !formData.email || isValidEmail(formData.email)
  const emailBlocked = !!formData.email && !emailOk

  const step1Valid =
    !!formData.nome.trim() &&
    !!formData.username &&
    usernameStatus === "available" &&
    !!formData.email &&
    emailOk &&
    dateOk &&
    (isAdultBirth || (isMinorBirth && codeStatus === "valid")) &&
    passwordStrong &&
    passwordsMatch &&
    acceptedTerms

  // Primeiro requisito não satisfeito, na ordem do formulário — evita botão "morto" sem explicação.
  const step1BlockReason = (() => {
    if (!formData.nome.trim()) return t("blockNome", "Preencha seu nome completo.")
    if (!formData.username) return t("blockUsername", "Escolha um nome de usuário.")
    if (usernameStatus === "checking") return t("blockUsernameChecking", "Verificando o nome de usuário...")
    if (usernameStatus !== "available") return t("blockUsernameUnavailable", "Confirme um nome de usuário disponível.")
    if (!formData.email || !emailOk) return t("blockEmail", "Digite um email válido.")
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
    setProfileData((prev) => ({ ...prev, estado: uf, municipio: "" }))
    const estadoObj = estados.find((e) => e.uf === uf)
    if (estadoObj) {
      setLoadingMunicipios(true)
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoObj.id}/municipios`
        )
        if (res.ok) {
          const data = await res.json()
          setMunicipios(data.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome })))
        }
      } catch {
        // silencioso
      } finally {
        setLoadingMunicipios(false)
      }
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

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!step1Valid) return
    setStep(2)
  }

  const submitSignup = async (asFreelancer: boolean) => {
    setSubmitError(null)
    if (asFreelancer) {
      if (!selectedMachineId || !selectedCategoryId) {
        setSubmitError(t("errSelectMachine", "Selecione enxame e profissão."))
        return
      }
      if (!profileData.estado || !profileData.municipio) {
        setSubmitError(t("errSelectLocation", "Selecione estado e município do perfil."))
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
    if (asFreelancer) {
      payload.id_machine = selectedMachineId
      payload.id_category = selectedCategoryId
      payload.display_name = profileData.display_name.trim()
      payload.bio = profileData.bio.trim() || null
      payload.avatar_url = profileData.avatar_url.trim() || null
      payload.estado = profileData.estado
      payload.municipio = profileData.municipio
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

  const totalSteps = userType === "client" ? 2 : 3

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
              const active = n <= step
              return (
                <span
                  key={n}
                  className={`h-2 rounded-full transition-all ${active ? "w-8 bg-[#F2B705]" : "w-2 bg-[#F5F1E8]/20"}`}
                />
              )
            })}
            <span className="ml-3 text-sm text-[#9A938A]">
              {t("step", "Etapa {step} de {total}")
                .replace("{step}", String(step))
                .replace("{total}", String(totalSteps))}
            </span>
          </div>
        </div>

        {/* STEP 1 — DADOS DA CONTA */}
        {step === 1 && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("accountDataTitle", "Dados da conta")}</h2>
              <p className="mt-1 text-sm text-[#5b554b]">{t("accountDataDescription", "Crie suas credenciais para acessar a Freelandoo")}</p>
            </div>

            {!isMinorBirth && (
              <div className="mb-6 space-y-4">
                <GoogleSignInButton text="signup_with" redirectTo={nextParam ?? undefined} />
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

            <form className="space-y-6" onSubmit={handleStep1Continue}>
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    <button
                      type="button"
                      onClick={() => setOpenTermosModal(true)}
                      className="font-bold text-[#0B0B0D] underline underline-offset-2"
                    >
                      {t("termsOfUse", "termos de uso")}
                    </button>
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!step1Valid}
                className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {t("continue", "Continuar")}
              </button>

              {!step1Valid && (
                <p className="-mt-3 text-center text-xs font-medium text-[#5b554b]">
                  {step1BlockReason}
                </p>
              )}

              <p className="text-center text-sm text-[#5b554b]">
                {t("alreadyHaveAccount", "Já tem uma conta?")}{" "}
                <Link href={loginHref} className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
                  {t("doLogin", "Faça login")}
                </Link>
              </p>
            </form>
          </div>
        )}

        {/* STEP 2 — TIPO DE USUÁRIO */}
        {step === 2 && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <button type="button" onClick={() => setStep(1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D]">
              <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
            </button>
            <h2 className="fl-display text-2xl text-[var(--fl-ink)]">{t("userTypeTitle", "Como você pretende usar a Freelandoo?")}</h2>
            <p className="mt-1 text-sm text-[#5b554b]">{t("userTypeDescription", "Você pode mudar isso depois pela sua conta.")}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setUserType("client")
                  submitSignup(false)
                }}
                disabled={isSubmitting}
                className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-white/50 p-6 text-left transition hover:border-[#0B0B0D] hover:shadow-[4px_4px_0_0_#0B0B0D] disabled:opacity-50"
              >
                <User className="mb-3 h-8 w-8 text-[#0B0B0D]" />
                <p className="mb-1 font-bold text-[#0B0B0D]">{t("iAmClient", "Sou cliente")}</p>
                <p className="text-sm text-[#5b554b]">{t("iAmClientDesc", "Quero contratar profissionais. Finalizar cadastro agora.")}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserType("freelancer")
                  setProfileData((prev) => ({ ...prev, display_name: prev.display_name || formData.nome }))
                  setStep(3)
                }}
                disabled={isSubmitting}
                className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-white/50 p-6 text-left transition hover:border-[#0B0B0D] hover:shadow-[4px_4px_0_0_#0B0B0D] disabled:opacity-50"
              >
                <Briefcase className="mb-3 h-8 w-8 text-[#0B0B0D]" />
                <p className="mb-1 font-bold text-[#0B0B0D]">{t("iAmFreelancer", "Sou freelancer")}</p>
                <p className="text-sm text-[#5b554b]">{t("iAmFreelancerDesc", "Quero criar perfil profissional para receber contatos.")}</p>
              </button>
            </div>
            {submitError && <p className="mt-4 text-sm text-[#dc2626]">{submitError}</p>}
            {isSubmitting && <p className="mt-4 text-sm text-[#5b554b]">{t("creatingAccount", "Criando conta...")}</p>}
          </div>
        )}

        {/* STEP 3 — PERFIL FREELANCER */}
        {step === 3 && (
          <div className="fl-card rounded-3xl p-6 sm:p-8">
            <button type="button" onClick={() => setStep(2)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D]">
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
                  <label htmlFor="municipio" className="fl-label">{t("cityLabel", "Município")}</label>
                  <select
                    id="municipio"
                    className="fl-input"
                    value={profileData.municipio}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, municipio: e.target.value }))}
                    disabled={!profileData.estado || loadingMunicipios}
                  >
                    <option value="">{loadingMunicipios ? t("loading", "Carregando...") : t("selectPlaceholder", "Selecione")}</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
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

      {/* Modal de termos (tabloide leve) */}
      {openTermosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenTermosModal(false)} />
          <div className="fl-card relative z-10 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <h3 className="fl-display text-2xl text-[var(--fl-ink)]">{t("termsModalTitle", "Termos de Uso - Freelandoo")}</h3>
            <div className="mt-4 space-y-4 text-sm text-[#3a352d]">
              <p>{t("termsP1", "Ao acessar e utilizar a plataforma Freelandoo, você declara que leu, compreendeu e concorda integralmente com os termos.")}</p>
              <p>{t("termsP2", "A Freelandoo atua exclusivamente como plataforma de divulgação. Não intermedia negociações, não participa de acordos e não recebe pagamentos. Todas as parcerias, valores e entregas são tratadas diretamente entre as partes.")}</p>
              <p>{t("termsP3", "Cada usuário é responsável pelas informações divulgadas em seu perfil. A Freelandoo não se responsabiliza por descumprimento de acordos, atrasos, qualidade de entregas ou prejuízos.")}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-[#0B0B0D]/12 pt-4">
              <button
                type="button"
                onClick={() => setOpenTermosModal(false)}
                className="fl-btn-card inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                {t("termsClose", "Fechar")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true)
                  setOpenTermosModal(false)
                }}
                className="fl-btn-gold inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold"
              >
                {t("termsAccept", "Li e aceito")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
