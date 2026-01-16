'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import PersonaCard from '@/components/PersonaCard'
import { Menu } from 'lucide-react'
import { personas } from '@/lib/personas'
import { useSearchParams } from 'next/navigation'

function SearchPageContent() {
  const params = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const q = params.get('q') || ''
    setSearchQuery(q)
  }, [params])

  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) {
      return personas
    }
    const query = searchQuery.toLowerCase()
    return personas.filter(persona =>
      persona.name.toLowerCase().includes(query) ||
      persona.id.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Spacer for mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white mb-4">
                Search
              </h1>
            </div>

            {/* Results */}
            {filteredPersonas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPersonas.map((persona) => (
                  <PersonaCard key={persona.id} persona={persona} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No personas found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-900 flex">
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
