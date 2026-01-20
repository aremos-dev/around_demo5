# 情绪追踪 App Demo

基于 Vite + React + TypeScript + Tailwind CSS + shadcn/ui 构建的情绪追踪应用演示。

## 功能特性

- 🎨 **登录动画**：点击绿色logo按钮，logo和背景颜色渐变切换
- 🌈 **情绪球体**：展示当前情绪状态，四种情绪对应不同颜色，球体从中心到边缘渐变透明
- 📅 **情绪日历**：7天情绪日历，显示周几、日期和情绪颜色圆点
- ⏰ **小时段情绪**：展示选中日期24小时的情绪记录
- 📊 **情绪数据弹窗**：展示详细的情绪数据，包括呼吸率图表、压力水平、压力调节恢复能力、自主神经平衡和自主神经活性
- 🗺️ **情绪图集**：展示情绪的雷达图可视化
- 👤 **用户资料**：查看用户信息和呼吸训练记录
- 📈 **呼吸训练报告**：详细的呼吸训练数据分析报告

## 技术栈

- **Vite** - 构建工具
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI组件库（工具函数）
- **Radix UI** - 无障碍UI组件库（Tooltip等）
- **Recharts** - 图表库

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
npx vite build上面那个不可以，这个应该可以
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── LoginPage.tsx   # 登录页面（带动画）
│   ├── MainPage.tsx    # 主界面
│   ├── TopBar.tsx      # 顶部导航栏
│   ├── EmotionSphere.tsx  # 情绪球体组件
│   ├── EmotionCalendar.tsx # 情绪日历组件
│   ├── HourlyEmotions.tsx  # 小时段情绪组件
│   ├── EmotionModal.tsx    # 情绪数据弹窗（呼吸率、压力水平等）
│   ├── AtlasModal.tsx      # 情绪图集弹窗
│   ├── ProfileModal.tsx    # 用户资料弹窗
│   ├── BreathingReportModal.tsx # 呼吸训练报告弹窗
│   ├── EmotionAtlas.tsx    # 情绪图集组件
│   ├── AtlasCalendarBar.tsx # 情绪图集日历栏
│   ├── BridgeConnector.tsx  # 桥接连接器组件
│   ├── RespirationRateChart.tsx # 呼吸率图表组件
│   ├── WaveChart.tsx        # 波形图表组件
│   ├── GaugeChart.tsx       # 仪表盘图表组件
│   └── ui/                  # UI组件库
│       └── tooltip.tsx      # Tooltip组件（基于Radix UI）
├── hooks/               # 自定义Hooks
│   └── useContainerSize.ts  # 容器尺寸响应式Hook
├── data/
│   └── mockData.ts     # Mock数据
├── types/
│   └── index.ts        # TypeScript类型定义
├── lib/
│   └── utils.ts        # 工具函数
├── App.tsx             # 主应用组件
├── main.tsx            # 入口文件
└── index.css           # 全局样式
```

## 情绪类型

- **开心** (happy) - 金色 (#FFD700)
- **悲伤** (sad) - 蓝色 (#4169E1)
- **愤怒** (angry) - 橙红色 (#FF4500)
- **平静** (calm) - 绿色 (#32CD32)

## 注意事项

- 所有API调用目前使用mock数据
- 登录无需验证，点击logo即可进入
- 默认显示今天的数据，点击日历可切换日期




