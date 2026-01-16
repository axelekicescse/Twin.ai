'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

interface Persona {
  name: string
  bio: string
  style_rules: string[]
  principles: string[]
  do_not: string[]
  examples: Array<{ topic: string; response: string }>
}

export default function StudioPage() {
  const [persona, setPersona] = useState<Persona>({
    name: '',
    bio: '',
    style_rules: [],
    principles: [],
    do_not: [],
    examples: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchPersona()
  }, [])

  const fetchPersona = async () => {
    try {
      const res = await fetch('/api/persona')
      const data = await res.json()
      setPersona(data)
    } catch (error) {
      console.error('Error loading persona:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/persona', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving persona:', error)
      alert('Failed to save persona')
    } finally {
      setSaving(false)
    }
  }

  const updateArrayField = (field: keyof Persona, index: number, value: string) => {
    const arr = [...(persona[field] as string[])]
    arr[index] = value
    setPersona({ ...persona, [field]: arr })
  }

  const addArrayItem = (field: keyof Persona) => {
    const arr = [...(persona[field] as string[])]
    arr.push('')
    setPersona({ ...persona, [field]: arr })
  }

  const removeArrayItem = (field: keyof Persona, index: number) => {
    const arr = [...(persona[field] as string[])]
    arr.splice(index, 1)
    setPersona({ ...persona, [field]: arr })
  }

  const updateExample = (index: number, field: 'topic' | 'response', value: string) => {
    const examples = [...persona.examples]
    examples[index] = { ...examples[index], [field]: value }
    setPersona({ ...persona, examples })
  }

  const addExample = () => {
    setPersona({
      ...persona,
      examples: [...persona.examples, { topic: '', response: '' }],
    })
  }

  const removeExample = (index: number) => {
    const examples = persona.examples.filter((_, i) => i !== index)
    setPersona({ ...persona, examples })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Edit Persona</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={persona.name}
              onChange={(e) => setPersona({ ...persona, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bio
            </label>
            <textarea
              value={persona.bio}
              onChange={(e) => setPersona({ ...persona, bio: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Style Rules</h2>
            <button
              onClick={() => addArrayItem('style_rules')}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              + Add
            </button>
          </div>
          {persona.style_rules.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateArrayField('style_rules', idx, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={() => removeArrayItem('style_rules', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Principles</h2>
            <button
              onClick={() => addArrayItem('principles')}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              + Add
            </button>
          </div>
          {persona.principles.map((principle, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={principle}
                onChange={(e) => updateArrayField('principles', idx, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={() => removeArrayItem('principles', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Do Not</h2>
            <button
              onClick={() => addArrayItem('do_not')}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              + Add
            </button>
          </div>
          {persona.do_not.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateArrayField('do_not', idx, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={() => removeArrayItem('do_not', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Examples</h2>
            <button
              onClick={addExample}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              + Add
            </button>
          </div>
          {persona.examples.map((example, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={example.topic}
                  onChange={(e) => updateExample(idx, 'topic', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Response
                </label>
                <textarea
                  value={example.response}
                  onChange={(e) => updateExample(idx, 'response', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                onClick={() => removeExample(idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                Remove Example
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
