import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface BridgeConnectorProps {
  selectedDate: string | null
  left: number // 左侧位置（相对于容器）
  width: number // 宽度（保留用于计算位置，但实际宽度使用固定值）
  calendarBottom: number // 情绪日历框的底部位置
  recordTop: number // 情绪记录框的顶部位置（保留用于未来可能的使用，但当前未使用）
  containerWidth?: number
  containerHeight?: number
}

export const BridgeConnector = ({ 
  selectedDate, 
  left, 
  calendarBottom, 
  containerWidth = 1179,
  containerHeight = 2556,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  width: _width,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordTop: _recordTop,
}: BridgeConnectorProps) => {
  if (!selectedDate) return null

  // 桥接组件尺寸：60px × 60px，left: 705.78px（响应式）
  const bridgeWidth = toResponsiveWidth(60, containerWidth)
  const bridgeHeight = toResponsiveHeight(60, containerHeight)
  const bridgeLeft = toResponsiveWidth(705.78, containerWidth)
  
  // 凹陷半径（响应式）- 根据 SVG，凹陷是半圆形，半径约为桥接组件宽度的一半
  const indentRadius = toResponsiveWidth(30, containerWidth) // 60px / 2 = 30px

  // 阴影参数（响应式，根据 SVG filter）
  const shadowOffsetX = toResponsiveWidth(5, containerWidth)
  const shadowOffsetY = toResponsiveWidth(6, containerHeight)
  const shadowBlur = toResponsiveWidth(17.5, containerWidth) // stdDeviation="17.5"
  const shadowOpacity = 0.13

  // 计算相对于容器的位置（容器从 1541px 开始）
  const bridgeTopRelative = toResponsiveHeight(2046, containerHeight) - toResponsiveHeight(1541, containerHeight) // 2046 - 1541 = 505px

  // 构建 SVG 路径：矩形，左右两边有半圆形凹陷
  // 路径从左上角开始，顺时针绘制
  const pathData = `
    M 0,0
    L ${bridgeWidth},0
    L ${bridgeWidth},${bridgeHeight}
    L 0,${bridgeHeight}
    Z
    M 0,${bridgeHeight / 2}
    A ${indentRadius},${indentRadius} 0 0 1 0,${bridgeHeight / 2 - indentRadius}
    A ${indentRadius},${indentRadius} 0 0 1 0,${bridgeHeight / 2}
    M ${bridgeWidth},${bridgeHeight / 2}
    A ${indentRadius},${indentRadius} 0 0 0 ${bridgeWidth},${bridgeHeight / 2 - indentRadius}
    A ${indentRadius},${indentRadius} 0 0 0 ${bridgeWidth},${bridgeHeight / 2}
  `.trim()

  return (
    <div 
      className="absolute"
      style={{
        left: `${bridgeLeft}px`,
        width: `${bridgeWidth}px`,
        height: `${bridgeHeight}px`,
        zIndex: 20, // 提高 zIndex，确保显示在所有元素之上
        top: `${bridgeTopRelative}px`,
        pointerEvents: 'none', // 不阻挡鼠标事件
      }}
    >
      <svg
        width={bridgeWidth}
        height={bridgeHeight}
        viewBox={`0 0 ${bridgeWidth} ${bridgeHeight}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Drop shadow filter - 根据 SVG 中的 filter */}
          <filter id={`bridgeFilter-${selectedDate}`} x="-50%" y="-50%" width="200%" height="200%">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix 
              in="SourceAlpha" 
              type="matrix" 
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" 
              result="hardAlpha"
            />
            <feOffset dx={shadowOffsetX} dy={shadowOffsetY}/>
            <feGaussianBlur stdDeviation={shadowBlur}/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix 
              type="matrix" 
              values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${shadowOpacity} 0`}
            />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
          
          {/* Mask for creating the indentations - 使用半圆从左右两边切入 */}
          <mask id={`bridgeMask-${selectedDate}`}>
            <rect width="100%" height="100%" fill="white" />
            {/* 左侧凹陷的半圆 - 从左边切入 */}
            <circle 
              cx={-indentRadius} 
              cy={bridgeHeight / 2} 
              r={indentRadius} 
              fill="black" 
            />
            {/* 右侧凹陷的半圆 - 从右边切入 */}
            <circle 
              cx={bridgeWidth + indentRadius} 
              cy={bridgeHeight / 2} 
              r={indentRadius} 
              fill="black" 
            />
          </mask>
        </defs>
        
        {/* 主形状 - 矩形，通过 mask 创建凹陷 */}
        <rect
          width="100%"
          height="100%"
          fill="#FBF7F9"
          filter={`url(#bridgeFilter-${selectedDate})`}
          mask={`url(#bridgeMask-${selectedDate})`}
        />
      </svg>
    </div>
  )
}

