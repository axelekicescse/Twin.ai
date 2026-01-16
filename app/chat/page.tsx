'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old /chat route to /chat/naval
export default function ChatPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/chat/naval')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  )
}
