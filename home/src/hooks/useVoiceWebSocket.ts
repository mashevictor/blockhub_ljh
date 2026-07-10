import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { MicCapture, PcmPlayer } from '../lib/audioPcm'

export type VoiceSessionState = 'disconnected' | 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

export interface VoiceMessage {
  role: 'user' | 'assistant' | 'system'
  text: string
}

interface VoiceWsConfig {
  ws_url: string
  capture_sample_rate: number
  playback_sample_rate: number
  frame_ms: number
  greeting?: string
  demo_samples?: Array<{ label: string; utterance: string }>
}

function resolveWsUrl(configUrl: string): string {
  if (configUrl.startsWith('ws://') || configUrl.startsWith('wss://')) {
    return configUrl
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${configUrl}`
}

export function useVoiceWebSocket(sessionId: string) {
  const [state, setState] = useState<VoiceSessionState>('disconnected')
  const [partialText, setPartialText] = useState('')
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [micActive, setMicActive] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const configRef = useRef<VoiceWsConfig | null>(null)

  const appendMessage = useCallback((role: VoiceMessage['role'], text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { role, text }])
  }, [])

  const appendAssistantDelta = useCallback((text: string) => {
    if (!text.trim()) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }]
      }
      return [...prev, { role: 'assistant', text }]
    })
  }, [])

  const disconnect = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    setMicActive(false)
    playerRef.current?.clear()
    wsRef.current?.close()
    wsRef.current = null
    setState('disconnected')
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current) return
    setError(null)
    setState('connecting')
    try {
      const res = await api.get<VoiceWsConfig & { configured: boolean }>('/voice/config')
      if (!res.data.configured) {
        throw new Error('电信语音服务未配置')
      }
      configRef.current = res.data
      const url = `${resolveWsUrl(res.data.ws_url)}?session_id=${encodeURIComponent(sessionId)}`
      const ws = new WebSocket(url)
      wsRef.current = ws
      playerRef.current = new PcmPlayer(res.data.playback_sample_rate)

      ws.onopen = () => {
        setState('idle')
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as Record<string, unknown>
        const type = String(msg.type || '')

        if (type === 'state') {
          const next = String(msg.state || 'idle') as VoiceSessionState
          setState(next === 'idle' || next === 'listening' || next === 'thinking' || next === 'speaking' ? next : 'idle')
        } else if (type === 'ready') {
          setState('idle')
          const greeting = String(msg.greeting || '')
          if (greeting) appendMessage('assistant', greeting)
        } else if (type === 'assistant_message') {
          appendMessage('assistant', String(msg.text || ''))
        } else if (type === 'asr_partial') {
          setPartialText(String(msg.text || ''))
        } else if (type === 'asr_final') {
          const text = String(msg.text || '')
          setPartialText('')
          appendMessage('user', text)
        } else if (type === 'llm_delta') {
          appendAssistantDelta(String(msg.text || ''))
        } else if (type === 'tts_audio') {
          void playerRef.current?.resume()
          playerRef.current?.enqueueBase64Pcm(String(msg.data || ''), configRef.current?.playback_sample_rate)
        } else if (type === 'error') {
          const message = String(msg.message || '语音会话错误')
          setError(message)
          setState('error')
        }
      }

      ws.onerror = () => {
        setError('WebSocket 连接失败')
        setState('error')
      }

      ws.onclose = () => {
        wsRef.current = null
        setMicActive(false)
        setState('disconnected')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接失败')
      setState('error')
    }
  }, [appendAssistantDelta, appendMessage, connect, sessionId])

  const simulateUtterance = useCallback(async (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect()
    }
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'simulate', text }))
    setState('thinking')
  }, [connect])

  const startMic = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect()
    }
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    if (!micRef.current) {
      const mic = new MicCapture()
      await mic.start((b64) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'audio', data: b64 }))
        }
      })
      micRef.current = mic
    }
    setMicActive(true)
    setState('listening')
  }, [connect])

  const stopMic = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    setMicActive(false)
    wsRef.current?.send(JSON.stringify({ type: 'utterance_end' }))
    setState('thinking')
  }, [])

  const bargeIn = useCallback(() => {
    playerRef.current?.clear()
    wsRef.current?.send(JSON.stringify({ type: 'barge_in' }))
    setState('listening')
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  return {
    state,
    partialText,
    messages,
    error,
    micActive,
    connect,
    disconnect,
    startMic,
    stopMic,
    bargeIn,
    simulateUtterance,
  }
}
