/* eslint-disable react/no-unescaped-entities */

'use client'

import Link from 'next/link'
import { Persona } from '@/lib/personas'
import Avatar from '@/components/Avatar'
import { getAvatarForPersona } from '@/lib/avatar'

interface PersonaCardProps {
  persona: Persona
}

export default function PersonaCard({ persona }: PersonaCardProps) {
  const { avatarImage, avatarLetter, avatarGradient } = getAvatarForPersona(persona)

  return (
    <Link
      href={`/creator/${persona.id}`}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl active:translate-y-0 dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-white/20"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-sky-500/15 to-indigo-600/15 blur-2xl transition-opacity group-hover:opacity-90" />
      <div className="flex flex-col items-center text-center">
        <Avatar
          name={persona.name}
          src={avatarImage}
          letter={avatarLetter}
          gradient={avatarGradient}
          size="lg"
          className="mb-4 shadow-md transition-shadow group-hover:shadow-lg"
        />
        
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
          {persona.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Verified twin profile
        </p>
      </div>
    </Link>
  )
}
