/**
 * Custom hook for voice-enabled chat
 * Manages TTS WebSocket, audio playback, and typewriter synchronization
 */

import { useRef, useState, useCallback } from 'react'
import { TtsWsClient, TtsEvent } from '@/lib/tts/TtsWsClient'
import { PcmPlayer } from '@/lib/audio/PcmPlayer'
import { AlignmentTypewriter } from '@/lib/typewriter/AlignmentTypewriter'
import { cleanResponseText } from '@/lib/textCleaner'

interface VoiceChatState {
  isConnected: boolean
  isPlaying: boolean
  queuedAudioMs: number
  revealedChars: number
  currentAudioTimeMs: number
}

const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel voice (can be changed)
const INACTIVITY_TIMEOUT = 180000 // 180 seconds

export function useVoiceChat() {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isConnected: false,
    isPlaying: false,
    queuedAudioMs: 0,
    revealedChars: 0,
    currentAudioTimeMs: 0,
  })

  const ttsClientRef = useRef<TtsWsClient | null>(null)
  const audioPlayerRef = useRef<PcmPlayer | null>(null)
  const typewriterRef = useRef<AlignmentTypewriter | null>(null)
  const currentMessageIndexRef = useRef<number>(-1)
  const updateTextCallbackRef = useRef<((text: string) => void) | null>(null)

  /**
   * Initialize voice chat components
   */
  const initializeVoice = useCallback(async (apiKey: string) => {
    try {
      // Initialize audio player
      const audioPlayer = new PcmPlayer({
        onTimeUpdate: (currentTimeMs) => {
          setVoiceState((prev) => ({
            ...prev,
            currentAudioTimeMs: currentTimeMs,
          }))
        },
        onEnded: () => {
          setVoiceState((prev) => ({
            ...prev,
            isPlaying: false,
          }))
        },
        onError: (error) => {
          console.error('Audio player error:', error)
        },
      })

      await audioPlayer.initialize()
      audioPlayerRef.current = audioPlayer

      // Initialize typewriter
      const typewriter = new AlignmentTypewriter()
      typewriter.setAudioTimeGetter(() => audioPlayer.getCurrentTime())
      typewriterRef.current = typewriter

      return true
    } catch (error) {
      console.error('Failed to initialize voice:', error)
      return false
    }
  }, [])

  /**
   * Start voice playback for a message
   */
  const startVoicePlayback = useCallback(
    async (
      text: string,
      messageIndex: number,
      updateText: (text: string) => void
    ) => {
      if (!voiceEnabled) {
        return
      }

      // Cancel any existing playback
      cancelVoicePlayback()

      // Get API key from backend
      let apiKey: string
      try {
        const tokenResponse = await fetch('/api/eleven/token')
        const tokenData = await tokenResponse.json()
        // Decode base64 in browser
        const decoded = atob(tokenData.token)
        const tokenObj = JSON.parse(decoded)
        apiKey = tokenObj.api_key
      } catch (error) {
        console.error('Failed to get API key:', error)
        return
      }

      currentMessageIndexRef.current = messageIndex
      updateTextCallbackRef.current = updateText

      const cleanedText = cleanResponseText(text)
      const audioPlayer = audioPlayerRef.current!

      // Text is already shown instantly, just update state
      setVoiceState((prev) => ({
        ...prev,
        revealedChars: cleanedText.length,
      }))

      // Create TTS client
      const ttsClient = new TtsWsClient(ELEVENLABS_VOICE_ID, apiKey)
      ttsClientRef.current = ttsClient

      // Connect and setup
      try {
        console.log('Attempting to connect to ElevenLabs WebSocket...')
        await ttsClient.connect()
        console.log('WebSocket connected successfully')
        setVoiceState((prev) => ({ ...prev, isConnected: true }))

        ttsClient.initialize({
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        })

        // Handle TTS events
        const unsubscribe = ttsClient.on((event: TtsEvent) => {
          console.log('TTS Event:', event.type, event.data)
          if (event.type === 'audio' && event.data) {
            const audioChunk = event.data as { audio: string; isFinal: boolean }
            if (audioChunk.audio && audioChunk.audio.length > 0) {
              try {
                audioPlayer.queueAudio(audioChunk.audio)
                setVoiceState((prev) => ({
                  ...prev,
                  isPlaying: true,
                  queuedAudioMs: prev.queuedAudioMs + (audioChunk.audio.length * 1000 / 24000), // Rough estimate
                }))
              } catch (error) {
                console.error('Error queueing audio:', error)
              }
            }
          } else if (event.type === 'alignment' && event.data) {
            const alignment = event.data as {
              chars: string[]
              charStartTimesMs: number[]
              charDurationsMs: number[]
            }
            console.log('Alignment received:', alignment.chars?.length || 0, 'chars')
            // Text is already shown, alignment is just for reference
          } else if (event.type === 'error') {
            console.error('TTS error:', event.data)
            setVoiceState((prev) => ({
              ...prev,
              isConnected: false,
            }))
          } else if (event.type === 'done') {
            console.log('TTS done')
            setVoiceState((prev) => ({
              ...prev,
              isConnected: false,
              isPlaying: false,
            }))
            unsubscribe()
          }
        })

        // Stream entire text at once (ElevenLabs can handle it)
        // Send text in chunks for better streaming
        const chunkSize = 200
        let offset = 0
        
        while (offset < cleanedText.length) {
          const chunk = cleanedText.substring(offset, Math.min(offset + chunkSize, cleanedText.length))
          const isLast = offset + chunk.length >= cleanedText.length
          
          ttsClient.streamText(chunk, isLast)
          offset += chunk.length
          
          // Small delay between chunks
          if (!isLast) {
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
        }

        // Flush and trigger final generation
        ttsClient.flush()
        
        // Start audio playback immediately
        audioPlayer.start()
      } catch (error) {
        console.error('Failed to start voice playback:', error)
        if (typewriterRef.current) {
          typewriterRef.current.revealAll() // Fallback
        }
        setVoiceState((prev) => ({
          ...prev,
          isConnected: false,
        }))
      }
    },
    [voiceEnabled]
  )

  /**
   * Cancel current voice playback
   */
  const cancelVoicePlayback = useCallback(() => {
    if (ttsClientRef.current) {
      ttsClientRef.current.cancel()
      ttsClientRef.current = null
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop()
    }

    if (typewriterRef.current) {
      typewriterRef.current.stop()
    }

    setVoiceState({
      isConnected: false,
      isPlaying: false,
      queuedAudioMs: 0,
      revealedChars: 0,
      currentAudioTimeMs: 0,
    })

    currentMessageIndexRef.current = -1
    updateTextCallbackRef.current = null
  }, [])

  /**
   * Toggle voice on/off
   */
  const toggleVoice = useCallback(async () => {
    const newState = !voiceEnabled
    setVoiceEnabled(newState)

    if (!newState) {
      cancelVoicePlayback()
    } else {
      // Get API key and initialize
      try {
        const tokenResponse = await fetch('/api/eleven/token')
        const tokenData = await tokenResponse.json()
        const decoded = atob(tokenData.token)
        const tokenObj = JSON.parse(decoded)
        await initializeVoice(tokenObj.api_key)
      } catch (error) {
        console.error('Failed to initialize voice:', error)
        setVoiceEnabled(false)
      }
    }
  }, [voiceEnabled, initializeVoice, cancelVoicePlayback])

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    cancelVoicePlayback()
    if (audioPlayerRef.current) {
      audioPlayerRef.current.destroy()
      audioPlayerRef.current = null
    }
  }, [cancelVoicePlayback])

  return {
    voiceEnabled,
    voiceState,
    toggleVoice,
    startVoicePlayback,
    cancelVoicePlayback,
    cleanup,
  }
}
