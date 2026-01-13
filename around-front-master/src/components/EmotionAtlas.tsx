import { EmotionType } from '../types'
import { EMOTION_CONFIG } from '../data/mockData'
import { useRef, useEffect, useMemo } from 'react'

interface EmotionAtlasProps {
  emotion: EmotionType | null
}

// 将hex颜色转换为HSL的hue值
const hexToHue = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  
  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360
  return h
}

// 简化的Perlin噪声（用于生成雾气纹理）
class SimpleNoise {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  private hash(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453
    return n - Math.floor(n)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  noise(x: number, y: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi

    const n00 = this.hash(xi, yi)
    const n10 = this.hash(xi + 1, yi)
    const n01 = this.hash(xi, yi + 1)
    const n11 = this.hash(xi + 1, yi + 1)

    const u = this.smoothstep(xf)
    const v = this.smoothstep(yf)

    return this.lerp(
      this.lerp(n00, n10, u),
      this.lerp(n01, n11, u),
      v
    )
  }

  octaveNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0
    let amplitude = 1
    let frequency = 0.02
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }

    return value / maxValue
  }
}

export const EmotionAtlas = ({ emotion }: EmotionAtlasProps) => {
  // 如果 emotion 为 null，不渲染任何内容（由父组件处理空状态）
  if (!emotion) return null
  
  const config = EMOTION_CONFIG[emotion]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const timeRef = useRef(0)
  
  // 将情绪颜色转换为HSL的hue值
  // 使用和首页 EmotionCalendar 一致的颜色映射
  const emotionColorMap: Record<EmotionType, string> = {
    calm: '#8AD48A',      // 和首页一致
    joy: '#FFF2B2',       // 和首页一致
    low: '#CEDEF9',       // 和首页一致
    tense: '#FFD2D2',    // 和首页一致
  }
  const emotionColor = emotionColorMap[emotion]
  const moodHue = useMemo(() => hexToHue(emotionColor), [emotionColor])
  
  // 根据情绪生成不同的参数
  const params = useMemo(() => {
    const intensityMap: Record<EmotionType, number> = {
      calm: 0.5,
      joy: 0.7,
      low: 0.4,
      tense: 0.8,
    }
    const intensity = intensityMap[emotion] || 0.6
    const seed = Math.floor(Math.random() * 1000)
    return { intensity, seed }
  }, [emotion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置canvas尺寸
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const noise = new SimpleNoise(params.seed)
    const width = canvas.width / window.devicePixelRatio
    const height = canvas.height / window.devicePixelRatio

    // 创建多个流体感blob的位置和参数
    const blobs = [
      { x: width * 0.3, y: height * 0.4, radius: width * 0.25, speed: 0.3 },
      { x: width * 0.7, y: height * 0.6, radius: width * 0.3, speed: 0.4 },
      { x: width * 0.5, y: height * 0.3, radius: width * 0.2, speed: 0.25 },
      { x: width * 0.4, y: height * 0.7, radius: width * 0.22, speed: 0.35 },
    ]

    // 3D向量和矩阵工具
    type Vec3 = [number, number, number]
    
    const rotateX = (angle: number): number[][] => {
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      return [
        [1, 0, 0],
        [0, c, -s],
        [0, s, c]
      ]
    }
    
    const rotateY = (angle: number): number[][] => {
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      return [
        [c, 0, s],
        [0, 1, 0],
        [-s, 0, c]
      ]
    }
    
    const rotateZ = (angle: number): number[][] => {
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      return [
        [c, -s, 0],
        [s, c, 0],
        [0, 0, 1]
      ]
    }
    
    const multiplyMatrix = (m1: number[][], m2: number[][]): number[][] => {
      const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          for (let k = 0; k < 3; k++) {
            result[i][j] += m1[i][k] * m2[k][j]
          }
        }
      }
      return result
    }
    
    const transformVec3 = (vec: Vec3, matrix: number[][]): Vec3 => {
      return [
        matrix[0][0] * vec[0] + matrix[0][1] * vec[1] + matrix[0][2] * vec[2],
        matrix[1][0] * vec[0] + matrix[1][1] * vec[1] + matrix[1][2] * vec[2],
        matrix[2][0] * vec[0] + matrix[2][1] * vec[1] + matrix[2][2] * vec[2]
      ]
    }
    
    const project3D = (vec: Vec3, distance: number = 500): [number, number] => {
      const scale = distance / (distance + vec[2])
      return [
        vec[0] * scale + width / 2,
        vec[1] * scale + height / 2
      ]
    }
    
    // 生成不规则多面体的顶点（使用噪声使其不规则）
    const generatePolyhedronVertices = (): Vec3[] => {
      const vertices: Vec3[] = []
      const baseRadius = Math.min(width, height) * 0.3
      const numVertices = 10
      
      // 使用黄金角度分布生成球面上的点
      const phi = Math.PI * (3 - Math.sqrt(5)) // 黄金角度
      
      for (let i = 0; i < numVertices; i++) {
        const y = 1 - (i / (numVertices - 1)) * 2
        const radius = Math.sqrt(1 - y * y)
        const theta = phi * i
        
        // 使用噪声使半径不规则
        const noiseValue = noise.octaveNoise(
          Math.cos(theta) * 0.5,
          Math.sin(theta) * 0.5,
          2
        )
        const r = baseRadius * (0.7 + noiseValue * 0.6)
        
        vertices.push([
          r * Math.cos(theta) * radius,
          r * y,
          r * Math.sin(theta) * radius
        ])
      }
      
      return vertices
    }
    
    // 生成多面体的面（使用凸包算法简化版）
    const generateFaces = (vertices: Vec3[]): number[][] => {
      // 简化：使用距离中心最近的几个点组成面
      // 这里使用一个简化的方法：将顶点分组形成三角形面
      const faces: number[][] = []
      const center: Vec3 = [0, 0, 0]
      
      // 计算中心点
      vertices.forEach(v => {
        center[0] += v[0]
        center[1] += v[1]
        center[2] += v[2]
      })
      center[0] /= vertices.length
      center[1] /= vertices.length
      center[2] /= vertices.length
      
      // 生成三角形面（简化：使用相邻顶点）
      for (let i = 0; i < vertices.length; i++) {
        const next = (i + 1) % vertices.length
        const next2 = (i + 2) % vertices.length
        faces.push([i, next, next2])
      }
      
      // 添加一些额外的面使形状更复杂
      for (let i = 0; i < vertices.length; i += 2) {
        const next = (i + 3) % vertices.length
        if (next !== i) {
          faces.push([i, (i + 1) % vertices.length, next])
        }
      }
      
      return faces
    }
    
    const vertices = generatePolyhedronVertices()
    const faces = generateFaces(vertices)

    const draw = (time: number) => {
      timeRef.current = time * 0.001
      
      // 清空画布
      ctx.clearRect(0, 0, width, height)
      
      // 创建不规则圆形裁剪路径，确保内容只在圆形内显示
      ctx.save()
      ctx.beginPath()
      const centerX = width / 2
      const centerY = height / 2
      const baseRadius = Math.min(width, height) / 2
      
      // 使用噪声生成不规则的边界
      const numPoints = 64 // 圆形边界的点数
      const noiseScale = 0.02 // 噪声缩放
      const noiseAmplitude = baseRadius * 0.08 // 噪声幅度（边界波动的最大距离）
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2
        const noiseValue = noise.octaveNoise(
          Math.cos(angle) * noiseScale + timeRef.current * 0.2,
          Math.sin(angle) * noiseScale + timeRef.current * 0.2,
          3
        )
        const radius = baseRadius + (noiseValue - 0.5) * noiseAmplitude
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.clip()
      
      // 计算旋转角度（进一步增强动态效果，旋转速度更快）
      const rotX = timeRef.current * 0.6
      const rotY = timeRef.current * 0.7
      const rotZ = timeRef.current * 0.5
      
      // 组合旋转矩阵
      let rotationMatrix = multiplyMatrix(rotateX(rotX), rotateY(rotY))
      rotationMatrix = multiplyMatrix(rotationMatrix, rotateZ(rotZ))
      
      // 旋转顶点
      const rotatedVertices = vertices.map(v => transformVec3(v, rotationMatrix))
      
      // 投影到2D
      const projectedVertices = rotatedVertices.map(v => ({
        vec3: v,
        screen: project3D(v),
        z: v[2]
      }))
      
      // 按z深度排序面（从后到前）
      const sortedFaces = faces
        .map(face => ({
          face,
          avgZ: (projectedVertices[face[0]].z + 
                 projectedVertices[face[1]].z + 
                 projectedVertices[face[2]].z) / 3
        }))
        .sort((a, b) => a.avgZ - b.avgZ)
      
      // 创建离屏canvas用于模糊
      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return

      // 绘制多面体的面
      sortedFaces.forEach(({ face, avgZ }) => {
        const v0 = projectedVertices[face[0]]
        const v1 = projectedVertices[face[1]]
        const v2 = projectedVertices[face[2]]
        
        // 计算面的法向量（用于光照效果）
        const normal = [
          (v1.vec3[1] - v0.vec3[1]) * (v2.vec3[2] - v0.vec3[2]) - 
          (v1.vec3[2] - v0.vec3[2]) * (v2.vec3[1] - v0.vec3[1]),
          (v1.vec3[2] - v0.vec3[2]) * (v2.vec3[0] - v0.vec3[0]) - 
          (v1.vec3[0] - v0.vec3[0]) * (v2.vec3[2] - v0.vec3[2]),
          (v1.vec3[0] - v0.vec3[0]) * (v2.vec3[1] - v0.vec3[1]) - 
          (v1.vec3[1] - v0.vec3[1]) * (v2.vec3[0] - v0.vec3[0])
        ]
        const normalLength = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2)
        if (normalLength > 0) {
          normal[0] /= normalLength
          normal[1] /= normalLength
          normal[2] /= normalLength
        }
        
        // 简单的光照计算（点积）
        const lightDir: Vec3 = [0.3, 0.5, 0.8]
        const lightLength = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2)
        const dot = (normal[0] * lightDir[0] + normal[1] * lightDir[1] + normal[2] * lightDir[2]) / lightLength
        const brightness = Math.max(0.3, Math.min(1, 0.5 + dot * 0.5))
        
        // 绘制面
        offCtx.beginPath()
        offCtx.moveTo(v0.screen[0], v0.screen[1])
        offCtx.lineTo(v1.screen[0], v1.screen[1])
        offCtx.lineTo(v2.screen[0], v2.screen[1])
        offCtx.closePath()
        
        // 使用渐变填充，根据光照调整透明度
        const centerX = (v0.screen[0] + v1.screen[0] + v2.screen[0]) / 3
        const centerY = (v0.screen[1] + v1.screen[1] + v2.screen[1]) / 3
        
        const gradient = offCtx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, Math.max(width, height) * 0.5
        )
        gradient.addColorStop(0, `hsla(${moodHue}, 85%, 55%, ${0.4 * brightness})`)
        gradient.addColorStop(0.5, `hsla(${moodHue + 10}, 85%, 55%, ${0.25 * brightness})`)
        gradient.addColorStop(1, `hsla(${moodHue - 10}, 85%, 55%, 0)`)
        
        offCtx.fillStyle = gradient
        offCtx.fill()
      })

      // 在多面体内部添加雾气效果（进一步增强动态效果）
      blobs.forEach((blob, i) => {
        const offsetX = Math.sin(timeRef.current * blob.speed * 1.5 + i) * 45
        const offsetY = Math.cos(timeRef.current * blob.speed * 1.8 + i) * 45
        const currentX = blob.x + offsetX
        const currentY = blob.y + offsetY
        const currentRadius = blob.radius + Math.sin(timeRef.current * 1.0 + i) * 30

        const gradient = offCtx.createRadialGradient(
          currentX, currentY, 0,
          currentX, currentY, currentRadius
        )
        gradient.addColorStop(0, `hsla(${moodHue}, 85%, 55%, 0.3)`)
        gradient.addColorStop(0.5, `hsla(${moodHue + 10}, 85%, 55%, 0.2)`)
        gradient.addColorStop(1, `hsla(${moodHue - 10}, 85%, 55%, 0)`)

        offCtx.fillStyle = gradient
        offCtx.beginPath()
        offCtx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2)
        offCtx.fill()
      })

      // 添加噪声纹理扰动（增强动态效果）
      const imageData = offCtx.getImageData(0, 0, width, height)
      const data = imageData.data
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4
          if (data[index + 3] > 0) {
            const noiseValue = noise.octaveNoise(
              x * 0.015 + timeRef.current * 0.6,
              y * 0.015 + timeRef.current * 0.6,
              4
            )
            data[index + 3] = Math.min(255, data[index + 3] * (0.6 + noiseValue * 0.4))
          }
        }
      }
      offCtx.putImageData(imageData, 0, 0)

      // 应用模糊效果
      ctx.filter = 'blur(20px)'
      ctx.drawImage(offscreen, 0, 0)
      
      // 叠加一层更柔和的雾气
      ctx.filter = 'blur(35px)'
      ctx.globalCompositeOperation = 'screen'
      
      blobs.forEach((blob, i) => {
        const offsetX = Math.sin(timeRef.current * blob.speed * 1.0 + i) * 50
        const offsetY = Math.cos(timeRef.current * blob.speed * 1.2 + i) * 50
        const currentX = blob.x + offsetX
        const currentY = blob.y + offsetY
        
        const gradient = ctx.createRadialGradient(
          currentX, currentY, 0,
          currentX, currentY, blob.radius * 1.8
        )
        gradient.addColorStop(0, `hsla(${moodHue}, 90%, 55%, 0.15)`)
        gradient.addColorStop(1, `hsla(${moodHue}, 90%, 55%, 0)`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(currentX, currentY, blob.radius * 1.8, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalCompositeOperation = 'source-over'
      ctx.filter = 'none'
      
      // 恢复裁剪路径
      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [emotion, moodHue, params])

  return (
    <div 
      className="w-full h-full relative flex items-center justify-center"
      style={{
        backgroundColor: 'transparent',
        borderRadius: '50%', // 圆形边界
        overflow: 'hidden',
        aspectRatio: '1 / 1', // 保持正方形，确保是圆形
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          borderRadius: '50%', // 圆形边界
        }}
      />
    </div>
  )
}
