import knowledgeData from '@/data/star-knowledge.json'

export type StarPost = {
  platform: 'x' | 'instagram' | 'youtube' | 'website' | 'other'
  date?: string
  text: string
  url?: string
}

export type StarOpinion = {
  topic: string
  summary: string
}

export type StarKnowledge = {
  opinions: StarOpinion[]
  latestPosts: StarPost[]
}

type StarKnowledgeFile = {
  version: number
  stars: Record<string, StarKnowledge>
}

const registry = knowledgeData as unknown as StarKnowledgeFile

export function getStarKnowledge(starId: string): StarKnowledge {
  return (
    registry.stars?.[starId] || {
      opinions: [],
      latestPosts: [],
    }
  )
}

export function formatKnowledgeForPrompt(starId: string): string {
  const k = getStarKnowledge(starId)
  const parts: string[] = []

  if (k.opinions?.length) {
    parts.push('KNOWN POSITIONS (curated):')
    for (const o of k.opinions.slice(0, 30)) {
      parts.push(`- ${o.topic}: ${o.summary}`)
    }
    parts.push('')
  }

  if (k.latestPosts?.length) {
    parts.push('RECENT PUBLIC POSTS (curated):')
    for (const p of k.latestPosts.slice(0, 10)) {
      const meta = [p.platform, p.date].filter(Boolean).join(' • ')
      parts.push(`- ${meta}: ${p.text}${p.url ? ` (${p.url})` : ''}`)
    }
    parts.push('')
  }

  if (!parts.length) {
    parts.push('RECENT CONTEXT:')
    parts.push('No curated posts/opinions loaded yet. Do not invent facts. If asked for specific up-to-date info, say you may be inaccurate and suggest checking official sources.')
    parts.push('')
  }

  return parts.join('\n')
}
