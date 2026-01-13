import { EmotionData, EmotionType } from '../types'
import { EMOTION_CONFIG } from '../data/mockData'
import { useRef } from 'react'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface EmotionCalendarProps {
  weeklyEmotions: EmotionData[]
  selectedDate: string
  onDateSelect: (date: string) => void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectedPosition?: (position: { left: number; width: number } | null) => void
  onAtlasButtonClick?: () => void
  containerWidth?: number
  containerHeight?: number
}

export const EmotionCalendar = ({
  weeklyEmotions,
  selectedDate,
  onDateSelect,
  onSelectedPosition,
  onAtlasButtonClick,
  containerWidth = 1179,
  containerHeight = 2556,
}: EmotionCalendarProps) => {
  // 情绪日历框尺寸：1069px × 911px，left: 55px（基于新设计尺寸 1179px × 2556px）
  const calendarWidth = toResponsiveWidth(1069, containerWidth)
  const calendarHeight = toResponsiveHeight(911, containerHeight)
  const calendarLeft = toResponsiveWidth(55, containerWidth)
  const calendarBorderRadius = toResponsiveWidth(33, containerWidth)
  const calendarPadding = toResponsiveWidth(16, containerWidth)
  
  // 阴影样式：5px 6px 35px rgba(0, 0, 0, 0.13)（响应式）
  const shadowOffsetX = toResponsiveWidth(5, containerWidth)
  const shadowOffsetY = toResponsiveWidth(6, containerWidth)
  const shadowBlur = toResponsiveWidth(35, containerWidth)
  const boxShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0, 0, 0, 0.13)`
  
  // 标题背景区域样式（相对于日历框：83 - 55 = 28px, 1568 - 1541 = 27px）
  const titleBgWidth = toResponsiveWidth(236, containerWidth)
  const titleBgHeight = toResponsiveHeight(69, containerHeight)
  const titleBgLeft = toResponsiveWidth(28, containerWidth) // 相对于日历框左边缘
  const titleBgTop = toResponsiveHeight(27, containerHeight) // 相对于日历框顶部
  const titleBgBorderRadius = toResponsiveWidth(53, containerWidth)
  
  // 标题文字样式（相对于日历框：121 - 55 = 66px, 1581 - 1541 = 40px）
  const titleWidth = toResponsiveWidth(161, containerWidth)
  const titleHeight = toResponsiveHeight(47, containerHeight)
  const titleLeft = toResponsiveWidth(66, containerWidth) // 相对于日历框左边缘
  const titleTop = toResponsiveHeight(40, containerHeight) // 相对于日历框顶部
  const titleFontSize = toResponsiveWidth(36, containerWidth)
  const titleLineHeight = toResponsiveHeight(42, containerHeight)
  
  // 周几和日期样式（根据 CSS）
  const weekdayItemWidth = toResponsiveWidth(77, containerWidth) // 大部分是 77px，周三是 78px
  const weekdayItemHeight = toResponsiveHeight(43, containerHeight)
  const weekdayFontSize = toResponsiveWidth(36, containerWidth)
  const weekdayLineHeight = toResponsiveHeight(42, containerHeight)
  const weekdayColor = '#B5A6B0'
  const dateColor = '#82797F'
  
  // 情绪圆圈尺寸：77px × 77px
  const emotionCircleSize = toResponsiveWidth(77, containerWidth)
  
  // 情绪颜色映射（根据 CSS 中的颜色）
  const emotionColorMap: Record<EmotionType, string> = {
    calm: '#8AD48A',      // Ellipse 14 - 绿色
    joy: '#FFF2B2',       // Ellipse 22 - 浅黄色（或 #F0D034 金色）
    low: '#CEDEF9',       // Ellipse 25 - 浅蓝色
    tense: '#FFD2D2',    // Ellipse 24 - 粉色
  }
  
  // 位置（相对于日历容器，日历容器从 top: 1541px 开始）
  // 周几位置：1737 - 1541 = 196px
  const weekdayTop = toResponsiveHeight(196, containerHeight)
  // 日期位置：1796 - 1541 = 255px
  const dateTop = toResponsiveHeight(255, containerHeight)
  // 小球位置：1882 - 1541 = 341px
  const circleTop = toResponsiveHeight(341, containerHeight)
  
  // 水平位置（相对于日历容器）
  // 日历容器宽度：1069px
  // 日期项左右padding：58px（基于原始设计尺寸）
  // 可用宽度：1069 - 58 * 2 = 953px
  // 日期项数量：7个
  // 日期项宽度：77px（周三78px）
  // 总日期项宽度：77 * 6 + 78 = 540px
  // 剩余空间：953 - 540 = 413px
  // 间距：413 / 6 = 68.83px（6个间距）
  // 
  // 计算每个日期的位置（从padding开始，等间距）
  const datePadding = toResponsiveWidth(58, containerWidth)
  const availableWidth = calendarWidth - datePadding * 2
  const wednesdayWidth = toResponsiveWidth(78, containerWidth)
  const totalItemWidth = weekdayItemWidth * 6 + wednesdayWidth // 6个77px + 1个78px
  const gap = (availableWidth - totalItemWidth) / 6 // 6个间距
  
  // 计算每个日期的位置（从左到右，等间距）
  let currentLeft = datePadding
  const horizontalPositions = [
    currentLeft,  // 周日
  ]
  currentLeft += weekdayItemWidth + gap
  horizontalPositions.push(currentLeft)  // 周一
  currentLeft += weekdayItemWidth + gap
  horizontalPositions.push(currentLeft)  // 周二
  currentLeft += weekdayItemWidth + gap
  horizontalPositions.push(currentLeft)  // 周三（78px）
  currentLeft += wednesdayWidth + gap
  horizontalPositions.push(currentLeft)  // 周四
  currentLeft += weekdayItemWidth + gap
  horizontalPositions.push(currentLeft)  // 周五
  currentLeft += weekdayItemWidth + gap
  horizontalPositions.push(currentLeft)  // 周六
  
  // 周三的宽度是 78px，其他是 77px
  const weekdayWidths = [
    weekdayItemWidth, // 周日
    weekdayItemWidth, // 周一
    weekdayItemWidth, // 周二
    toResponsiveWidth(78, containerWidth), // 周三
    weekdayItemWidth, // 周四
    weekdayItemWidth, // 周五
    weekdayItemWidth, // 周六
  ]
  
  // 右上角按钮尺寸和位置
  const atlasButtonSize = toResponsiveWidth(70, containerWidth)
  const atlasButtonTop = toResponsiveHeight(34, containerHeight) // 距离日历容器上方 34px
  const atlasButtonRight = toResponsiveWidth(38, containerWidth) // 距离日历容器右边 38px
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    return weekDays[date.getDay()]
  }

  const getDayNumber = (dateString: string): number => {
    const date = new Date(dateString)
    return date.getDate()
  }



  // 上半部分背景层（Rectangle 1）：509px 高，从顶部开始
  const topSectionHeight = toResponsiveHeight(509, containerHeight)
  const topSectionBorderRadius = toResponsiveWidth(50, containerWidth)
  const topSectionShadowOffsetX = toResponsiveWidth(15, containerWidth)
  const topSectionShadowOffsetY = toResponsiveWidth(33, containerHeight)
  const topSectionShadowBlur = toResponsiveWidth(35.9, containerWidth)
  const topSectionBoxShadow = `${topSectionShadowOffsetX}px ${topSectionShadowOffsetY}px ${topSectionShadowBlur}px rgba(70, 70, 70, 0.11)`

  return (
    <div 
      className="flex flex-col relative"
      style={{
        width: `${calendarWidth}px`,
        height: `${calendarHeight}px`,
        left: `${calendarLeft}px`,
        background: '#FBF7F9',
        borderRadius: `${calendarBorderRadius}px`,
        boxShadow: boxShadow,
        padding: `${calendarPadding}px`,
        overflow: 'hidden',
      }}
    >
      {/* 上半部分背景层（Rectangle 1）- 从日历框边缘开始，不考虑 padding */}
      <div
        className="absolute"
        style={{
          width: `${calendarWidth}px`,
          height: `${topSectionHeight}px`,
          left: `${-calendarPadding}px`,
          top: `${-calendarPadding}px`,
          background: 'rgba(246, 237, 243, 0.47)',
          borderRadius: `${topSectionBorderRadius}px`,
          boxShadow: topSectionBoxShadow,
          zIndex: 1,
        }}
      />
      {/* 标题背景区域 */}
      <div
        className="absolute z-10"
        style={{
          width: `${titleBgWidth}px`,
          height: `${titleBgHeight}px`,
          left: `${titleBgLeft}px`,
          top: `${titleBgTop}px`,
          background: '#DDCFD8',
          opacity: 0.8,
          borderRadius: `${titleBgBorderRadius}px`,
        }}
      />
      
      {/* 标题文字 */}
      <h2 
        className="absolute font-medium text-center z-10"
        style={{
          width: `${titleWidth}px`,
          height: `${titleHeight}px`,
          left: `${titleLeft}px`,
          top: `${titleTop}px`,
          fontSize: `${titleFontSize}px`,
          lineHeight: `${titleLineHeight}px`,
          color: '#FFFFFF',
          fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 500,
        }}
      >
        情绪日历
      </h2>

      {/* 右上角按钮 */}
      {onAtlasButtonClick && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('Atlas button clicked')
            onAtlasButtonClick()
          }}
          className="absolute cursor-pointer"
          style={{
            top: `${atlasButtonTop}px`,
            right: `${atlasButtonRight}px`,
            width: `${atlasButtonSize}px`,
            height: `${atlasButtonSize}px`,
            backgroundImage: 'url(/emo_atlas.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 'none',
            outline: 'none',
            zIndex: 50,
            pointerEvents: 'auto',
          }}
          aria-label="打开情绪图集"
        />
      )}
      {/* 周几、日期和情绪圆圈 - 使用绝对定位 */}
      <div className="relative z-10" style={{ width: '100%', height: '100%' }}>
        {weeklyEmotions.map((emotion, index) => {
          const config = emotion.emotion ? EMOTION_CONFIG[emotion.emotion] : null
          const isSelected = emotion.date === selectedDate
          const dayOfWeek = getDayOfWeek(emotion.date)
          const dayNumber = getDayNumber(emotion.date)
          const left = horizontalPositions[index]
          const itemWidth = weekdayWidths[index]
          const circleColor = emotion.emotion ? emotionColorMap[emotion.emotion] : undefined
          
          return (
            <div key={emotion.date} className="absolute">
              {/* 周几 */}
              <div
                className="absolute text-center"
                style={{
                  width: `${itemWidth}px`,
                  height: `${weekdayItemHeight}px`,
                  left: `${left}px`,
                  top: `${weekdayTop}px`,
                  fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: `${weekdayFontSize}px`,
                  lineHeight: `${weekdayLineHeight}px`,
                  color: weekdayColor,
                }}
              >
                {dayOfWeek}
              </div>
              
              {/* 日期数字 */}
              <div
                className="absolute text-center"
                style={{
                  width: `${itemWidth}px`,
                  height: `${weekdayItemHeight}px`,
                  left: `${left}px`,
                  top: `${dateTop}px`,
                  fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: `${weekdayFontSize}px`,
                  lineHeight: `${weekdayLineHeight}px`,
                  color: dateColor,
                }}
              >
                {dayNumber}
              </div>
              
              {/* 情绪圆圈 */}
              {emotion.emotion && circleColor && config ? (
                <button
                  ref={(el) => {
                    buttonRefs.current[emotion.date] = el
                  }}
                  onClick={() => onDateSelect(emotion.date)}
                  className="absolute rounded-full transition-all"
                  style={{
                    width: `${emotionCircleSize}px`,
                    height: `${emotionCircleSize}px`,
                    left: `${left}px`,
                    top: `${circleTop}px`,
                    backgroundColor: circleColor,
                    border: 'none',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    ...(isSelected && {
                      boxShadow: `0 0 0 2px #3B82F6, 0 0 0 4px white`,
                    }),
                  }}
                  aria-label={`${emotion.date} - ${config.label}`}
                />
              ) : (
                // 空数据：虚线圆圈
                <div
                  className="absolute rounded-full"
                  style={{
                    width: `${emotionCircleSize}px`,
                    height: `${emotionCircleSize}px`,
                    left: `${left}px`,
                    top: `${circleTop}px`,
                    boxSizing: 'border-box',
                    opacity: 0.88,
                    border: `2px dashed ${weekdayColor}`,
                    backgroundColor: 'transparent',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}




