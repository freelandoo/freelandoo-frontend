"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PawPrint } from "lucide-react"
import { TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

type Breed = { id_breed: number; species: string; slug: string; label: string; is_mixed: boolean }
type Species = "dog" | "cat" | "other"

// "Outra raça" é uma linha do catálogo, e escolhê-la abre o campo livre: quem
// tem um bicho fora da lista não pode ficar sem cadastrar, mas também não pode
// sujar o catálogo digitando direto nele.
const FREE_TEXT_SLUG = "outra"
const FREE_TEXT_SLUG_OTHER = "outro"

export function CreatePetModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const t = useTranslations("Spaces")
  const router = useRouter()

  const [name, setName] = useState("")
  const [species, setSpecies] = useState<Species>("dog")
  const [breedSlug, setBreedSlug] = useState("")
  const [breedFree, setBreedFree] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [bio, setBio] = useState("")
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loadingBreeds, setLoadingBreeds] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadBreeds = useCallback(async (sp: Species) => {
    const token = getToken()
    if (!token) return
    setLoadingBreeds(true)
    try {
      const res = await fetch(`/api/pets/breeds?species=${sp}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setBreeds(Array.isArray(data.breeds) ? data.breeds : [])
    } catch {
      setBreeds([])
    } finally {
      setLoadingBreeds(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setBreedSlug("")
    setBreedFree("")
    loadBreeds(species)
  }, [open, species, loadBreeds])

  const isFreeText = breedSlug === FREE_TEXT_SLUG || breedSlug === FREE_TEXT_SLUG_OTHER

  const submit = async () => {
    const token = getToken()
    if (!token) return
    if (!name.trim()) {
      setMsg(t("petNameRequired", "Dê um nome ao seu pet."))
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: name.trim(),
          species,
          breed_slug: breedSlug || null,
          breed_label: isFreeText ? breedFree.trim() || null : null,
          birth_year: birthYear ? Number(birthYear) : null,
          bio: bio.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("createError", "Não foi possível criar."))
      onCreated?.()
      onClose()
      router.push(`/comunidades/${data.community.id_profile}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("createError", "Não foi possível criar."))
    } finally {
      setSaving(false)
    }
  }

  const speciesOptions: { key: Species; label: string }[] = [
    { key: "dog", label: t("speciesDog", "Cachorro") },
    { key: "cat", label: t("speciesCat", "Gato") },
    { key: "other", label: t("speciesOther", "Outro animal") },
  ]

  return (
    <TabloidDialog
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={<span className="flex items-center gap-2"><PawPrint className="h-5 w-5" /> {t("newPetTitle", "Novo pet")}</span>}
      description={t("newPetDesc", "O pet ganha uma comunidade própria, com mural, seguidores e posts.")}
      className="fl-root fl-sharp"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="pet-name" className="fl-label">
            {t("petNameLabel", "Nome do pet")} <span className="text-[#b91c1c]">*</span>
          </label>
          <input
            id="pet-name"
            className="fl-input"
            placeholder={t("petNamePlaceholder", "Ex.: Rex")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <span className="fl-label">{t("speciesLabel", "O que ele é")}</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {speciesOptions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSpecies(s.key)}
                className="border-2 px-3 py-2 text-sm font-bold transition"
                style={{
                  borderColor: species === s.key ? "#0B0B0D" : "rgba(11,11,13,0.2)",
                  background: species === s.key ? "#F2B705" : "transparent",
                  color: "#0B0B0D",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="pet-breed" className="fl-label">{t("breedLabel", "Raça")}</label>
          <select
            id="pet-breed"
            className="fl-input"
            value={breedSlug}
            disabled={loadingBreeds}
            onChange={(e) => setBreedSlug(e.target.value)}
          >
            <option value="">
              {loadingBreeds ? t("loading", "Carregando...") : t("breedUnknown", "Não sei / não informar")}
            </option>
            {breeds.map((b) => (
              <option key={b.id_breed} value={b.slug}>{b.label}</option>
            ))}
          </select>
        </div>

        {isFreeText && (
          <div>
            <label htmlFor="pet-breed-free" className="fl-label">{t("breedFreeLabel", "Qual raça?")}</label>
            <input
              id="pet-breed-free"
              className="fl-input"
              value={breedFree}
              onChange={(e) => setBreedFree(e.target.value)}
              maxLength={80}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pet-year" className="fl-label">{t("birthYearLabel", "Ano de nascimento (opcional)")}</label>
            <input
              id="pet-year"
              className="fl-input"
              inputMode="numeric"
              placeholder="2021"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pet-bio" className="fl-label">{t("bioLabel", "Descrição (opcional)")}</label>
          <textarea
            id="pet-bio"
            className="fl-input h-20 py-2"
            value={bio}
            maxLength={200}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {msg && <p className="text-sm font-medium text-[#b91c1c]">{msg}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="fl-btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          <PawPrint className="h-4 w-4" />
          {saving ? t("creating", "Criando...") : t("createPetCta", "Criar comunidade do pet")}
        </button>
      </div>
    </TabloidDialog>
  )
}
