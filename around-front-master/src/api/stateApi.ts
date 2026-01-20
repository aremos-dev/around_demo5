/**
 * 真实 API 服务 - 连接后端 /api/state 接口
 */

import { EmotionType, EmotionData, CurrentEmotionData } from '../types'

// 后端返回的数据结构
export interface BackendState {
  hr: number[]
  br: number[]
  sdnn: number[]
  lf_hf: number[]
  lf_hf_ratio: number[]
  hf: number[]
  lf: number[]
  spo2: number[]
  time: number[]
  lf_hf_status: string | null
  is_abnormal: boolean
  arousal_score: number | null
  valence_score: number | null
  emotion_state: 'Stress' | 'Entertainment' | 'Calm' | 'Meditation' | null
  emotion_intensity: 'High' | 'Low' | null
}

// API 基础 URL - 在生产构建中使用相对路径，开发时使用代理
const API_BASE_URL = ''

/**
 * 将后端情绪状态映射到前端情绪类型
 */
export const mapEmotionState = (emotionState: string | null): EmotionType => {
  switch (emotionState) {
    case 'Stress':
      return 'tense'
    case 'Entertainment':
      return 'joy'
    case 'Calm':
      return 'calm'
    case 'Meditation':
      return 'calm' // 冥想状态映射为平静
    default:
      return 'calm' // 默认返回平静
  }
}

/**
 * 获取后端实时状态
 */
export const fetchBackendState = async (): Promise<BackendState | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/state`, {
      cache: 'no-cache',
    })
    if (!response.ok) {
      console.warn('Backend API not available, using mock data')
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn('Failed to fetch backend state:', error)
    return null
  }
}

/**
 * 从后端状态获取当前情绪数据
 */
export const getCurrentEmotionFromBackend = async (): Promise<CurrentEmotionData | null> => {
  const state = await fetchBackendState()
  if (!state) return null

  return {
    emotion: mapEmotionState(state.emotion_state),
    timestamp: new Date().toISOString(),
  }
}

/**
 * 获取呼吸率数据（从后端实时数据）
 */
export interface RespirationDataPoint {
  hour: number
  minute: number
  value: number
  time: string
  timestamp: number
}

export const getRespirationDataFromBackend = async (): Promise<RespirationDataPoint[]> => {
  const state = await fetchBackendState()
  if (!state || !state.br || state.br.length === 0) {
    return []
  }

  // 将后端的 br 数组转换为前端需要的格式
  return state.br.map((value, index) => ({
    hour: 0,
    minute: 0,
    value: value,
    time: index.toString().padStart(2, '0'),
    timestamp: Date.now() - (state.br.length - index) * 1000,
  }))
}

/**
 * 获取压力水平（基于 SDNN）
 * SDNN 越高(好)，压力越低
 * 范围: 0-200ms，映射到 0-100%
 */
export const getStressLevelFromBackend = async (): Promise<{ value: number }> => {
  const state = await fetchBackendState()
  if (!state || !state.sdnn || state.sdnn.length === 0) {
    return { value: 50 } // 默认值
  }

  const sdnn = state.sdnn[state.sdnn.length - 1]
  // 映射: 0-200 -> 100-0 (SDNN越高压力越低)
  const normalizedSdnn = Math.min(200, Math.max(0, sdnn))
  const stressLevel = 100 - (normalizedSdnn / 200) * 100
  
  return { value: Math.round(stressLevel) }
}

/**
 * 获取压力调节恢复能力（基于 Valence）
 * Valence 范围: -3 到 3，映射到 0-100%
 */
export const getStressRecoveryFromBackend = async (): Promise<{ value: number }> => {
  const state = await fetchBackendState()
  if (!state || state.valence_score === null) {
    return { value: 50 } // 默认值
  }

  // 映射: -3 到 3 -> 0 到 100
  const normalized = (state.valence_score + 3) / 6
  return { value: Math.round(normalized * 100) }
}

/**
 * 获取自主神经平衡（LF/HF 比值）
 */
export const getAutonomicBalanceFromBackend = async (): Promise<{ value: number }> => {
  const state = await fetchBackendState()
  if (!state || !state.lf_hf || state.lf_hf.length === 0) {
    return { value: 1.0 } // 默认值
  }

  const ratio = state.lf_hf[state.lf_hf.length - 1]
  return { value: Math.round(ratio * 10) / 10 }
}

/**
 * 获取自主神经活性（基于 Arousal）
 * Arousal 范围: -3 到 3，映射到 0-100%
 */
export const getAutonomicActivityFromBackend = async (): Promise<{ value: number }> => {
  const state = await fetchBackendState()
  if (!state || state.arousal_score === null) {
    return { value: 50 } // 默认值
  }

  // 映射: -3 到 3 -> 0 到 100
  const normalized = (state.arousal_score + 3) / 6
  return { value: Math.round(normalized * 100) }
}

/**
 * 获取心率数据
 */
export const getHeartRateFromBackend = async (): Promise<number[]> => {
  const state = await fetchBackendState()
  if (!state || !state.hr) {
    return []
  }
  return state.hr
}

/**
 * 缓存的后端状态（用于减少请求次数）
 */
let cachedState: BackendState | null = null
let lastFetchTime = 0
const CACHE_DURATION = 1000 // 缓存1秒

/**
 * 获取缓存的后端状态
 */
export const getCachedBackendState = async (): Promise<BackendState | null> => {
  const now = Date.now()
  if (cachedState && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedState
  }
  
  cachedState = await fetchBackendState()
  lastFetchTime = now
  return cachedState
}

/**
 * 发送特殊模式命令到后端
 * 双击情绪球时触发，让后端进入特殊状态
 */
export const sendSpecialModeCommand = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/special_mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'enter_special_mode',
        timestamp: new Date().toISOString(),
      }),
    })
    
    if (!response.ok) {
      console.warn('Failed to send special mode command')
      return { success: false, message: 'Request failed' }
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error sending special mode command:', error)
    return { success: false, message: 'Network error' }
  }
}
