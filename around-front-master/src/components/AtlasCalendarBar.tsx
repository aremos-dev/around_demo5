import { EmotionData } from '../types'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface AtlasCalendarBarProps {
  weeklyEmotions: EmotionData[]
  selectedDate: string
  onDateSelect: (date: string) => void
  containerWidth: number // 容器宽度，用于自适应计算
  containerHeight?: number // 容器高度，用于自适应计算
}

export const AtlasCalendarBar = ({ 
  weeklyEmotions, 
  selectedDate, 
  onDateSelect, 
  containerWidth,
  containerHeight = 2556 
}: AtlasCalendarBarProps) => {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    return weekDays[date.getDay()]
  }

  const getDayNumber = (dateString: string): number => {
    const date = new Date(dateString)
    return date.getDate()
  }

  // 使用和 EmotionCalendar 相同的样式和布局
  // 周几和日期样式（根据 CSS）
  const weekdayItemWidth = toResponsiveWidth(77, containerWidth) // 大部分是 77px，周三是 78px
  const weekdayItemHeight = toResponsiveHeight(43, containerHeight)
  const weekdayFontSize = toResponsiveWidth(36, containerWidth)
  const weekdayLineHeight = toResponsiveHeight(42, containerHeight)
  const weekdayColor = '#B5A6B0'
  const dateColor = '#82797F'
  
  // 日历总宽度：954px（从113px到1067px，相对于1179px的设计图）
  // 弹窗宽度：1069px，日历居中：(1069 - 954) / 2 = 57.5px
  const calendarWidth = toResponsiveWidth(954, containerWidth)
  const calendarHeight = toResponsiveHeight(93, containerHeight)
  
  // 整体向上挪一个字的相对高度（一个字的高度大约是 weekdayItemHeight）
  const calendarTopOffset = -weekdayItemHeight
  
  // 周几位置：top: 0（相对于日历容器顶部）
  const weekdayTop = 0
  // 日期位置：top: 50px（2034 - 1984 = 50px）
  const dateTop = toResponsiveHeight(50, containerHeight)
  
  // 选中小球尺寸：130px × 130px
  const selectedCircleSize = toResponsiveWidth(130, containerWidth)
  
  // 水平位置（相对于日历容器左边缘，从0开始）
  // 周日：113 - 113 = 0px
  // 周一：259 - 113 = 146px
  // 周二：405 - 113 = 292px
  // 周三：551 - 113 = 438px（宽度78px）
  // 周四：698 - 113 = 585px
  // 周五：844 - 113 = 731px
  // 周六：990 - 113 = 877px
  const horizontalPositions = [
    toResponsiveWidth(0, containerWidth),    // 周日
    toResponsiveWidth(146, containerWidth), // 周一
    toResponsiveWidth(292, containerWidth), // 周二
    toResponsiveWidth(438, containerWidth), // 周三
    toResponsiveWidth(585, containerWidth), // 周四
    toResponsiveWidth(731, containerWidth),  // 周五
    toResponsiveWidth(877, containerWidth),  // 周六
  ]
  
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

  return (
    <div 
      className="relative"
      style={{
        width: `${calendarWidth}px`,
        height: `${calendarHeight}px`,
        left: '50%',
        transform: 'translateX(-50%)', // 左右居中对齐
        marginTop: `${calendarTopOffset}px`, // 整体向上挪一个字的相对高度
      }}
    >
      {weeklyEmotions.map((emotion, index) => {
        const isSelected = emotion.date === selectedDate
        const dayOfWeek = getDayOfWeek(emotion.date)
        const dayNumber = getDayNumber(emotion.date)
        const left = horizontalPositions[index]
        const itemWidth = weekdayWidths[index]
        
        return (
          <button
            key={emotion.date}
            onClick={() => onDateSelect(emotion.date)}
            className="absolute cursor-pointer"
            style={{
              left: `${left}px`,
              top: 0,
              width: `${itemWidth}px`,
              height: `${calendarHeight}px`,
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          >
            {/* 选中状态指示 - 小球圆心和日期左右居中对齐，上下位置在"日"和日期字符中间，稍微下移一点 */}
            {isSelected && (
              <div
                className="absolute rounded-full"
                style={{
                  width: `${selectedCircleSize}px`,
                  height: `${selectedCircleSize}px`,
                  left: `calc(50% - ${selectedCircleSize / 2}px)`, // 小球圆心和日期左右居中对齐
                  top: `${(weekdayTop + dateTop) / 2 - selectedCircleSize / 2 + toResponsiveHeight(20, containerHeight)}px`, // 上下位置在"日"和日期字符中间，再下移一点
                  background: '#CEDEF9',
                  zIndex: 0,
                }}
              />
            )}
            
            {/* 周几 */}
            <div
              className="absolute text-center"
              style={{
                width: `${itemWidth}px`,
                height: `${weekdayItemHeight}px`,
                left: 0,
                top: `${weekdayTop}px`,
                fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: `${weekdayFontSize}px`,
                lineHeight: `${weekdayLineHeight}px`,
                color: weekdayColor,
                zIndex: 10, // 文字在最上面
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
                left: 0,
                top: `${dateTop}px`,
                fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: `${weekdayFontSize}px`,
                lineHeight: `${weekdayLineHeight}px`,
                color: dateColor,
                zIndex: 10, // 文字在最上面
              }}
            >
              {dayNumber}
            </div>
            
            {/* 选中状态指示 - 小球圆心和日期左右居中对齐，上下位置在"日"和日期字符中间，稍微下移一点 */}
            {isSelected && (
              <div
                className="absolute rounded-full"
                style={{
                  width: `${selectedCircleSize}px`,
                  height: `${selectedCircleSize}px`,
                  left: `calc(50% - ${selectedCircleSize / 2}px)`, // 小球圆心和日期左右居中对齐
                  top: `${(weekdayTop + dateTop) / 2 - selectedCircleSize / 2 + toResponsiveHeight(20, containerHeight)}px`, // 上下位置在"日"和日期字符中间，再下移一点
                  background: '#CEDEF9',
                  zIndex: 0,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

