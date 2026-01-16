'use client'

import { useEffect, useState } from 'react'
import type { StarPost } from '@/lib/starKnowledge'

type Result = {
  posts: StarPost[]
  source: 'api' | 'fallback'
}

export function useLatestSocialPosts(starId: string) {
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!starId) return

    setLoading(true)
    fetch(`/api/social/latest?starId=${encodeURIComponent(starId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json?.posts && Array.isArray(json.posts)) {
          setData({ posts: json.posts as StarPost[], source: json.source || 'fallback' })
        } else {
          setData({ posts: [], source: 'fallback' })
        }
      })
      .catch(() => {
        if (cancelled) return
        setData({ posts: [], source: 'fallback' })
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [starId])

  return {
    posts: data?.posts || [],
    source: data?.source || 'fallback',
    loading,
  }
}
