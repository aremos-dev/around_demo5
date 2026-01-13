import { useMemo, useState, useEffect } from 'react'
import { toResponsiveWidth } from '../hooks/useContainerSize'

interface WaveChartProps {
  title?: string
  value: number
  unit?: string
  valueFontSize?: number
  unitFontSize?: number
  decimalPlaces?: number // 小数位数，默认0（整数）
  maxValue?: number // 最大值，用于计算波浪位置，默认100
  containerWidth?: number // 容器宽度，用于响应式计算
  showOnlySVG?: boolean // 是否只显示SVG部分，不显示标题和数值
}

export const WaveChart = ({ 
  title = '', 
  value, 
  unit = '', 
  valueFontSize = 24,
  unitFontSize = 6,
  decimalPlaces = 0,
  maxValue = 100,
  containerWidth = 617, // 默认设计图宽度
  showOnlySVG = false // 是否只显示SVG部分
}: WaveChartProps) => {
  // 加载外部SVG文件内容
  const [svgPath, setSvgPath] = useState<string>('')
  
  useEffect(() => {
    fetch('/wave-path.svg')
      .then(response => response.text())
      .then(text => {
        // 从SVG文件中提取path元素的d属性
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(text, 'image/svg+xml')
        const pathElement = svgDoc.querySelector('#wave-path')
        if (pathElement) {
          const d = pathElement.getAttribute('d')
          if (d) {
            setSvgPath(d)
          }
        }
      })
      .catch(error => {
        console.error('Failed to load wave-path.svg:', error)
        // 如果加载失败，使用默认路径
        setSvgPath('M1.70264 23C29.0152 13.1081 73.084 5 136.925 5C200.766 5 255.056 23 339.004 23C417.423 23 458.811 11 469.703 5')
      })
  }, [])
  // 波浪路径已保存到 /public/wave-path.svg 文件中
  // 原始SVG路径: M1.70264 23C29.0152 13.1081 73.084 5 136.925 5C200.766 5 255.056 23 339.004 23C417.423 23 458.811 11 469.703 5
  // 这是一个三次贝塞尔曲线路径，形成波浪形状
  
  // 计算数据点在波浪路径上的位置
  const dataPoint = useMemo(() => {
    // SVG原始尺寸：width="473" height="28"
    // 原始路径的控制点（从SVG解析）
    // 起点: P0 = (1.70264, 23)
    // 第一段贝塞尔曲线: C29.0152 13.1081 73.084 5 136.925 5
    //   CP1 = (29.0152, 13.1081), CP2 = (73.084, 5), P1 = (136.925, 5)
    // 第二段贝塞尔曲线: C200.766 5 255.056 23 339.004 23
    //   CP1 = (200.766, 5), CP2 = (255.056, 23), P2 = (339.004, 23)
    // 第三段贝塞尔曲线: C417.423 23 458.811 11 469.703 5
    //   CP1 = (417.423, 23), CP2 = (458.811, 11), P3 = (469.703, 5)
    
    // 波浪路径定义（用于计算数据点位置）
    const wavePathDefinition = `M1.70264 23C29.0152 13.1081 73.084 5 136.925 5C200.766 5 255.056 23 339.004 23C417.423 23 458.811 11 469.703 5`
    
    // 三次贝塞尔曲线公式: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
    const cubicBezier = (t: number, p0: number, p1: number, p2: number, p3: number) => {
      const mt = 1 - t
      return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
    }
    
    // 计算数据点在波浪上的位置
    // value 映射到路径上的位置（根据 maxValue 归一化到 0-1）
    const t = Math.min(Math.max(value / maxValue, 0), 1) // 0到1的参数，限制在0-1之间
    
    // 根据x坐标范围计算分段比例
    // 第一段：从 x=1.70264 到 x=136.925，范围约 135.22
    // 第二段：从 x=136.925 到 x=339.004，范围约 202.08
    // 第三段：从 x=339.004 到 x=469.703，范围约 130.70
    // 总范围：从 1.70264 到 469.703，约 468
    const totalRange = 469.703 - 1.70264
    const segment1Range = 136.925 - 1.70264
    const segment2Range = 339.004 - 136.925
    const segment3Range = 469.703 - 339.004
    
    const segment1Ratio = segment1Range / totalRange // ≈ 0.289
    const segment2Ratio = segment2Range / totalRange // ≈ 0.432
    const segment3Ratio = segment3Range / totalRange // ≈ 0.279
    
    let pathX = 0
    let pathY = 0
    
    if (t <= segment1Ratio) {
      // 第一段：从(1.70264, 23)到(136.925, 5)
      const segmentT = t / segment1Ratio
      pathX = cubicBezier(segmentT, 1.70264, 29.0152, 73.084, 136.925)
      pathY = cubicBezier(segmentT, 23, 13.1081, 5, 5)
    } else if (t <= segment1Ratio + segment2Ratio) {
      // 第二段：从(136.925, 5)到(339.004, 23)
      const segmentT = (t - segment1Ratio) / segment2Ratio
      pathX = cubicBezier(segmentT, 136.925, 200.766, 255.056, 339.004)
      pathY = cubicBezier(segmentT, 5, 5, 23, 23)
    } else {
      // 第三段：从(339.004, 23)到(469.703, 5)
      const segmentT = (t - segment1Ratio - segment2Ratio) / segment3Ratio
      pathX = cubicBezier(segmentT, 339.004, 417.423, 458.811, 469.703)
      pathY = cubicBezier(segmentT, 23, 23, 11, 5)
    }
    
    return { x: pathX, y: pathY }
  }, [value, maxValue])

  if (showOnlySVG) {
    // 只显示SVG部分，不显示标题和数值
    return (
      <div className="w-full h-full relative" style={{ minHeight: 0 }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 473 28" 
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`waveGradient-${title || 'wave'}`} x1="1.70264" y1="14" x2="469.703" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#BBADB7" stopOpacity="0"/>
              <stop offset="0.307692" stopColor="#978B94"/>
              <stop offset="0.509615" stopColor="#6E4764"/>
              <stop offset="0.706731" stopColor="#746B71"/>
              <stop offset="1" stopColor="#82797F" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* 使用从外部SVG文件加载的波浪路径 */}
          {svgPath && (
            <path 
              d={svgPath}
              stroke={`url(#waveGradient-${title || 'wave'})`}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* 数据点 - 实心圆圈，背景色和边框颜色都是#685563 */}
          <circle
            cx={dataPoint.x}
            cy={dataPoint.y}
            r="12"
            fill="#685563"
            stroke="#685563"
            strokeWidth="2"
          />
        </svg>
      </div>
    )
  }

  return (
    <div 
      className="w-full h-full relative"
      style={{
        backgroundColor: '#F6EDF3',
        borderRadius: `${toResponsiveWidth(10, containerWidth)}px`,
        padding: `${toResponsiveWidth(16, containerWidth)}px`,
      }}
    >
      {/* 标题 - 右上角 */}
      {title && (
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
      )}
      
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

      {/* 图表 - 使用SVG直接绘制波浪 */}
      <div className="w-full h-full flex items-center justify-center relative" style={{ minHeight: 0 }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 473 28" 
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`waveGradient-${title || 'wave'}`} x1="1.70264" y1="14" x2="469.703" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#BBADB7" stopOpacity="0"/>
              <stop offset="0.307692" stopColor="#978B94"/>
              <stop offset="0.509615" stopColor="#6E4764"/>
              <stop offset="0.706731" stopColor="#746B71"/>
              <stop offset="1" stopColor="#82797F" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* 使用从外部SVG文件加载的波浪路径 */}
          {svgPath && (
            <path 
              d={svgPath}
              stroke={`url(#waveGradient-${title || 'wave'})`}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* 数据点 - 实心圆圈，背景色和边框颜色都是#685563 */}
          <circle
            cx={dataPoint.x}
            cy={dataPoint.y}
            r="12"
            fill="#685563"
            stroke="#685563"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}
