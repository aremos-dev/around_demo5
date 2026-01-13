import { useState, useEffect, useRef } from 'react'
import { EmotionSphere } from './EmotionSphere'
import { EmotionCalendar } from './EmotionCalendar'
import { HourlyEmotions } from './HourlyEmotions'
import { TopBar } from './TopBar'
import { EmotionModal } from './EmotionModal'
import { AtlasModal } from './AtlasModal'
import { ProfileModal } from './ProfileModal'
import { BreathingReportModal } from './BreathingReportModal'
import { EmotionData, CurrentEmotionData } from '../types'
import { fetchHourlyEmotions, BreathingTrainingRecord } from '../data/mockData'
import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface MainPageProps {
  preloadedData: {
    currentEmotionData: CurrentEmotionData
    weeklyEmotions: EmotionData[]
    selectedDate: string
    hourlyEmotions: EmotionData[]
  } | null
  containerWidth: number
  containerHeight: number
}

export const MainPage = ({ preloadedData, containerWidth, containerHeight }: MainPageProps) => {
  const [currentEmotionData, setCurrentEmotionData] = useState<CurrentEmotionData>(
    preloadedData?.currentEmotionData || { emotion: 'calm', timestamp: new Date().toISOString() }
  )
  const [weeklyEmotions, setWeeklyEmotions] = useState<EmotionData[]>(preloadedData?.weeklyEmotions || [])
  const [selectedDate, setSelectedDate] = useState<string>(preloadedData?.selectedDate || '')
  const [hourlyEmotions, setHourlyEmotions] = useState<EmotionData[]>(preloadedData?.hourlyEmotions || [])
  const [isLoading, setIsLoading] = useState(!preloadedData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAtlasModalOpen, setIsAtlasModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isBreathingReportOpen, setIsBreathingReportOpen] = useState(false)
  const [selectedBreathingRecord, setSelectedBreathingRecord] = useState<BreathingTrainingRecord | null>(null)
  const [sphereWidth, setSphereWidth] = useState(300)
  const calendarRef = useRef<HTMLDivElement>(null)
  const recordRef = useRef<HTMLDivElement>(null)
  const sphereRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 如果有预加载数据，直接使用，否则加载数据
    if (preloadedData) {
      setCurrentEmotionData(preloadedData.currentEmotionData)
      setWeeklyEmotions(preloadedData.weeklyEmotions)
      setSelectedDate(preloadedData.selectedDate)
      setHourlyEmotions(preloadedData.hourlyEmotions)
      setIsLoading(false)

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'preloaded-data',
          location:'MainPage.tsx:useEffect:initFromPreloaded',
          message:'Initialized MainPage from preloadedData',
          data:{
            hasPreloaded:!!preloadedData,
            weeklyCount:preloadedData.weeklyEmotions.length,
            selectedDate:preloadedData.selectedDate,
            hourlyCount:preloadedData.hourlyEmotions.length
          },
          timestamp:Date.now()
        })
      }).catch(()=>{})
      // #endregion
    } else {
      // 如果没有预加载数据（直接访问主页面），则加载数据
      setIsLoading(true)
      // 这里可以添加fallback加载逻辑，但通常不会执行
      setIsLoading(false)
    }
  }, [preloadedData])

  useEffect(() => {
    // 当用户选择新日期时，加载对应的小时情绪数据
    if (selectedDate && !isLoading) {
      fetchHourlyEmotions(selectedDate).then(setHourlyEmotions)
    }
  }, [selectedDate, isLoading])

  useEffect(() => {
    // 计算 EmotionSphere 的宽度（响应式）
    if (sphereRef.current) {
      setSphereWidth(sphereRef.current.offsetWidth)
    }
  }, [weeklyEmotions, currentEmotionData, containerWidth])


  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
  }

  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col">
      {/* load.png 背景 - 一直显示，充斥整个容器 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/load.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {isLoading ? (
        // 加载中：显示空白或加载指示器
        <div className="relative z-0 min-h-full pb-8">
          <TopBar />
        </div>
      ) : (
        // 数据加载完成后，一次性渲染所有内容
        <>
          {/* 第一个 MainPage div：包含 TopBar 和 EmotionSphere */}
          <div 
            className="relative z-0 flex flex-col"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, white 50%)',
              height: `${toResponsiveHeight(1541, containerHeight)}px`, // 高度到第二个 div 开始的位置
            }}
          >
            {/* TopBar - 框住三个元素 */}
            <div className="relative" style={{ width: '100%', height: '100%' }}>
              <TopBar 
                onIconClick={() => setIsModalOpen(true)}
                onAvatarClick={() => setIsProfileModalOpen(true)}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
              />
            </div>

            {/* EmotionSphere - 在第一个 div 里面，距离顶部 475px，居中 */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{
                width: `${toResponsiveWidth(836, containerWidth)}px`,
                height: `${toResponsiveWidth(836, containerWidth)}px`,
                top: `${toResponsiveHeight(475, containerHeight)}px`,
              }}
            >
              <div ref={sphereRef} className="w-full h-full flex items-center justify-center">
                <EmotionSphere 
                  emotion={currentEmotionData.emotion} 
                  timestamp={currentEmotionData.timestamp}
                />
              </div>
            </div>

            {/* "深呼吸，把这一刻收藏起来。"文字 */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{
                width: `${toResponsiveWidth(700, containerWidth)}px`,
                height: `${toResponsiveHeight(156, containerHeight)}px`,
                top: `${toResponsiveHeight(1375, containerHeight)}px`,
              }}
            >
              <div 
                className="text-center"
                style={{
                  fontFamily: "'OPPO Sans 4.0', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: `${toResponsiveWidth(40, containerWidth)}px`,
                  lineHeight: `${toResponsiveHeight(47, containerHeight)}px`,
                  textAlign: 'center',
                  color: '#262024',
                }}
              >
                深呼吸，把这一刻收藏起来。
              </div>
            </div>
          </div>

          {/* 第二个 MainPage div：包含情绪日历和情绪记录，距离 top 1541px */}
          <div 
            className="absolute left-0 right-0 flex flex-col pb-4 gap-4"
            style={{ 
              top: `${toResponsiveHeight(1541, containerHeight)}px`,
              overflow: 'visible', // 改为 visible，确保桥接组件不被裁剪
              backgroundColor: '#FFFFFF', // 白色背景，不透明
            }}
          >
            {/* 情绪日历 - 独立的div */}
            {weeklyEmotions.length > 0 && (
              <div ref={calendarRef} className="flex-shrink-0">
                <EmotionCalendar
                  weeklyEmotions={weeklyEmotions}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onAtlasButtonClick={() => {
                    console.log('Atlas button clicked in MainPage')
                    setIsAtlasModalOpen(true)
                  }}
                  containerWidth={containerWidth}
                  containerHeight={containerHeight}
                />
              </div>
            )}

            {/* 小时段情绪展示 - 独立的div */}
            {/* 即使没有小时数据，也显示组件（显示空态：轴和时间标签） */}
            {selectedDate && (
              <div ref={recordRef} className="flex-shrink-0">
                <HourlyEmotions
                  hourlyEmotions={hourlyEmotions}
                  selectedDate={selectedDate}
                  containerWidth={containerWidth}
                  containerHeight={containerHeight}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* 弹窗 */}
      <EmotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        topBarHeight={toResponsiveHeight(80, containerHeight)} // TopBar 高度（响应式）
        sphereWidth={sphereWidth}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
      />
      
      {/* 情绪图集弹窗 */}
      <AtlasModal
        isOpen={isAtlasModalOpen}
        onClose={() => setIsAtlasModalOpen(false)}
        topBarHeight={toResponsiveHeight(80, containerHeight)} // TopBar 高度（响应式）
        sphereWidth={sphereWidth}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        weeklyEmotions={weeklyEmotions}
      />
      
      {/* 用户资料弹窗 */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        topBarHeight={toResponsiveHeight(80, containerHeight)} // TopBar 高度（响应式）
        sphereWidth={sphereWidth}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        onRecordClick={(record) => {
          setSelectedBreathingRecord(record)
          setIsBreathingReportOpen(true)
        }}
      />

      {/* 呼吸训练报告弹窗 */}
      <BreathingReportModal
        isOpen={isBreathingReportOpen && !!selectedBreathingRecord}
        onClose={() => setIsBreathingReportOpen(false)}
        topBarHeight={toResponsiveHeight(80, containerHeight)}
        sphereWidth={sphereWidth}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        record={selectedBreathingRecord}
      />
    </div>
  )
}




