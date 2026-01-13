import { useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { MainPage } from './components/MainPage'
import { EmotionData, CurrentEmotionData } from './types'
import { fetchCurrentEmotion, fetchWeeklyEmotions, fetchHourlyEmotions } from './data/mockData'
import { useContainerSize } from './hooks/useContainerSize'

function App() {
  const containerSize = useContainerSize()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [preloadedData, setPreloadedData] = useState<{
    currentEmotionData: CurrentEmotionData
    weeklyEmotions: EmotionData[]
    selectedDate: string
    hourlyEmotions: EmotionData[]
  } | null>(null)

  const handleLoginStart = async () => {
    // 开始预加载数据
    // 并行加载当前情绪和周情绪数据
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'login-flow',
        location:'App.tsx:handleLoginStart:beforeFetch',
        message:'Starting login prefetch',
        data:{},
        timestamp:Date.now()
      })
    }).catch(()=>{})
    // #endregion

    const [currentEmotionData, weeklyData] = await Promise.all([
      fetchCurrentEmotion(),
      fetchWeeklyEmotions(),
    ])
    
    // 确定默认选择的日期
    const today = new Date().toISOString().split('T')[0]
    const todayEmotion = weeklyData.find((e) => e.date === today)
    const defaultDate = todayEmotion ? today : (weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].date : '')
    
    let hourlyData: EmotionData[] = []
    if (defaultDate) {
      hourlyData = await fetchHourlyEmotions(defaultDate)
    }
    
    setPreloadedData({
      currentEmotionData,
      weeklyEmotions: weeklyData,
      selectedDate: defaultDate,
      hourlyEmotions: hourlyData,
    })

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac308b02-c703-4480-bd86-07d8769e1b61',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'login-flow',
        location:'App.tsx:handleLoginStart:afterPrefetch',
        message:'Finished login prefetch',
        data:{
          hasCurrentEmotion:!!currentEmotionData,
          weeklyCount:weeklyData.length,
          defaultDate,
          hasHourly:hourlyData.length>0
        },
        timestamp:Date.now()
      })
    }).catch(()=>{})
    // #endregion
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-200"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 响应式容器 - 保持设计图比例 (1337px × 617px)，完全填满屏幕 */}
      <div
        className="relative overflow-hidden"
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          backgroundColor: '#fff',
          maxWidth: '100vw',
          maxHeight: '100vh',
          flexShrink: 0,
        }}
      >
        {/* 内容区域 */}
        <div className="w-full h-full relative overflow-hidden">
          {!isLoggedIn ? (
            <LoginPage 
              onLoginStart={handleLoginStart}
              onLoginComplete={() => setIsLoggedIn(true)} 
            />
          ) : (
            <MainPage 
              preloadedData={preloadedData}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App




