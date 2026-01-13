import { useState } from 'react'

interface LoginPageProps {
  onLoginStart: () => void
  onLoginComplete: () => void
}

export const LoginPage = ({ onLoginStart, onLoginComplete }: LoginPageProps) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleLogoClick = () => {
    if (isAnimating) return // 防止重复点击
    
    setIsAnimating(true)
    // 立即开始预加载数据
    onLoginStart()
    
    // 等待动画完成后进入主页面
    setTimeout(() => {
      onLoginComplete()
    }, 1500) // 动画持续时间
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* load.png 背景 - 一直显示 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/load.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 半透明绿色叠加层 - 渐变时显示 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#0B5B38',
          opacity: isAnimating ? 0.8 : 0,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />
      {/* LOGO按钮 */}
      <button
        onClick={handleLogoClick}
        disabled={isAnimating}
        className={`relative z-10 flex items-center justify-center ${
          isAnimating ? 'cursor-default' : 'cursor-pointer hover:scale-105'
        }`}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <svg
          width="247"
          height="247"
          viewBox="0 0 247 247"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '96px',
            height: '96px',
            transition: 'fill 1.5s ease-in-out',
          }}
        >
          <path
            d="M247 179.322C247 81.51 160.056 0 64.714 0C39.026 0 21.242 17.537 21.242 39.767C21.242 62.491 39.52 78.052 63.726 80.275C116.337 85.215 158.08 127.946 158.08 156.845C158.08 166.972 153.387 172.9 144.495 172.9C118.313 172.9 113.373 123.5 61.75 123.5C27.417 123.5 0 150.917 0 185.25C0 220.077 28.158 247 62.491 247C114.114 247 119.301 197.6 144.989 197.6C171.912 197.6 172.159 230.945 206.986 231.439C232.18 231.686 247 213.161 247 179.322Z"
            fill={isAnimating ? '#ffffff' : '#0B5B38'}
          />
        </svg>
      </button>
    </div>
  )
}

