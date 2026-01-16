'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogIn, User } from 'lucide-react'

type Props = {
  className?: string
}

export default function AccountButton({ className }: Props) {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const savedRole = window.localStorage.getItem('twinai.role')
    if (savedRole) setRole(savedRole)
  }, [])

  const isSignedIn = !!role

  return (
    <>
      <Link
        href="/account"
        className={
          className ||
          'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
        }
        aria-label={isSignedIn ? 'Account' : 'Sign in'}
      >
        {isSignedIn ? (
          <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <LogIn className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </Link>
    </>
  )
}
