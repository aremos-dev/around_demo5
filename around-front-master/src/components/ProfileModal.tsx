import { useState, useEffect } from 'react'
import { fetchBreathingTrainingRecords, BreathingTrainingRecord } from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight, toResponsive } from '../hooks/useContainerSize'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  topBarHeight: number
  sphereWidth: number
  containerWidth: number
  containerHeight: number
  onRecordClick?: (record: BreathingTrainingRecord) => void
}

export const ProfileModal = ({ isOpen, onClose, topBarHeight, sphereWidth, containerWidth, containerHeight, onRecordClick }: ProfileModalProps) => {
  const [records, setRecords] = useState<BreathingTrainingRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BreathingTrainingRecord | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetchBreathingTrainingRecords().then((data) => {
        setRecords(data)
        setIsLoading(false)
      })
    }
  }, [isOpen])

  // 当选中记录变化时，记录一次“详情视图打开”的日志，便于确认“跳转”逻辑是否触发
  useEffect(() => {
    if (selectedRecord) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'post-fix',
          hypothesisId:'breathing-detail-open',
          location:'ProfileModal.tsx:useEffect:selectedRecord',
          message:'Breathing record detail view opened',
          data:{ id:selectedRecord.id, duration:selectedRecord.duration, score:selectedRecord.score },
          timestamp:Date.now()
        })
      }).catch(()=>{})
      // #endregion
    }
  }, [selectedRecord])

  if (!isOpen) return null

  // 弹窗尺寸和位置（基于设计图 1179px 宽度）
  const modalWidth = toResponsiveWidth(1069, containerWidth)
  const modalHeight = toResponsiveHeight(1759, containerHeight)
  const modalLeft = toResponsiveWidth(57, containerWidth)
  const modalTop = toResponsiveHeight(400, containerHeight)
  // ProfileModal 独有的圆角样式：左上角 300px，其他角 100px（响应式）
  const modalBorderRadiusTopLeft = toResponsiveWidth(300, containerWidth)
  const modalBorderRadiusOther = toResponsiveWidth(100, containerWidth)
  const modalBorderRadius = `${modalBorderRadiusTopLeft}px ${modalBorderRadiusOther}px ${modalBorderRadiusOther}px ${modalBorderRadiusOther}px`
  const backdropBlur = toResponsiveWidth(12.5, containerWidth)
  
  // 用户信息区域样式（基于设计图 1179px * 2556px）
  // 弹窗位置：left: 57px, top: 400px (相对于主界面)
  
  // 头像区域：399px × 399px, left: 170px, top: 503px (相对于主界面)
  // 转换为相对于弹窗：left: 170 - 57 = 113px, top: 503 - 400 = 103px
  const avatarSize = toResponsiveWidth(399, containerWidth)
  const avatarLeft = toResponsiveWidth(170 - 57, containerWidth) // 113px 相对于弹窗
  const avatarTop = toResponsiveHeight(503 - 400, containerHeight) // 103px 相对于弹窗
  const avatarImageWidth = toResponsiveWidth(399.08, containerWidth)
  const avatarImageHeight = toResponsiveHeight(401.57, containerHeight)
  const avatarShadowX = toResponsiveWidth(4, containerWidth)
  const avatarShadowY = toResponsiveWidth(19, containerWidth)
  const avatarShadowBlur = toResponsiveWidth(58.8, containerWidth)
  const avatarBoxShadowY = toResponsiveWidth(4, containerWidth)
  const avatarBoxShadowBlur = toResponsiveWidth(35, containerWidth)
  
  // 用户名：252px × 105px, left: 630px, top: 670px (相对于主界面)
  // 转换为相对于弹窗：left: 630 - 57 = 573px, top: 670 - 400 = 270px
  const userNameWidth = toResponsiveWidth(252, containerWidth)
  const userNameHeight = toResponsiveHeight(105, containerHeight)
  const userNameLeft = toResponsiveWidth(630 - 57, containerWidth) // 573px 相对于弹窗
  const userNameTop = toResponsiveHeight(670 - 400, containerHeight) // 270px 相对于弹窗
  const userNameFontSize = toResponsiveWidth(80, containerWidth)
  const userNameLineHeight = '100%' // line-height: 100%
  
  // ID：252px × 37px, left: 630px, top: 766px (相对于主界面)
  // 转换为相对于弹窗：left: 630 - 57 = 573px, top: 766 - 400 = 366px
  const userIdWidth = toResponsiveWidth(252, containerWidth)
  const userIdHeight = toResponsiveHeight(37, containerHeight)
  const userIdLeft = toResponsiveWidth(630 - 57, containerWidth) // 573px 相对于弹窗
  const userIdTop = toResponsiveHeight(766 - 400, containerHeight) // 366px 相对于弹窗
  const userIdFontSize = toResponsiveWidth(30, containerWidth)
  const userIdLineHeight = toResponsiveHeight(35, containerHeight)
  
  // 签名：280px × 51px, left: 630px, top: 838px (相对于主界面)
  // 转换为相对于弹窗：left: 630 - 57 = 573px, top: 838 - 400 = 438px
  const userSignatureWidth = toResponsiveWidth(280, containerWidth)
  const userSignatureHeight = toResponsiveHeight(51, containerHeight)
  const userSignatureLeft = toResponsiveWidth(630 - 57, containerWidth) // 573px 相对于弹窗
  const userSignatureTop = toResponsiveHeight(838 - 400, containerHeight) // 438px 相对于弹窗
  const userSignatureFontSize = toResponsiveWidth(36, containerWidth)
  const userSignatureLineHeight = toResponsiveHeight(42, containerHeight)
  
  // 编辑图标：38px × 38px, left: 943px, top: 839px (相对于主界面)
  // 转换为相对于弹窗：left: 943 - 57 = 886px, top: 839 - 400 = 439px
  const editIconSize = toResponsiveWidth(38, containerWidth)
  const editIconLeft = toResponsiveWidth(943 - 57, containerWidth) // 886px 相对于弹窗
  const editIconTop = toResponsiveHeight(839 - 400, containerHeight) // 439px 相对于弹窗
  
  // 性别图标：37px × 37px, 位于用户名的右边，顶部和用户名顶部齐平
  const genderIconSize = toResponsiveWidth(37, containerWidth)
  const genderIconLeft = userNameLeft + userNameWidth + toResponsiveWidth(10, containerWidth) // 用户名右边，留10px间距
  const genderIconTop = userNameTop // 顶部和用户名顶部齐平
  
  // 呼吸训练日志框的样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 114px, top: 952px (相对于主界面)
  // 弹窗位置：left: 57px, top: 400px (相对于主界面)
  // 转换为相对于弹窗的位置：left: 114 - 57 = 57px, top: 952 - 400 = 552px
  const logBoxWidth = toResponsiveWidth(956, containerWidth)
  const logBoxHeight = toResponsiveHeight(1151, containerHeight)
  const logBoxLeft = toResponsiveWidth(114 - 57, containerWidth) // 57px 相对于弹窗
  const logBoxTop = toResponsiveHeight(952 - 400, containerHeight) // 552px 相对于弹窗
  const logBoxBorderRadius = toResponsiveWidth(60, containerWidth)
  const logBoxShadowX = toResponsiveWidth(6, containerWidth)
  const logBoxShadowY = toResponsiveWidth(12, containerWidth)
  const logBoxShadowBlur = toResponsiveWidth(27.8, containerWidth)
  
  // 呼吸训练日志标题的样式（基于设计图 1179px * 2556px）
  // 原始位置：left: 173px, top: 1004px (相对于主界面)
  // 日志框位置：left: 114px, top: 952px (相对于主界面)
  // 转换为相对于日志框的位置：left: 173 - 114 = 59px, top: 1004 - 952 = 52px
  const logTitleWidth = toResponsiveWidth(322, containerWidth)
  const logTitleHeight = toResponsiveHeight(105, containerHeight)
  const logTitleLeft = toResponsiveWidth(173 - 114, containerWidth) // 59px 相对于日志框
  const logTitleTop = toResponsiveHeight(1004 - 952, containerHeight) // 52px 相对于日志框
  const logTitleFontSize = toResponsiveWidth(48, containerWidth)
  const logTitleLineHeight = toResponsiveHeight(56, containerHeight)
  
  // 呼吸训练日志条目样式（基于设计图 1179px * 2556px）
  // 条目容器：900px × 245px
  const recordItemWidth = toResponsiveWidth(900, containerWidth)
  const recordItemHeight = toResponsiveHeight(245, containerHeight)
  const recordItemBorderRadius = toResponsiveHeight(122.5, containerHeight)
  const recordItemShadowX = toResponsiveWidth(6, containerWidth)
  const recordItemShadowY = toResponsiveWidth(12, containerWidth)
  const recordItemShadowBlur = toResponsiveWidth(27.8, containerWidth)
  
  // 图标区域：141px × 141px，相对于条目 left: 196 - 146 = 50px, top: 1143 - 1091 = 52px
  const recordIconSize = toResponsiveWidth(141, containerWidth)
  const recordIconLeft = toResponsiveWidth(196 - 146, containerWidth) // 50px
  const recordIconTop = toResponsiveHeight(1143 - 1091, containerHeight) // 52px
  
  // 图标内部图形：50.18px × 65.77px，相对于图标中心
  const recordIconInnerWidth = toResponsiveWidth(50.18, containerWidth)
  const recordIconInnerHeight = toResponsiveHeight(65.77, containerHeight)
  
  // 时长文本："1,48s" - left: 364 - 146 = 218px, top: 1157 - 1091 = 66px
  const recordDurationLeft = toResponsiveWidth(364 - 146, containerWidth) // 218px
  const recordDurationTop = toResponsiveHeight(1157 - 1091, containerHeight) // 66px
  const recordDurationFontSize = toResponsiveWidth(56, containerWidth)
  const recordDurationLineHeight = toResponsiveHeight(66, containerHeight)
  
  // "时长"标签：left: 518 - 146 = 372px, top: 1176 - 1091 = 85px
  const recordDurationLabelLeft = toResponsiveWidth(518 - 146, containerWidth) // 372px
  const recordDurationLabelTop = toResponsiveHeight(1176 - 1091, containerHeight) // 85px
  const recordLabelFontSize = toResponsiveWidth(32, containerWidth)
  const recordLabelLineHeight = toResponsiveHeight(38, containerHeight)
  
  // 日期时间：left: 364 - 146 = 218px, top: 1254 - 1091 = 163px
  const recordDateTimeLeft = toResponsiveWidth(364 - 146, containerWidth) // 218px
  const recordDateTimeTop = toResponsiveHeight(1254 - 1091, containerHeight) // 163px
  
  // 分数区域：left: 655 - 146 = 509px, top: 1107 - 1091 = 16px, 375px × 214px
  const recordScoreBoxLeft = toResponsiveWidth(655 - 146, containerWidth) // 509px
  const recordScoreBoxTop = toResponsiveHeight(1107 - 1091, containerHeight) // 16px
  const recordScoreBoxWidth = toResponsiveWidth(375, containerWidth)
  const recordScoreBoxHeight = toResponsiveHeight(214, containerHeight)
  const recordScoreBoxBorderRadius = toResponsiveHeight(107, containerHeight)
  
  // 分数数字："93" - left: 758 - 146 = 612px, top: 1141 - 1091 = 50px
  const recordScoreLeft = toResponsiveWidth(758 - 146, containerWidth) // 612px
  const recordScoreTop = toResponsiveHeight(1141 - 1091, containerHeight) // 50px
  const recordScoreFontSize = toResponsiveWidth(128, containerWidth)
  const recordScoreLineHeight = toResponsiveHeight(150, containerHeight)
  
  // "分"标签：left: 917 - 146 = 771px, top: 1228 - 1091 = 137px
  const recordScoreLabelLeft = toResponsiveWidth(917 - 146, containerWidth) // 771px
  const recordScoreLabelTop = toResponsiveHeight(1228 - 1091, containerHeight) // 137px
  
  // 箭头：left: 922 - 146 = 776px, top: 1144 - 1091 = 53px
  const recordArrowLeft = toResponsiveWidth(922 - 146, containerWidth) // 776px
  const recordArrowTop = toResponsiveHeight(1144 - 1091, containerHeight) // 53px
  const recordArrowWidth = toResponsiveWidth(30.26, containerWidth)
  const recordArrowHeight = toResponsiveHeight(32.5, containerHeight)
  
  // 滚动容器位置：在标题下方，left: 146 - 114 = 32px, top: 1091 - 952 = 139px
  const recordScrollContainerLeft = toResponsiveWidth(146 - 114, containerWidth) // 32px 相对于日志框
  const recordScrollContainerTop = toResponsiveHeight(1091 - 952, containerHeight) // 139px 相对于日志框
  const recordScrollContainerWidth = toResponsiveWidth(900, containerWidth)
  const recordItemGap = toResponsiveHeight(20, containerHeight) // 条目之间的间距
  
  // 底部渐变遮罩高度
  const recordGradientHeight = toResponsiveHeight(174, containerHeight)
  
  // 关闭按钮尺寸和位置（基于设计图 1179px 宽度）
  const outerCircleSize = toResponsiveWidth(104, containerWidth)
  const outerCircleBorder = toResponsiveWidth(4, containerWidth)
  const xLineWidth = toResponsiveWidth(9.37, containerWidth)
  const xLineHeight = toResponsiveWidth(54.11, containerWidth)
  const outerCircleBottomFromModalBottom = toResponsiveHeight(2294 - 2159, containerHeight) // 135px
  const outerCircleCenterXOffset = toResponsiveWidth(587 - 591.5, containerWidth) // -4.5px

  // 格式化时长：将秒数转换为 "分,秒" 格式
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins},${secs.toString().padStart(2, '0')}s`
  }

  // 格式化日期时间：Nov 17, 14:28
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month} ${day}, ${hours}:${minutes}`
  }

  // 雷达图的五个固定维度（顺时针顺序）
  const radarDimensions = [
    '呼吸率',
    '压力水平',
    '自主神经活性',
    '自主神经平衡',
    '压力调节恢复能力',
  ]

  // 根据单次得分生成五个维度的相对评分（0~1），做一点点差异化，强调“轮廓感”
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
          className="w-full flex flex-col overflow-hidden"
          style={{
            position: 'relative',
            borderRadius: modalBorderRadius,
            height: `${modalHeight}px`,
            background: 'linear-gradient(330.9deg, rgba(255, 255, 255, 0.86) 67.56%, rgba(246, 237, 243, 0.86) 94.65%)',
            backdropFilter: `blur(${backdropBlur}px)`,
            WebkitBackdropFilter: `blur(${backdropBlur}px)`,
          }}
        >
          {/* 用户信息区域 - 绝对定位 */}
          {/* 头像区域 - Mask group */}
          <div
            style={{
              position: 'absolute',
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              left: `${avatarLeft}px`,
              top: `${avatarTop}px`,
              filter: `drop-shadow(${avatarShadowX}px ${avatarShadowY}px ${avatarShadowBlur}px rgba(57, 34, 35, 0.19))`,
            }}
          >
            {/* Ellipse 56 - 白色圆形背景 */}
            <div
              style={{
                position: 'absolute',
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                left: 0,
                top: 0,
                background: '#FFFFFF',
                borderRadius: '50%',
                boxShadow: `0px ${avatarBoxShadowY}px ${avatarBoxShadowBlur}px rgba(0, 0, 0, 0.12)`,
              }}
            />
            {/* 头像图片 */}
            <img
              src="/usr_photo.png"
              alt="用户头像"
              style={{
                position: 'absolute',
                width: `${avatarImageWidth}px`,
                height: `${avatarImageHeight}px`,
                left: 0,
                top: 0,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* 用户名 */}
          <h2
            style={{
              position: 'absolute',
              width: `${userNameWidth}px`,
              height: `${userNameHeight}px`,
              left: `${userNameLeft}px`,
              top: `${userNameTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: `${userNameFontSize}px`,
              lineHeight: userNameLineHeight,
              letterSpacing: '0%',
              color: '#262024',
              margin: 0,
              padding: 0,
            }}
          >
            小情绪
          </h2>

          {/* 性别图标 */}
          <div
            style={{
              position: 'absolute',
              width: `${genderIconSize}px`,
              height: `${genderIconSize}px`,
              left: `${genderIconLeft}px`,
              top: `${genderIconTop}px`,
            }}
          >
            <img
              src="/gender-icon.svg"
              alt="性别"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* ID */}
          <div
            style={{
              position: 'absolute',
              left: `${userIdLeft}px`,
              top: `${userIdTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: `${userIdFontSize}px`,
              lineHeight: `${userIdLineHeight}px`,
              color: '#82797F',
              whiteSpace: 'nowrap',
            }}
          >
            ID：8888888888
          </div>

          {/* 签名 */}
          <div
            style={{
              position: 'absolute',
              width: `${userSignatureWidth}px`,
              height: `${userSignatureHeight}px`,
              left: `${userSignatureLeft}px`,
              top: `${userSignatureTop}px`,
              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: `${userSignatureFontSize}px`,
              lineHeight: `${userSignatureLineHeight}px`,
              color: '#262024',
            }}
          >
            还什么都没写……
          </div>

          {/* 编辑图标 - 铅笔 */}
          <div
            style={{
              position: 'absolute',
              width: `${editIconSize}px`,
              height: `${editIconSize}px`,
              left: `${editIconLeft}px`,
              top: `${editIconTop}px`,
              cursor: 'pointer',
            }}
          >
            <img
              src="/edit-icon.svg"
              alt="编辑"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* 呼吸训练日志区域 - 绝对定位 */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              position: 'absolute',
              width: `${logBoxWidth}px`,
              height: `${logBoxHeight}px`,
              left: `${logBoxLeft}px`,
              top: `${logBoxTop}px`,
              background: '#F6EDF3',
              boxShadow: `${logBoxShadowX}px ${logBoxShadowY}px ${logBoxShadowBlur}px rgba(0, 0, 0, 0.1)`,
              borderRadius: `${logBoxBorderRadius}px`,
            }}
          >
              {/* 标题 */}
              <h3
                style={{
                  position: 'absolute',
                  width: `${logTitleWidth}px`,
                  height: `${logTitleHeight}px`,
                  left: `${logTitleLeft}px`,
                  top: `${logTitleTop}px`,
                  fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: `${logTitleFontSize}px`,
                  lineHeight: `${logTitleLineHeight}px`,
                  color: '#82797F',
                }}
              >
                呼吸训练日志
              </h3>

              {/* 记录列表 - 可滚动容器 */}
              <div
                style={{
                  position: 'absolute',
                  left: `${recordScrollContainerLeft}px`,
                  top: `${recordScrollContainerTop}px`,
                  width: `${recordScrollContainerWidth}px`,
                  height: `calc(100% - ${recordScrollContainerTop + toResponsiveHeight(20, containerHeight)}px)`,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    加载中...
                  </div>
                ) : records.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    暂无记录
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%' }}>
                    {records.map((record, index) => (
                      <div
                        key={record.id}
                        style={{
                          position: 'absolute',
                          width: `${recordItemWidth}px`,
                          height: `${recordItemHeight}px`,
                          left: 0,
                          top: `${index * (recordItemHeight + recordItemGap)}px`,
                          background: '#F7F3F6',
                          boxShadow: `${recordItemShadowX}px ${recordItemShadowY}px ${recordItemShadowBlur}px rgba(0, 0, 0, 0.06)`,
                          borderRadius: `${recordItemBorderRadius}px`,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({
                              sessionId:'debug-session',
                              runId:'pre-fix',
                              hypothesisId:'breathing-item-click',
                              location:'ProfileModal.tsx:recordItem:onClick',
                              message:'Breathing record item clicked',
                              data:{ id:record.id, duration:record.duration, score:record.score },
                              timestamp:Date.now()
                            })
                          }).catch(()=>{})
                          // #endregion

                          setSelectedRecord(record)
                          if (onRecordClick) {
                            onRecordClick(record)
                          }
                        }}
                      >
                        {/* 图标区域 - SVG 图标 */}
                        <div
                          style={{
                            position: 'absolute',
                            width: `${recordIconSize}px`,
                            height: `${recordIconSize}px`,
                            left: `${recordIconLeft}px`,
                            top: `${recordIconTop}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src="/breathing-icon.svg"
                            alt="呼吸训练图标"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        </div>

                        {/* 时长文本 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${recordDurationLeft}px`,
                            top: `${recordDurationTop}px`,
                            fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: `${recordDurationFontSize}px`,
                            lineHeight: `${recordDurationLineHeight}px`,
                            color: '#82797F',
                          }}
                        >
                          {formatDuration(record.duration)}
                        </div>

                        {/* "时长"标签 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${recordDurationLabelLeft}px`,
                            top: `${recordDurationLabelTop}px`,
                            fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: `${recordLabelFontSize}px`,
                            lineHeight: `${recordLabelLineHeight}px`,
                            color: '#B5A6B0',
                          }}
                        >
                          时长
                        </div>

                        {/* 日期时间 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${recordDateTimeLeft}px`,
                            top: `${recordDateTimeTop}px`,
                            fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontStyle: 'normal',
                            fontWeight: 400,
                            fontSize: `${recordLabelFontSize}px`,
                            lineHeight: `${recordLabelLineHeight}px`,
                            color: '#B5A6B0',
                          }}
                        >
                          {formatDateTime(record.timestamp)}
                        </div>

                        {/* 分数区域 */}
                        <div
                          style={{
                            position: 'absolute',
                            width: `${recordScoreBoxWidth}px`,
                            height: `${recordScoreBoxHeight}px`,
                            left: `${recordScoreBoxLeft}px`,
                            top: `${recordScoreBoxTop}px`,
                            background: '#FFFFFF',
                            borderRadius: `${recordScoreBoxBorderRadius}px`,
                          }}
                        >
                          {/* 分数数字 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${recordScoreLeft - recordScoreBoxLeft}px`,
                              top: `${recordScoreTop - recordScoreBoxTop}px`,
                              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              fontStyle: 'normal',
                              fontWeight: 300,
                              fontSize: `${recordScoreFontSize}px`,
                              lineHeight: `${recordScoreLineHeight}px`,
                              color: '#82797F',
                            }}
                          >
                            {record.score}
                          </div>

                          {/* "分"标签 */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${recordScoreLabelLeft - recordScoreBoxLeft}px`,
                              top: `${recordScoreLabelTop - recordScoreBoxTop}px`,
                              fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                              fontStyle: 'normal',
                              fontWeight: 400,
                              fontSize: `${recordLabelFontSize}px`,
                              lineHeight: `${recordLabelLineHeight}px`,
                              color: '#82797F',
                            }}
                          >
                            分
                          </div>

                          {/* 上升箭头 */}
                          <div
                            style={{
                              position: 'absolute',
                              width: `${recordArrowWidth}px`,
                              height: `${recordArrowHeight}px`,
                              left: `${recordArrowLeft - recordScoreBoxLeft}px`,
                              top: `${recordArrowTop - recordScoreBoxTop}px`,
                              transform: 'rotate(-12.69deg)',
                            }}
                          >
                            <svg
                              width="100%"
                              height="100%"
                              viewBox="0 0 30 33"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M15 2L28 17H19V31H11V17H2L15 2Z"
                                fill="#56CD6E"
                                stroke="#56CD6E"
                                strokeWidth="2"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* 容器高度，用于滚动 */}
                    <div style={{ height: `${records.length * (recordItemHeight + recordItemGap)}px` }} />
                  </div>
                )}
                
                {/* 底部渐变遮罩 - 固定在滚动容器底部 */}
                <div
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: `${recordGradientHeight}px`,
                    background: 'linear-gradient(180deg, rgba(246, 237, 243, 0) 0%, #F6EDF3 74.04%)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    marginTop: `-${recordGradientHeight}px`,
                  }}
                />
              </div>

              {/* 底部渐隐遮罩提示 */}
              {records.length > 3 && (
                <div
                  className="relative -mb-4 h-8 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(255, 255, 255, 0.6) 0%, transparent 100%)',
                    marginTop: '-32px',
                  }}
                />
              )}
          </div>

          {/* 底部"详情"浮层已移除，仅保留列表与独立报告弹窗联动 */}
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
