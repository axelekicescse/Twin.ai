'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'

type Props = {
  name: string
  src?: string | null
  letter?: string
  gradient?: string // tailwind gradient classes without bg-gradient-to-br
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export default function Avatar({
  name,
  src,
  letter,
  gradient = 'from-sky-500 to-indigo-600',
  size = 'md',
  className,
}: Props) {
  const [imgOk, setImgOk] = useState(true)

  const fallbackLetter = useMemo(() => {
    const l = (letter || name?.[0] || '?').toUpperCase().slice(0, 1)
    return l
  }, [letter, name])

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-full bg-gradient-to-br shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        gradient,
        sizeMap[size],
        'flex items-center justify-center font-semibold text-white',
        className
      )}
    >
      {src && imgOk ? (
        // Using <img> intentionally for simplicity and remote URLs
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span aria-hidden>{fallbackLetter}</span>
      )}
    </div>
  )
}

