import { useMemo, useState, useEffect } from 'react'
import { toResponsiveWidth } from '../hooks/useContainerSize'

interface GaugeChartProps {
  title: string
  value: number
  unit?: string
  valueFontSize?: number
  unitFontSize?: number
  decimalPlaces?: number // 小数位数，默认0（整数）
  minValue?: number // 最小值，用于计算指针位置，默认0
  maxValue?: number // 最大值，用于计算指针位置，默认100
  containerWidth?: number // 容器宽度，用于响应式计算
  showOnlySVG?: boolean // 是否只显示SVG部分，不显示标题和数值
}

export const GaugeChart = ({ 
  title, 
  value, 
  unit = '', 
  valueFontSize = 24,
  unitFontSize = 6,
  decimalPlaces = 0,
  minValue = 0,
  maxValue = 100,
  containerWidth = 617, // 默认设计图宽度
  showOnlySVG = false // 是否只显示SVG部分
}: GaugeChartProps) => {
  // 从外部SVG文件加载刻度路径
  const [scalePath, setScalePath] = useState<string>('')
  
  useEffect(() => {
    fetch('/gauge-chart.svg')
      .then(response => response.text())
      .then(text => {
        // 从SVG文件中提取刻度路径的d属性
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(text, 'image/svg+xml')
        const scalePathElement = svgDoc.querySelector('#gauge-scale-path')
        if (scalePathElement) {
          const d = scalePathElement.getAttribute('d')
          if (d) {
            setScalePath(d)
          }
        }
      })
      .catch(error => {
        console.error('Failed to load gauge-chart.svg:', error)
        // 如果加载失败，使用默认路径（原来的硬编码路径）
        setScalePath('M5.03741 42.4815C9.57568 40.1692 15.1297 41.9736 17.4422 46.5117L35.2824 81.5263C37.5946 86.0646 35.7903 91.6179 31.2521 93.9304C26.7137 96.2428 21.1597 94.4385 18.8473 89.9001L1.00714 54.8863C-1.30513 50.3479 0.499079 44.7939 5.03741 42.4815ZM346.53 46.5125C348.842 41.9742 354.396 40.169 358.935 42.4815C363.473 44.7939 365.277 50.348 362.965 54.8863L345.125 89.9001C342.812 94.4385 337.258 96.2427 332.72 93.9304C328.182 91.6179 326.377 86.0647 328.69 81.5263L346.53 46.5125ZM32.2436 29.9121C36.9461 27.9553 42.3444 30.1815 44.3015 34.8838L59.3998 71.1656C61.3565 75.8681 59.1306 81.2665 54.4281 83.2235C49.7255 85.1803 44.3264 82.9544 42.3694 78.2518L27.2728 41.9708C25.3159 37.2682 27.5411 31.8691 32.2436 29.9121ZM318.513 34.4374C320.455 29.7286 325.846 27.4851 330.555 29.4266C335.264 31.3682 337.507 36.7592 335.565 41.468L320.587 77.7983C318.645 82.5074 313.254 84.7507 308.545 82.8092C303.836 80.8676 301.592 75.4766 303.534 70.7677L318.513 34.4374ZM61.5426 19.076C66.3867 17.5021 71.5901 20.1536 73.1642 24.9977L85.3075 62.3712C86.8815 67.2154 84.23 72.4188 79.3858 73.9929C74.5416 75.5666 69.3389 72.9154 67.7649 68.0712L55.6217 30.6977C54.0478 25.8535 56.6984 20.65 61.5426 19.076ZM290.808 24.9977C292.382 20.1536 297.585 17.502 302.43 19.076C307.274 20.6501 309.924 25.8535 308.35 30.6977L296.207 68.0712C294.633 72.9153 289.43 75.5665 284.586 73.9929C279.742 72.4188 277.091 67.2155 278.665 62.3712L290.808 24.9977ZM90.3802 10.9176C95.331 9.72046 100.315 12.7641 101.512 17.7148L110.748 55.9107C111.946 60.8616 108.902 65.8457 103.951 67.0429C99.0004 68.2397 94.0169 65.1964 92.8198 60.2456L83.5837 22.0505C82.3866 17.0997 85.4294 12.1148 90.3802 10.9176ZM261.247 17.4548C262.428 12.5 267.402 9.44055 272.357 10.6215C277.311 11.8026 280.37 16.7764 279.189 21.731L270.079 59.9574C268.898 64.9122 263.923 67.9709 258.968 66.7899C254.014 65.6088 250.955 60.6351 252.136 55.6805L261.247 17.4548ZM121.014 4.79857C126.044 4.00185 130.769 7.43444 131.565 12.4652L137.713 51.2782C138.51 56.3089 135.078 61.033 130.047 61.83C125.016 62.6268 120.292 59.1943 119.495 54.1634L113.347 15.3504C112.55 10.3197 115.983 5.59543 121.014 4.79857ZM232.407 12.4652C233.204 7.4344 237.928 4.00177 242.958 4.79857C247.989 5.59547 251.422 10.3198 250.625 15.3504L244.477 54.1642C243.68 59.1948 238.956 62.6267 233.925 61.83C228.894 61.0331 225.462 56.309 226.259 51.2782L232.407 12.4652ZM150.773 1.25153C155.85 0.84384 160.296 4.62919 160.704 9.706L163.851 48.8777C164.259 53.9547 160.474 58.4005 155.397 58.8085C150.32 59.2163 145.873 55.4312 145.465 50.354L142.319 11.1839C141.911 6.10664 145.696 1.65945 150.773 1.25153ZM202.029 9.63943C202.421 4.56089 206.855 0.760709 211.933 1.15206C217.012 1.54342 220.811 5.97779 220.42 11.0562L217.401 50.2373C217.009 55.3159 212.575 59.1153 207.497 58.7239C202.418 58.3325 198.619 53.8983 199.01 48.8198L202.029 9.63943ZM181.986 0C187.079 7.93579e-05 191.209 4.12933 191.209 9.22277V48.5198C191.209 53.6133 187.08 57.7425 181.986 57.7426C176.892 57.7426 172.763 53.6134 172.763 48.5198V9.22277C172.763 4.12929 176.893 0 181.986 0Z')
      })
  }, [])
  
  // 分析刻度圆弧的几何结构
  // 从SVG路径分析，刻度形成一个半圆弧
  // 圆心在div外面（底部下方），需要计算圆心的位置和半径
  // 最左侧刻度大约在 (5, 42)，最右侧刻度大约在 (346, 46)，中心刻度在 (182, 0)
  
  // 刻度点坐标
  const leftX = 5
  const leftY = 42
  const centerX = 182
  const centerY = 0  // 中心刻度在顶部
  const rightX = 346
  const rightY = 46
  
  // 计算圆心：通过三个点求外接圆圆心
  // 使用更精确的方法：通过三个点计算外接圆
  // 圆心应该在底部中心下方
  const circleCenterX = centerX // 182，假设圆心X在中心
  
  // 通过三个点计算圆心Y：使用迭代方法找到合适的圆心Y
  const circleCenterY = useMemo(() => {
    // 通过左侧点 (5, 42)、中心点 (182, 0) 和右侧点 (346, 46) 计算
    // 找到使三个点到圆心的距离最接近的y值
    let bestY = 200
    let minDiff = Infinity
    
    for (let y = 150; y <= 250; y += 1) {
      const r1 = Math.sqrt((leftX - circleCenterX) ** 2 + (leftY - y) ** 2)
      const r2 = Math.sqrt((centerX - circleCenterX) ** 2 + (centerY - y) ** 2)
      const r3 = Math.sqrt((rightX - circleCenterX) ** 2 + (rightY - y) ** 2)
      
      // 计算三个半径的方差
      const avg = (r1 + r2 + r3) / 3
      const diff = Math.abs(r1 - avg) + Math.abs(r2 - avg) + Math.abs(r3 - avg)
      
      if (diff < minDiff) {
        minDiff = diff
        bestY = y
      }
    }
    
    // 将圆心往下拉80px（总共）
    return bestY + 80
  }, [circleCenterX, leftX, leftY, centerX, centerY, rightX, rightY])
  
  // 计算半径（使用平均值）
  const radius = useMemo(() => {
    const r1 = Math.sqrt((leftX - circleCenterX) ** 2 + (leftY - circleCenterY) ** 2)
    const r2 = Math.sqrt((centerX - circleCenterX) ** 2 + (centerY - circleCenterY) ** 2)
    const r3 = Math.sqrt((rightX - circleCenterX) ** 2 + (rightY - circleCenterY) ** 2)
    return (r1 + r2 + r3) / 3
  }, [circleCenterX, circleCenterY, leftX, leftY, centerX, centerY, rightX, rightY])
  
  // 计算左侧和右侧的角度（从圆心到刻度点）
  const leftAngle = Math.atan2(leftY - circleCenterY, leftX - circleCenterX) * (180 / Math.PI)
  const rightAngle = Math.atan2(rightY - circleCenterY, rightX - circleCenterX) * (180 / Math.PI)
  
  // 计算指针在圆弧上的位置和角度
  const { pointerX, pointerY, pointerAngle } = useMemo(() => {
    // 将value映射到0-1范围：考虑minValue和maxValue
    const range = maxValue - minValue
    const normalizedValue = range > 0 
      ? Math.min(Math.max((value - minValue) / range, 0), 1) // 0-1
      : 0
    // 映射到角度范围：从 leftAngle 到 rightAngle
    const angle = leftAngle + (normalizedValue * (rightAngle - leftAngle))
    const angleRad = angle * (Math.PI / 180)
    
    // 计算指针底部在圆弧上的位置
    // 圆心向下移动，指针显示位置往下移动50px
    const pointerX = circleCenterX + radius * Math.cos(angleRad)
    const pointerY = circleCenterY + radius * Math.sin(angleRad) - 30 // 指针显示位置往下移动50px（从-40改为-30）
    
    // 指针应该指向圆心（径向方向）
    // angle 是从圆心到圆弧上点的角度
    // 指针从圆弧指向圆心，所以是 angle + 180度
    // 但指针的原始方向是垂直向下的（在SVG中），需要调整
    // 如果看起来是相切的，说明需要再调整90度
    // 径向方向 = angle + 180度，但考虑到指针原始方向，可能需要调整
    const pointerAngle = angle + 180 + 90 // 调整90度，从切向改为径向
    
    return { pointerX, pointerY, pointerAngle }
  }, [value, maxValue, leftAngle, rightAngle, radius, circleCenterX, circleCenterY])

  // 指针尺寸：宽度扩大到1.2倍后为12.3x113.4（高度缩减到90%）
  // 指针底部中心大约在 (6.15, 113.4)
  const pointerWidth = 41 * 0.5 * 0.5 * 1.2 // 12.3，宽度扩大到1.2倍
  const pointerHeight = 126 * 0.9 // 113.4，高度缩减到90%
  const pointerCenterX = pointerWidth / 2 // 6.15，指针底部中心X
  const pointerBottomY = pointerHeight // 113.4，指针底部Y

  if (showOnlySVG) {
    // 只显示SVG部分，不显示标题和数值
    return (
      <div className="w-full h-full relative" style={{ minHeight: 0 }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 364 95" 
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`gaugeGradient-${title}`} x1="-74.8485" y1="69.9316" x2="437.878" y2="69.9316" gradientUnits="userSpaceOnUse">
              <stop offset="0.0485284" stopColor="#9CC5B6" stopOpacity="0"/>
              <stop offset="0.474249" stopColor="#79A598"/>
              <stop offset="1" stopColor="#EDFFF9" stopOpacity="0.57"/>
            </linearGradient>
          </defs>
          
          {/* 刻度路径 - 从外部SVG文件加载 */}
          {scalePath && (
            <path 
              d={scalePath}
              fill={`url(#gaugeGradient-${title})`}
            />
          )}
          
          {/* 指针 - 底部在圆弧上，指向圆心方向 - 使用矩形元素 */}
          <g transform={`translate(${pointerX}, ${pointerY}) rotate(${pointerAngle}) translate(-${pointerCenterX}, -${pointerBottomY})`}>
            <rect
              x="0"
              y="0"
              width={pointerWidth}
              height={pointerHeight}
              fill="#685563"
              stroke="white"
              strokeWidth="4"
              rx="4"
              ry="4"
              style={{ shapeRendering: 'geometricPrecision' }}
            />
          </g>
        </svg>
      </div>
    )
  }

  return (
    <div 
      className="w-full h-full relative"
      style={{
        backgroundColor: 'transparent', // 背景透明，使用父容器的背景色
        borderRadius: `${toResponsiveWidth(60, containerWidth)}px`,
        padding: `${toResponsiveWidth(16, containerWidth)}px`,
      }}
    >
      {/* 标题 - 右上角 */}
      <div 
        className="absolute font-semibold text-gray-800"
        style={{
          top: `${toResponsiveWidth(4, containerWidth)}px`,
          right: `${toResponsiveWidth(4, containerWidth)}px`,
          fontSize: `${toResponsiveWidth(9, containerWidth)}px`,
        }}
      >
        {title}
      </div>
      
      {/* 数值 - 左下角 */}
      <div 
        className="absolute flex items-baseline"
        style={{
          bottom: `${toResponsiveWidth(4, containerWidth)}px`,
          left: `${toResponsiveWidth(4, containerWidth)}px`,
        }}
      >
        <span
          style={{
            fontSize: `${valueFontSize}px`,
            fontWeight: 'bold',
            color: '#1f2937',
          }}
        >
          {decimalPlaces > 0 ? value.toFixed(decimalPlaces) : value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: `${unitFontSize}px`,
              color: '#6b7280',
              marginLeft: '4px',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* 仪表盘 - 使用SVG直接绘制 */}
      <div className="w-full h-full flex items-center justify-center relative" style={{ minHeight: 0 }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 364 95" 
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`gaugeGradient-${title}`} x1="-74.8485" y1="69.9316" x2="437.878" y2="69.9316" gradientUnits="userSpaceOnUse">
              <stop offset="0.0485284" stopColor="#9CC5B6" stopOpacity="0"/>
              <stop offset="0.474249" stopColor="#79A598"/>
              <stop offset="1" stopColor="#EDFFF9" stopOpacity="0.57"/>
            </linearGradient>
          </defs>
          
          {/* 刻度路径 - 从外部SVG文件加载 */}
          {scalePath && (
            <path 
              d={scalePath}
              fill={`url(#gaugeGradient-${title})`}
            />
          )}
          
          {/* 指针 - 底部在圆弧上，指向圆心方向 - 使用矩形元素 */}
          <g transform={`translate(${pointerX}, ${pointerY}) rotate(${pointerAngle}) translate(-${pointerCenterX}, -${pointerBottomY})`}>
            <rect
              x="0"
              y="0"
              width={pointerWidth}
              height={pointerHeight}
              fill="#685563"
              stroke="white"
              strokeWidth="4"
              rx="4"
              ry="4"
              style={{ shapeRendering: 'geometricPrecision' }}
            />
          </g>
        </svg>
      </div>
    </div>
  )
}
