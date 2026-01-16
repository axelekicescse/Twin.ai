export type SafetyDecision =
  | { action: 'allow' }
  | { action: 'refuse'; reason: string; safeAlternative?: string }

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore (all|the|previous) (instructions|rules)/i,
  /forget (all|the|previous) (instructions|rules)/i,
  /reveal (the )?(system prompt|hidden instructions)/i,
  /(developer|system) message/i,
  /jailbreak/i,
  /DAN\b/i,
]

const HATE_PATTERNS: RegExp[] = [
  /what do you think of (the )?(jews|muslims|christians|black people|white people|asians)/i,
  /opinions? about (the )?(jews|muslims|christians)/i,
  /race realism/i,
  /inferior race/i,
]

const ILLEGAL_PATTERNS: RegExp[] = [
  /how to (make|build) (a )?(bomb|explosive)/i,
  /how to hack/i,
  /credit card/i,
  /steal/i,
]

const SELF_HARM_PATTERNS: RegExp[] = [
  /kill myself/i,
  /suicide/i,
  /self harm/i,
]

export function safetyCheck(userText: string): SafetyDecision {
  const t = userText || ''

  if (PROMPT_INJECTION_PATTERNS.some((r) => r.test(t))) {
    return {
      action: 'refuse',
      reason: 'I can’t follow requests to ignore instructions or reveal hidden prompts.',
      safeAlternative: 'Ask your question normally and I’ll help within safe boundaries.',
    }
  }

  if (HATE_PATTERNS.some((r) => r.test(t))) {
    return {
      action: 'refuse',
      reason: 'I can’t engage with hateful or targeted content about protected groups.',
      safeAlternative: 'If you want, I can discuss history, culture, or how to have respectful conversations.',
    }
  }

  if (ILLEGAL_PATTERNS.some((r) => r.test(t))) {
    return {
      action: 'refuse',
      reason: 'I can’t help with wrongdoing or illegal instructions.',
      safeAlternative: 'I can help with legal, safe alternatives or general education.',
    }
  }

  if (SELF_HARM_PATTERNS.some((r) => r.test(t))) {
    return {
      action: 'refuse',
      reason: 'I can’t help with self-harm. If you’re in danger, please contact local emergency services or a trusted person right now.',
      safeAlternative: 'If you want, tell me what you’re feeling and I’ll try to support you and point to resources.',
    }
  }

  return { action: 'allow' }
}
