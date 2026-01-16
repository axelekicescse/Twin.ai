'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import { ArrowRight, LogOut } from 'lucide-react'

type Role = 'fan' | 'star'

type Step = 'role' | 'credentials'

export default function AccountPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('role')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [publicName, setPublicName] = useState<string>('')

  const [role, setRole] = useState<Role>('fan')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [signedRole, setSignedRole] = useState<Role | null>(null)

  useEffect(() => {
    const savedRole = window.localStorage.getItem('twinai.role')
    const savedUsername = window.localStorage.getItem('twinai.username')
    const savedAvatar = window.localStorage.getItem('userAvatar')
    const savedPublic = window.localStorage.getItem('twinai.publicName')

    if (savedRole === 'fan' || savedRole === 'star') setRole(savedRole)
    if (savedUsername) setUsername(savedUsername)
    if (savedAvatar) setAvatar(savedAvatar)
    if (savedPublic) setPublicName(savedPublic)
    setSignedRole(savedRole === 'fan' || savedRole === 'star' ? savedRole : null)

    if (savedRole) {
      setStep('credentials')
    }
  }, [])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setAvatar(result)
      window.localStorage.setItem('userAvatar', result)
    }
    reader.readAsDataURL(file)
  }

  const disconnect = () => {
    window.localStorage.removeItem('twinai.role')
    window.localStorage.removeItem('twinai.starId')
    window.localStorage.removeItem('twinai.username')

    setUsername('')
    setPassword('')
    setRole('fan')
    setStep('role')
    setSignedRole(null)

    router.replace('/account')
    router.refresh()
  }

  // Logged-in profile page
  if (signedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 lg:px-6 h-16">
            <Link href="/" className="text-sm font-semibold text-gray-900 dark:text-white">Your profile</Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-3xl overflow-hidden border border-gray-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">No photo</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-500 dark:text-gray-400">Public name</div>
                <input
                  value={publicName}
                  onChange={(e) => {
                    const v = e.target.value
                    setPublicName(v)
                    window.localStorage.setItem('twinai.publicName', v)
                  }}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />

                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Email</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{username}</div>

                <div className="mt-4 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm text-gray-700 hover:bg-white transition-colors dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                    Change photo
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>

                  <button
                    onClick={disconnect}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051D5] transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const signOut = () => {
    window.localStorage.removeItem('twinai.role')
    window.localStorage.removeItem('twinai.starId')
    window.localStorage.removeItem('twinai.username')

    setUsername('')
    setPassword('')
    setRole('fan')
    setStep('role')
    setSignedRole(null)

    router.replace('/account')
    router.refresh()
  }

  const signIn = () => {
    // demo auth
    if (!username || !password) return

    window.localStorage.setItem('twinai.role', role)
    window.localStorage.setItem('twinai.username', username)

    setSignedRole(role)

    router.replace(role === 'star' ? '/star' : '/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
        <div className="max-w-2xl mx-auto flex items-center justify-end px-4 lg:px-6 h-16">
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 lg:px-6 py-10">
        <div className="max-w-md mx-auto overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Profile</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {step === 'role'
                  ? 'Choose your space.'
                  : 'Enter your username and password.'}
              </p>
            </div>

            {!!signedRole && (
              <button
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            )}
          </div>

          {step === 'role' && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setRole('fan')
                  setStep('credentials')
                }}
                className="rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                Fan
              </button>
              <button
                onClick={() => {
                  setRole('star')
                  setStep('credentials')
                }}
                className="rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                Star
              </button>
            </div>
          )}

          {step === 'credentials' && (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                Selected: <span className="font-semibold">{role}</span>
              </div>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => setStep('role')}
                  className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                >
                  Back
                </button>

                <button
                  onClick={signIn}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051D5] transition-colors"
                >
                  Connect
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
