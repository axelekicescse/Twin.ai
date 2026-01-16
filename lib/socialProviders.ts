import feedsData from '@/data/social-feeds.json'
import { getStarKnowledge, type StarPost } from '@/lib/starKnowledge'

type SocialFeedsFile = {
  version: number
  stars: Record<
    string,
    {
      youtubeChannelId: string | null
      feeds: string[]
    }
  >
}

const registry = feedsData as unknown as SocialFeedsFile

function getFeeds(starId: string) {
  return registry.stars?.[starId] || { youtubeChannelId: null, feeds: [] }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }
  return res.text()
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseYouTubeAtom(xml: string): StarPost[] {
  const entries = xml.split('<entry>').slice(1)
  const posts: StarPost[] = []

  for (const chunk of entries) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(chunk)?.[1]
    const link = /<link[^>]*?href="([^"]+)"[^>]*?\/>/.exec(chunk)?.[1]
    const published = /<published>([\s\S]*?)<\/published>/.exec(chunk)?.[1]
    if (!title || !link) continue
    posts.push({
      platform: 'youtube',
      date: published,
      text: decodeXmlEntities(title).trim(),
      url: link,
    })
  }

  return posts
}

function parseGenericRssAtom(xml: string): StarPost[] {
  const items = xml.includes('<item>') ? xml.split('<item>').slice(1) : xml.split('<entry>').slice(1)
  const posts: StarPost[] = []

  for (const chunk of items) {
    const title = /<title(?:[^>]*)>([\s\S]*?)<\/title>/.exec(chunk)?.[1]
    const link1 = /<link>([\s\S]*?)<\/link>/.exec(chunk)?.[1]
    const link2 = /<link[^>]*?href="([^"]+)"[^>]*?>/.exec(chunk)?.[1]
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(chunk)?.[1]
    const updated = /<updated>([\s\S]*?)<\/updated>/.exec(chunk)?.[1]
    const link = (link1 || link2 || '').trim()
    if (!title && !link) continue
    posts.push({
      platform: 'other',
      date: (updated || pubDate || '').trim() || undefined,
      text: decodeXmlEntities((title || link).trim()).trim(),
      url: link || undefined,
    })
  }

  return posts
}

async function fetchYouTubeAtomLatest(starId: string): Promise<StarPost[]> {
  const { youtubeChannelId } = getFeeds(starId)
  if (!youtubeChannelId) return []
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(youtubeChannelId)}`
  const xml = await fetchText(url)
  return parseYouTubeAtom(xml).slice(0, 6)
}

async function fetchCustomFeedsLatest(starId: string): Promise<StarPost[]> {
  const { feeds } = getFeeds(starId)
  if (!feeds?.length) return []

  const settled = await Promise.allSettled(
    feeds.slice(0, 4).map(async (u) => {
      const xml = await fetchText(u)
      return parseGenericRssAtom(xml)
    })
  )

  const posts: StarPost[] = []
  for (const s of settled) {
    if (s.status === 'fulfilled') posts.push(...s.value)
  }
  return posts
}

export async function getLatestSocialPosts(starId: string): Promise<{ posts: StarPost[]; source: 'api' | 'fallback' }>{
  // Try RSS/Atom feeds (best-effort)
  try {
    const [yt, other] = await Promise.allSettled([
      fetchYouTubeAtomLatest(starId),
      fetchCustomFeedsLatest(starId),
    ])

    const posts: StarPost[] = []
    if (yt.status === 'fulfilled') posts.push(...yt.value)
    if (other.status === 'fulfilled') posts.push(...other.value)

    const unique = new Map<string, StarPost>()
    for (const p of posts) {
      const key = p.url || `${p.platform}:${p.date}:${p.text.slice(0, 32)}`
      unique.set(key, p)
    }

    const merged = Array.from(unique.values())
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8)

    if (merged.length) return { posts: merged, source: 'api' }
  } catch {
    // ignore: fallback below
  }

  const fallback = getStarKnowledge(starId).latestPosts || []
  return { posts: fallback.slice(0, 8), source: 'fallback' }
}
