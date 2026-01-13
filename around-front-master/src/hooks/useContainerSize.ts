import { useState, useEffect } from 'react'

// 原设计图尺寸
const DESIGN_WIDTH = 1179
const DESIGN_HEIGHT = 2556
const DESIGN_ASPECT_RATIO = DESIGN_HEIGHT / DESIGN_WIDTH // ≈ 2.169

interface ContainerSize {
  width: number
  height: number
}

export const useContainerSize = (): ContainerSize => {
  const [size, setSize] = useState<ContainerSize>(() => {
    // 直接使用视口尺寸，完全填满屏幕
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let containerWidth: number
    let containerHeight: number
    
    // 基于视口宽度计算高度
    const widthBasedHeight = viewportWidth * DESIGN_ASPECT_RATIO
    // 基于视口高度计算宽度
    const heightBasedWidth = viewportHeight / DESIGN_ASPECT_RATIO
    
    // 判断哪个维度是限制因素
    if (widthBasedHeight <= viewportHeight) {
      // 宽度受限：使用全部视口宽度，按比例计算高度
      containerWidth = viewportWidth
      containerHeight = containerWidth * DESIGN_ASPECT_RATIO
    } else {
      // 高度受限：使用全部视口高度，按比例计算宽度
      containerHeight = viewportHeight
      containerWidth = containerHeight / DESIGN_ASPECT_RATIO
    }
    
    return {
      width: Math.round(containerWidth),
      height: Math.round(containerHeight),
    }
  })

  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let containerWidth: number
      let containerHeight: number
      
      const widthBasedHeight = viewportWidth * DESIGN_ASPECT_RATIO
      const heightBasedWidth = viewportHeight / DESIGN_ASPECT_RATIO
      
      if (widthBasedHeight <= viewportHeight) {
        // 宽度受限
        containerWidth = viewportWidth
        containerHeight = containerWidth * DESIGN_ASPECT_RATIO
      } else {
        // 高度受限
        containerHeight = viewportHeight
        containerWidth = containerHeight / DESIGN_ASPECT_RATIO
      }
      
      setSize({
        width: Math.round(containerWidth),
        height: Math.round(containerHeight),
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

// 将设计图中的像素值转换为响应式值（基于容器宽度）
export const toResponsiveWidth = (designPx: number, containerWidth: number): number => {
  return (designPx / DESIGN_WIDTH) * containerWidth
}

// 将设计图中的像素值转换为响应式值（基于容器高度）
export const toResponsiveHeight = (designPx: number, containerHeight: number): number => {
  return (designPx / DESIGN_HEIGHT) * containerHeight
}

// 将设计图中的像素值转换为响应式值（基于容器尺寸，自动选择较小的比例）
export const toResponsive = (designPx: number, containerWidth: number, containerHeight: number): number => {
  const widthScale = containerWidth / DESIGN_WIDTH
  const heightScale = containerHeight / DESIGN_HEIGHT
  // 使用较小的比例，确保不会超出容器
  const scale = Math.min(widthScale, heightScale)
  return designPx * scale
}
