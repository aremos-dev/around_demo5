/**
 * WebSocket 服务 - 连接后端 SocketIO 实现实时数据更新
 */
import { io, Socket } from 'socket.io-client'

// WebSocket 服务器地址（与 API 相同）
const WS_URL = window.location.origin

// 呼吸频率更新回调类型
type BreathingRateCallback = (data: { br: number; time: number; timestamp: number }) => void

class SocketService {
  private socket: Socket | null = null
  private breathingRateCallbacks: BreathingRateCallback[] = []
  private connected = false

  /**
   * 连接 WebSocket 服务器
   */
  connect() {
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected')
      return
    }

    console.log('[SocketService] Connecting to', WS_URL)
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected')
      this.connected = true
    })

    this.socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected')
      this.connected = false
    })

    this.socket.on('connected', (data) => {
      console.log('[SocketService] Server acknowledged connection:', data)
    })

    // 监听呼吸频率更新事件
    this.socket.on('breathing_rate_update', (data) => {
      console.log('[SocketService] Breathing rate update:', data)
      this.breathingRateCallbacks.forEach((callback) => callback(data))
    })

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error)
    })
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      console.log('[SocketService] Disconnected')
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * 订阅呼吸频率更新
   */
  onBreathingRateUpdate(callback: BreathingRateCallback) {
    this.breathingRateCallbacks.push(callback)
    // 返回取消订阅函数
    return () => {
      this.breathingRateCallbacks = this.breathingRateCallbacks.filter((cb) => cb !== callback)
    }
  }
}

// 导出单例
export const socketService = new SocketService()
