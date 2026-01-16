/**
 * Low-latency PCM Audio Player
 * Uses Web Audio API with AudioWorklet for optimal performance
 * Falls back to ScriptProcessorNode if AudioWorklet is unavailable
 */

export interface PcmPlayerCallbacks {
  onTimeUpdate?: (currentTimeMs: number) => void
  onEnded?: () => void
  onError?: (error: Error) => void
}

export class PcmPlayer {
  private audioContext: AudioContext | null = null
  private audioWorkletNode: AudioWorkletNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private source: AudioBufferSourceNode | null = null
  private isPlaying: boolean = false
  private startTime: number = 0
  private pausedTime: number = 0
  private callbacks: PcmPlayerCallbacks
  private sampleRate: number = 24000
  private audioQueue: Float32Array[] = []
  private animationFrameId: number | null = null

  constructor(callbacks: PcmPlayerCallbacks = {}) {
    this.callbacks = callbacks
  }

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (this.audioContext) {
      return
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      })

      // Try to use AudioWorklet for better performance
      try {
        // Load worklet from public directory
        await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js')
        this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor')
        // Connect to destination so audio actually plays
        this.audioWorkletNode.connect(this.audioContext.destination)
        this.audioWorkletNode.port.onmessage = (event) => {
          if (event.data.type === 'timeupdate') {
            this.callbacks.onTimeUpdate?.(event.data.currentTimeMs)
          } else if (event.data.type === 'debug') {
            console.log('AudioWorklet:', event.data.message)
          }
        }
        console.log('AudioWorklet initialized and connected')
      } catch (error) {
        console.warn('AudioWorklet not available, using ScriptProcessorNode fallback', error)
        // Fallback to ScriptProcessorNode
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
        this.scriptProcessor.connect(this.audioContext.destination)
        this.scriptProcessor.onaudioprocess = (event) => {
          if (this.isPlaying) {
            const currentTime = this.audioContext!.currentTime - this.startTime
            this.callbacks.onTimeUpdate?.(currentTime * 1000)
            
            // Process audio queue
            const outputBuffer = event.outputBuffer
            const channel = outputBuffer.getChannelData(0)
            
            // Fill with queued audio or silence
            if (this.audioQueue.length > 0) {
              const samples = this.audioQueue.shift()!
              const copyLength = Math.min(samples.length, channel.length)
              for (let i = 0; i < copyLength; i++) {
                channel[i] = samples[i]
              }
              // Fill rest with silence
              for (let i = copyLength; i < channel.length; i++) {
                channel[i] = 0
              }
            } else {
              // Silence
              for (let i = 0; i < channel.length; i++) {
                channel[i] = 0
              }
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize audio context: ${error}`)
    }
  }

  /**
   * Start playback
   */
  start(): void {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    if (this.isPlaying) {
      return
    }

    this.isPlaying = true
    this.startTime = this.audioContext.currentTime - (this.pausedTime / 1000)

    // Start time update loop
    this.startTimeUpdateLoop()
  }

  /**
   * Queue PCM audio data (base64 encoded)
   */
  queueAudio(base64Audio: string): void {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Convert to Float32Array (PCM 16-bit little-endian)
    const samples = new Float32Array(bytes.length / 2)
    for (let i = 0; i < samples.length; i++) {
      const int16 = bytes[i * 2] | (bytes[i * 2 + 1] << 8)
      samples[i] = int16 > 32767 ? (int16 - 65536) / 32768 : int16 / 32768
    }

    this.audioQueue.push(samples)
    console.log('Audio queued:', samples.length, 'samples, total queue:', this.audioQueue.length)

    // If not playing, start playback
    if (!this.isPlaying) {
      console.log('Starting audio playback')
      this.start()
    }

    // Process queue
    this.processQueue()
  }

  /**
   * Process audio queue
   */
  private processQueue(): void {
    if (!this.audioContext) {
      return
    }

    if (this.audioWorkletNode && this.audioQueue.length > 0) {
      // Use AudioWorklet - send samples to worklet
      while (this.audioQueue.length > 0) {
        const samples = this.audioQueue.shift()!
        this.audioWorkletNode.port.postMessage({
          type: 'audio',
          samples: Array.from(samples), // Convert to regular array for message passing
        })
      }
    }
    // ScriptProcessorNode processes queue in onaudioprocess callback
  }

  /**
   * Start time update loop
   */
  private startTimeUpdateLoop(): void {
    const update = () => {
      if (this.isPlaying && this.audioContext) {
        const currentTime = (this.audioContext.currentTime - this.startTime) * 1000
        this.callbacks.onTimeUpdate?.(currentTime)
        this.animationFrameId = requestAnimationFrame(update)
      }
    }
    update()
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) {
      return
    }

    this.isPlaying = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.audioContext) {
      this.pausedTime = (this.audioContext.currentTime - this.startTime) * 1000
    }
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    this.isPlaying = false
    this.audioQueue = []
    this.pausedTime = 0

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ type: 'stop' })
    }
  }

  /**
   * Get current playback time in milliseconds
   */
  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pausedTime
    }
    return (this.audioContext.currentTime - this.startTime) * 1000
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop()

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect()
      this.audioWorkletNode = null
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
