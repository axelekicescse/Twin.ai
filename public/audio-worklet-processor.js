// AudioWorklet processor for low-latency PCM playback
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = []
    this.bufferSize = 48000 // Larger buffer for smoother playback
    this.startTime = currentTime
    this.sampleCount = 0
    this.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        // Add samples to buffer
        const samples = event.data.samples
        if (Array.isArray(samples) && samples.length > 0) {
          this.buffer.push(...samples)
          // Log first few chunks for debugging
          if (this.sampleCount < 3) {
            this.port.postMessage({
              type: 'debug',
              message: `Received ${samples.length} samples, buffer size: ${this.buffer.length}`
            })
            this.sampleCount++
          }
        }
      } else if (event.data.type === 'stop') {
        this.buffer = []
        this.sampleCount = 0
      }
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]
    if (!output || output.length === 0) {
      return true
    }
    
    const channel = output[0]
    if (!channel) {
      return true
    }

    // Fill output with samples from buffer
    const samplesToWrite = Math.min(channel.length, this.buffer.length)
    
    for (let i = 0; i < samplesToWrite; i++) {
      channel[i] = this.buffer.shift()
    }
    
    // Zero out remaining samples (silence)
    for (let i = samplesToWrite; i < channel.length; i++) {
      channel[i] = 0
    }

    // Send time update occasionally
    if (this.sampleCount % 1000 === 0) {
      const currentTimeMs = (currentTime - this.startTime) * 1000
      this.port.postMessage({
        type: 'timeupdate',
        currentTimeMs: currentTimeMs,
      })
    }
    this.sampleCount++

    return true
  }
}

registerProcessor('pcm-processor', PcmProcessor)
