"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { machineDescription } from "@/lib/constants/machine-descriptions"
import { checkPassword, isPasswordStrong, isAdult, isValidEmail, calculateAge } from "@/lib/validation/signup"
import { Check, X, ArrowLeft, User, Briefcase, Info, ShieldCheck } from "lucide-react"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

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

  const checkUsername = useCallback(async (u: string) => {
    if (u.length < 3) {
      setUsernameStatus("invalid")
      setUsernameMsg("Mínimo 3 caracteres")
      return
    }
    setUsernameStatus("checking")
    try {
      const res = await fetch(`/api/check-username?u=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (data.available) {
        setUsernameStatus("available")
        setUsernameMsg("Disponível ✓")
      } else {
        setUsernameStatus("taken")
        setUsernameMsg("Este nome já está em uso")
      }
    } catch {
      setUsernameStatus("idle")
      setUsernameMsg("")
    }
  }, [])

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
    fetch("/api/machines")
      .then((r) => r.json())
      .then((data) => setMachines(Array.isArray(data) ? data : data.machines || []))
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
        setSubmitError("Selecione máquina e profissão.")
        return
      }
      if (!profileData.estado || !profileData.municipio) {
        setSubmitError("Selecione estado e município do perfil.")
        return
      }
      if (!profileData.display_name.trim()) {
        setSubmitError("Defina o nome de exibição do perfil.")
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
        setSubmitError(data.error || data.message || "Erro ao criar cadastro. Tente novamente.")
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error(error)
      setSubmitError("Erro ao conectar com o servidor. Tente novamente.")
      setIsSubmitting(false)
    }
  }

  const PasswordRequirement = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-green-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
      <span>{label}</span>
    </li>
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold">Criar conta</h1>
            <p className="text-muted-foreground">Etapa {step} de {userType === "client" ? 2 : 3}</p>
          </div>

          {/* STEP 1 — DADOS DA CONTA */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Dados da conta</CardTitle>
                <CardDescription>Crie suas credenciais para acessar a Freelandoo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isMinorBirth && (
                  <>
                    <GoogleSignInButton text="signup_with" />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou com email</span>
                      </div>
                    </div>
                  </>
                )}
                <form className="space-y-6" onSubmit={handleStep1Continue}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: João Silva"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de usuário</Label>
                      <Input
                        id="username"
                        placeholder="ex: joao.silva"
                        value={formData.username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        required
                        maxLength={30}
                        className={
                          usernameStatus === "taken" || usernameStatus === "invalid"
                            ? "border-red-500 focus-visible:ring-red-500"
                            : usernameStatus === "available"
                              ? "border-green-500 focus-visible:ring-green-500"
                              : ""
                        }
                      />
                      {usernameMsg && (
                        <p
                          className={`text-xs mt-1 font-medium ${
                            usernameStatus === "taken" || usernameStatus === "invalid"
                              ? "text-red-500"
                              : usernameStatus === "available"
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {usernameStatus === "checking" ? "Verificando..." : usernameMsg}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className={emailBlocked ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {emailBlocked && (
                        <p className="text-xs text-red-500">Digite um email válido.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dataNascimento">Data de nascimento</Label>
                      <Input
                        id="dataNascimento"
                        type="date"
                        value={formData.dataNascimento}
                        onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Bloco Conta Supervisionada — aparece apenas se idade < 18 */}
                  {isMinorBirth && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Conta supervisionada
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Para criar uma conta menor de idade, informe o <strong>código do responsável</strong>.
                            O código é gerado por um adulto na conta dele, em <em>Conta &rsaquo; Parental</em>, e
                            vale por 24 horas.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="responsibleCode">Código do responsável</Label>
                        <Input
                          id="responsibleCode"
                          placeholder="PAR-XXXXXXXX"
                          value={responsibleCode}
                          onChange={(e) => handleResponsibleCodeChange(e.target.value)}
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
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo (opcional)</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, sexo: value })} value={formData.sexo}>
                      <SelectTrigger id="sexo">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha</Label>
                      <Input
                        id="senha"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={formData.senha}
                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                        required
                      />
                      <ul className="space-y-1 mt-2">
                        <PasswordRequirement ok={passwordChecks.min_length} label="Mínimo de 8 caracteres" />
                        <PasswordRequirement ok={passwordChecks.uppercase} label="Pelo menos 1 letra maiúscula" />
                        <PasswordRequirement ok={passwordChecks.number} label="Pelo menos 1 número" />
                        <PasswordRequirement ok={passwordChecks.special_character} label="Pelo menos 1 caractere especial" />
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                      <Input
                        id="confirmarSenha"
                        type="password"
                        placeholder="Repita sua senha"
                        value={formData.confirmarSenha}
                        onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                        required
                        className={
                          formData.confirmarSenha.length > 0 && !passwordsMatch
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {formData.confirmarSenha.length > 0 && !passwordsMatch && (
                        <p className="text-xs text-red-500">As senhas não coincidem.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-muted-foreground">
                        Li e aceito os{" "}
                        <button
                          type="button"
                          onClick={() => setOpenTermosModal(true)}
                          className="font-medium text-blue-500 hover:underline"
                        >
                          termos de uso
                        </button>
                        .
                      </span>
                    </label>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={!step1Valid}>
                    Continuar
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Faça login
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 — TIPO DE USUÁRIO */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <CardTitle>Como você pretende usar a Freelandoo?</CardTitle>
                <CardDescription>Você pode mudar isso depois pela sua conta.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserType("client")
                      submitSignup(false)
                    }}
                    disabled={isSubmitting}
                    className="text-left rounded-lg border-2 border-border hover:border-primary p-6 transition-colors disabled:opacity-50"
                  >
                    <User className="h-8 w-8 mb-3 text-primary" />
                    <p className="font-semibold mb-1">Sou cliente</p>
                    <p className="text-sm text-muted-foreground">
                      Quero contratar profissionais. Finalizar cadastro agora.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserType("freelancer")
                      setProfileData((prev) => ({
                        ...prev,
                        display_name: prev.display_name || formData.nome,
                      }))
                      setStep(3)
                    }}
                    disabled={isSubmitting}
                    className="text-left rounded-lg border-2 border-border hover:border-primary p-6 transition-colors disabled:opacity-50"
                  >
                    <Briefcase className="h-8 w-8 mb-3 text-primary" />
                    <p className="font-semibold mb-1">Sou freelancer</p>
                    <p className="text-sm text-muted-foreground">
                      Quero criar perfil profissional para receber contatos.
                    </p>
                  </button>
                </div>
                {submitError && <p className="text-sm text-red-500 mt-4">{submitError}</p>}
                {isSubmitting && (
                  <p className="text-sm text-muted-foreground mt-4">Criando conta...</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 3 — PERFIL FREELANCER */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <CardTitle>Perfil profissional</CardTitle>
                <CardDescription>
                  Seu perfil nasce <strong>aguardando ativação</strong>. Ele só aparece publicamente após você ativar o perfil.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitSignup(true)
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Nome de exibição</Label>
                    <Input
                      id="display_name"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Machines */}
                  {machines.length > 0 && (
                    <div className="space-y-3">
                      <Label>Escolha sua máquina</Label>
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
                                  ? {
                                      boxShadow: `0 0 18px ${m.color_glow}, 0 0 6px ${m.color_ring}`,
                                      borderColor: m.color_ring,
                                    }
                                  : {}
                              }
                              className={`rounded-lg border-2 bg-black px-3 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 ${
                                isSelected ? "" : "border-white/10 hover:border-white/30"
                              }`}
                            >
                              {m.name}
                            </button>
                          )
                        })}
                      </div>
                      {hoveredOrSelectedMachine && machineDescription(hoveredOrSelectedMachine.slug) && (
                        <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 flex gap-2 items-start">
                          <Info className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">{hoveredOrSelectedMachine.name}</p>
                            <p className="text-muted-foreground">{machineDescription(hoveredOrSelectedMachine.slug)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profession */}
                  {selectedMachine && (
                    <div className="space-y-3">
                      <Label>Escolha sua profissão</Label>
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
                                    ? {
                                        boxShadow: `0 0 14px ${selectedMachine.color_glow}`,
                                        borderColor: selectedMachine.color_ring,
                                        color: selectedMachine.color_text,
                                      }
                                    : {}
                                }
                                className={`rounded-lg border-2 bg-black px-3 py-2 text-sm text-white transition-all duration-200 hover:brightness-110 ${
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

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (opcional)</Label>
                    <textarea
                      id="bio"
                      rows={3}
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">URL do avatar (opcional)</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      placeholder="https://..."
                      value={profileData.avatar_url}
                      onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={profileData.estado} onValueChange={handleEstadoChange}>
                        <SelectTrigger id="estado">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {estados.map((e) => (
                            <SelectItem key={e.uf} value={e.uf}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="municipio">Município</Label>
                      <Select
                        value={profileData.municipio}
                        onValueChange={(val) => setProfileData((prev) => ({ ...prev, municipio: val }))}
                        disabled={!profileData.estado || loadingMunicipios}
                      >
                        <SelectTrigger id="municipio">
                          <SelectValue placeholder={loadingMunicipios ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          {municipios.map((m) => (
                            <SelectItem key={m.id} value={m.nome}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {submitError && <p className="text-sm text-red-500">{submitError}</p>}

                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Criando conta..." : "Finalizar cadastro"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={openTermosModal} onOpenChange={setOpenTermosModal}>
        <DialogContent className="max-h-[80vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termos de Uso - Freelandoo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Ao acessar e utilizar a plataforma Freelandoo, você declara que leu, compreendeu e concorda
              integralmente com os termos.
            </p>
            <p>
              A Freelandoo atua exclusivamente como plataforma de divulgação. Não intermedia negociações,
              não participa de acordos e não recebe pagamentos. Todas as parcerias, valores e entregas são
              tratadas diretamente entre as partes.
            </p>
            <p>
              Cada usuário é responsável pelas informações divulgadas em seu perfil. A Freelandoo não se
              responsabiliza por descumprimento de acordos, atrasos, qualidade de entregas ou prejuízos.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpenTermosModal(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setAcceptedTerms(true)
                setOpenTermosModal(false)
              }}
            >
              Li e aceito
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
