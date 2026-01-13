import { useState, useEffect } from 'react'
import { RespirationRateChart } from './RespirationRateChart'
import { WaveChart } from './WaveChart'
import { GaugeChart } from './GaugeChart'
import { 
  fetchRespirationData, 
  RespirationData,
  fetchStressLevel,
  StressLevelData,
  fetchStressRecovery,
  StressRecoveryData,
  fetchAutonomicBalance,
  AutonomicBalanceData,
  fetchAutonomicActivity,
  AutonomicActivityData
} from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface EmotionModalProps {
  isOpen: boolean
  onClose: () => void
  topBarHeight: number
  sphereWidth: number
  containerWidth: number
  containerHeight: number
}

export const EmotionModal = ({ isOpen, onClose, topBarHeight, sphereWidth, containerWidth, containerHeight }: EmotionModalProps) => {
  const [respirationData, setRespirationData] = useState<RespirationData[]>([])
  const [stressLevel, setStressLevel] = useState<StressLevelData | null>(null)
  const [stressRecovery, setStressRecovery] = useState<StressRecoveryData | null>(null)
  const [autonomicBalance, setAutonomicBalance] = useState<AutonomicBalanceData | null>(null)
  const [autonomicActivity, setAutonomicActivity] = useState<AutonomicActivityData | null>(null)

  useEffect(() => {
    if (isOpen) {
      // 打开弹窗时加载所有数据
      Promise.all([
        fetchRespirationData(),
        fetchStressLevel(),
        fetchStressRecovery(),
        fetchAutonomicBalance(),
        fetchAutonomicActivity()
      ]).then(([respiration, stressLevelData, stressRecoveryData, autonomicBalanceData, autonomicActivityData]) => {
        setRespirationData(respiration)
        setStressLevel(stressLevelData)
        setStressRecovery(stressRecoveryData)
        setAutonomicBalance(autonomicBalanceData)
        setAutonomicActivity(autonomicActivityData)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  // 弹窗尺寸和位置（基于设计图 1179px 宽度）
  const modalWidth = toResponsiveWidth(1069, containerWidth)
  const modalHeight = toResponsiveHeight(1759, containerHeight)
  const modalLeft = toResponsiveWidth(57, containerWidth)
  const modalTop = toResponsiveHeight(400, containerHeight)
  const modalBorderRadius = toResponsiveWidth(100, containerWidth)
  const backdropBlur = toResponsiveWidth(12.5, containerWidth)
  
  // 关闭按钮尺寸和位置（基于设计图 1179px 宽度）
  // 弹窗：left: 57px, top: 400px, width: 1069px, height: 1759px
  // 弹窗底部：400 + 1759 = 2159px
  // 弹窗中心X：57 + 1069/2 = 591.5px
  // 
  // Ellipse 59（外圈）：104px × 104px, left: 535px, top: 2190px, border: 4px
  //   中心X：535 + 52 = 587px，相对于弹窗中心：587 - 591.5 = -4.5px
  //   中心Y：2190 + 52 = 2242px，相对于弹窗底部：2242 - 2159 = 83px（向上）
  //   底部Y：2190 + 104 = 2294px，相对于弹窗底部：2294 - 2159 = 135px（向上）
  // 
  // Vector（X线条）：9.37px × 54.11px，中心应该和外圈圆心对齐
  
  const outerCircleSize = toResponsiveWidth(104, containerWidth)
  const outerCircleBorder = toResponsiveWidth(4, containerWidth)
  const xLineWidth = toResponsiveWidth(9.37, containerWidth)
  const xLineHeight = toResponsiveWidth(54.11, containerWidth)
  
  // 外圈相对于弹窗底部的位置（向上为正）
  const outerCircleBottomFromModalBottom = toResponsiveHeight(2294 - 2159, containerHeight) // 135px
  const outerCircleCenterFromModalBottom = toResponsiveHeight(2242 - 2159, containerHeight) // 83px
  
  // 相对于弹窗中心的水平偏移（负值表示偏左）
  const outerCircleCenterXOffset = toResponsiveWidth(587 - 591.5, containerWidth) // -4.5px

  return (
    <TooltipProvider delayDuration={200}>
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
          className="w-full flex flex-col relative"
          style={{
            borderRadius: `${modalBorderRadius}px`,
            height: `${modalHeight}px`,
            background: 'linear-gradient(330.9deg, rgba(255, 255, 255, 0.86) 67.56%, rgba(246, 237, 243, 0.86) 94.65%)',
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
            overflow: 'visible',
            position: 'relative',
          }}
        >
          {/* 弹窗上半部分：呼吸率图表 */}
          <div className="flex-1" style={{ height: '50%', paddingLeft: '16px', paddingTop: '16px', paddingBottom: '16px', paddingRight: 0 }}>
            {respirationData.length > 0 && (
              <RespirationRateChart data={respirationData} containerWidth={containerWidth} containerHeight={containerHeight} />
            )}
          </div>
          
          {/* 弹窗下半部分：2x2网格 */}
          <div className="flex-1 p-4" style={{ height: '50%' }}>
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-4">
              {/* 左上：压力水平 - 占位div，实际内容用绝对定位覆盖 */}
              <div className="w-full h-full" style={{ visibility: 'hidden' }}>
                {/* 占位，保持grid布局 */}
              </div>
              
              {/* 右上：压力调节恢复能力 - 占位div，实际内容用绝对定位覆盖 */}
              <div className="w-full h-full" style={{ visibility: 'hidden' }}>
                {/* 占位，保持grid布局 */}
              </div>
              
              {/* 左下：自主神经平衡 - 占位div，实际内容用绝对定位覆盖 */}
              <div className="w-full h-full" style={{ visibility: 'hidden' }}>
                {/* 占位，保持grid布局 */}
              </div>
              
              {/* 右下：自主神经活性 - 占位div，实际内容用绝对定位覆盖 */}
              <div className="w-full h-full" style={{ visibility: 'hidden' }}>
                {/* 占位，保持grid布局 */}
              </div>
            </div>
            
            {/* 左上：压力水平 - 绝对定位，恢复原始位置 */}
            <div 
              style={{
                position: 'absolute',
                width: `${toResponsiveWidth(468, containerWidth)}px`,
                height: `${toResponsiveHeight(404, containerHeight)}px`,
                left: `${toResponsiveWidth(117 - 57, containerWidth)}px`, // 相对于弹窗：117 - 57 = 60px（恢复原始位置）
                top: `${toResponsiveHeight(1275 - 400, containerHeight)}px`, // 相对于弹窗：1275 - 400 = 875px（恢复原始位置）
                background: '#F6EDF3',
                borderRadius: `${toResponsiveWidth(60, containerWidth)}px`,
                padding: `${toResponsiveWidth(16, containerWidth)}px`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 左上角：SVG图标 - 距离框的left和top都是36px */}
              <div
                style={{
                  position: 'absolute',
                  width: `${toResponsiveWidth(106, containerWidth)}px`,
                  height: `${toResponsiveHeight(106, containerHeight)}px`,
                  left: `${toResponsiveWidth(36, containerWidth)}px`, // 距离框的left: 36px
                  top: `${toResponsiveHeight(36, containerHeight)}px`, // 距离框的top: 36px
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <img 
                  src="/stress-level-icon.svg" 
                  alt="压力水平图标"
                  width={toResponsiveWidth(106, containerWidth)}
                  height={toResponsiveHeight(106, containerHeight)}
                  style={{
                    objectFit: 'contain',
                  }}
                />
              </div>
              
              {/* 右上角：标题和Tips图标 - 中心与压力水平图标中心齐平 */}
              <div
                style={{
                  position: 'absolute',
                  right: `${toResponsiveWidth(16, containerWidth)}px`, // 距离框的right: 16px (padding)
                  top: `${toResponsiveHeight(36 + 106 / 2, containerHeight)}px`, // 与压力水平图标中心对齐：36 + 106/2 = 89px
                  transform: 'translateY(-50%)', // 垂直居中
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${toResponsiveWidth(8, containerWidth)}px`,
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: 'OPPO Sans 4.0',
                    fontWeight: 500,
                    fontStyle: 'normal',
                    fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    textAlign: 'right',
                    color: '#262024',
                  }}
                >
                  压力水平
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      style={{
                        width: `${toResponsiveWidth(48, containerWidth)}px`,
                        height: `${toResponsiveWidth(48, containerWidth)}px`,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg 
                        width={toResponsiveWidth(48, containerWidth)} 
                        height={toResponsiveWidth(48, containerWidth)} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="10" stroke="#B5A6B0" strokeWidth="2" fill="none"/>
                        <path d="M12 16V12M12 8H12.01" stroke="#B5A6B0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    borderRadius={toResponsiveWidth(30, containerWidth)}
                    containerWidth={containerWidth}
                  >
                    压力指数是累积的压力指数，用于衡量生活中处理各种事情引起的心理压力，以及身体长期暴露在负面因素中造成的生理压力。压力指数偏高代表压力水平上升，压力指数偏低代表压力水平下降，压力指数过低也代表交感神经活性减弱。
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 中间：WaveChart SVG部分 - 中心与EmotionModal中心对齐，保持在div框内，不覆盖其他元素 */}
              {stressLevel && (
                <div
                  style={{
                    position: 'absolute',
                    // 计算wavechart位置，使其中心与EmotionModal中心对齐
                    // 原始设计图：modalHeight = 1759px, 指标框top = 875px (相对于modal顶部)
                    // Modal中心Y = 1759 / 2 = 879.5px (相对于modal顶部)
                    // Modal中心相对于指标框顶部 = 879.5 - 875 = 4.5px
                    // 图标区域：top: 36px, height: 106px，占据 36px-142px
                    // 数字区域：bottom: 62px, 字体约96px，占据底部约158px区域
                    // 可用区域：图标下方162px到数字上方246px之间
                    // 可用空间中心约204px，但Modal中心在4.5px（会被图标覆盖）
                    // 解决方案：让wavechart在可用空间内，但尽量将其中心对齐到Modal中心位置
                    // 如果Modal中心(4.5px)在可用区域内，就用它；否则用可用区域中心
                    left: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    right: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    // 计算wavechart高度和位置，使其中心尽量对齐Modal中心(4.5px)，但不覆盖图标
                    // 图标底部：36 + 106 = 142px，需要至少留20px间距，所以wavechart顶部至少162px
                    // 数字顶部：404 - 62 - 96 = 246px，需要至少留20px间距，所以wavechart底部最多226px
                    // 可用高度：226 - 162 = 64px，但这样太小了
                    // 重新计算：如果wavechart中心要对齐到4.5px，而高度为H，那么top = 4.5 - H/2
                    // 但如果4.5 - H/2 < 162，那么会被图标覆盖，所以至少top = 162
                    // 如果wavechart高度为100px，center在4.5px，那么top = 4.5 - 50 = -45.5px（不可行）
                    // 所以只能让wavechart在可用空间内，尽量接近Modal中心
                    // 可用空间：从162px到226px，中心在194px
                    // 为了让wavechart中心尽量接近4.5px，但又不能覆盖图标，我们让wavechart尽可能往上，但不覆盖图标
                    // 最简单方案：在可用空间内居中
                    top: `${toResponsiveHeight(162, containerHeight)}px`, // 图标下方
                    bottom: `${toResponsiveHeight(62 + 96, containerHeight)}px`, // 数字上方
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 0,
                  }}
                >
                  <WaveChart 
                    value={stressLevel.value}
                    containerWidth={containerWidth}
                    showOnlySVG={true}
                  />
                </div>
              )}
              
              {/* 底部：指标数字 - 距离div框的left和bottom各48px */}
              {stressLevel && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${toResponsiveWidth(48, containerWidth)}px`, // 距离div框的left: 48px
                    bottom: `${toResponsiveHeight(48, containerHeight)}px`, // 距离div框的bottom: 48px
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(96, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: '#262024',
                    }}
                  >
                    {stressLevel.value}
                  </span>
                </div>
              )}
            </div>
            
            {/* 右上：压力调节恢复能力 - 绝对定位，恢复原始位置 */}
            <div 
              style={{
                position: 'absolute',
                width: `${toResponsiveWidth(468, containerWidth)}px`,
                height: `${toResponsiveHeight(404, containerHeight)}px`,
                left: `${toResponsiveWidth(117 - 57 + 468 + 16, containerWidth)}px`, // 相对于弹窗：压力水平框left(60px) + width(468px) + gap(16px) = 544px（恢复原始位置）
                top: `${toResponsiveHeight(1275 - 400, containerHeight)}px`, // 与压力水平框top对齐：1275 - 400 = 875px（恢复原始位置）
                background: '#F7F3F6',
                borderRadius: `${toResponsiveWidth(60, containerWidth)}px`,
                padding: `${toResponsiveWidth(16, containerWidth)}px`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 左上角：SVG图标 - 中心与压力水平图标中心齐平 */}
              <div
                style={{
                  position: 'absolute',
                  width: `${toResponsiveWidth(74, containerWidth)}px`,
                  height: `${toResponsiveHeight(74, containerHeight)}px`,
                  left: `${toResponsiveWidth(36, containerWidth)}px`, // 距离框的left: 36px
                  top: `${toResponsiveHeight(36 + 106 / 2 - 74 / 2, containerHeight)}px`, // 与压力水平图标中心对齐：36 + 106/2 - 74/2 = 36 + 53 - 37 = 52px
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <img 
                  src="/stress-recovery-icon.svg" 
                  alt="压力调节恢复能力图标"
                  width={toResponsiveWidth(74, containerWidth)}
                  height={toResponsiveHeight(74, containerHeight)}
                  style={{
                    objectFit: 'contain',
                  }}
                />
              </div>
              
              {/* 右上角：标题和Tips图标 - 中心与压力水平图标中心齐平 */}
              <div
                style={{
                  position: 'absolute',
                  right: `${toResponsiveWidth(16, containerWidth)}px`, // 距离框的right: 16px (padding)
                  top: `${toResponsiveHeight(36 + 106 / 2, containerHeight)}px`, // 与压力水平图标中心对齐：36 + 106/2 = 89px
                  transform: 'translateY(-50%)', // 垂直居中
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${toResponsiveWidth(8, containerWidth)}px`,
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    lineHeight: '100%',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      textAlign: 'right',
                      color: '#262024',
                    }}
                  >
                    压力调节
                  </span>
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      textAlign: 'right',
                      color: '#262024',
                    }}
                  >
                    恢复能力
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      style={{
                        width: `${toResponsiveWidth(48, containerWidth)}px`,
                        height: `${toResponsiveWidth(48, containerWidth)}px`,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg 
                        width={toResponsiveWidth(48, containerWidth)} 
                        height={toResponsiveWidth(48, containerWidth)} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="10" stroke="#B5A6B0" strokeWidth="2" fill="none"/>
                        <path d="M12 16V12M12 8H12.01" stroke="#B5A6B0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="end"
                    borderRadius={toResponsiveWidth(30, containerWidth)}
                    containerWidth={containerWidth}
                  >
                    压力调节恢复能力提示信息
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 中间：WaveChart SVG部分 - 中心与EmotionModal中心对齐，保持在div框内，不覆盖其他元素 */}
              {stressRecovery && (
                <div
                  style={{
                    position: 'absolute',
                    // 计算wavechart位置，使其中心与EmotionModal中心对齐
                    // 原始设计图：modalHeight = 1759px, 指标框top = 875px (相对于modal顶部)
                    // Modal中心Y = 1759 / 2 = 879.5px (相对于modal顶部)
                    // Modal中心相对于指标框顶部 = 879.5 - 875 = 4.5px
                    // 图标区域：top约52px（中心对齐压力水平图标），height: 74px，占据约52px-126px
                    // 数字区域：bottom: 62px, 字体约96px，占据底部约158px区域
                    // 可用区域：图标下方约146px到数字上方约246px之间
                    left: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    right: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    top: `${toResponsiveHeight(146, containerHeight)}px`, // 图标下方
                    bottom: `${toResponsiveHeight(62 + 96, containerHeight)}px`, // 数字上方
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 0,
                  }}
                >
                  <WaveChart 
                    value={stressRecovery.value}
                    containerWidth={containerWidth}
                    showOnlySVG={true}
                  />
                </div>
              )}
              
              {/* 底部：指标数字 - 距离div框的left和bottom各48px */}
              {stressRecovery && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${toResponsiveWidth(48, containerWidth)}px`, // 距离div框的left: 48px
                    bottom: `${toResponsiveHeight(48, containerHeight)}px`, // 距离div框的bottom: 48px
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(96, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: '#262024',
                    }}
                  >
                    {stressRecovery.value}
                  </span>
                </div>
              )}
            </div>
            
            {/* 左下：自主神经平衡 - 绝对定位，left与压力水平对齐，位于压力水平下方 */}
            <div 
              style={{
                position: 'absolute',
                width: `${toResponsiveWidth(468, containerWidth)}px`,
                height: `${toResponsiveHeight(404, containerHeight)}px`,
                left: `${toResponsiveWidth(117 - 57, containerWidth)}px`, // 与压力水平div的left对齐：60px
                // 压力水平div的top是875px，高度404px，底部是875+404=1279px
                // 压力水平与压力调节恢复能力之间的水平间距是16px（gap）
                // 所以垂直间距也应该是16px
                // 新div的top = 1279 + 16 = 1295px
                top: `${toResponsiveHeight(1275 - 400 + 404 + 16, containerHeight)}px`, // 875 + 404 + 16 = 1295px
                background: '#F7F3F6',
                borderRadius: `${toResponsiveWidth(60, containerWidth)}px`,
                padding: `${toResponsiveWidth(16, containerWidth)}px`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 左上角：SVG图标 - 使用automatic-balance-icon.svg，距离框的left和top都是36px */}
              <div
                style={{
                  position: 'absolute',
                  width: `${toResponsiveWidth(74, containerWidth)}px`,
                  height: `${toResponsiveHeight(74, containerHeight)}px`,
                  left: `${toResponsiveWidth(36, containerWidth)}px`, // 距离框的left: 36px
                  top: `${toResponsiveHeight(36, containerHeight)}px`, // 距离框的top: 36px
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2, // 最上层，在GaugeChart上方
                }}
              >
                <img 
                  src="/automatic-balance-icon.svg" 
                  alt="自主神经平衡图标"
                  width={toResponsiveWidth(74, containerWidth)}
                  height={toResponsiveHeight(74, containerHeight)}
                  style={{
                    objectFit: 'contain',
                  }}
                />
              </div>
              
              {/* 右上角：标题和Tips图标 - 中心与图标中心齐平 */}
              <div
                style={{
                  position: 'absolute',
                  right: `${toResponsiveWidth(16, containerWidth)}px`, // 距离框的right: 16px (padding)
                  top: `${toResponsiveHeight(36 + 74 / 2, containerHeight)}px`, // 与图标中心对齐：36 + 74/2 = 73px
                  transform: 'translateY(-50%)', // 垂直居中
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${toResponsiveWidth(8, containerWidth)}px`,
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: 'OPPO Sans 4.0',
                    fontWeight: 500,
                    fontStyle: 'normal',
                    fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    textAlign: 'right',
                    color: '#262024',
                  }}
                >
                  自主神经平衡
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      style={{
                        width: `${toResponsiveWidth(48, containerWidth)}px`,
                        height: `${toResponsiveWidth(48, containerWidth)}px`,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg 
                        width={toResponsiveWidth(48, containerWidth)} 
                        height={toResponsiveWidth(48, containerWidth)} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="10" stroke="#B5A6B0" strokeWidth="2" fill="none"/>
                        <path d="M12 16V12M12 8H12.01" stroke="#B5A6B0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    borderRadius={toResponsiveWidth(30, containerWidth)}
                    containerWidth={containerWidth}
                  >
                    自主神经平衡提示信息
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 中间：GaugeChart部分 - 在div内上下居中，z-index设置为中间层 */}
              {autonomicBalance && (
                <div
                  style={{
                    position: 'absolute',
                    // 还原GaugeChart的原始尺寸：viewBox是364x95，所以给它足够的空间
                    // 原始设计：GaugeChart宽度364px，高度95px
                    left: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    right: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    // 上下居中：使用top: 50%和transform实现垂直居中，往上移动10px
                    top: '50%',
                    transform: `translateY(calc(-50% - ${toResponsiveHeight(10, containerHeight)}px))`,
                    height: `${toResponsiveHeight(95, containerHeight)}px`, // GaugeChart的原始高度
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1, // 中间层：在背景上方，但在图标/标题/数字下方
                  }}
                >
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <GaugeChart 
                      title="" 
                      value={autonomicBalance.value}
                      decimalPlaces={1}
                      minValue={0.1}
                      maxValue={5.0}
                      valueFontSize={toResponsiveWidth(24, containerWidth)}
                      unitFontSize={toResponsiveWidth(6, containerWidth)}
                      containerWidth={containerWidth}
                      showOnlySVG={true}
                    />
                  </div>
                </div>
              )}
              
              {/* 底部：指标数字 - 距离div框的left和bottom各48px */}
              {autonomicBalance && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${toResponsiveWidth(48, containerWidth)}px`, // 距离div框的left: 48px
                    bottom: `${toResponsiveHeight(48, containerHeight)}px`, // 距离div框的bottom: 48px
                    zIndex: 2, // 最上层，在GaugeChart上方
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(96, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: '#262024',
                    }}
                  >
                    {autonomicBalance.value.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            
            {/* 右下：自主神经活性 - 绝对定位，left与压力调节恢复能力对齐，与自主神经平衡top对齐 */}
            <div 
              style={{
                position: 'absolute',
                width: `${toResponsiveWidth(468, containerWidth)}px`,
                height: `${toResponsiveHeight(404, containerHeight)}px`,
                left: `${toResponsiveWidth(117 - 57 + 468 + 16, containerWidth)}px`, // 与压力调节恢复能力div的left对齐：544px
                // 与自主神经平衡div的top对齐，使它们在同一水平线上
                top: `${toResponsiveHeight(1275 - 400 + 404 + 16, containerHeight)}px`, // 875 + 404 + 16 = 1295px
                background: '#F6EDF3',
                borderRadius: `${toResponsiveWidth(60, containerWidth)}px`,
                padding: `${toResponsiveWidth(16, containerWidth)}px`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 左上角：SVG图标 - 使用stress-recovery-icon.svg，距离框的left和top都是36px */}
              <div
                style={{
                  position: 'absolute',
                  width: `${toResponsiveWidth(74, containerWidth)}px`,
                  height: `${toResponsiveHeight(74, containerHeight)}px`,
                  left: `${toResponsiveWidth(36, containerWidth)}px`, // 距离框的left: 36px
                  top: `${toResponsiveHeight(36, containerHeight)}px`, // 距离框的top: 36px
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2, // 最上层，在GaugeChart上方
                }}
              >
                <img 
                  src="/automatic-neural-activity.svg" 
                  alt="自主神经活性图标"
                  width={toResponsiveWidth(74, containerWidth)}
                  height={toResponsiveHeight(74, containerHeight)}
                  style={{
                    objectFit: 'contain',
                  }}
                />
              </div>
              
              {/* 右上角：标题和Tips图标 - 中心与图标中心齐平 */}
              <div
                style={{
                  position: 'absolute',
                  right: `${toResponsiveWidth(16, containerWidth)}px`, // 距离框的right: 16px (padding)
                  top: `${toResponsiveHeight(36 + 74 / 2, containerHeight)}px`, // 与图标中心对齐：36 + 74/2 = 73px
                  transform: 'translateY(-50%)', // 垂直居中
                  display: 'flex',
                  alignItems: 'center',
                  gap: `${toResponsiveWidth(8, containerWidth)}px`,
                  zIndex: 2, // 最上层，在GaugeChart上方
                }}
              >
                <span
                  style={{
                    fontFamily: 'OPPO Sans 4.0',
                    fontWeight: 500,
                    fontStyle: 'normal',
                    fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    textAlign: 'right',
                    color: '#262024',
                  }}
                >
                  自主神经活性
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      style={{
                        width: `${toResponsiveWidth(48, containerWidth)}px`,
                        height: `${toResponsiveWidth(48, containerWidth)}px`,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg 
                        width={toResponsiveWidth(48, containerWidth)} 
                        height={toResponsiveWidth(48, containerWidth)} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="10" stroke="#B5A6B0" strokeWidth="2" fill="none"/>
                        <path d="M12 16V12M12 8H12.01" stroke="#B5A6B0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="end"
                    borderRadius={toResponsiveWidth(30, containerWidth)}
                    containerWidth={containerWidth}
                  >
                    自主神经活性提示信息
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 中间：GaugeChart部分 - 在div内上下居中，z-index设置为中间层 */}
              {autonomicActivity && (
                <div
                  style={{
                    position: 'absolute',
                    // 还原GaugeChart的原始尺寸：viewBox是364x95，所以给它足够的空间
                    // 原始设计：GaugeChart宽度364px，高度95px
                    left: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    right: `${toResponsiveWidth(16, containerWidth)}px`, // padding
                    // 上下居中：使用top: 50%和transform实现垂直居中，往上移动10px
                    top: '50%',
                    transform: `translateY(calc(-50% - ${toResponsiveHeight(10, containerHeight)}px))`,
                    height: `${toResponsiveHeight(95, containerHeight)}px`, // GaugeChart的原始高度
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1, // 中间层：在背景上方，但在图标/标题/数字下方
                  }}
                >
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <GaugeChart 
                      title="" 
                      value={autonomicActivity.value}
                      valueFontSize={toResponsiveWidth(24, containerWidth)}
                      unitFontSize={toResponsiveWidth(6, containerWidth)}
                      containerWidth={containerWidth}
                      showOnlySVG={true}
                    />
                  </div>
                </div>
              )}
              
              {/* 底部：指标数字 - 距离div框的left和bottom各48px */}
              {autonomicActivity && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${toResponsiveWidth(48, containerWidth)}px`, // 距离div框的left: 48px
                    bottom: `${toResponsiveHeight(48, containerHeight)}px`, // 距离div框的bottom: 48px
                    zIndex: 2, // 最上层，在GaugeChart上方
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'OPPO Sans 4.0',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: `${toResponsiveWidth(96, containerWidth)}px`,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: '#262024',
                    }}
                  >
                    {autonomicActivity.value}
                  </span>
                </div>
              )}
            </div>
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
    </TooltipProvider>
  )
}

