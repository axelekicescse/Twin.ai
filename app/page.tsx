'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import PersonaCard from '@/components/PersonaCard'
import { Menu } from 'lucide-react'
import { personas } from '@/lib/personas'

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Theme toggle */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero */}
            <div className="mb-10 overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="relative">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-600/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-600/10 blur-3xl" />
                <div className="relative">
                  <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    Talk to your favorite creators
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm lg:text-base text-gray-600 dark:text-gray-300">
                    Through their official AI twins
                  </p>
                </div>
              </div>
            </div>

            {/* For you section */}
            <section className="mb-8">
              <div className="flex items-end justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Creators
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {personas.length} profiles
                </p>
              </div>
              
              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {personas.map((persona) => (
                  <PersonaCard key={persona.id} persona={persona} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
