'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import { Menu } from 'lucide-react'

export default function BackstagePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5 text-white/80" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="px-4 lg:px-6 py-8">
            <div className="max-w-6xl mx-auto">
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
                <div className="relative">
                  <div className="absolute inset-0">
                    <img
                      src="/backstages/Naval backstages.png"
                      alt="Inside the making of an AI twin"
                      className="h-full w-full object-cover object-[50%_20%] sm:object-[50%_15%] opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
                  </div>

                  <div className="relative px-6 py-14 sm:px-10 sm:py-16">
                    <div className="max-w-2xl">
                      <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
                        Inside the making of an AI twin: Naval Ravikant
                      </h1>
                      <p className="mt-3 text-sm sm:text-base text-white/70">
                        From real human to infinite presence
                      </p>
                      <p className="mt-6 text-sm text-white/70 leading-relaxed">
                        Backstage is a documentary space. It exists to show that Twin.ai isn’t roleplay — it’s a real co-creation process with real people, real material, and real validation.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-10 space-y-10">
                <DocSection
                  index="01"
                  title="Interviews with the real creator"
                  caption="Long-form conversations to capture intent, values, boundaries, and the creator’s natural rhythm."
                  imageSrc="/backstages/naval backtages2.png"
                  imageAlt="Backstage interviews"
                />

                <DocSection
                  index="02"
                  title="Personality modeling"
                  caption="We map recurring beliefs, motivations, and decision patterns — what stays consistent across contexts."
                  imageSrc="/backstages/Naval backstages3.png"
                  imageAlt="Personality modeling"
                />

                <DocSection
                  index="03"
                  title="Simulation & training"
                  caption="The twin learns voice, tone shifts, and response pacing — not just facts, but the creator’s way of thinking."
                  imageSrc="/backstages/Naval backstages4.png"
                  imageAlt="Simulation and training"
                />

                <DocSection
                  index="04"
                  title="Validation by the creator"
                  caption="The creator reviews responses, corrects drift, and locks constraints. Authenticity is verified, not assumed."
                  imageSrc="/backstages/Naval backstages5.png"
                  imageAlt="Creator validation"
                />

                <DocSection
                  index="05"
                  title="Twin launch"
                  caption="A living twin that keeps improving — refreshed, monitored, and tuned to stay aligned over time."
                  imageSrc="/backstages/Naval backstages6.png"
                  imageAlt="Twin launch"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function DocSection({
  index,
  title,
  caption,
  imageSrc,
  imageAlt,
}: {
  index: string
  title: string
  caption: string
  imageSrc: string
  imageAlt: string
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-white/50">{index}</div>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/70 leading-relaxed">
              {caption}
            </p>
          </div>
          <div className="hidden sm:block text-xs text-white/40">Backstage</div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-44 sm:h-56 w-full object-cover object-[50%_25%]"
          />
        </div>

        <div className="mt-4 text-xs text-white/50">
          Documentary note: this is a simplified visualization. In production, each section would include real clips, artifacts, and review logs.
        </div>
      </div>
    </section>
  )
}
