import creatorsData from '@/data/creators.json'

export type CreatorId = string

export interface CreatorSource {
  label: string
  url: string
}

export interface CreatorSocials {
  website?: string | null
  wikipedia?: string | null
  youtube?: string | null
  instagram?: string | null
  x?: string | null
  tiktok?: string | null
  twitch?: string | null
}

export interface CreatorProfile {
  id: CreatorId
  displayName: string
  knownAs: string[]
  avatarImage: string | null
  avatarFallback: {
    letter: string
    gradient: string // tailwind gradient classes (without "bg-gradient-to-br")
  }
  sources: CreatorSource[]

  bioShort?: string
  tags?: string[]
  socials?: CreatorSocials
  fanCount?: number | null
}

type CreatorRegistryFile = {
  version: number
  creators: CreatorProfile[]
}

const registry = creatorsData as unknown as CreatorRegistryFile

export function getCreatorProfile(id: CreatorId): CreatorProfile | undefined {
  return registry.creators.find((c) => c.id === id)
}

export function getAllCreatorProfiles(): CreatorProfile[] {
  return registry.creators
}

/**
 * Normalizes avatar data:
 * - If an avatarImage is missing, returns a UI-Avatars URL based on displayName
 * - Always returns a stable `avatarLetter` and `avatarGradient`
 */
export function getCreatorAvatar(profile: CreatorProfile): {
  avatarImage: string
  avatarLetter: string
  avatarGradient: string
} {
  const avatarLetter = (profile.avatarFallback?.letter || profile.displayName?.[0] || '?')
    .toUpperCase()
    .slice(0, 1)

  const avatarGradient = profile.avatarFallback?.gradient || 'from-sky-500 to-indigo-600'

  const avatarImage =
    profile.avatarImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=256&background=0D8ABC&color=fff&bold=true`

  return { avatarImage, avatarLetter, avatarGradient }
}

