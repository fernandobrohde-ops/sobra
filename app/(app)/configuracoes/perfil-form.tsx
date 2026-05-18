'use client'

/**
 * Form de edição do perfil (briefing 4.7).
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updatePerfil } from '@/lib/actions/configuracoes'
import { createClient } from '@/lib/supabase/client'
import { formatPhoneBR } from '@/lib/utils/phone'
import type { Setor } from '@/types/database'

interface PerfilFormProps {
  initial: {
    nome_negocio: string
    setor: Setor
    whatsapp: string
    avatar_url: string
  }
}

const SETORES: Array<{ value: Setor; label: string }> = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'servicos',    label: 'Serviços' },
  { value: 'comercio',    label: 'Comércio' },
  { value: 'construcao',  label: 'Construção' },
  { value: 'saude',       label: 'Saúde' },
  { value: 'educacao',    label: 'Educação' },
  { value: 'outros',      label: 'Outros' },
]

export function PerfilForm({ initial }: PerfilFormProps) {
  const router = useRouter()
  const [nome, setNome] = useState(initial.nome_negocio)
  const [setor, setSetor] = useState<Setor>(initial.setor)
  const [whatsapp, setWhatsapp] = useState(formatPhoneBR(initial.whatsapp))
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; text: string } | null>(null)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)
      return
    }
    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarFile])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setMsg(null)

    let proximaFoto = avatarUrl.trim() || null
    if (avatarFile) {
      const upload = await uploadAvatar(avatarFile)
      if (!upload.ok) {
        setSubmitting(false)
        setMsg({ tipo: 'erro', text: upload.error })
        return
      }
      proximaFoto = upload.url
      setAvatarUrl(upload.url)
      setAvatarFile(null)
    }

    const res = await updatePerfil({
      nome_negocio: nome,
      setor,
      whatsapp: whatsapp.trim() || null,
      avatar_url: proximaFoto,
    })
    setSubmitting(false)
    if (!res.ok) {
      setMsg({ tipo: 'erro', text: res.error })
      return
    }
    setMsg({ tipo: 'ok', text: 'Salvo.' })
    router.refresh()
  }

  function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ tipo: 'erro', text: 'Use uma foto JPG, PNG ou WebP.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ tipo: 'erro', text: 'A foto precisa ter até 5 MB.' })
      return
    }
    setMsg(null)
    setAvatarFile(file)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3 sm:w-56">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-sobra-green text-white flex items-center justify-center text-h3 font-medium">
            {(avatarPreview || avatarUrl.trim()) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview || avatarUrl.trim()}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              pegarInicial(nome)
            )}
          </div>
          <div>
            <p className="text-body-sm font-medium text-sobra-ink">Foto do perfil</p>
            <p className="text-caption text-sobra-ink-muted">Aparece no topo do app.</p>
          </div>
        </div>

        <label className="block flex-1">
          <span className="text-caption text-sobra-ink/70 mb-1.5 block">Escolher foto</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sobra-input"
            onChange={onAvatarChange}
          />
        </label>
      </div>

      {(avatarUrl || avatarFile) && (
        <button
          type="button"
          className="text-caption text-sobra-danger-text hover:underline"
          onClick={() => {
            setAvatarFile(null)
            setAvatarUrl('')
          }}
        >
          Remover foto
        </button>
      )}

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">Nome do negócio</span>
        <input
          type="text"
          required
          maxLength={120}
          className="sobra-input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">Setor</span>
        <select
          className="sobra-input"
          value={setor}
          onChange={(e) => setSetor(e.target.value as Setor)}
        >
          {SETORES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">WhatsApp</span>
        <input
          type="tel"
          maxLength={16}
          placeholder="(11) 99999-9999"
          className="sobra-input"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className="sobra-btn-primary" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {msg && (
          <span className={`text-caption ${msg.tipo === 'ok' ? 'text-sobra-green' : 'text-sobra-danger-text'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}

function pegarInicial(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || '·'
}

async function uploadAvatar(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('profile-avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (error) return { ok: false, error: 'Não consegui enviar a foto agora.' }

  const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` }
}
