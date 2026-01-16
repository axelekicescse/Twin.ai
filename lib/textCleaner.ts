/**
 * Cleans AI response text to remove markdown formatting and make it more natural
 */
export function cleanResponseText(text: string): string {
  let cleaned = text

  // Avoid em/en dashes for a more natural conversational tone
  cleaned = cleaned.replace(/\s*[—–]\s*/g, ', ')

  // Remove markdown bold/italic (**, __, *)
  cleaned = cleaned.replace(/\*\*\*(.*?)\*\*\*/g, '$1')
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1')
  cleaned = cleaned.replace(/__(.*?)__/g, '$1')
  cleaned = cleaned.replace(/_(.*?)_/g, '$1')

  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')

  // Remove markdown links but keep the text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

  // Remove markdown code blocks but keep content
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '')
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')

  // Remove bullet points and list markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '')
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '')

  // Clean up excessive line breaks (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Clean up accidental double punctuation/spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/,\s*,/g, ',')

  // Trim whitespace
  cleaned = cleaned.trim()

  return cleaned
}
