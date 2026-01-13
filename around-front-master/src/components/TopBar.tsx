import { toResponsiveWidth, toResponsiveHeight } from '../hooks/useContainerSize'

interface TopBarProps {
  onIconClick?: () => void
  onAvatarClick?: () => void
  containerWidth?: number
  containerHeight?: number
}

export const TopBar = ({ onIconClick, onAvatarClick, containerWidth = 1179, containerHeight = 2556 }: TopBarProps) => {
  // 头像尺寸：151px × 151px（基于新设计尺寸 1179px × 2556px）
  const avatarSize = toResponsiveWidth(151, containerWidth)
  // 头像位置：距离 top 167px，距离 left 64px
  const avatarTop = toResponsiveHeight(167, containerHeight)
  const avatarLeft = toResponsiveWidth(64, containerWidth)
  
  // "我的情绪"标题尺寸和位置
  const titleWidth = toResponsiveWidth(320, containerWidth)
  const titleHeight = toResponsiveHeight(84, containerHeight)
  const titleTop = toResponsiveHeight(213, containerHeight)
  const titleLeft = toResponsiveWidth(430, containerWidth)
  const titleFontSize = toResponsiveWidth(52, containerWidth)
  
  // 右侧按钮尺寸和位置：151px × 151px，距离top 167px，距离left 965px
  const iconButtonSize = toResponsiveWidth(151, containerWidth)
  const iconButtonTop = toResponsiveHeight(167, containerHeight)
  const iconButtonLeft = toResponsiveWidth(965, containerWidth)
  
  // emo_icon.png 尺寸：宽56.37px，高50.82px（基于新设计尺寸 1179px × 2556px）
  const iconWidth = toResponsiveWidth(56.37, containerWidth)
  const iconHeight = toResponsiveHeight(50.82, containerHeight)
  
  // 按钮阴影：0px 4px 35px 0px #0000001F（响应式）
  const shadowOffsetY = toResponsiveWidth(4, containerWidth)
  const shadowBlur = toResponsiveWidth(35, containerWidth)
  const boxShadow = `0px ${shadowOffsetY}px ${shadowBlur}px 0px #0000001F`
  
  const paddingTop = toResponsiveHeight(40, containerHeight)
  
  return (
    <div 
      className="w-full flex items-center justify-between relative z-10" 
      style={{ 
        paddingLeft: `${toResponsiveWidth(16, containerWidth)}px`,
        paddingRight: `${toResponsiveWidth(16, containerWidth)}px`,
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${toResponsiveHeight(12, containerHeight)}px`,
      }}
    >
      {/* 左边：用户头像 - 绝对定位 */}
      <button
        onClick={onAvatarClick}
        className="absolute cursor-pointer"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          top: `${avatarTop}px`,
          left: `${avatarLeft}px`,
        }}
      >
        <img
          src="/usr_photo.png"
          alt="用户头像"
          className="rounded-full object-cover"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </button>

      {/* 中间：我的情绪 - 绝对定位 */}
      <div 
        className="absolute flex items-center justify-center"
        style={{ 
          width: `${titleWidth}px`,
          height: `${titleHeight}px`,
          top: `${titleTop}px`,
          left: `${titleLeft}px`,
        }}
      >
        <h1
          className="text-black text-center w-full"
          style={{
            fontFamily: 'OPPO Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 500,
            fontSize: `${titleFontSize}px`,
          }}
        >
          我的情绪
        </h1>
      </div>

      {/* 右边：Icon按钮 - 绝对定位 */}
      <button
        onClick={onIconClick}
        className="absolute cursor-pointer"
        style={{
          background: 'white',
          border: 'none',
          outline: 'none',
          width: `${iconButtonSize}px`,
          height: `${iconButtonSize}px`,
          top: `${iconButtonTop}px`,
          left: `${iconButtonLeft}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: boxShadow,
        }}
      >
        {/* Icon实体 */}
        <img
          src="/emo_icon.png"
          alt=""
          className="object-contain"
          style={{
            width: `${iconWidth}px`,
            height: `${iconHeight}px`,
          }}
        />
      </button>
    </div>
  )
}

