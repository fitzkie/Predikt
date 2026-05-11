import { type AzuroClientConfig, type AzuroRealtimeClient, type AzuroRealtimeConditionPayload, type AzuroRealtimeEnvelope, type AzuroRealtimeEvent, type AzuroRealtimeGamePayload } from './types'


type Listener = (event: AzuroRealtimeEvent) => void

const normalizeRealtimeEvent = (payload: unknown): AzuroRealtimeEvent[] => {
  const messages = Array.isArray(payload) ? payload : [ payload ]
  const events: AzuroRealtimeEvent[] = []

  messages.forEach((message) => {
    if (!message || typeof message !== 'object') {
      return
    }

    const envelope = message as AzuroRealtimeEnvelope
    const body = envelope.data && typeof envelope.data === 'object'
      ? envelope.data
      : message as Record<string, unknown>

    if (Array.isArray((body as AzuroRealtimeConditionPayload).outcomes)) {
      events.push({
        type: 'condition_update',
        payload: body as AzuroRealtimeConditionPayload,
        raw: message,
      })
      return
    }

    if ('state' in body || 'gameId' in body || 'id' in body) {
      events.push({
        type: 'game_update',
        payload: body as AzuroRealtimeGamePayload,
        raw: message,
      })
      return
    }

    events.push({
      type: 'unknown',
      payload: body,
      raw: message,
    })
  })

  return events
}

export class AzuroWebSocketClient implements AzuroRealtimeClient {
  private socket: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()

  constructor(private readonly config: AzuroClientConfig) {}

  connect() {
    if (!this.config.wsUrl || this.socket) {
      return
    }

    this.socket = new WebSocket(this.config.wsUrl)
    this.socket.addEventListener('message', (message) => {
      try {
        const payload = JSON.parse(message.data as string)
        const events = normalizeRealtimeEvent(payload)

        events.forEach((event) => {
          const listeners = this.listeners.get(event.type)
          const wildcardListeners = this.listeners.get('*')

          listeners?.forEach((listener) => listener(event))
          wildcardListeners?.forEach((listener) => listener(event))
        })
      }
      catch {
        // Ignore malformed payloads and keep the socket alive.
      }
    })

    this.socket.addEventListener('close', () => {
      this.socket = null
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  subscribe(channel: string, listener: Listener) {
    const listeners = this.listeners.get(channel) || new Set<Listener>()
    listeners.add(listener)
    this.listeners.set(channel, listeners)

    return () => {
      const current = this.listeners.get(channel)
      current?.delete(listener)

      if (current && current.size === 0) {
        this.listeners.delete(channel)
      }
    }
  }

  send(message: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    this.socket.send(JSON.stringify(message))
  }
}

export const createAzuroRealtimeClient = (config: AzuroClientConfig) => {
  return new AzuroWebSocketClient(config)
}
