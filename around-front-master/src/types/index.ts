// 情绪类型
export type EmotionType = 'calm' | 'joy' | 'low' | 'tense'

// 情绪配置
export interface EmotionConfig {
  type: EmotionType
  label: string
  color: string
  image: string // 背景图片路径
}

// 情绪数据
export interface EmotionData {
  date: string // YYYY-MM-DD
  hour?: number // 0-23
  emotion?: EmotionType | null // 情绪类型，可以为空（表示没有数据）
  timestamp?: string // 状态变化的时间戳，格式：YYYY-MM-DDTHH:mm:ss
}

// 当前情绪数据（包含时间戳）
export interface CurrentEmotionData {
  emotion: EmotionType
  timestamp: string // 状态变化的时间戳，格式：YYYY-MM-DDTHH:mm:ss
}

// 用户数据
export interface UserData {
  id: string
  name: string
  currentEmotion: EmotionType
  currentEmotionTimestamp: string // 当前情绪的时间戳
  weeklyEmotions: EmotionData[]
  hourlyEmotions: Record<string, EmotionData[]> // key: date, value: hourly emotions
}




