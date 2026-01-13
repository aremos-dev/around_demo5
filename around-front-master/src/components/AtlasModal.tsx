import { useState, useEffect } from 'react'
import { EmotionData } from '../types'
import { AtlasCalendarBar } from './AtlasCalendarBar'
import { EmotionAtlas } from './EmotionAtlas'
import { EMOTION_CONFIG } from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface AtlasModalProps {
  isOpen: boolean
  onClose: () => void
  topBarHeight: number
  sphereWidth: number
  containerWidth: number
  containerHeight: number
  weeklyEmotions?: EmotionData[]
}

export const AtlasModal = ({ isOpen, onClose, topBarHeight, sphereWidth, containerWidth, containerHeight, weeklyEmotions = [] }: AtlasModalProps) => {
  const [selectedDate, setSelectedDate] = useState<string>(weeklyEmotions.length > 0 ? weeklyEmotions[weeklyEmotions.length - 1].date : '')

  // 当weeklyEmotions变化时，更新selectedDate
  useEffect(() => {
    if (weeklyEmotions.length > 0 && !selectedDate) {
      setSelectedDate(weeklyEmotions[weeklyEmotions.length - 1].date)
    }
  }, [weeklyEmotions, selectedDate])

  if (!isOpen) return null

  // 弹窗尺寸和位置（基于设计图 1179px 宽度）
  const modalWidth = toResponsiveWidth(1069, containerWidth)
  const modalHeight = toResponsiveHeight(1759, containerHeight)
  const modalLeft = toResponsiveWidth(57, containerWidth)
  const modalTop = toResponsiveHeight(400, containerHeight)
  const modalBorderRadius = toResponsiveWidth(100, containerWidth)
  const backdropBlur = toResponsiveWidth(12.5, containerWidth)
  
  // 关闭按钮尺寸和位置（基于设计图 1179px 宽度）
  const outerCircleSize = toResponsiveWidth(104, containerWidth)
  const outerCircleBorder = toResponsiveWidth(4, containerWidth)
  const xLineWidth = toResponsiveWidth(9.37, containerWidth)
  const xLineHeight = toResponsiveWidth(54.11, containerWidth)
  const outerCircleBottomFromModalBottom = toResponsiveHeight(2294 - 2159, containerHeight) // 135px
  const outerCircleCenterXOffset = toResponsiveWidth(587 - 591.5, containerWidth) // -4.5px

  // 获取选中日期的情绪
  const selectedEmotion = weeklyEmotions.find(e => e.date === selectedDate)
  const currentEmotion = selectedEmotion?.emotion || null

  return (
    <>
      {/* 蒙板背景 */}
      <div
        className="absolute inset-0 z-50"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => {
          // 点击蒙板区域不关闭弹窗，只点击关闭按钮才关闭
          e.stopPropagation()
        }}
      />
      
      {/* 弹窗容器 */}
      <div
        className="absolute z-50 flex flex-col items-center"
        style={{
          left: `${modalLeft}px`,
          top: `${modalTop}px`,
          width: `${modalWidth}px`,
        }}
      >
        {/* 弹窗内容 */}
        <div
          className="w-full flex flex-col"
          style={{
            borderRadius: `${modalBorderRadius}px`,
            height: `${modalHeight}px`,
            background: 'linear-gradient(330.9deg, rgba(255, 255, 255, 0.86) 67.56%, rgba(246, 237, 243, 0.86) 94.65%)',
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
          }}
        >
          {/* 标题 - 顶部居中 */}
          <div 
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              position: 'absolute',
              width: `${toResponsiveWidth(320, containerWidth)}px`,
              height: `${toResponsiveHeight(84, containerHeight)}px`,
              left: '50%',
              top: `${toResponsiveHeight(482 - 400, containerHeight)}px`, // 相对于弹窗顶部：482 - 400 = 82px
              transform: 'translateX(-50%)',
            }}
          >
            <h2 
              className="text-center"
              style={{
                fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: `${toResponsiveWidth(52, containerWidth)}px`,
                lineHeight: `${toResponsiveHeight(61, containerHeight)}px`,
                color: '#262024',
              }}
            >
              我的情绪图谱
            </h2>
          </div>
          
          {/* 情绪图谱 - 中间居中 */}
          <div className="flex-1 flex items-center justify-center p-4" style={{ minHeight: 0 }}>
            <div className="w-full h-full max-w-full max-h-full">
              {currentEmotion ? (
                <EmotionAtlas emotion={currentEmotion} />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 400,
                    fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                    lineHeight: `${toResponsiveHeight(47, containerHeight)}px`,
                    textAlign: 'center',
                    color: '#262024',
                  }}
                >
                  当天暂无情绪图谱
                </div>
              )}
            </div>
          </div>
          
          {/* 日历bar - 底部，距离弹窗底部72px（响应式） */}
          <div 
            className="flex-shrink-0"
            style={{
              position: 'absolute',
              bottom: `${toResponsiveHeight(72, containerHeight)}px`,
              left: 0,
              right: 0,
            }}
          >
            <AtlasCalendarBar
              weeklyEmotions={weeklyEmotions}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              containerWidth={modalWidth}
              containerHeight={containerHeight}
            />
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute cursor-pointer"
          style={{
            left: `calc(50% + ${outerCircleCenterXOffset}px)`,
            bottom: `-${outerCircleBottomFromModalBottom}px`,
            width: `${outerCircleSize}px`,
            height: `${outerCircleSize}px`,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            transform: 'translateX(-50%)',
          }}
        >
          {/* 外圈（Ellipse 59） */}
          <div
            className="absolute rounded-full"
            style={{
              width: `${outerCircleSize}px`,
              height: `${outerCircleSize}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              border: `${outerCircleBorder}px solid #FBF7F9`,
              boxSizing: 'border-box',
            }}
          />
          
          {/* X线条 - Vector 5（45度） */}
          <div
            className="absolute"
            style={{
              width: `${xLineWidth}px`,
              height: `${xLineHeight}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              transformOrigin: 'center',
              background: '#D8CAD3',
            }}
          />
          
          {/* X线条 - Vector 6（-45度） */}
          <div
            className="absolute"
            style={{
              width: `${xLineWidth}px`,
              height: `${xLineHeight}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              transformOrigin: 'center',
              background: '#D8CAD3',
            }}
          />
        </button>
      </div>
    </>
  )
}
