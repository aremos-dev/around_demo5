import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface RespirationData {
  hour: number
  minute: number
  value: number
  time: string
  timestamp: number
}

interface RespirationRateChartProps {
  data: RespirationData[]
  containerWidth?: number
  containerHeight?: number
}

export const RespirationRateChart = ({ data, containerWidth = 1179, containerHeight = 2556 }: RespirationRateChartProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(data.length > 0 ? data.length - 1 : 0)
  const [isDragging, setIsDragging] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // 当数据更新时，更新默认选中的数据点
  useEffect(() => {
    if (data.length > 0) {
      setSelectedIndex(data.length - 1)
    }
  }, [data])

  const selectedData = data[selectedIndex] || null

  // 根据x坐标找到最近的数据点
  const findNearestDataPoint = useCallback((clientX: number) => {
    if (!chartContainerRef.current || data.length === 0) return selectedIndex
    
    const svgElement = chartContainerRef.current.querySelector('svg')
    if (!svgElement) return selectedIndex
    
    const svgRect = svgElement.getBoundingClientRect()
    const relativeX = clientX - svgRect.left - 20 // 减去左边距
    const plotWidth = svgRect.width - 40 // 减去左右边距
    
    if (plotWidth <= 0) return selectedIndex
    
    const index = Math.round((relativeX / plotWidth) * (data.length - 1))
    return Math.max(0, Math.min(data.length - 1, index))
  }, [data.length, selectedIndex])

  // 处理鼠标移动（拖拽）
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const newIndex = findNearestDataPoint(e.clientX)
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex)
    }
  }, [isDragging, findNearestDataPoint, selectedIndex])

  // 处理鼠标按下
  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 计算数值字体大小和BMP字体大小
  const valueFontSize = 24
  const bmpFontSize = valueFontSize / 4

  // 刻度字体大小：36px（基于原始设计尺寸1179px），响应式
  const tickFontSize = toResponsiveWidth(36, containerWidth)
  
  // 矩形宽度：42px（基于原始设计尺寸1179px），响应式
  const rectangleWidth = toResponsiveWidth(42, containerWidth)
  // 矩形高度：231px（基于原始设计尺寸2556px），响应式
  const rectangleHeight = toResponsiveHeight(231, containerHeight)
  // 圆圈直径：42px（基于原始设计尺寸1179px），响应式
  const circleRadius = toResponsiveWidth(42, containerWidth) / 2
  // 虚线宽度：2px（基于原始设计尺寸1179px），响应式
  const lineWidth = toResponsiveWidth(2, containerWidth)
  // 圆圈边框宽度：4px（基于原始设计尺寸1179px），响应式
  const circleStrokeWidth = toResponsiveWidth(4, containerWidth)

  // 自定义XAxis的tick渲染，只显示0, 15, 30, 45
  const customXTick = (props: any) => {
    const { x, y, payload } = props
    const time = payload.value
    // 只显示0, 15, 30, 45
    const timeNum = parseInt(time, 10)
    if (timeNum !== undefined && !isNaN(timeNum) && (timeNum === 0 || timeNum === 15 || timeNum === 30 || timeNum === 45)) {
      return (
        <text 
          x={x} 
          y={y + 5} 
          textAnchor="middle" 
          fill="#6b7280"
          style={{
            fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontStyle: 'normal',
            fontWeight: 500,
            fontSize: `${tickFontSize}px`,
            lineHeight: '100%',
            letterSpacing: '0%',
            textAlign: 'center',
          }}
        >
          {time}
        </text>
      )
    }
    return null
  }
  
  // 自定义YAxis的tick渲染，只显示8, 16, 24, 32
  // 刻度文字紧贴组件左边
  const customYTick = (props: any) => {
    const { y, payload } = props
    const value = payload.value
    // 只显示8, 16, 24, 32
    if (value === 8 || value === 16 || value === 24 || value === 32) {
      // 确保y坐标在有效范围内（图表高度范围内）
      const validY = y !== undefined && !isNaN(y) ? y + 5 : null
      if (validY !== null) {
        return (
          <text 
            x={0} 
            y={validY} 
            textAnchor="start" 
            fill="#6b7280"
            style={{
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: `${tickFontSize}px`,
              lineHeight: '100%',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >
            {value}
          </text>
        )
      }
    }
    return null
  }

  // 右边呼吸率数值距离右侧58px（基于原始设计尺寸1179px），响应式
  const rightMargin = toResponsiveWidth(58, containerWidth)

  return (
    <div className="w-full h-full flex flex-col">
      {/* 顶部Bar - 置顶弹窗，包含呼吸率标题和数值 */}
      <div 
        className="flex items-center justify-between"
        style={{
          paddingRight: `${rightMargin}px`,
        }}
      >
        {/* 左边：呼吸率 */}
        <div className="text-lg font-semibold text-gray-800">
          呼吸率
        </div>
        
        {/* 右边：数值和BMP */}
        {selectedData && (
          <div className="flex items-baseline">
            <span
              style={{
                fontSize: `${valueFontSize}px`,
                fontWeight: 'bold',
                color: '#1f2937',
              }}
            >
              {selectedData.value}
            </span>
            <span
              style={{
                fontSize: `${bmpFontSize}px`,
                color: '#6b7280',
                marginLeft: '4px',
              }}
            >
              BMP
            </span>
          </div>
        )}
      </div>

      {/* 图表 - 右侧贴紧，紧贴bar下方 */}
      <div 
        ref={chartContainerRef}
        className="flex-1 flex items-center relative"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 0, bottom: 0, left: -12 }}
          >
            <defs>
              <linearGradient id="respirationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFE4E6" />
                <stop offset="90.11%" stopColor="rgba(217, 217, 217, 0)" />
              </linearGradient>
              <linearGradient id="dotGradient" x1="0%" y1="0%" x2="0%" y2="100%" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F2769E" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#F2769E" stopOpacity="0.4" />
                <stop offset="80%" stopColor="rgba(255, 204, 224, 0.2)" stopOpacity="0.2" />
                <stop offset="95%" stopColor="rgba(255, 204, 224, 0.1)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="rgba(255, 204, 224, 0)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {/* 自定义虚线横线 - 在y轴刻度8, 16, 24, 32处 */}
            {[8, 16, 24, 32].map((value) => (
              <ReferenceLine
                key={`grid-line-${value}`}
                y={value}
                stroke="#D8CAD2"
                strokeWidth={lineWidth}
                strokeDasharray="4 4"
              />
            ))}
            <XAxis
              dataKey="time"
              stroke="#D8CAD2"
              tick={customXTick}
              axisLine={{ stroke: '#D8CAD2', strokeWidth: lineWidth }}
              tickLine={false}
              height={20}
            />
            <YAxis
              domain={[0, 32]}
              ticks={[8, 16, 24, 32]}
              stroke="transparent"
              tick={customYTick}
              axisLine={false}
              tickLine={false}
              width={35}
              orientation="left"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ display: 'none' }}
              cursor={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#82797F"
              strokeWidth={2}
              fill="url(#respirationGradient)"
              activeDot={false}
            />
            {/* 只显示一个可拖拽的数据点 - 矩形和圆圈都放在Area后面，确保显示在Area前面 */}
            {selectedData && (
              <>
                {/* 渐变矩形 - 从选中点向下延伸到x轴，显示在Area前面 */}
                <ReferenceDot
                  x={selectedData.time}
                  y={selectedData.value}
                  r={0}
                  fill="none"
                  stroke="none"
                  shape={(props: any): React.ReactElement => {
                    const { cx, cy } = props
                    // 获取选中点的实际坐标
                    const dotX = cx
                    const dotY = cy
                    
                    if (dotX === undefined || dotY === undefined) {
                      return <g />
                    }
                    
                    // 矩形使用固定高度231px（响应式）
                    // 矩形左上角位置（从选中点开始，居中）
                    const rectX = dotX - rectangleWidth / 2
                    const rectY = dotY
                    
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect
                          x={rectX}
                          y={rectY}
                          width={rectangleWidth}
                          height={rectangleHeight}
                          fill="url(#dotGradient)"
                        />
                      </g>
                    )
                  }}
                />
                {/* 圆圈 - 显示在最前面 */}
                <ReferenceDot
                  x={selectedData.time}
                  y={selectedData.value}
                  r={circleRadius}
                  fill="#EFE8EC"
                  stroke="#82797F"
                  strokeWidth={circleStrokeWidth}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

