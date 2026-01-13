import { EmotionType, UserData, EmotionData, CurrentEmotionData, EmotionConfig } from '../types'
import {
  fetchBackendState,
  mapEmotionState,
  getRespirationDataFromBackend,
  getStressLevelFromBackend,
  getStressRecoveryFromBackend,
  getAutonomicBalanceFromBackend,
  getAutonomicActivityFromBackend,
} from '../api/stateApi'

// 情绪配置
export const EMOTION_CONFIG: Record<EmotionType, EmotionConfig> = {
  calm: { type: 'calm', label: '平静', color: '#32CD32', image: '/calm_bg.png' },
  joy: { type: 'joy', label: '开心', color: '#FFD700', image: '/joy_bg.png' },
  low: { type: 'low', label: '低落', color: '#4169E1', image: '/low_bg.png' },
  tense: { type: 'tense', label: '紧张', color: '#FF4500', image: '/tense_bg.png' },
}

// 生成过去7天的日期
const getDateString = (daysAgo: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// 生成某一天的小时情绪数据（不完整，随机选择部分小时）
const generateHourlyEmotions = (date: string, includeAllHours: boolean = false): EmotionData[] => {
  const emotions: EmotionType[] = ['calm', 'joy', 'low', 'tense']
  
  if (includeAllHours) {
    // 生成完整的24小时数据
    return Array.from({ length: 24 }, (_, i) => ({
      date,
      hour: i,
      emotion: emotions[Math.floor(Math.random() * emotions.length)] as EmotionType,
    }))
  } else {
    // 随机选择8-16个小时的数据点（不完整）
    const numHours = Math.floor(Math.random() * 9) + 8 // 8-16个小时
    const selectedHours = new Set<number>()
    
    // 随机选择不重复的小时
    while (selectedHours.size < numHours) {
      selectedHours.add(Math.floor(Math.random() * 24))
    }
    
    return Array.from(selectedHours)
      .sort((a, b) => a - b)
      .map(hour => ({
        date,
        hour,
        emotion: emotions[Math.floor(Math.random() * emotions.length)] as EmotionType,
      }))
  }
}

// 生成时间戳（模拟2小时前）
const generateTimestamp = (): string => {
  const now = new Date()
  now.setHours(now.getHours() - 2)
  return now.toISOString()
}

// Mock 用户数据
// 包含所有7天的数据，但某些天没有情绪数据（显示空心虚线小球）
export const mockUserData: UserData = {
  id: '1',
  name: 'Demo User',
  currentEmotion: 'joy',
  currentEmotionTimestamp: generateTimestamp(),
  // 包含所有7天的数据，但某些天没有情绪数据
  weeklyEmotions: [
    { date: getDateString(6), emotion: 'joy' },      // 6天前：有数据
    { date: getDateString(5), emotion: null },        // 5天前：无数据
    { date: getDateString(4), emotion: 'calm' },       // 4天前：有数据
    { date: getDateString(3), emotion: null },         // 3天前：无数据
    { date: getDateString(2), emotion: 'tense' },    // 2天前：有数据
    { date: getDateString(1), emotion: null },       // 1天前：无数据
    { date: getDateString(0), emotion: 'joy' },       // 今天：有数据
  ],
  // 只有有日数据的日期才有小时数据，且小时数据不完整（不是24小时都有）
  hourlyEmotions: {
    [getDateString(6)]: generateHourlyEmotions(getDateString(6), false), // 不完整数据
    [getDateString(4)]: generateHourlyEmotions(getDateString(4), false), // 不完整数据
    [getDateString(2)]: generateHourlyEmotions(getDateString(2), false), // 不完整数据
    [getDateString(0)]: generateHourlyEmotions(getDateString(0), false), // 不完整数据
    // 注意：5天前、3天前、1天前没有日数据，所以也没有小时数据
  },
}

// ==================== API 函数 - 优先使用后端数据，回退到 Mock 数据 ====================

/**
 * 获取当前情绪数据
 * 优先从后端 API 获取，失败时使用 mock 数据
 */
export const fetchCurrentEmotion = async (): Promise<CurrentEmotionData> => {
  try {
    const backendState = await fetchBackendState()
    if (backendState && backendState.emotion_state) {
      return {
        emotion: mapEmotionState(backendState.emotion_state),
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.warn('Backend unavailable, using mock data:', error)
  }
  
  // 回退到 mock 数据
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    emotion: mockUserData.currentEmotion,
    timestamp: mockUserData.currentEmotionTimestamp,
  }
}

/**
 * 获取周情绪数据
 * 目前使用 mock 数据（后端暂无历史数据存储）
 */
export const fetchWeeklyEmotions = async (): Promise<EmotionData[]> => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 尝试获取当前情绪并更新今天的数据
  try {
    const backendState = await fetchBackendState()
    if (backendState && backendState.emotion_state) {
      const today = getDateString(0)
      const currentEmotion = mapEmotionState(backendState.emotion_state)
      
      // 更新今天的情绪
      return mockUserData.weeklyEmotions.map(e => 
        e.date === today ? { ...e, emotion: currentEmotion } : e
      )
    }
  } catch (error) {
    console.warn('Backend unavailable for weekly emotions:', error)
  }
  
  return mockUserData.weeklyEmotions
}

/**
 * 获取指定日期的小时情绪数据
 */
export const fetchHourlyEmotions = async (date: string): Promise<EmotionData[]> => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return mockUserData.hourlyEmotions[date] || []
}

// ==================== 呼吸率数据 ====================

export interface RespirationData {
  hour: number
  minute: number
  value: number
  time: string // 格式：HH:MM
  timestamp: number // 用于排序和查找
}

// 生成最近一分钟内的呼吸率数据（每秒一个数据点，共60个点）- Mock 版本
const generateMockRespirationData = (): RespirationData[] => {
  const data: RespirationData[] = []
  
  // 生成最近60秒的数据（每秒一个点）
  for (let i = 1; i <= 60; i++) {
    const second = i
    const timestamp = Date.now() - (60 - i) * 1000 // 从60秒前到现在
    
    // 生成呼吸率值（3-28之间，模拟正常呼吸率变化）
    const baseValue = 15
    const variation = Math.sin(i * 0.1) * 5 + Math.cos(i * 0.15) * 3 + Math.random() * 2 - 1
    const value = Math.max(3, Math.min(28, Math.round((baseValue + variation) * 10) / 10))
    
    data.push({
      hour: 0,
      minute: 0,
      value,
      time: second.toString().padStart(2, '0'),
      timestamp,
    })
  }
  
  return data
}

/**
 * 获取呼吸率数据
 * 优先从后端获取
 */
export const fetchRespirationData = async (): Promise<RespirationData[]> => {
  try {
    const data = await getRespirationDataFromBackend()
    if (data && data.length > 0) {
      return data
    }
  } catch (error) {
    console.warn('Backend unavailable for respiration data:', error)
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  return generateMockRespirationData()
}

// ==================== 压力水平数据 ====================

export interface StressLevelData {
  value: number // 0-100
}

/**
 * 获取压力水平数据
 * 优先从后端获取（基于 SDNN）
 */
export const fetchStressLevel = async (): Promise<StressLevelData> => {
  try {
    const data = await getStressLevelFromBackend()
    if (data) {
      return data
    }
  } catch (error) {
    console.warn('Backend unavailable for stress level:', error)
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    value: Math.floor(Math.random() * 101),
  }
}

// ==================== 压力调节恢复能力数据 ====================

export interface StressRecoveryData {
  value: number // 0-100
}

/**
 * 获取压力调节恢复能力数据
 * 优先从后端获取（基于 Valence）
 */
export const fetchStressRecovery = async (): Promise<StressRecoveryData> => {
  try {
    const data = await getStressRecoveryFromBackend()
    if (data) {
      return data
    }
  } catch (error) {
    console.warn('Backend unavailable for stress recovery:', error)
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    value: Math.floor(Math.random() * 101),
  }
}

// ==================== 自主神经平衡数据 ====================

export interface AutonomicBalanceData {
  value: number // 小数，保留一位小数
}

/**
 * 获取自主神经平衡数据
 * 优先从后端获取（LF/HF 比值）
 */
export const fetchAutonomicBalance = async (): Promise<AutonomicBalanceData> => {
  try {
    const data = await getAutonomicBalanceFromBackend()
    if (data) {
      return data
    }
  } catch (error) {
    console.warn('Backend unavailable for autonomic balance:', error)
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    value: Math.round((0.1 + Math.random() * 4.9) * 10) / 10,
  }
}

// ==================== 自主神经活性数据 ====================

export interface AutonomicActivityData {
  value: number // 0-100
}

/**
 * 获取自主神经活性数据
 * 优先从后端获取（基于 Arousal）
 */
export const fetchAutonomicActivity = async (): Promise<AutonomicActivityData> => {
  try {
    const data = await getAutonomicActivityFromBackend()
    if (data) {
      return data
    }
  } catch (error) {
    console.warn('Backend unavailable for autonomic activity:', error)
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    value: Math.floor(Math.random() * 101),
  }
}

// ==================== 呼吸训练日志数据 ====================

export interface BreathingTrainingRecord {
  id: string
  duration: number // 秒数
  score: number // 分数 0-100
  date: string // ISO日期字符串
  timestamp: string // ISO时间戳
}

// 生成呼吸训练日志数据
const generateBreathingTrainingRecords = (): BreathingTrainingRecord[] => {
  const records: BreathingTrainingRecord[] = []
  const now = new Date()
  
  // 生成过去7天的记录，每天1-3条
  for (let day = 0; day < 7; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)
    const numRecords = Math.floor(Math.random() * 3) + 1 // 1-3条
    
    for (let i = 0; i < numRecords; i++) {
      const timestamp = new Date(date)
      timestamp.setHours(Math.floor(Math.random() * 12) + 8) // 8-20点
      timestamp.setMinutes(Math.floor(Math.random() * 60))
      
      records.push({
        id: `${date.toISOString().split('T')[0]}-${i}`,
        duration: Math.floor(Math.random() * 120) + 30, // 30-150秒
        score: Math.floor(Math.random() * 30) + 70, // 70-100分
        date: date.toISOString().split('T')[0],
        timestamp: timestamp.toISOString(),
      })
    }
  }
  
  // 按时间倒序排序
  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * 获取呼吸训练日志
 * 目前使用 mock 数据（后端暂无此功能）
 */
export const fetchBreathingTrainingRecords = async (): Promise<BreathingTrainingRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return generateBreathingTrainingRecords()
}
