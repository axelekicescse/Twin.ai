/**
 * ElevenLabs WebSocket Text-to-Speech Client
 * Handles streaming TTS with alignment data for synchronized typewriter effect
 */

export type TtsState = 'IDLE' | 'CONNECTING' | 'STREAMING' | 'PLAYING' | 'FINALIZING' | 'DONE' | 'CANCELLED' | 'ERROR'

export interface AlignmentData {
  chars: string[]
  charStartTimesMs: number[]
  charDurationsMs: number[]
}

export interface AudioChunk {
  audio: string // base64 PCM data
  isFinal: boolean
}

export interface TtsEvent {
  type: 'audio' | 'alignment' | 'error' | 'done'
  data?: AudioChunk | AlignmentData | string
}

export type TtsEventHandler = (event: TtsEvent) => void

export class TtsWsClient {
  private ws: WebSocket | null = null
  private state: TtsState = 'IDLE'
  private eventHandlers: Set<TtsEventHandler> = new Set()
  private voiceId: string
  private apiKey: string
  private textBuffer: string = ''
  private chunkSize: number = 50 // characters per chunk

  constructor(voiceId: string, apiKey: string) {
    this.voiceId = voiceId
    this.apiKey = apiKey
  }

  /**
   * Subscribe to TTS events
   */
  on(eventHandler: TtsEventHandler): () => void {
    this.eventHandlers.add(eventHandler)
    return () => this.eventHandlers.delete(eventHandler)
  }

  /**
   * Get current state
   */
  getState(): TtsState {
    return this.state
  }

  /**
   * Connect to ElevenLabs WebSocket
   */
  async connect(): Promise<void> {
    if (this.state !== 'IDLE' && this.state !== 'ERROR' && this.state !== 'CANCELLED') {
      throw new Error(`Cannot connect from state: ${this.state}`)
    }

    this.state = 'CONNECTING'

    return new Promise((resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout | null = null
      
      try {
        // ElevenLabs WebSocket endpoint - API key will be sent in messages
        const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream?output_format=pcm_24000&optimize_streaming_latency=3&sync_alignment=true&inactivity_timeout=180`
        
        console.log('Creating WebSocket connection to:', wsUrl.replace(this.apiKey, '***'))
        this.ws = new WebSocket(wsUrl)
        
        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (this.state === 'CONNECTING') {
            console.error('WebSocket connection timeout')
            this.state = 'ERROR'
            this.ws?.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout

        this.ws.onopen = () => {
          console.log('TTS WebSocket connected')
          if (connectionTimeout) clearTimeout(connectionTimeout)
          this.state = 'STREAMING'
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            // ElevenLabs sends different message types
            if (typeof event.data === 'string') {
              const data = JSON.parse(event.data)
              console.log('TTS WS message:', data)

              // Handle audio chunks (base64 encoded PCM)
              if (data.audio) {
                this.emit({
                  type: 'audio',
                  data: {
                    audio: data.audio,
                    isFinal: data.is_final || false,
                  },
                })
              }

              // Handle alignment data (character-level timing)
              if (data.alignment) {
                const alignment = data.alignment
                this.emit({
                  type: 'alignment',
                  data: {
                    chars: alignment.chars || alignment.characters || [],
                    charStartTimesMs: alignment.charStartTimesMs || alignment.char_start_times_ms || [],
                    charDurationsMs: alignment.charDurationsMs || alignment.char_durations_ms || [],
                  },
                })
              }

              // Handle text_stream events (some APIs send text this way)
              if (data.text_stream) {
                // Text stream data might contain alignment info
                if (data.text_stream.alignment) {
                  const alignment = data.text_stream.alignment
                  this.emit({
                    type: 'alignment',
                    data: {
                      chars: alignment.chars || [],
                      charStartTimesMs: alignment.charStartTimesMs || [],
                      charDurationsMs: alignment.charDurationsMs || [],
                    },
                  })
                }
              }

              // Handle completion
              if (data.is_final || data.event === 'audio_complete') {
                this.state = 'FINALIZING'
              }
            } else if (event.data instanceof ArrayBuffer) {
              // Binary audio data (less common, but possible)
              console.log('Received binary audio data:', event.data.byteLength)
            }
          } catch (error) {
            console.error('Failed to parse WS message:', error, event.data)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          if (connectionTimeout) clearTimeout(connectionTimeout)
          this.state = 'ERROR'
          this.emit({ type: 'error', data: 'WebSocket connection error' })
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          if (this.state !== 'CANCELLED') {
            if (event.code !== 1000) {
              this.state = 'ERROR'
              this.emit({ type: 'error', data: `WebSocket closed: ${event.code} - ${event.reason || 'Unknown reason'}` })
            } else {
              this.state = 'DONE'
              this.emit({ type: 'done' })
            }
          }
        }
      } catch (error) {
        this.state = 'ERROR'
        reject(error)
      }
    })
  }

  /**
   * Send initialization message with voice settings
   * According to ElevenLabs docs, xi_api_key should be in the message, not just URL
   */
  initialize(voiceSettings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const initMessage = {
      text: ' ',
      voice_settings: voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
      xi_api_key: this.apiKey, // API key in message body as per docs
    }

    console.log('Sending initialization message')
    this.ws.send(JSON.stringify(initMessage))
  }

  /**
   * Stream text chunk to WebSocket
   * According to ElevenLabs docs, each message needs xi_api_key
   */
  streamText(text: string, tryTriggerGeneration: boolean = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    this.textBuffer += text

    // Send chunk when buffer reaches size or on punctuation
    const shouldSend = 
      this.textBuffer.length >= this.chunkSize ||
      /[.!?]\s*$/.test(this.textBuffer) ||
      tryTriggerGeneration

    if (shouldSend) {
      const message = {
        text: this.textBuffer,
        try_trigger_generation: tryTriggerGeneration,
        xi_api_key: this.apiKey, // API key in each message
      }

      console.log('Sending text chunk:', this.textBuffer.substring(0, 50) + '...')
      this.ws.send(JSON.stringify(message))
      this.textBuffer = ''
    }
  }

  /**
   * Flush remaining text buffer
   */
  flush(): void {
    if (this.textBuffer && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        text: this.textBuffer,
        try_trigger_generation: true,
        xi_api_key: this.apiKey, // API key in message
      }
      console.log('Flushing text buffer:', this.textBuffer.substring(0, 50) + '...')
      this.ws.send(JSON.stringify(message))
      this.textBuffer = ''
    }
  }

  /**
   * Cancel and close connection
   */
  cancel(): void {
    this.state = 'CANCELLED'
    if (this.ws) {
      this.ws.close(1000, 'Cancelled by user')
      this.ws = null
    }
    this.textBuffer = ''
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: TtsEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        console.error('Error in TTS event handler:', error)
      }
    })
  }
}
