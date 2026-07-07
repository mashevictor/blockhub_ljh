export const CAPTURE_SAMPLE_RATE = 16000
export const PLAYBACK_SAMPLE_RATE = 24000
export const FRAME_MS = 200

export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Int16Array(bytes.buffer)
}

export function int16ToFloat32(pcm: Int16Array): Float32Array {
  const out = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i += 1) {
    out[i] = pcm[i] / (pcm[i] < 0 ? 0x8000 : 0x7fff)
  }
  return out
}

export class MicCapture {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private buffer: number[] = []
  private frameSamples = Math.floor((CAPTURE_SAMPLE_RATE * FRAME_MS) / 1000)

  async start(onFrame: (b64: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: CAPTURE_SAMPLE_RATE,
      },
    })
    this.ctx = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE })
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      for (let i = 0; i < input.length; i += 1) {
        this.buffer.push(input[i])
      }
      while (this.buffer.length >= this.frameSamples) {
        const chunk = this.buffer.splice(0, this.frameSamples)
        const pcm = floatTo16BitPCM(Float32Array.from(chunk))
        onFrame(int16ToBase64(pcm))
      }
    }
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close()
    this.processor = null
    this.source = null
    this.stream = null
    this.ctx = null
    this.buffer = []
  }
}

export class PcmPlayer {
  private ctx: AudioContext
  private nextTime = 0
  private activeSources: AudioBufferSourceNode[] = []

  constructor(sampleRate = PLAYBACK_SAMPLE_RATE) {
    this.ctx = new AudioContext({ sampleRate })
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  enqueueBase64Pcm(b64: string, sampleRate = PLAYBACK_SAMPLE_RATE): void {
    if (!b64) return
    const pcm = base64ToInt16(b64)
    const floats = int16ToFloat32(pcm)
    const buffer = this.ctx.createBuffer(1, floats.length, sampleRate)
    buffer.copyToChannel(floats, 0)
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.ctx.destination)
    const startAt = Math.max(this.nextTime, this.ctx.currentTime + 0.02)
    source.start(startAt)
    this.nextTime = startAt + buffer.duration
    this.activeSources.push(source)
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source)
    }
  }

  clear(): void {
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    }
    this.activeSources = []
    this.nextTime = 0
  }
}
