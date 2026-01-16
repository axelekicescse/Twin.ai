/**
 * Alignment-based Typewriter
 * Reveals characters based on audio alignment timestamps for tight synchronization
 */

export interface Alignment {
  chars: string[]
  charStartTimesMs: number[]
  charDurationsMs: number[]
}

export type TypewriterCallback = (revealedText: string) => void

export class AlignmentTypewriter {
  private alignment: Alignment | null = null
  private fullText: string = ''
  private revealedText: string = ''
  private callback: TypewriterCallback | null = null
  private isActive: boolean = false
  private checkInterval: number | null = null
  private getCurrentAudioTime: (() => number) | null = null

  /**
   * Set the full text to reveal
   */
  setText(text: string): void {
    this.fullText = text
    this.revealedText = ''
  }

  /**
   * Set alignment data from TTS
   */
  setAlignment(alignment: Alignment): void {
    this.alignment = alignment
  }

  /**
   * Set callback for text updates
   */
  onUpdate(callback: TypewriterCallback): void {
    this.callback = callback
  }

  /**
   * Set function to get current audio playback time
   */
  setAudioTimeGetter(getter: () => number): void {
    this.getCurrentAudioTime = getter
  }

  /**
   * Start typewriter effect
   */
  start(): void {
    if (this.isActive) {
      return
    }

    this.isActive = true
    this.revealedText = ''

    // Check alignment every frame
    this.checkInterval = window.setInterval(() => {
      this.update()
    }, 16) // ~60fps
  }

  /**
   * Update revealed text based on current audio time
   */
  private update(): void {
    if (!this.isActive || !this.alignment || !this.getCurrentAudioTime) {
      return
    }

    const currentTime = this.getCurrentAudioTime()
    const { chars, charStartTimesMs } = this.alignment

    // Find how many characters should be revealed
    let revealedCount = 0
    for (let i = 0; i < chars.length; i++) {
      if (charStartTimesMs[i] <= currentTime) {
        revealedCount = i + 1
      } else {
        break
      }
    }

    // Update revealed text
    if (revealedCount > this.revealedText.length) {
      this.revealedText = chars.slice(0, revealedCount).join('')
      this.callback?.(this.revealedText)
    }
  }

  /**
   * Reveal all text immediately (fallback if alignment fails)
   */
  revealAll(): void {
    this.revealedText = this.fullText
    this.callback?.(this.revealedText)
  }

  /**
   * Stop typewriter
   */
  stop(): void {
    this.isActive = false
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Get current revealed text
   */
  getRevealedText(): string {
    return this.revealedText
  }

  /**
   * Reset
   */
  reset(): void {
    this.stop()
    this.fullText = ''
    this.revealedText = ''
    this.alignment = null
  }
}
