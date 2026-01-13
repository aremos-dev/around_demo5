import { useEffect } from 'react'
import type { BreathingTrainingRecord } from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface BreathingReportModalProps {
  isOpen: boolean
  onClose: () => void
  record: BreathingTrainingRecord | null
  topBarHeight: number
  sphereWidth: number
  containerWidth: number
  containerHeight: number
}

// 固定的五个维度（顺时针）
const RADAR_DIMENSIONS = [
  '呼吸率',
  '压力水平',
  '自主神经活性',
  '自主神经平衡',
  '压力调节恢复能力',
]

// 根据综合得分生成五个维度的轮廓（0~1），做轻微差异
const getRadarValues = (score: number): number[] => {
  const base = score / 100
  const clamp = (v: number) => Math.max(0.25, Math.min(1, v))
  return [
    clamp(base + 0.1),   // 呼吸率
    clamp(base - 0.05),  // 压力水平
    clamp(base + 0.05),  // 自主神经活性
    clamp(base),         // 自主神经平衡
    clamp(base + 0.02),  // 压力调节恢复能力
  ]
}

// 生成雷达图多边形路径
const buildRadarPath = (values: number[], radius: number, cx: number, cy: number): string => {
  const angleStep = (Math.PI * 2) / values.length
  let d = ''
  values.forEach((v, i) => {
    const angle = -Math.PI / 2 + i * angleStep
    const r = radius * v
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `
  })
  d += 'Z'
  return d
}

export const BreathingReportModal = ({
  isOpen,
  onClose,
  record,
  topBarHeight,
  sphereWidth,
  containerWidth,
  containerHeight,
}: BreathingReportModalProps) => {
  // 未打开或没有选中记录时不渲染
  if (!isOpen || !record) return null

  // 弹窗尺寸和位置（基于设计图 1179px 宽度）
  const modalWidth = toResponsiveWidth(1069, containerWidth)
  const modalHeight = toResponsiveHeight(1759, containerHeight)
  const modalLeft = toResponsiveWidth(57, containerWidth)
  const modalTop = toResponsiveHeight(400, containerHeight)
  // 弹窗圆角样式：左上角 300px，其他角 100px（响应式）- 与 ProfileModal 保持一致
  const modalBorderRadiusTopLeft = toResponsiveWidth(300, containerWidth)
  const modalBorderRadiusOther = toResponsiveWidth(100, containerWidth)
  const modalBorderRadius = `${modalBorderRadiusTopLeft}px ${modalBorderRadiusOther}px ${modalBorderRadiusOther}px ${modalBorderRadiusOther}px`
  const backdropBlur = toResponsiveWidth(12.5, containerWidth)
  
  // 返回按钮样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 172px, top: 509px (相对于主界面)
  // 弹窗位置：left: 57px, top: 400px (相对于主界面)
  // 转换为相对于弹窗的位置：left: 172 - 57 = 115px, top: 509 - 400 = 109px
  const backButtonSize = toResponsiveWidth(151, containerWidth)
  const backButtonLeft = toResponsiveWidth(172 - 57, containerWidth) // 115px 相对于弹窗
  const backButtonTop = toResponsiveHeight(509 - 400, containerHeight) // 109px 相对于弹窗
  const backButtonShadowY = toResponsiveWidth(4, containerWidth)
  const backButtonShadowBlur = toResponsiveWidth(35, containerWidth)
  
  // 标题样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 430px, top: 555px (相对于主界面)
  // 转换为相对于弹窗：left: 430 - 57 = 373px, top: 555 - 400 = 155px
  const titleWidth = toResponsiveWidth(320, containerWidth)
  const titleHeight = toResponsiveHeight(84, containerHeight)
  const titleLeft = toResponsiveWidth(430 - 57, containerWidth) // 373px 相对于弹窗
  const titleTop = toResponsiveHeight(555 - 400, containerHeight) // 155px 相对于弹窗
  const titleFontSize = toResponsiveWidth(52, containerWidth)
  const titleLineHeight = toResponsiveHeight(61, containerHeight)
  
  // 分数样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 496px, top: 745px (相对于主界面)
  // 转换为相对于弹窗：left: 496 - 57 = 439px, top: 745 - 400 = 345px
  const scoreWidth = toResponsiveWidth(187, containerWidth)
  const scoreHeight = toResponsiveHeight(173, containerHeight)
  const scoreLeft = toResponsiveWidth(496 - 57, containerWidth) // 439px 相对于弹窗
  const scoreTop = toResponsiveHeight(745 - 400, containerHeight) // 345px 相对于弹窗
  const scoreFontSize = toResponsiveWidth(140, containerWidth)
  const scoreLineHeight = toResponsiveHeight(164, containerHeight)
  
  // "分"标签样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 683px, top: 844px (相对于主界面)
  // 转换为相对于弹窗：left: 683 - 57 = 626px, top: 844 - 400 = 444px
  const scoreLabelWidth = toResponsiveWidth(56, containerWidth)
  const scoreLabelHeight = toResponsiveHeight(42, containerHeight)
  const scoreLabelLeft = toResponsiveWidth(683 - 57, containerWidth) // 626px 相对于弹窗
  const scoreLabelTop = toResponsiveHeight(844 - 400, containerHeight) // 444px 相对于弹窗
  const scoreLabelFontSize = toResponsiveWidth(32, containerWidth)
  const scoreLabelLineHeight = toResponsiveHeight(38, containerHeight)
  
  // 鼓励标语样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 240px, top: 923px (相对于主界面)
  // 转换为相对于弹窗：left: 240 - 57 = 183px, top: 923 - 400 = 523px
  const encouragementWidth = toResponsiveWidth(700, containerWidth)
  const encouragementHeight = toResponsiveHeight(76, containerHeight)
  const encouragementLeft = toResponsiveWidth(240 - 57, containerWidth) // 183px 相对于弹窗
  const encouragementTop = toResponsiveHeight(923 - 400, containerHeight) // 523px 相对于弹窗
  const encouragementFontSize = toResponsiveWidth(40, containerWidth)
  const encouragementLineHeight = toResponsiveHeight(47, containerHeight)
  
  // 蛛网图样式（基于设计图 1179px * 2556px）
  // 原始位置：top: 1206px (相对于主界面)
  // 弹窗位置：top: 400px (相对于主界面)
  // 转换为相对于弹窗：top: 1206 - 400 = 806px
  // 再向上移动 100px（两次各 50px）
  const radarTop = toResponsiveHeight(1206 - 400 - 100, containerHeight) // 706px 相对于弹窗
  
  // 关闭按钮尺寸和位置（基于设计图 1179px 宽度）
  const outerCircleSize = toResponsiveWidth(104, containerWidth)
  const outerCircleBorder = toResponsiveWidth(4, containerWidth)
  const xLineWidth = toResponsiveWidth(9.37, containerWidth)
  const xLineHeight = toResponsiveWidth(54.11, containerWidth)
  const outerCircleBottomFromModalBottom = toResponsiveHeight(2294 - 2159, containerHeight) // 135px
  const outerCircleCenterXOffset = toResponsiveWidth(587 - 591.5, containerWidth) // -4.5px

  // 进入时记录一次日志，便于确认“跳转到详情页”已发生
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'post-fix',
        hypothesisId:'breathing-report-open',
        location:'BreathingReportModal.tsx:useEffect:open',
        message:'Breathing report modal opened',
        data:{ id:record.id, score:record.score, duration:record.duration },
        timestamp:Date.now(),
      })
    }).catch(()=>{})
    // #endregion
  }, [record])

  return (
    <>
      {/* 蒙板背景 */}
      <div
        className="absolute inset-0 z-50"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => {
          // 点击蒙板区域不关闭弹窗，只点击关闭按钮/返回才关闭
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
        <div
          className="w-full flex flex-col overflow-hidden"
          style={{
            borderRadius: modalBorderRadius,
            height: `${modalHeight}px`,
            background: 'rgba(246, 237, 243, 0.86)',
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
          }}
        >
          {/* 返回按钮 - 绝对定位 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              width: `${backButtonSize}px`,
              height: `${backButtonSize}px`,
              left: `${backButtonLeft}px`,
              top: `${backButtonTop}px`,
              background: '#FFFFFF',
              boxShadow: `0px ${backButtonShadowY}px ${backButtonShadowBlur}px rgba(0, 0, 0, 0.12)`,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {/* 返回箭头图标 */}
            <svg
              width="60%"
              height="60%"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="#262024"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* 标题 */}
          <div
            style={{
              position: 'absolute',
              width: `${titleWidth}px`,
              height: `${titleHeight}px`,
              left: `${titleLeft}px`,
              top: `${titleTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: `${titleFontSize}px`,
              lineHeight: `${titleLineHeight}px`,
              textAlign: 'center',
              color: '#262024',
            }}
          >
            呼吸训练报告
          </div>

          {/* 分数 */}
          <div
            style={{
              position: 'absolute',
              width: `${scoreWidth}px`,
              height: `${scoreHeight}px`,
              left: `${scoreLeft}px`,
              top: `${scoreTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 300,
              fontSize: `${scoreFontSize}px`,
              lineHeight: `${scoreLineHeight}px`,
              textAlign: 'center',
              color: '#262024',
            }}
          >
            {record.score}
          </div>

          {/* "分"标签 */}
          <div
            style={{
              position: 'absolute',
              width: `${scoreLabelWidth}px`,
              height: `${scoreLabelHeight}px`,
              left: `${scoreLabelLeft}px`,
              top: `${scoreLabelTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: `${scoreLabelFontSize}px`,
              lineHeight: `${scoreLabelLineHeight}px`,
              color: '#82797F',
            }}
          >
            分
          </div>

          {/* 鼓励标语 */}
          <div
            style={{
              position: 'absolute',
              width: `${encouragementWidth}px`,
              height: `${encouragementHeight}px`,
              left: `${encouragementLeft}px`,
              top: `${encouragementTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: `${encouragementFontSize}px`,
              lineHeight: `${encouragementLineHeight}px`,
              textAlign: 'center',
              color: '#262024',
            }}
          >
            你的状态很好，继续保持吧～
          </div>

          {/* 雷达图区域 - 绝对定位 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: `${radarTop}px`,
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '320px',
              paddingLeft: `${toResponsiveWidth(40, containerWidth)}px`,
              paddingRight: `${toResponsiveWidth(40, containerWidth)}px`,
            }}
          >
            <svg
              viewBox="0 0 200 200"
              className="w-full"
            >
              <defs>
                {/* 雷达图面积颜色 */}
              </defs>

              {/* 蜘蛛网背景多边形 */}
              {[0.25, 0.5, 0.75, 1].map((level, idx) => (
                <path
                  key={level}
                  d={buildRadarPath(new Array(RADAR_DIMENSIONS.length).fill(level), 70, 100, 100)}
                  fill="none"
                  stroke="rgba(209, 213, 219, 0.7)"
                  strokeWidth={idx === 3 ? 1.2 : 0.6}
                />
              ))}

              {/* 轴线 */}
              {RADAR_DIMENSIONS.map((_, i) => {
                const angle = -Math.PI / 2 + i * ((Math.PI * 2) / RADAR_DIMENSIONS.length)
                const x = 100 + 70 * Math.cos(angle)
                const y = 100 + 70 * Math.sin(angle)
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2={x}
                    y2={y}
                    stroke="rgba(209, 213, 219, 0.7)"
                    strokeWidth="0.8"
                  />
                )
              })}

              {/* 维度标签 */}
              {RADAR_DIMENSIONS.map((label, i) => {
                const angle = -Math.PI / 2 + i * ((Math.PI * 2) / RADAR_DIMENSIONS.length)
                let r = 86
                let x = 100 + r * Math.cos(angle)
                let y = 100 + r * Math.sin(angle)
                
                // "压力调节恢复能力"（左上角，i=4）和"压力水平"（右上角，i=1）需要调整位置
                const isLeftCorner = label === '压力调节恢复能力' // 左上角
                const isRightCorner = label === '压力水平' // 右上角
                const titleHeight = toResponsiveHeight(42, containerHeight)
                
                if (isLeftCorner || isRightCorner) {
                  // 保持较小的半径，确保在SVG框内
                  r = 86
                  x = 100 + r * Math.cos(angle)
                  y = 100 + r * Math.sin(angle)
                  // 向下移动两个标题高度的距离（84px），避免和线条重合
                  y += titleHeight * 2
                }
                
                // "压力调节恢复能力"需要分成两行
                const isLongLabel = label === '压力调节恢复能力'
                const labelParts = isLongLabel ? ['压力调节', '恢复能力'] : [label]
                
                return (
                  <g key={label}>
                    {labelParts.map((part, partIndex) => {
                      const offsetY = isLongLabel ? (partIndex - 0.5) * titleHeight : 0
                      return (
                        <text
                          key={partIndex}
                          x={x}
                          y={y + offsetY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#82797F"
                          style={{
                            fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontWeight: 500,
                            fontStyle: 'normal',
                            fontSize: `${toResponsiveWidth(36, containerWidth)}px`,
                            lineHeight: `${titleHeight}px`,
                            textAlign: 'center',
                          }}
                        >
                          {part}
                        </text>
                      )
                    })}
                  </g>
                )
              })}

              {/* 数据多边形与顶点 */}
              {(() => {
                const values = getRadarValues(record.score)
                const path = buildRadarPath(values, 70, 100, 100)
                const angleStep = (Math.PI * 2) / RADAR_DIMENSIONS.length
                return (
                  <>
                    <path
                      d={path}
                      fill="rgba(194, 227, 255, 0.61)"
                      stroke="#60A5FA"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    {values.map((v, i) => {
                      const angle = -Math.PI / 2 + i * angleStep
                      const r = 70 * v
                      const x = 100 + r * Math.cos(angle)
                      const y = 100 + r * Math.sin(angle)
                      const pointSize = toResponsiveWidth(22.92, containerWidth)
                      const pointBorderWidth = toResponsiveWidth(4, containerWidth)
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r={pointSize / 2}
                          fill="#F6EDF3"
                          stroke="#6CAADF"
                          strokeWidth={pointBorderWidth}
                        />
                      )
                    })}
                  </>
                )
              })()}
            </svg>
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

