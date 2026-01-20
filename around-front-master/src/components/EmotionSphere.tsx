import { EmotionType } from '../types'
import { EMOTION_CONFIG } from '../data/mockData'
import { sendSpecialModeCommand } from '../api/stateApi'

interface EmotionSphereProps {
  emotion: EmotionType
  timestamp?: string // 时间戳，格式：YYYY-MM-DDTHH:mm:ss
  onDoubleClick?: () => void // 双击回调
}

export const EmotionSphere = ({ emotion, timestamp, onDoubleClick }: EmotionSphereProps) => {
  const config = EMOTION_CONFIG[emotion]

  // 格式化时间戳为 "14:38 Nov 6" 格式
  const formatTimestamp = (timestampStr: string): string => {
    const date = new Date(timestampStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    return `${hours}:${minutes} ${month} ${day}`
  }

  // 处理双击事件
  const handleDoubleClick = async () => {
    console.log('EmotionSphere double clicked, sending special mode command...')
    try {
      const result = await sendSpecialModeCommand()
      console.log('Special mode command result:', result)
      // 调用外部回调（如果有）
      if (onDoubleClick) {
        onDoubleClick()
      }
    } catch (error) {
      console.error('Failed to send special mode command:', error)
    }
  }

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onDoubleClick={handleDoubleClick}
    >
      {/* 情绪背景图片 - 撑满整个容器 */}
      <img
        src={config.image}
        alt={config.label}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* 中央文字：状态标签和时间戳 - 居中 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* 状态标签 - 显示英文状态名称 */}
        <div className="text-3xl font-bold text-white drop-shadow-2xl mb-2">
          {emotion}
        </div>
        
        {/* 时间戳 */}
        {timestamp && (
          <div className="text-sm text-white drop-shadow-lg font-medium">
            {formatTimestamp(timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}

