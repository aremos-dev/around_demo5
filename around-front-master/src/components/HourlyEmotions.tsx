import { EmotionData, EmotionType } from '../types'
import { EMOTION_CONFIG } from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface HourlyEmotionsProps {
  hourlyEmotions: EmotionData[]
  selectedDate: string
  containerWidth?: number
  containerHeight?: number
}

export const HourlyEmotions = ({
  hourlyEmotions,
  containerWidth = 1179,
  containerHeight = 2556,
}: HourlyEmotionsProps) => {
  
  // 容器尺寸：1069px × 342px，left: 55px（响应式）
  const containerWidth_responsive = toResponsiveWidth(1069, containerWidth)
  const containerHeight_responsive = toResponsiveHeight(342, containerHeight)
  const containerLeft = toResponsiveWidth(55, containerWidth)
  
  // 容器样式（响应式）- Rectangle 4 样式
  const containerPadding = toResponsiveWidth(16, containerWidth)
  const containerBorderRadius = toResponsiveWidth(50, containerWidth)
  
  // 阴影样式：15px 33px 35.9px rgba(70, 70, 70, 0.11)（响应式）
  const shadowOffsetX = toResponsiveWidth(15, containerWidth)
  const shadowOffsetY = toResponsiveWidth(33, containerHeight)
  const shadowBlur = toResponsiveWidth(35.9, containerWidth)
  const boxShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(70, 70, 70, 0.11)`
  
  // 背景色：rgba(246, 237, 243, 0.47)
  const backgroundColor = 'rgba(246, 237, 243, 0.47)'
  
  // 图表区域（去除padding后的可用区域）
  const chartAreaWidth = containerWidth_responsive - containerPadding * 2
  const chartAreaHeight = containerHeight_responsive - containerPadding * 2
  
  // x轴范围：从 left: 98px 到 left: 1086px（相对于页面），容器内：43px 到 1031px
  // 水平实线宽度 988px，从 98px 开始，所以结束位置是 98 + 988 = 1086px
  const xAxisStart = toResponsiveWidth(43, containerWidth)  // 98 - 55
  const xAxisEnd = toResponsiveWidth(1031, containerWidth)   // 1086 - 55 = 1031px
  const xAxisWidth = xAxisEnd - xAxisStart // 988px
  
  // 情绪圆圈尺寸：37px × 37px（响应式，确保不重叠）
  // 确保所有小球严格圆形且直径一致
  const circleSize = toResponsiveWidth(37, containerWidth)
  const circleRadius = circleSize / 2
  
  // 确保 circleSize 是整数，避免渲染问题
  const circleSizeInt = Math.round(circleSize)
  const circleRadiusInt = circleSizeInt / 2
  
  // 情绪颜色映射（从上到下：愉悦joy黄，紧绷tense红，放松calm绿，低沉low蓝）
  const emotionColorMap: Record<EmotionType, string> = {
    joy: '#FFF2B2',      // 黄色 - 最上方
    tense: '#FFD2D2',    // 红色 - 第二层
    calm: '#8AD48A',     // 绿色 - 第三层
    low: '#CEDEF9',      // 蓝色 - 最下方
  }
  
  // y轴位置（从上到下：愉悦，紧绷，放松，低沉）
  // 设计图中的y位置范围：74px 到 165px（相对于容器）
  const yTop = toResponsiveHeight(74, containerHeight)
  const yBottom = toResponsiveHeight(165, containerHeight)
  const yRange = yBottom - yTop
  
  // 行间距：小球直径的十分之一
  const rowSpacing = circleSizeInt / 10
  
  // 4行情绪类型，需要3个间距
  // 总可用高度 = yRange
  // 4行小球占用的高度 = 4 * circleSizeInt
  // 3个间距占用的高度 = 3 * rowSpacing
  // 剩余空间 = yRange - 4 * circleSizeInt - 3 * rowSpacing
  // 顶部额外间距 = 剩余空间 / 2
  const totalCircleHeight = circleSizeInt * 4
  const totalSpacingHeight = rowSpacing * 3
  const remainingSpace = yRange - totalCircleHeight - totalSpacingHeight
  const topMargin = remainingSpace / 2
  
  // 整体下移1.5个小球直径的距离
  const verticalOffset = circleSizeInt * 1.5
  
  const emotionYPositions: Record<EmotionType, number> = {
    joy: yTop + topMargin + verticalOffset,                                         // 最上方
    tense: yTop + topMargin + verticalOffset + circleSizeInt + rowSpacing,         // 第二层
    calm: yTop + topMargin + verticalOffset + circleSizeInt * 2 + rowSpacing * 2, // 第三层
    low: yTop + topMargin + verticalOffset + circleSizeInt * 3 + rowSpacing * 3,   // 最下方
  }
  
  // 时间标签样式（根据 CSS，但字体调小以确保不换行）
  const labelWidth = toResponsiveWidth(77, containerWidth)
  const labelHeight = toResponsiveHeight(43, containerHeight)
  // 减小字体大小，确保"0时"、"6时"、"12时"、"18时"都能完整显示
  const labelFontSize = toResponsiveWidth(28, containerWidth) // 从36px减小到28px
  const labelLineHeight = toResponsiveHeight(34, containerHeight) // 相应调整行高
  const labelColor = 'rgba(181, 166, 176, 0.9)'
  
  // 时间标签位置（相对于容器，容器从 top: 2110px, left: 55px 开始）
  // top: 2362 - 2110 = 252px
  const labelTop = toResponsiveHeight(252, containerHeight)
  
  // 水平实线（Vector 1）
  // left: 98 - 55 = 43px, top: 2359 - 2110 = 249px, width: 988px
  const horizontalLineLeft = toResponsiveWidth(43, containerWidth)
  const horizontalLineTop = toResponsiveHeight(249, containerHeight)
  const horizontalLineWidth = toResponsiveWidth(988, containerWidth)
  const horizontalLineColor = '#E3D7DF'
  const horizontalLineWidth_px = toResponsiveWidth(2, containerWidth)
  
  // 垂直虚线（Vector 2, 3, 4）
  // width: 221px, top: 2174 - 2110 = 64px
  const verticalLineWidth = toResponsiveWidth(221, containerWidth)
  const verticalLineTop = toResponsiveHeight(64, containerHeight)
  const verticalLineColor = '#E3D7DF'
  const verticalLineWidth_px = toResponsiveWidth(2, containerWidth)
  
  // 创建24小时的数据映射（0-23时）
  const hourlyDataMap = new Map<number, EmotionData>()
  hourlyEmotions.forEach(emotion => {
    if (emotion.hour !== undefined && emotion.hour >= 0 && emotion.hour <= 23) {
      hourlyDataMap.set(emotion.hour, emotion)
    }
  })
  
  // 计算每个小时的x位置（24小时严格等分）
  // 0-23小时共24个位置，需要23个间距
  // 第一个位置（0时）在 xAxisStart，最后一个位置（23时）在 xAxisEnd
  // 每个小时的位置（圆心位置）= xAxisStart + (hour / 23) * xAxisWidth
  const getHourXPosition = (hour: number): number => {
    // 确保严格等分：0时在 xAxisStart，23时在 xAxisEnd
    // 这样24个位置之间的间距完全相等
    return xAxisStart + (hour / 23) * xAxisWidth
  }
  
  // 计算垂直虚线的x位置（6时、12时、18时）
  const verticalLinePositions = {
    6: getHourXPosition(6),
    12: getHourXPosition(12),
    18: getHourXPosition(18),
  }
  
  // 计算时间标签的x位置（0时、6时、12时、18时）
  const labelPositions = {
    0: getHourXPosition(0),
    6: getHourXPosition(6),
    12: getHourXPosition(12),
    18: getHourXPosition(18),
  }

  return (
    <div 
      className="absolute"
      style={{
        width: `${containerWidth_responsive}px`,
        height: `${containerHeight_responsive}px`,
        left: `${containerLeft}px`,
        top: `${toResponsiveHeight(2110, containerHeight) - toResponsiveHeight(1541, containerHeight)}px`,
        padding: `${containerPadding}px`,
        background: backgroundColor,
        borderRadius: `${containerBorderRadius}px`,
        boxShadow: boxShadow,
        overflow: 'visible', // 改为 visible，确保线条和圆圈不被裁剪
        zIndex: 1,
      }}
    >
      {/* 水平实线（Vector 1） */}
      <div
        className="absolute"
        style={{
          width: `${horizontalLineWidth}px`,
          height: `${horizontalLineWidth_px}px`,
          left: `${horizontalLineLeft}px`,
          top: `${horizontalLineTop}px`,
          background: horizontalLineColor,
        }}
      />
      
      {/* 垂直虚线（Vector 2, 3, 4） */}
      {[6, 12, 18].map((hour) => (
        <div
          key={`vertical-line-${hour}`}
          className="absolute"
          style={{
            width: `${verticalLineWidth_px}px`,
            height: `${verticalLineWidth}px`,
            left: `${verticalLinePositions[hour as keyof typeof verticalLinePositions]}px`,
            top: `${verticalLineTop}px`,
            borderLeft: `${verticalLineWidth_px}px dashed ${verticalLineColor}`,
            background: 'transparent',
          }}
        />
      ))}
      
      {/* 情绪圆圈 - 24小时等分，每个小时最多一个球 */}
      {Array.from({ length: 24 }, (_, hour) => {
        const emotionData = hourlyDataMap.get(hour)
        if (!emotionData || !emotionData.emotion) return null
        
        const x = getHourXPosition(hour) - circleRadiusInt // 居中对齐
        const y = emotionYPositions[emotionData.emotion] - circleRadiusInt // 居中对齐
        const color = emotionColorMap[emotionData.emotion] || '#CEDEF9'
        
        return (
          <div
            key={hour}
            className="absolute"
            style={{
              width: `${circleSizeInt}px`,
              height: `${circleSizeInt}px`,
              left: `${x}px`,
              top: `${y}px`,
              background: color,
              borderRadius: '50%', // 确保严格圆形
              boxSizing: 'border-box', // 确保尺寸计算正确
            }}
          />
        )
      })}
      
      {/* 时间标签（0时、6时、12时、18时） - 左对齐，标签左边框与小球圆心对齐，右移四个虚线宽度避免重叠 */}
      {[0, 6, 12, 18].map((hour) => {
        // 标签左边缘与小球圆心对齐，然后右移四个虚线宽度
        const labelLeft = labelPositions[hour as keyof typeof labelPositions] + verticalLineWidth_px * 4
        
        return (
          <div
            key={`label-${hour}`}
            className="absolute"
            style={{
              width: `${labelWidth}px`,
              height: `${labelHeight}px`,
              left: `${labelLeft}px`,
              top: `${labelTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: `${labelFontSize}px`,
              lineHeight: `${labelLineHeight}px`,
              color: labelColor,
              whiteSpace: 'nowrap', // 不换行
              overflow: 'visible', // 改为 visible，不隐藏内容
              textAlign: 'left', // 左对齐
            }}
          >
            {hour}时
          </div>
        )
      })}
    </div>
  )
}

