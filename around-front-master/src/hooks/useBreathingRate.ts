/**
 * 实时呼吸频率 Hook - 使用 WebSocket 获取实时数据
 */
import { useState, useEffect, useRef } from 'react'
import { socketService } from '../api/socketService'

interface BreathingRateData {
  br: number
  time: number
  timestamp: number
}

interface RespirationData {
  hour: number
  minute: number
  value: number
  time: string
  timestamp: number
}

/**
 * 使用 WebSocket 获取实时呼吸频率数据
 * @param maxDataPoints 最大数据点数量
 */
export const useBreathingRate = (maxDataPoints = 50) => {
  const [respirationData, setRespirationData] = useState<RespirationData[]>([])
  const [latestBr, setLatestBr] = useState<number | null>(null)
  const dataCountRef = useRef(0)

  useEffect(() => {
    // 连接 WebSocket
    socketService.connect()

    // 订阅呼吸频率更新
    const unsubscribe = socketService.onBreathingRateUpdate((data: BreathingRateData) => {
      setLatestBr(data.br)
      
      // 更新数据数组
      setRespirationData((prev) => {
        const newData: RespirationData = {
          hour: 0,
          minute: 0,
          value: data.br,
          time: dataCountRef.current.toString().padStart(2, '0'),
          timestamp: data.timestamp * 1000,
        }
        dataCountRef.current += 1

        const updated = [...prev, newData]
        // 保持最大数据点数量
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints)
        }
        return updated
      })
    })

    // 清理
    return () => {
      unsubscribe()
    }
  }, [maxDataPoints])

  return {
    respirationData,
    latestBr,
    isConnected: socketService.isConnected(),
  }
}
