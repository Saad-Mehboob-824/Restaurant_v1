import { useEffect, useRef, useCallback, useState } from 'react'

// This hook now uses a single global WebSocket instance (attached to window)
// so HMR / Fast Refresh won't create/tear down sockets repeatedly.
// Each hook instance registers its message/onopen/onclose handlers into
// global Sets. When no listeners remain, the socket is closed.
export function useWebSocket(onMessage, options = {}) {
  const localListenerRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  const {
    autoReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 50,
    onOpen,
    onClose,
    onError
  } = options

  // Ensure globals exist
  if (typeof window !== 'undefined') {
    if (!window.__REST_WS__) {
      window.__REST_WS__ = {
        socket: null,
        listeners: new Set(),
        onOpenHandlers: new Set(),
        onCloseHandlers: new Set(),
        onErrorHandlers: new Set(),
        reconnectAttempts: 0,
        reconnectTimer: null,
        pingTimer: null,
        connecting: false
      }
    }
  }

  const createGlobalSocket = useCallback(() => {
    if (typeof window === 'undefined') return

    const globalState = window.__REST_WS__
    if (globalState.socket && (globalState.socket.readyState === WebSocket.OPEN || globalState.socket.readyState === WebSocket.CONNECTING)) {
      return globalState.socket
    }

    if (globalState.connecting) return
    globalState.connecting = true

    try {
      const isSecure = window.location.protocol === 'https:'
      const protocol = isSecure ? 'wss:' : 'ws:'
      // Prefer explicit IPv4 loopback to avoid ::1 vs 127.0.0.1 mismatch during dev
      const host = window.location.hostname === 'localhost' ? '127.0.0.1:3002' : `${window.location.hostname}:3002`
      const wsUrl = isSecure ? 'wss://shelter-kits-meets-why.trycloudflare.com/' : 'ws://shelter-kits-meets-why.trycloudflare.com/'

      console.debug('[useWebSocket] creating global socket ->', wsUrl)
      const ws = new WebSocket(wsUrl)
      globalState.socket = ws

      ws.onopen = (event) => {
        globalState.connecting = false
        globalState.reconnectAttempts = 0
        console.info('[useWebSocket] global socket open')
        // start keepalive ping every 25s
        if (globalState.pingTimer) clearInterval(globalState.pingTimer)
        globalState.pingTimer = setInterval(() => {
          try {
            if (globalState.socket && globalState.socket.readyState === WebSocket.OPEN) {
              globalState.socket.send(JSON.stringify({ type: '__ping__', ts: Date.now() }))
            }
          } catch (e) {
            // ignore
          }
        }, 25000)

        globalState.onOpenHandlers.forEach(h => {
          try { h(event) } catch (e) { console.error('onOpen handler error', e) }
        })
      }

      ws.onmessage = (event) => {
        let parsed = null
        try { parsed = event.data ? JSON.parse(event.data) : null } catch (e) { console.warn('[useWebSocket] failed to parse message', e) }
        globalState.listeners.forEach(fn => {
          try { fn(parsed) } catch (e) { console.error('listener error', e) }
        })
      }

      ws.onerror = (err) => {
        console.warn('[useWebSocket] global socket error', err)
        globalState.onErrorHandlers.forEach(h => { try { h(err) } catch (e) { /* ignore */ } })
      }

      ws.onclose = (event) => {
        console.warn('[useWebSocket] global socket closed', { code: event.code, reason: event.reason })
        // clear ping
        if (globalState.pingTimer) {
          clearInterval(globalState.pingTimer)
          globalState.pingTimer = null
        }

        globalState.onCloseHandlers.forEach(h => { try { h(event) } catch (e) { /* ignore */ } })

        // schedule reconnect if still have listeners
        if (autoReconnect && globalState.listeners.size > 0) {
          const attempts = Math.min(globalState.reconnectAttempts, maxReconnectAttempts)
          const backoff = Math.min(reconnectInterval * Math.pow(2, attempts), 30000)
          console.log(`[useWebSocket] scheduling reconnect in ${backoff}ms (attempt ${globalState.reconnectAttempts + 1})`)
          if (globalState.reconnectTimer) clearTimeout(globalState.reconnectTimer)
          globalState.reconnectTimer = setTimeout(() => {
            globalState.reconnectAttempts++
            globalState.socket = null
            createGlobalSocket()
          }, backoff)
        }
      }

      return ws
    } catch (e) {
      console.error('[useWebSocket] failed to create socket', e)
      const globalState = window.__REST_WS__
      if (autoReconnect) {
        if (globalState.reconnectTimer) clearTimeout(globalState.reconnectTimer)
        globalState.reconnectTimer = setTimeout(() => {
          globalState.reconnectAttempts++
          createGlobalSocket()
        }, reconnectInterval)
      }
    }
  }, [autoReconnect, reconnectInterval, maxReconnectAttempts])

  // register/unregister this hook's handlers on mount/unmount
  useEffect(() => {
    const globalState = typeof window !== 'undefined' ? window.__REST_WS__ : null
    if (!globalState) return

    // register message listener
    const listener = (data) => {
      try { if (onMessage) onMessage(data) } catch (e) { console.error('onMessage handler error', e) }
    }
    localListenerRef.current = listener
    globalState.listeners.add(listener)

    // register optional lifecycle handlers
    if (onOpen) globalState.onOpenHandlers.add(onOpen)
    if (onClose) globalState.onCloseHandlers.add(onClose)
    if (onError) globalState.onErrorHandlers.add(onError)

    // ensure socket exists
    const ws = createGlobalSocket()
    // update connection state based on socket immediately
    setIsConnected(!!(ws && ws.readyState === WebSocket.OPEN))

    // small safety: if socket closes quickly (HMR), we still have a persistent global instance

    return () => {
      // remove listeners/handlers
      globalState.listeners.delete(listener)
      if (onOpen) globalState.onOpenHandlers.delete(onOpen)
      if (onClose) globalState.onCloseHandlers.delete(onClose)
      if (onError) globalState.onErrorHandlers.delete(onError)

      // when no listeners left, close socket after a short delay
      if (globalState.listeners.size === 0) {
        // give a brief chance for another hook to mount (100ms)
        setTimeout(() => {
          if (globalState.listeners.size === 0) {
            try {
              if (globalState.socket) {
                globalState.socket.close()
                globalState.socket = null
              }
            } catch (e) { /* ignore */ }
            if (globalState.pingTimer) {
              clearInterval(globalState.pingTimer)
              globalState.pingTimer = null
            }
            if (globalState.reconnectTimer) {
              clearTimeout(globalState.reconnectTimer)
              globalState.reconnectTimer = null
            }
            globalState.reconnectAttempts = 0
          }
        }, 100)
      }
    }
  }, [createGlobalSocket, onMessage, onOpen, onClose, onError])

  const send = useCallback((data) => {
    const globalState = typeof window !== 'undefined' ? window.__REST_WS__ : null
    try {
      if (globalState && globalState.socket && globalState.socket.readyState === WebSocket.OPEN) {
        globalState.socket.send(JSON.stringify(data))
      } else {
        console.warn('[useWebSocket] send called but socket not open')
      }
    } catch (e) {
      console.error('[useWebSocket] send error', e)
      if (onError) onError(e)
    }
  }, [onError])

  // expose isConnected based on global socket
  useEffect(() => {
    const globalState = typeof window !== 'undefined' ? window.__REST_WS__ : null
    if (!globalState) return
    const update = () => setIsConnected(!!(globalState.socket && globalState.socket.readyState === WebSocket.OPEN))
    // quick check now
    update()
    // and whenever onOpen/onClose handlers are called they'll update local state because the hook user passed onOpen/onClose
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return { send, isConnected }
}