# Around - 情绪追踪应用前端

基于 React + TypeScript + Vite 构建的情绪追踪应用前端，用于实时展示用户情绪状态、呼吸训练数据及自主神经系统相关生理指标。

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [页面与组件详解](#页面与组件详解)
  - [LoginPage 登录页](#loginpage-登录页)
  - [MainPage 主页面](#mainpage-主页面)
  - [TopBar 顶部导航栏](#topbar-顶部导航栏)
  - [EmotionSphere 情绪球体](#emotionsphere-情绪球体)
  - [EmotionCalendar 情绪日历](#emotioncalendar-情绪日历)
  - [HourlyEmotions 小时段情绪](#hourlyemotions-小时段情绪)
  - [EmotionModal 情绪数据弹窗](#emotionmodal-情绪数据弹窗)
  - [AtlasModal 情绪图集弹窗](#atlasmodal-情绪图集弹窗)
  - [ProfileModal 用户资料弹窗](#profilemodal-用户资料弹窗)
  - [BreathingReportModal 呼吸训练报告弹窗](#breathingreportmodal-呼吸训练报告弹窗)
  - [EmotionAtlas 情绪图集可视化](#emotionatlas-情绪图集可视化)
  - [RespirationRateChart 呼吸率图表](#respirationratechart-呼吸率图表)
  - [WaveChart 波形图表](#wavechart-波形图表)
  - [GaugeChart 仪表盘图表](#gaugechart-仪表盘图表)
  - [AtlasCalendarBar 图集日历栏](#atlascalendarbar-图集日历栏)
  - [BridgeConnector 桥接连接器](#bridgeconnector-桥接连接器)
- [API 服务层](#api-服务层)
  - [stateApi 后端状态 API](#stateapi-后端状态-api)
  - [socketService WebSocket 服务](#socketservice-websocket-服务)
- [自定义 Hooks](#自定义-hooks)
  - [useContainerSize 响应式容器尺寸](#usecontainersize-响应式容器尺寸)
  - [useBreathingRate 呼吸频率 Hook](#usebreathingrate-呼吸频率-hook)
- [类型定义](#类型定义)
- [数据层](#数据层)
- [情绪类型说明](#情绪类型说明)
- [数据流说明](#数据流说明)
- [响应式设计](#响应式设计)
- [构建与部署](#构建与部署)
- [与后端的联动](#与后端的联动)

---

## 功能概览

| 功能模块 | 描述 |
|---|---|
| 登录页面 | 带过渡动画的启动界面，点击 logo 预加载数据并进入主页 |
| 情绪球体 | 实时展示当前情绪状态（平静 / 喜悦 / 低落 / 紧张），背景随情绪变化 |
| 情绪日历 | 7 天情绪汇总日历，支持日期切换 |
| 小时段情绪 | 选中日期 24 小时情绪分布时间轴 |
| 情绪数据弹窗 | 呼吸率折线图、压力水平、压力调节恢复能力、自主神经平衡与活性四项指标 |
| 情绪图集 | Canvas 绘制的 3D 多面体动画，根据情绪类型呈现不同色调 |
| 用户资料 | 用户信息展示 + 呼吸训练历史日志 |
| 呼吸训练报告 | 雷达图展示五维度训练得分 |
| 实时数据 | 通过 WebSocket 接收实时呼吸频率更新 |

---

## 技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| 前端框架 | React | ^18.2.0 |
| 语言 | TypeScript | ^5.2.2 |
| 构建工具 | Vite | ^4.5.0 |
| 样式框架 | Tailwind CSS | ^3.4.0 |
| 图表库 | Recharts | ^3.5.1 |
| UI 组件 | Radix UI (Tooltip) | ^1.2.8 |
| 图标库 | lucide-react | ^0.344.0 |
| WebSocket | socket.io-client | ^4.7.2 |
| 类名工具 | clsx + tailwind-merge | ^2.1.0 / ^2.2.0 |
| PostCSS | autoprefixer | ^10.4.16 |
| 代码检查 | ESLint + TypeScript ESLint | ^8.55.0 |

---

## 项目结构

```
around-front-master/
├── public/                          # 静态资源（图片、SVG 图标、背景图）
│   ├── calm_bg.png                  # 平静情绪背景
│   ├── joy_bg.png                   # 喜悦情绪背景
│   ├── low_bg.png                   # 低落情绪背景
│   ├── tense_bg.png                 # 紧张情绪背景
│   ├── emo_atlas.png                # 情绪图集图标
│   ├── emo_icon.png                 # 情绪图标
│   ├── logo.svg                     # 应用 logo
│   ├── usr_photo.png                # 默认用户头像
│   ├── stress-level-icon.svg        # 压力水平图标
│   ├── stress-recovery-icon.svg     # 压力调节恢复能力图标
│   ├── automatic-balance-icon.svg   # 自主神经平衡图标
│   ├── automatic-neural-activity.svg# 自主神经活性图标
│   ├── breathing-icon.svg           # 呼吸图标
│   ├── gauge-chart.svg              # 仪表盘图标
│   ├── wave-path.svg                # 波形路径
│   ├── gender-icon.svg              # 性别图标
│   ├── edit-icon.svg                # 编辑图标
│   ├── back.png                     # 返回图标
│   └── load.png                     # 加载图标
├── src/
│   ├── api/                         # 后端通信层
│   │   ├── socketService.ts         # Socket.IO WebSocket 服务单例
│   │   └── stateApi.ts              # REST API 调用（/api/state）
│   ├── components/                  # React 组件
│   │   ├── ui/
│   │   │   └── tooltip.tsx          # Radix UI Tooltip 封装
│   │   ├── LoginPage.tsx            # 登录页面
│   │   ├── MainPage.tsx             # 主页面容器
│   │   ├── TopBar.tsx               # 顶部导航栏
│   │   ├── EmotionSphere.tsx        # 情绪球体
│   │   ├── EmotionCalendar.tsx      # 情绪日历（7 天）
│   │   ├── HourlyEmotions.tsx       # 小时段情绪时间轴
│   │   ├── EmotionModal.tsx         # 情绪数据弹窗
│   │   ├── AtlasModal.tsx           # 情绪图集弹窗
│   │   ├── ProfileModal.tsx         # 用户资料弹窗
│   │   ├── BreathingReportModal.tsx # 呼吸训练报告弹窗
│   │   ├── EmotionAtlas.tsx         # 3D 情绪图集 Canvas 动画
│   │   ├── AtlasCalendarBar.tsx     # 图集弹窗内日历栏
│   │   ├── BridgeConnector.tsx      # 日历与情绪记录的视觉桥接
│   │   ├── RespirationRateChart.tsx # 呼吸率折线图（Recharts）
│   │   ├── WaveChart.tsx            # 波形数据图表
│   │   └── GaugeChart.tsx           # 半圆仪表盘图表
│   ├── data/
│   │   └── mockData.ts              # Mock 数据（后端不可用时的降级数据）
│   ├── hooks/
│   │   ├── useContainerSize.ts      # 响应式容器尺寸计算
│   │   └── useBreathingRate.ts      # WebSocket 呼吸频率订阅
│   ├── lib/
│   │   └── utils.ts                 # Tailwind 类名合并工具 cn()
│   ├── types/
│   │   └── index.ts                 # 全局 TypeScript 类型定义
│   ├── App.tsx                      # 根组件，管理登录状态与数据预加载
│   ├── main.tsx                     # React 应用入口
│   └── index.css                    # 全局样式（Tailwind 指令 + 自定义变量）
├── dist/                            # 生产构建输出目录
├── index.html                       # HTML 入口（<div id="root">）
├── vite.config.ts                   # Vite 配置（代理、端口、路径别名）
├── tailwind.config.js               # Tailwind CSS 自定义主题配置
├── tsconfig.json                    # TypeScript 编译配置
├── tsconfig.node.json               # Node 环境 TypeScript 配置
├── postcss.config.js                # PostCSS 配置
├── .eslintrc.cjs                    # ESLint 规则配置
├── package.json                     # 项目依赖与脚本
└── package-lock.json                # 依赖版本锁定
```

---

## 快速开始

### 前置条件

- Node.js >= 16
- npm >= 8
- 后端服务运行在 `http://localhost:5000`（可选，前端有 Mock 数据降级）

### 安装依赖

```bash
cd around-front-master
npm install
```

### 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

### 构建生产版本

```bash
npx vite build
# 输出至 dist/ 目录
```

### 预览构建结果

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

---

## 页面与组件详解

### LoginPage 登录页

**文件**：`src/components/LoginPage.tsx`

应用的启动界面。

- 全屏背景图片（渐变叠加）
- 中央绿色圆形 logo 按钮
- 点击 logo 触发以下流程：
  1. 执行缩放 + 淡出过渡动画
  2. 并行预加载当前情绪、周情绪、小时情绪数据
  3. 动画结束后通过 `onLoginSuccess` 回调切换到主页面
- **无需任何认证**，点击即进入

---

### MainPage 主页面

**文件**：`src/components/MainPage.tsx`

主页面容器组件，管理整体布局与弹窗状态。

**布局（从上到下）**：
1. `TopBar` — 顶部导航栏
2. `EmotionSphere` — 情绪球体（大图）
3. `EmotionCalendar` — 7 天情绪日历
4. `BridgeConnector` — 桥接视觉元素（有选中日期时显示）
5. `HourlyEmotions` — 24 小时情绪时间轴

**弹窗管理**（通过状态控制显/隐）：
- `EmotionModal` — 点击情绪球体打开
- `AtlasModal` — 点击情绪图集按钮打开
- `ProfileModal` — 点击用户头像打开
- `BreathingReportModal` — 在 ProfileModal 中点击训练记录打开

---

### TopBar 顶部导航栏

**文件**：`src/components/TopBar.tsx`

固定在页面顶部的导航栏。

- 左侧：用户头像（点击触发 `onAvatarClick`，打开 ProfileModal）
- 中间：标题文字"我的情绪"
- 右侧：功能图标按钮
- 使用 `useContainerSize` Hook 进行响应式定位与尺寸计算

---

### EmotionSphere 情绪球体

**文件**：`src/components/EmotionSphere.tsx`

主页的核心视觉组件，展示当前情绪状态。

- 根据情绪类型显示对应背景图（calm/joy/low/tense）
- 球体从中心向边缘渐变透明
- 显示时间戳，格式示例：`14:38 Nov 6`
- **双击球体**：向后端发送特殊模式命令（`sendSpecialModeCommand()`）
- 点击触发 `onClick` 回调，打开 EmotionModal

---

### EmotionCalendar 情绪日历

**文件**：`src/components/EmotionCalendar.tsx`

展示最近 7 天的情绪摘要。

- 每个日期格显示：周几（Mon/Tue/...）、日期数字、情绪颜色圆点
- 点击某天触发 `onDateSelect`，更新 `HourlyEmotions` 数据
- 右上角有「情绪图集」按钮，点击打开 AtlasModal
- 当前选中日期高亮显示

---

### HourlyEmotions 小时段情绪

**文件**：`src/components/HourlyEmotions.tsx`

展示选中日期 24 小时内的情绪分布。

- 横向时间轴，标注 0 时、6 时、12 时、18 时
- 每条情绪记录以彩色圆点表示，垂直位置根据情绪类型错开排列
- 颜色与情绪类型对应：平静（绿）、喜悦（金）、低落（蓝）、紧张（橙红）
- 无数据时显示空状态提示

---

### EmotionModal 情绪数据弹窗

**文件**：`src/components/EmotionModal.tsx`

点击情绪球体后弹出的详细数据面板。

**内容区域**：
1. **RespirationRateChart** — 顶部呼吸率折线图，支持拖拽选点
2. 四个指标卡片（2×2 网格）：

| 指标 | 组件 | 数据来源 |
|---|---|---|
| 压力水平 | WaveChart | SDNN 值 |
| 压力调节恢复能力 | WaveChart | Valence 值 |
| 自主神经平衡 | GaugeChart | LF/HF 比值 |
| 自主神经活性 | GaugeChart | Arousal 值 |

- 通过 `useBreathingRate` Hook 订阅 WebSocket 实时呼吸频率数据
- 支持关闭按钮退出弹窗

---

### AtlasModal 情绪图集弹窗

**文件**：`src/components/AtlasModal.tsx`

展示选中日期的情绪可视化图集。

- 顶部：`EmotionAtlas`（3D 多面体 Canvas 动画）
- 底部：`AtlasCalendarBar`（7 天日期切换栏）
- 切换日期时重新加载对应情绪数据，驱动 Atlas 动画更新

---

### ProfileModal 用户资料弹窗

**文件**：`src/components/ProfileModal.tsx`

点击顶部头像后弹出的用户信息面板。

**展示内容**：
- 用户头像、用户名、ID、个性签名
- 呼吸训练日志列表，每条记录显示：
  - 训练时间
  - 训练时长
  - 综合得分

- 点击某条日志，打开 `BreathingReportModal` 查看详细报告
- 数据由 `fetchBreathingTrainingRecords()` 提供

---

### BreathingReportModal 呼吸训练报告弹窗

**文件**：`src/components/BreathingReportModal.tsx`

单次呼吸训练的详细分析报告。

**展示内容**：
- 训练综合得分（大字展示）
- 鼓励语句
- **雷达图**（五维度）：

| 维度 | 说明 |
|---|---|
| 呼吸率 | 呼吸频率指标 |
| 压力水平 | 基于 SDNN |
| 自主神经活性 | 基于 Arousal |
| 自主神经平衡 | LF/HF 比值 |
| 压力调节恢复能力 | 基于 Valence |

---

### EmotionAtlas 情绪图集可视化

**文件**：`src/components/EmotionAtlas.tsx`

使用 HTML5 Canvas 绘制的 3D 动态可视化组件。

**技术细节**：
- 绘制旋转的 3D 多面体（通过投影矩阵变换顶点）
- 根据情绪类型显示不同颜色的雾气/光晕效果
- 使用 Perlin 噪声生成动态纹理，使画面更有机感
- `requestAnimationFrame` 驱动持续动画循环
- 接收 `emotionType` prop 控制颜色主题

---

### RespirationRateChart 呼吸率图表

**文件**：`src/components/RespirationRateChart.tsx`

基于 Recharts 的呼吸率折线区域图。

**功能**：
- 折线 + 渐变填充区域图（Area Chart）
- **拖拽选点**：鼠标/触摸拖拽可在时间轴上选择特定数据点
- 选中点时显示数值气泡和渐变矩形区域指示器
- X 轴为时间序列，Y 轴为呼吸率（次/分钟）
- 自定义 Tooltip 样式

---

### WaveChart 波形图表

**文件**：`src/components/WaveChart.tsx`

沿波浪路径排列数据点的自定义图表。

**用于**：
- 压力水平指标
- 压力调节恢复能力指标

**实现方式**：
- 使用 SVG `<path>` 绘制波浪曲线
- 数据点沿路径等间距分布
- 高亮当前激活数据点

---

### GaugeChart 仪表盘图表

**文件**：`src/components/GaugeChart.tsx`

半圆形仪表盘，用指针指示当前数值。

**用于**：
- 自主神经平衡（LF/HF 比值）
- 自主神经活性（Arousal）

**实现方式**：
- SVG 绘制半圆刻度弧线
- 指针根据当前数值旋转到对应角度
- 刻度标注（低 / 中 / 高）

---

### AtlasCalendarBar 图集日历栏

**文件**：`src/components/AtlasCalendarBar.tsx`

AtlasModal 底部的日期切换栏。

- 显示 7 天日期（月/日 格式）
- 当前选中日期显示蓝色背景圆点
- 点击切换日期，触发父组件数据重载

---

### BridgeConnector 桥接连接器

**文件**：`src/components/BridgeConnector.tsx`

`EmotionCalendar` 与 `HourlyEmotions` 之间的纯视觉过渡组件。

- 仅在用户选中某天日期时渲染
- 显示细竖线或圆点，在视觉上连接日历与时间轴

---

## API 服务层

### stateApi 后端状态 API

**文件**：`src/api/stateApi.ts`

封装所有对后端 REST API 的调用，统一调用 `/api/state` 接口。

| 函数 | 说明 | 返回值 |
|---|---|---|
| `fetchBackendState()` | 获取完整后端状态 JSON | 完整状态对象 |
| `getCurrentEmotionFromBackend()` | 获取当前情绪类型 | `EmotionType` |
| `getRespirationDataFromBackend()` | 获取呼吸率时间序列 | `number[]` |
| `getStressLevelFromBackend()` | 获取压力水平（基于 SDNN） | `number` |
| `getStressRecoveryFromBackend()` | 获取压力调节恢复能力（基于 Valence） | `number` |
| `getAutonomicBalanceFromBackend()` | 获取自主神经平衡（LF/HF 比值） | `number` |
| `getAutonomicActivityFromBackend()` | 获取自主神经活性（基于 Arousal） | `number` |
| `sendSpecialModeCommand()` | 向后端发送特殊模式触发命令 | `void` |

**代理配置**（`vite.config.ts`）：
```
/api → http://localhost:5000
```
开发时所有 `/api/*` 请求被代理到本地后端服务。

---

### socketService WebSocket 服务

**文件**：`src/api/socketService.ts`

基于 `socket.io-client` 的 WebSocket 单例服务。

- **连接地址**：`http://localhost:5000`（与后端 Socket.IO 服务器对接）
- **监听事件**：`breathing_rate_update` — 接收实时呼吸频率推送
- 提供订阅 / 取消订阅接口，供 `useBreathingRate` Hook 使用
- 单例模式保证全局只创建一个连接

---

## 自定义 Hooks

### useContainerSize 响应式容器尺寸

**文件**：`src/hooks/useContainerSize.ts`

根据当前视口尺寸计算响应式容器宽高，保持设计稿比例。

**设计稿基准尺寸**：`1179px × 2556px`（iPhone Pro Max 设计稿）

**返回值**：

| 名称 | 说明 |
|---|---|
| `containerWidth` | 当前容器宽度（px） |
| `containerHeight` | 当前容器高度（px） |
| `toResponsiveWidth(x)` | 将设计稿宽度值转为响应式像素值 |
| `toResponsiveHeight(y)` | 将设计稿高度值转为响应式像素值 |
| `toResponsive(v)` | 自动取宽高比例中较小值，适配不同屏幕 |

所有组件使用此 Hook 保证在不同屏幕尺寸下布局一致。

---

### useBreathingRate 呼吸频率 Hook

**文件**：`src/hooks/useBreathingRate.ts`

订阅 WebSocket 实时呼吸频率数据。

**返回值**：

| 名称 | 说明 |
|---|---|
| `breathingData` | 历史呼吸频率数据数组（用于图表） |
| `latestRate` | 最新一次呼吸频率值（次/分钟） |

- 组件挂载时订阅，卸载时自动取消订阅（防止内存泄漏）
- 内部调用 `socketService` 单例

---

## 类型定义

**文件**：`src/types/index.ts`

```typescript
// 情绪类型枚举
type EmotionType = 'calm' | 'joy' | 'low' | 'tense';

// 情绪配置（颜色、背景图等）
interface EmotionConfig {
  color: string;
  bgImage: string;
  label: string;
}

// 单条情绪数据
interface EmotionData {
  timestamp: string;
  emotionType: EmotionType;
}

// 当前情绪数据
interface CurrentEmotionData {
  emotionType: EmotionType;
  timestamp: string;
}

// 用户数据
interface UserData {
  name: string;
  id: string;
  avatar: string;
  bio: string;
}
```

---

## 数据层

**文件**：`src/data/mockData.ts`

所有数据获取函数均采用**优先后端 API，失败时降级到 Mock 数据**的策略。

| 函数 | 说明 |
|---|---|
| `fetchCurrentEmotion()` | 获取当前情绪（调用 `stateApi`，失败返回 Mock） |
| `fetchWeeklyEmotions()` | 获取最近 7 天情绪数据 |
| `fetchHourlyEmotions(date)` | 获取指定日期 24 小时情绪数据 |
| `fetchRespirationData()` | 获取呼吸率时间序列数据 |
| `fetchStressLevel()` | 获取压力水平数值 |
| `fetchStressRecovery()` | 获取压力调节恢复能力数值 |
| `fetchAutonomicBalance()` | 获取自主神经平衡数值 |
| `fetchAutonomicActivity()` | 获取自主神经活性数值 |
| `fetchBreathingTrainingRecords()` | 获取呼吸训练历史记录列表 |

---

## 情绪类型说明

| 类型值 | 中文名 | 颜色 | 对应背景 |
|---|---|---|---|
| `calm` | 平静 | 绿色 | `calm_bg.png` |
| `joy` | 喜悦 | 金色/黄色 | `joy_bg.png` |
| `low` | 低落 | 蓝色 | `low_bg.png` |
| `tense` | 紧张 | 橙红色 | `tense_bg.png` |

> 注：情绪类型由后端基于生理信号（HRV、呼吸率等）计算得出，前端负责可视化呈现。

---

## 数据流说明

```
用户点击 logo
    │
    ├─ 预加载数据（并行）
    │   ├─ fetchCurrentEmotion()
    │   ├─ fetchWeeklyEmotions()
    │   └─ fetchHourlyEmotions(today)
    │
    ▼
进入 MainPage
    │
    ├─ EmotionSphere 展示当前情绪
    │
    ├─ EmotionCalendar 点击某天
    │       └─ fetchHourlyEmotions(selectedDate)
    │               └─ 更新 HourlyEmotions
    │
    ├─ 点击情绪球体 → EmotionModal
    │       ├─ useBreathingRate() —— WebSocket 实时接收
    │       └─ fetchStressLevel / fetchAutonomicBalance 等
    │
    ├─ 点击情绪图集 → AtlasModal
    │       ├─ EmotionAtlas Canvas 动画
    │       └─ AtlasCalendarBar 切换日期
    │
    └─ 点击头像 → ProfileModal
            └─ 点击训练记录 → BreathingReportModal
```

**后端通信通道**：
- **REST**：`GET /api/state` — 轮询/按需获取生理状态数据
- **WebSocket**：`socket.io` 连接 `localhost:5000` — 实时推送呼吸频率

---

## 响应式设计

本项目以 **iPhone Pro Max（1179×2556）** 为基准设计稿，通过 `useContainerSize` Hook 实现等比缩放适配。

- 所有组件的宽度、高度、字体大小、间距均通过 `toResponsiveWidth()` / `toResponsiveHeight()` / `toResponsive()` 动态计算
- 容器宽高随视口变化而更新，保持视觉比例一致
- Tailwind CSS 负责基础样式，自定义尺寸全部由 Hook 计算后以内联样式注入

---

## 构建与部署

### 开发环境

- 开发服务器端口：`3000`
- API 代理：`/api/*` → `http://localhost:5000`
- 热模块替换（HMR）由 Vite 提供

### 生产构建

```bash
npx vite build
```

- 输出目录：`dist/`
- 资源自动分包与哈希命名
- TypeScript 类型检查在构建时执行（`tsc && vite build`）

### Vite 配置摘要（`vite.config.ts`）

```typescript
{
  plugins: [react()],
  resolve: { alias: { '@': './src' } },
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:5000' }
  },
  build: { outDir: 'dist' }
}
```

---

## 与后端的联动

本前端设计为与 `around_demo5` 项目根目录下的 Python 后端配合运行。

**后端提供**：
- `GET /api/state` — 返回包含情绪类型、HRV 指标、呼吸率等的状态 JSON
- Socket.IO 服务 — 推送 `breathing_rate_update` 事件（含实时呼吸频率数据）
- 特殊模式命令接口 — 接收前端双击情绪球体触发的指令

**后端不可用时**：前端自动降级使用 `mockData.ts` 中的静态 Mock 数据，保证界面仍可正常展示。

---

> 本项目为情绪与生理数据可视化演示原型，展示基于 HRV、呼吸率等生理指标进行情绪识别的前端交互设计。
