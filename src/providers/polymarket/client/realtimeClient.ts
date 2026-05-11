import { type PolymarketClientConfig, type PolymarketRealtimeBookEvent, type PolymarketRealtimeClient } from './types'


type Listener = (event: PolymarketRealtimeBookEvent) => void

export class PolymarketWebSocketClient implements PolymarketRealtimeClient {
  private socket: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()
  private subscribedAssetIds = new Set<string>()
  private pingInterval: number | null = null

  constructor(private readonly config: PolymarketClientConfig) {}

  connect() {
    if (this.socket) {
      return
    }

    this.socket = new WebSocket(this.config.wsUrl)

    this.socket.addEventListener('open', () => {
      this.flushSubscriptions()
      this.pingInterval = window.setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send('PING')
        }
      }, 10_000)
    })

    this.socket.addEventListener('message', (message) => {
      try {
        const event = JSON.parse(message.data as string) as PolymarketRealtimeBookEvent
        const assetId = event.asset_id

        if (!assetId) {
          return
        }

        const assetListeners = this.listeners.get(assetId)
        assetListeners?.forEach((listener) => listener(event))
      }
      catch {
        // Ignore malformed messages.
      }
    })

    this.socket.addEventListener('close', () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }

      this.pingInterval = null
      this.socket = null
    })
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    this.pingInterval = null
    this.socket?.close()
    this.socket = null
  }

  private flushSubscriptions() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.subscribedAssetIds.size) {
      return
    }

    this.socket.send(JSON.stringify({
      type: 'market',
      assets_ids: [ ...this.subscribedAssetIds ],
      custom_feature_enabled: true,
    }))
  }

  subscribe(tokenIds: string[], listener: Listener) {
    tokenIds.forEach((tokenId) => {
      const listeners = this.listeners.get(tokenId) || new Set<Listener>()
      listeners.add(listener)
      this.listeners.set(tokenId, listeners)

      if (!this.subscribedAssetIds.has(tokenId)) {
        this.subscribedAssetIds.add(tokenId)

        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            operation: 'subscribe',
            assets_ids: [ tokenId ],
          }))
        }
      }
    })

    this.connect()

    return () => {
      tokenIds.forEach((tokenId) => {
        const listeners = this.listeners.get(tokenId)
        listeners?.delete(listener)

        if (listeners && listeners.size === 0) {
          this.listeners.delete(tokenId)
          this.subscribedAssetIds.delete(tokenId)

          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
              operation: 'unsubscribe',
              assets_ids: [ tokenId ],
            }))
          }
        }
      })
    }
  }
}

export const createPolymarketRealtimeClient = (config: PolymarketClientConfig) => {
  return new PolymarketWebSocketClient(config)
}
