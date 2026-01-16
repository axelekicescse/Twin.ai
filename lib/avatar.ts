import { getCreatorAvatar, getCreatorProfile } from '@/lib/creators'
import type { Persona } from '@/lib/personas'
import avatarManifestData from '@/data/avatar-manifest.json'

type AvatarManifestFile = {
  version: number
  avatars: Record<string, string | null>
}

const avatarManifest = avatarManifestData as unknown as AvatarManifestFile

function getLocalAvatarPath(personaId: string): string | undefined {
  const raw = avatarManifest?.avatars?.[personaId]
  if (!raw) return undefined
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function getAvatarForPersona(persona: Persona): {
  avatarImage: string
  avatarLetter: string
  avatarGradient: string
} {
  const creator = getCreatorProfile(persona.id)
  const creatorAvatar = creator ? getCreatorAvatar(creator) : null

  const localAvatar = getLocalAvatarPath(persona.id)

  const avatarLetter = persona.avatarLetter ?? creatorAvatar?.avatarLetter ?? '?'
  const avatarGradient = persona.avatarGradient ?? creatorAvatar?.avatarGradient ?? 'from-sky-500 to-indigo-600'

  const avatarImage =
    localAvatar ||
    persona.avatarImage ||
    creatorAvatar?.avatarImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(persona.name)}&size=256&background=0D8ABC&color=fff&bold=true`

  return { avatarImage, avatarLetter, avatarGradient }
}
