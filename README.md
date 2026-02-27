# Around — 多传感器情绪感知交互系统

本项目是一个基于多传感器融合的情绪感知桌面交互原型，综合使用毫米波雷达、PPG 穿戴传感器、BLE 无线通信、霍尔传感器和音频输出，实时检测用户的生理状态（心率、呼吸率、HRV），计算情绪 Arousal/Valence 分数，并通过 Web 前端可视化呈现。整个系统运行在 Docker 容器中，适合部署在嵌入式 Linux 板卡（如 RK3588、树莓派等）上。

---

## 目录

- [系统架构总览](#系统架构总览)
- [硬件依赖](#硬件依赖)
- [软件模块说明](#软件模块说明)
  - [demo.py — 主程序 & 状态机控制器](#demopy--主程序--状态机控制器)
  - [fsm.py — 数据融合与可视化调度](#fsmpy--数据融合与可视化调度)
  - [micRadar3.py — 毫米波雷达驱动](#micradar3py--毫米波雷达驱动)
  - [ppg.py — PPG 光电传感器驱动](#ppgpy--ppg-光电传感器驱动)
  - [ble.py — BLE 蓝牙通信层](#blepy--ble-蓝牙通信层)
  - [HRVcalculate.py — HRV 计算模块](#hrvcalculatepy--hrv-计算模块)
  - [hall.py — 霍尔传感器驱动](#hallpy--霍尔传感器驱动)
  - [data_recorder.py — 数据记录与情绪评分](#data_recorderpy--数据记录与情绪评分)
  - [data_visualizer.py — Web 服务器 & 实时可视化](#data_visualizerpy--web-服务器--实时可视化)
  - [emotion_dete.py — 情绪分类模型训练](#emotion_detepy--情绪分类模型训练)
  - [heal_mode.py — 独立疗愈模式](#heal_modepy--独立疗愈模式)
  - [radar_recoder.py — 雷达原始数据录制工具](#radar_recoderpy--雷达原始数据录制工具)
  - [ble_server.py — BLE 服务端](#ble_serverpy--ble-服务端)
- [状态机详解](#状态机详解)
- [情绪识别算法](#情绪识别算法)
- [前后端通信机制](#前后端通信机制)
- [数据流完整路径](#数据流完整路径)
- [文件一览](#文件一览)
- [Docker 部署](#docker-部署)
- [本地开发运行](#本地开发运行)
- [串口 & 蓝牙设备分配](#串口--蓝牙设备分配)
- [数据持久化](#数据持久化)
- [前端说明](#前端说明)

---

## 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        硬件层 (Hardware)                             │
│                                                                     │
│  毫米波雷达          PPG 穿戴设备           霍尔传感器               │
│  /dev/ttyS3          BLE "demo3"           /dev/ttyUSB0             │
│  (心率/呼吸率/体动)   (心率/SpO2/RRI/陀螺仪) (磁悬浮检测/平台控制)   │
└──────────┬──────────────────┬──────────────────┬────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       传感器驱动层                                   │
│                                                                     │
│   micRadar3.py          ble.py / ppg.py          hall.py            │
│   (串口解析+HRV)        (BLE异步+帧解析)          (串口读取)         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      业务逻辑层                                      │
│                                                                     │
│               fsm.py (数据融合 + 线程调度)                          │
│                    ↑              ↓                                 │
│          HRVcalculate.py    data_recorder.py                        │
│          (HRV 时域/频域)    (情绪评分 + CSV 写入)                   │
│                    ↑                                                │
│               demo.py (状态机 + 设备行为编排)                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   服务与可视化层                                     │
│                                                                     │
│               data_visualizer.py                                    │
│          Flask + Socket.IO @ localhost:5000                         │
│          GET /api/state      (REST 接口)                            │
│          POST /api/special_mode (前端触发特殊模式)                   │
│          WebSocket 事件: breathing_rate_update                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTP + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   前端层 (React SPA)                                 │
│          around-front-master/dist/ (构建产物)                       │
│          登录页 → 主页 → 情绪可视化 → 生理指标弹窗                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 硬件依赖

| 硬件 | 接口 | 设备路径 | 用途 |
|---|---|---|---|
| 毫米波雷达（心率/呼吸模块） | UART 串口 | `/dev/ttyS3` | 非接触式检测心率、呼吸率、体动 |
| PPG 穿戴设备（含陀螺仪） | BLE 蓝牙 | 设备名 `demo3` | 心率、血氧、RRI（R-R 间期）、震动手势 |
| 霍尔传感器 / 磁悬浮底座 | UART 串口 | `/dev/ttyUSB0` | 检测物体是否悬浮、控制底座平台升降 |
| 音频输出 | 系统音频 | — | 呼吸引导音（pygame） |
| 运行主机 | — | — | Linux 板卡（如 RK3588），需具备蓝牙和串口 |

---

## 软件模块说明

### demo.py — 主程序 & 状态机控制器

**作用**：整个系统的主入口，负责协调所有子系统。

**核心类**：`dot`

**职责**：
- 初始化并持有 `BLE`、`FSM`、`DataRecorder`、`hall` 实例
- 定义完整的 `transitions` 状态机（10 个状态，多条转换规则）
- 运行多个后台线程：
  - `levitation` 线程：持续读取霍尔传感器，判断物体是否悬浮并控制底座
  - `monitor_here` 线程：根据雷达心率新鲜度判断是否有人在场
  - `_monitor_breathing_444_commands` 线程：轮询前端发来的 444 呼吸模式指令
- 实现各状态的行为：灯光、震动、音频播放
- 将前端发来的 `enter_special_mode` 命令路由至状态机触发 `enter_breathing_444`

**启动流程**：
```
python demo.py
  └─ setup_logging()          # 日志同时写入 demo.log 和控制台
  └─ dot.__init__()            # 初始化所有硬件实例
  └─ dot.main()
       ├─ fsm.run()             # 启动传感器线程 + Web 服务器
       ├─ levitation 线程
       ├─ monitor_here 线程
       ├─ _monitor_breathing_444 线程
       └─ machine.start()       # 进入 booting → baseline 状态
```

---

### fsm.py — 数据融合与可视化调度

**作用**：FSM 的数据中枢，负责：
1. 从毫米波雷达（`MicRadar`）和 PPG（`ppg.PPG`）获取数据并融合到统一的 `self.data` 字典
2. 每秒调用 `DataVisualizer.update_data()` 将最新数据推送到 Web 界面
3. 启动情绪监控线程（每 5 秒计算一次 Arousal/Valence）

**数据字段**（均为 `deque(maxlen=240)`）：

| 字段 | 说明 | 来源 |
|---|---|---|
| `HF` | HRV 高频功率（0.15–0.4 Hz） | 雷达 / PPG |
| `LF` | HRV 低频功率（0.04–0.15 Hz） | 雷达 / PPG |
| `lf_hf` | LF/HF 比值（自主神经平衡指标） | 计算得出 |
| `sdnn` | SDNN（HRV 时域指标，压力水平指标） | 雷达 |
| `hr` | 心率（BPM） | 雷达 / PPG |
| `br` | 呼吸率（次/分钟） | 雷达 |
| `spo2` | 血氧饱和度（%） | PPG |

**常模数据库**（用于情绪偏差计算）：
- `young_male`：年轻男性（HR 均值 63.9，SDNN 均值 50.0）
- `young_female`：年轻女性（HR 均值 66.7，SDNN 均值 48.7）
- `old_male`：年老男性（HR 均值 64.9，SDNN 均值 44.6）

**`data_source` 参数**：
- `'radar'`：仅使用雷达
- `'ppg'`：仅使用 PPG（BLE）
- `'both'`：同时使用两种数据源（当前 demo.py 使用此模式）

---

### micRadar3.py — 毫米波雷达驱动

**作用**：通过串口（`/dev/ttyS3`，115200 baud）驱动毫米波雷达模块，实现非接触式生理参数检测。

**帧格式**（二进制协议）：
```
[帧头: 53 59] [CTRL: 1B] [CMD: 1B] [LEN: 2B] [PAYLOAD: N B] [CHECKSUM: 1B] [帧尾: 54 43]
```

**支持的数据类型**：

| CTRL | CMD | 数据 | 说明 |
|---|---|---|---|
| `0x85` | `0x02` | `payload[0]` | 心率（BPM） |
| `0x81` | `0x02` | `payload[0]` | 呼吸率（次/分钟） |
| `0x80` | `0x03` | `payload[0]` | 体动参数 |

**线程架构**：
- `read_thread`：持续从串口读取并解析帧，更新 `heart_rate`、`breath_rate`、`motion_para` deque
- `hrv_thread`：每 3 秒调用 `HRVcalculate` 计算 SDNN、RMSSD、LF、HF、LF/HF

**人员在场检测**：通过 `_last_hr_time` 记录最近一次有效心率的时间戳，8 秒内无新心率则判定为离开。

---

### ppg.py — PPG 光电传感器驱动

**作用**：从 BLE 穿戴设备获取 PPG 生理数据（心率、血氧、RRI），并计算 HRV 频域指标。

**依赖**：使用外部传入的 `BLE` 实例（共用同一个 BLE 连接），不重新建立独立连接。

**数据字段**：
- `heartrate`：最新心率
- `blood_oxygen`：最新血氧
- `HF` / `LF`：HRV 频域功率（通过 `hrv_frequency_manual()` 计算）

**HRV 频段定义**（自实现，不依赖 NeuroKit2）：
- VLF：0.003–0.04 Hz
- LF：0.04–0.15 Hz
- HF：0.15–0.4 Hz
- 使用 Welch 法（4 Hz 重采样 + 三次插值）计算 PSD

---

### ble.py — BLE 蓝牙通信层

**作用**：基于 `bleak` 库的异步 BLE 客户端，连接穿戴传感器并解析自定义二进制帧协议，同时支持向设备发送控制指令（灯光、震动、省电模式）。

**BLE 特征 UUID**：
- 通知特征：`6e400003-b5a3-f393-e0a9-e50e24dcca9e`（接收数据）
- 写特征：`6e400002-b5a3-f393-e0a9-e50e24dcca9e`（发送指令）

**数据帧格式**（自定义，10 字节）：
```
[包头: FF] [HR: 1B] [SpO2: 1B] [SDNN: 1B] [RRI[0]: 1B] [RRI[1]: 1B] [RRI[2]: 1B] [陀螺仪: 1B] [保留: 1B] [保留: 1B]
```

**数据缓冲区**：

| 属性 | 说明 |
|---|---|
| `hr` | 心率历史（deque） |
| `blood_oxygen` | 血氧历史 |
| `sdnn` | SDNN 历史 |
| `rri` | R-R 间期列表（maxlen=480） |
| `gyroscope` | 陀螺仪/手势值（0=静止，1/2/3=不同震动模式） |

**控制指令（同步发送）**：

| 方法 | 指令 | 说明 |
|---|---|---|
| `message_sync(s=1)` | `s=1` | 进入省电模式 |
| `message_sync(s=0)` | `s=0` | 退出省电模式 |
| `mode_sync(N)` | `m=N` | 设置灯光模式（1=呼吸，2=蓝紫流动，3=关闭，4=橙流，6=积累，7=暖黄闪烁） |
| `shake_sync(N)` | `v=N` | 设置震动（0=停止，1/2/3/4=不同强度） |
| `color_sync(R,G,B)` | `c=R,G,B` | 设置 RGB 灯颜色 |
| `jump_sync(N)` | `j=N` | 跳动控制 |

**连接策略**：
- 开机自动重置蓝牙适配器（`bluetoothctl power off/on`）
- 连接失败时每 5 秒自动重试，直到成功

---

### HRVcalculate.py — HRV 计算模块

**作用**：对雷达心率序列进行 HRV 分析，提供时域和频域两套计算方法。

**时域计算（`compute_time`）**：
- 输入：雷达最近 `window_size`（默认 20）个心率值
- 由心率换算 RR 间期（`rri = 60000 / hr`）
- 输出：RMSSD、SDNN

**频域计算（`compute_freq`）**：
- 输入：上述 RR 间期矩阵
- 使用 `pyhrv.frequency_domain.welch_psd`（hamming 窗，nfft=128）
- 输出：LF/HF 比值、LF 功率、HF 功率

---

### hall.py — 霍尔传感器驱动

**作用**：通过串口（`/dev/ttyUSB0`，115200 baud）读取霍尔效应传感器的磁场强度值，用于检测物体是否处于磁悬浮状态，同时向底座平台发送升降控制指令。

**霍尔值阈值（在 demo.py 中使用）**：

| 霍尔值范围 | 含义 | 动作 |
|---|---|---|
| 1600–2200 | 物体接近底座 | 激活线圈（`coil_flag=1`）+ 升起平台（`platform_flag*2`） |
| 350–450 | 物体离开底座 | 降下平台（`platform_flag*0`） |
| 2250–2400 | 物体处于悬浮 | 记录悬浮状态 |
| 2700–3100 | 触发待机 | 进入 `standby` 状态 |

**控制指令（通过 `write_string` 发送）**：
- `coil_flag=1`：激活线圈（启动磁悬浮）
- `platform_flag*0`：降下平台
- `platform_flag*1`：平台居中
- `platform_flag*2`：升起平台

---

### data_recorder.py — 数据记录与情绪评分

**作用**：每 5 秒对当前生理数据窗口进行统计分析，计算情绪 Arousal/Valence 分数，并持久化到 CSV 文件，同时生成情绪象限图。

**情绪评分算法**（基于常模偏差加权计算）：

**Arousal（唤醒度，纵轴）**：
```
arousal = 0.4 × (HR偏差) + 0.01 × (LF/HF偏差) - 0.59 × (SDNN偏差)
```
> SDNN 越低 → 压力越大 → 唤醒度越高（取负）

**Valence（效价，横轴）**：
```
valence = -0.7 × (BR偏差) + 0.3 × (SDNN偏差)
```
> 呼吸率越高 → 效价越低（焦虑）；SDNN 越高 → 效价越高（放松）

**情绪象限映射**：

| Arousal | Valence | 情绪状态 |
|---|---|---|
| 高（+） | 高（+） | Joy（喜悦） |
| 高（+） | 低（-） | Tense（紧张） |
| 低（-） | 低（-） | Low（低落） |
| 低（-） | 高（+） | Calm（平静） |

**输出文件**：
- `personal_data.csv`：每行一条时间戳记录，含所有生理指标的均值/标准差/最小值/最大值，以及 arousal/valence 分数
- `personal_data.png`：Valence-Arousal 二维情绪象限散点图（带历史轨迹）

---

### data_visualizer.py — Web 服务器 & 实时可视化

**作用**：提供 HTTP + WebSocket 服务，将生理数据暴露给前端展示，并接收前端指令。

**技术栈**：Flask + Flask-SocketIO（threading 模式），服务绑定 `0.0.0.0:5000`

**前端挂载策略（自动检测）**：
1. 若 `around-front-master/dist/index.html` 存在 → 挂载 React 构建产物（新前端）
2. 否则 → 回退到 `js/` 目录（旧原生 JS 前端）

**REST API 接口**：

| 接口 | 方法 | 说明 |
|---|---|---|
| `GET /` | GET | 返回前端 `index.html` |
| `GET /api/state` | GET | 返回当前所有生理数据快照（JSON） |
| `POST /api/special_mode` | POST | 接收前端双击情绪球发送的特殊模式命令 |

**`/api/state` 响应结构**：
```json
{
  "hr": [...],         // 心率历史
  "br": [...],         // 呼吸率历史
  "hf": [...],         // HF 功率历史
  "lf": [...],         // LF 功率历史
  "sdnn": [...],       // SDNN 历史
  "spo2": [...],       // 血氧历史
  "lf_hf_ratio": [...],// LF/HF 比值历史
  "time": [...],       // 时间戳
  "arousal_score": 0.5,
  "valence_score": -0.3,
  "emotion_state": "Tense",   // Stress/Entertainment/Calm/Meditation
  "emotion_intensity": "High",
  "is_abnormal": false,
  "lf_hf_status": null
}
```

**WebSocket 事件**：
- 服务端每秒推送 `breathing_rate_update`：`{ br, time, timestamp }`

---

### emotion_dete.py — 情绪分类模型训练

**作用**：离线训练脚本，使用 WESAD 公开数据集训练情绪二分类模型（Arousal/Valence），生成供在线推理使用的 `.pkl` 模型文件。

**数据集**：WESAD（Wearable Stress and Affect Detection），包含 15 名被试胸部 ECG/呼吸信号。

**信号处理流程**：
1. 提取 ECG → 计算瞬时心率（NeuroKit2）
2. 提取 Resp → 计算呼吸率（NeuroKit2）
3. 降采样到 1 Hz（原始 700 Hz）
4. 60 秒滑动窗口（步长 10 秒）提取统计特征（均值、标准差、最大值、最小值、斜率）

**标签映射**（WESAD 原始标签 → 双轴）：

| WESAD 标签 | 场景 | Arousal | Valence |
|---|---|---|---|
| 1 | Baseline | 0 (Low) | 0 (Neutral) |
| 2 | Stress | 1 (High) | 0 (Negative) |
| 3 | Amusement | 1 (High) | 1 (Positive) |
| 4 | Meditation | 0 (Low) | 1 (Positive) |

**模型**：随机森林分类器，使用留一被试法（LOGO）交叉验证。

**训练产物**：
- `stress_detection_model_arousal.pkl`：Arousal 二分类模型
- `stress_detection_model_valence.pkl`：Valence 二分类模型

> **注意**：该文件为离线训练脚本，需要配置 `WESAD_ROOT_DIR` 路径后独立运行。在线推理部分通过 `data_recorder.py` 中的加权偏差公式实现，不调用此模型文件。

---

### heal_mode.py — 独立疗愈模式

**作用**：独立运行的疗愈音乐 + 灯光序列脚本，可在不启动主程序的情况下单独测试指定的声光交互方案。

**方案 A（`planA`）**：按预设时序发送 BLE 灯光颜色和震动指令，配合音频播放约 4 分钟的疗愈序列。

**运行方式**：
```bash
python heal_mode.py
# 连接到 BLE 设备 "liubai" 后，输入 A 或 B 选择方案
```

---

### radar_recoder.py — 雷达原始数据录制工具

**作用**：独立的雷达波形数据录制工具，将心率波形和呼吸波形原始数据保存到带时间戳的 CSV 文件，用于离线分析和调试。

**与 `micRadar3.py` 的区别**：
- `micRadar3.py`：解析心率/呼吸率数值，实时计算 HRV，用于主程序
- `radar_recoder.py`：录制原始波形（心率波形 5 点、呼吸波形 5 点），用于数据采集和回放

**运行方式**：
```bash
python radar_recoder.py
# 默认端口 /dev/ttyS5，录制 300 秒后停止
```

---

### ble_server.py — BLE 服务端

**作用**：BLE GATT 服务端，可将本机作为 BLE 外设广播数据（与 `ble.py` 的客户端角色相反）。主程序 `start.sh` 中已注释掉对该文件的调用，当前仅作为备用服务端实现。

---

## 状态机详解

主程序 `demo.py` 使用 `transitions` 库实现有限状态机，管理设备的行为模式。

### 状态列表

| 状态名 | 说明 |
|---|---|
| `booting` | 启动初始化状态 |
| `baseline` | 基线采集（播放 start.WAV，等待雷达数据稳定，控制底座升起） |
| `waiting` | 等待用户靠近（监测心率新鲜度） |
| `engaged` | 用户已在场（监控手势，决定进入哪种引导模式） |
| `guiding_fatigue` | 疲劳引导：播放 breath3.WAV（呼吸训练音频，最长 3 分钟） |
| `guiding_mode1` | 模式1：暖黄闪烁灯光 + 低强度震动（持续 10 秒） |
| `guiding_mode2` | 模式2：蓝紫慢流灯光 + 中强度震动（持续 8 秒） |
| `guiding_mode3` | 模式3：橙色快流灯光 + 高强度震动（持续 12 秒） |
| `desk_idle` | 桌面待机模式：柔和白光 + 每 30 秒轻微震动（最长 5 分钟） |
| `breathing_444` | 444 呼吸模式（由前端双击情绪球触发，持续 60 秒） |
| `standby` | 深度待机（霍尔值过高时触发，物体归位后恢复） |

### 状态转换图

```
booting ──start──→ baseline ──baseline_done──→ waiting
                                                  │
                                         person_detected
                                                  │
                                                  ▼
                           ┌────────────────→ engaged ←────────────────┐
                           │                    │  │                    │
                   breathing_444_done    need_mode1  need_fatigue       │
                           │             need_mode2  need_mode3         │
                           ▼             need_mode3     │               │
                    breathing_444           │            ▼               │
                    (← enter_breathing_444) │     guiding_fatigue        │
                                           ▼      (guide_finished→waiting)
                                    guiding_mode1                       │
                                    guiding_mode2   ←enter_idle──────── │
                                    guiding_mode3                       │
                                         │                              │
                                   enter_idle                           │
                                         ▼                              │
                                     desk_idle ──idle_done──→ waiting   │
                                                                        │
lost_person（任何状态）──────────────────────────────────────→ waiting ──┘

任何状态 ──enter_standby──→ standby ──standby_done──→ waiting
```

### 手势触发逻辑（陀螺仪值）

| 陀螺仪连续两次值 | 触发模式 |
|---|---|
| `[1, 1]` | `need_mode1`（暖黄闪烁） |
| `[2, 2]` | `need_mode2`（蓝紫慢流） |
| `[3, 3]` | `need_mode3`（橙色快流） |
| `[0, 0]` + 超过 10 秒无交互 | `enter_idle`（桌面待机） |

---

## 情绪识别算法

系统使用基于生理常模偏差的加权评分法，实时计算用户情绪的二维坐标（Arousal × Valence）。

### 指标说明

| 指标 | 生理意义 | 压力时变化 |
|---|---|---|
| HR（心率） | 自主神经系统活动水平 | 升高 |
| SDNN（心率变异性） | 自主神经调节能力，越高越健康 | 降低 |
| LF/HF | 交感/副交感神经平衡（>1 偏交感，<1 偏副交感） | 升高 |
| BR（呼吸率） | 呼吸模式，焦虑时加快 | 升高 |

### 偏差计算

```
指标偏差 = (当前均值 - 常模均值) / 常模标准差
```

### 情绪方程

```
Arousal = 0.4×HR偏差 + 0.01×LF/HF偏差 − 0.59×SDNN偏差
Valence = −0.7×BR偏差 + 0.3×SDNN偏差
```

### 在线推断（`/api/state` 接口）

当 `arousal_score` 和 `valence_score` 均非空时，后端以 0 为阈值二分类：

| arousal | valence | 情绪状态 (emotion_state) |
|---|---|---|
| ≥ 0 | < 0 | `Stress`（高唤醒 + 消极） |
| ≥ 0 | ≥ 0 | `Entertainment`（高唤醒 + 积极） |
| < 0 | < 0 | `Calm`（低唤醒 + 消极） |
| < 0 | ≥ 0 | `Meditation`（低唤醒 + 积极） |

---

## 前后端通信机制

```
前端 (React SPA, port 3000/dist)          后端 (Flask, port 5000)
         │                                         │
         │──── GET /api/state ──────────────────→  │  返回生理数据 JSON
         │                                         │
         │──── POST /api/special_mode ──────────→  │  触发 444 呼吸模式
         │     { command: 'enter_special_mode' }   │
         │                                         │
         │←─── WebSocket: breathing_rate_update ── │  每秒推送呼吸率
         │     { br, time, timestamp }             │
```

**开发时代理**（Vite `vite.config.ts`）：
```
前端 :3000 /api/* → 代理到 后端 :5000
```

**生产时**：前端构建产物（`around-front-master/dist/`）直接由 Flask 托管，无需代理，所有请求在同一端口（5000）完成。

---

## 数据流完整路径

```
毫米波雷达 (/dev/ttyS3)
    └─ micRadar3.py 解析帧 → heart_rate, breath_rate deque
    └─ HRVcalculate.py → SDNN, LF, HF, LF/HF

PPG BLE 设备
    └─ ble.py 解析BLE帧 → hr, blood_oxygen, rri, gyroscope
    └─ ppg.py → 同步更新 + HRV 计算

fsm.py (每秒)
    └─ update_current_data() → self.data 字典（融合双源）
    └─ update_visualizer_only() → DataVisualizer.update_data()
    └─ emotion_monitor() (每5秒) → data_recorder.record()
        └─ _calculate_emotion_scores() → arousal_score, valence_score
        └─ _save_to_csv() → personal_data.csv
        └─ _plot_deviation() → personal_data.png
        └─ 更新 fsm.arousal_score, fsm.valence_score

DataVisualizer (Flask :5000)
    └─ /api/state → 前端轮询 → 展示呼吸率/压力/HRV 图表
    └─ WebSocket → 前端实时呼吸率折线图
    └─ /api/special_mode → demo.py._handle_breathing_444_command()
        └─ dot.enter_breathing_444() → 状态机切换 → BLE 控制 + 平台升降

hall.py (/dev/ttyUSB0)
    └─ levitation 线程 → 判断悬浮状态 → 触发状态机转换
```

---

## 文件一览

| 文件 | 类型 | 说明 |
|---|---|---|
| `demo.py` | 主程序 | 状态机控制器，系统入口 |
| `fsm.py` | 核心逻辑 | 传感器融合 + 线程调度 |
| `micRadar3.py` | 传感器驱动 | 毫米波雷达串口驱动 + HRV |
| `ppg.py` | 传感器驱动 | PPG BLE 传感器驱动 |
| `ble.py` | 通信层 | BLE 客户端（数据接收 + 控制指令） |
| `HRVcalculate.py` | 算法 | HRV 时域/频域计算 |
| `hall.py` | 传感器驱动 | 霍尔传感器串口驱动 |
| `data_recorder.py` | 数据处理 | 情绪评分计算 + CSV 记录 + 可视化图 |
| `data_visualizer.py` | Web 服务 | Flask + SocketIO 服务器 + API |
| `emotion_dete.py` | 离线训练 | WESAD 情绪分类模型训练脚本 |
| `heal_mode.py` | 工具脚本 | 独立疗愈序列测试脚本 |
| `radar_recoder.py` | 工具脚本 | 雷达波形数据录制工具 |
| `ble_server.py` | 备用 | BLE GATT 服务端 |
| `start.sh` | 启动脚本 | Docker 容器入口（运行 demo.py） |
| `Dockerfile` | 容器配置 | 基于 python:3.9-bookworm |
| `docker-compose.yml` | 容器编排 | 特权模式 + host 网络 + 蓝牙挂载 |
| `requirements.txt` | 依赖清单 | 完整 Python 依赖列表 |
| `personal_data.csv` | 数据产物 | 实时情绪数据记录（持续追加） |
| `personal_data.png` | 数据产物 | 情绪象限可视化图（每次更新覆盖） |
| `stress_detection_model_arousal.pkl` | 模型 | Arousal 分类模型（备用，当前未在线调用） |
| `stress_detection_model_valence.pkl` | 模型 | Valence 分类模型（备用，当前未在线调用） |
| `breath.WAV` / `breath2.WAV` / `breath3.WAV` | 音频 | 呼吸训练引导音频 |
| `start.WAV` | 音频 | 基线采集阶段的启动提示音 |
| `around-front-master/` | 前端 | React 情绪可视化前端（见前端 README） |

---

## Docker 部署

### 构建镜像

```bash
docker compose build
# 或手动构建
docker build -t around_demo:v6 .
```

### 启动容器

```bash
docker compose up -d
```

### 关键配置说明（`docker-compose.yml`）

| 配置项 | 值 | 原因 |
|---|---|---|
| `network_mode` | `host` | 共用宿主机 IP，保证前端可通过 `localhost:5000` 访问 |
| `privileged` | `true` | 需要访问 `/dev/ttyS*`（雷达/霍尔串口）和蓝牙设备 |
| `restart` | `always` | 开机自启，断电恢复后自动重启 |
| `/var/run/dbus:/var/run/dbus:ro` | 挂载 | 蓝牙依赖 D-Bus 系统总线 |
| `/var/lib/bluetooth:/var/lib/bluetooth` | 挂载 | 保留蓝牙设备绑定信息 |
| `/etc/localtime:/etc/localtime:ro` | 挂载 | 时间戳与宿主机一致 |
| `./:/app` | 挂载 | 代码热更新，宿主机改代码后重启容器即生效 |

### Dockerfile 说明

1. **基础镜像**：`python:3.9-bookworm`（Debian 12，稳定版）
2. **APT 源**：替换为阿里云镜像加速 `apt-get install`
3. **系统依赖**：`bluez`（蓝牙）、`dbus`（D-Bus）、`libsndfile1`（音频）、`libgirepository1.0-dev`（PyGObject）
4. **pip 源**：使用阿里云 PyPI 镜像加速 `pip install`
5. **启动命令**：`CMD ["./start.sh"]`

### 查看运行日志

```bash
docker compose logs -f
# 或在容器内查看
docker exec -it around_demo6 tail -f /app/demo.log
```

---

## 本地开发运行

### 前置条件

- Python 3.9+
- 系统已安装 `bluez`（蓝牙）、`dbus`
- 已连接雷达串口（`/dev/ttyS3`）和霍尔传感器串口（`/dev/ttyUSB0`）

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动后端

```bash
python demo.py
# 后端服务启动于 http://localhost:5000
# 日志同时写入 demo.log
```

### 启动前端（开发模式）

```bash
cd around-front-master
npm install
npm run dev
# 前端启动于 http://localhost:3000
# /api/* 自动代理到 localhost:5000
```

### 构建前端（生产模式）

```bash
cd around-front-master
npx vite build
# 产物输出至 around-front-master/dist/
# 之后由 Flask 后端直接托管，访问 http://localhost:5000 即可
```

---

## 串口 & 蓝牙设备分配

| 设备 | 文件/路径 | 可配置位置 |
|---|---|---|
| 毫米波雷达 | `/dev/ttyS3` | `fsm.py` 第 73 行 `MicRadar(port='/dev/ttyS3')` |
| 霍尔传感器 | `/dev/ttyUSB0` | `demo.py` 第 53 行 `hall(port='/dev/ttyUSB0')` |
| PPG BLE 设备 | 设备名 `demo3` | `demo.py` 第 45 行 `BLE(device_name="demo3")` |
| 雷达录制工具 | `/dev/ttyS5` | `radar_recoder.py` 第 195 行 |
| 疗愈模式 BLE | 设备名 `liubai` | `heal_mode.py` 第 9 行 |

---

## 数据持久化

| 文件 | 格式 | 说明 |
|---|---|---|
| `personal_data.csv` | CSV，追加写入 | 每 5 秒一行，含所有生理指标统计 + 情绪分数 |
| `personal_data.png` | PNG 图像 | 每次更新覆盖，展示最新情绪象限图 |
| `demo.log` | 文本，追加写入 | 所有 stdout/stderr 日志，每次启动加分隔线 |
| `radar_data_YYYYMMDD_HHMMSS.csv` | CSV | 由 `radar_recoder.py` 生成的原始波形数据 |

---

## 前端说明

前端位于 `around-front-master/` 目录，详细说明请参阅 [around-front-master/README.md](around-front-master/README.md)。

**快速说明**：
- 技术栈：React 18 + TypeScript + Vite + Tailwind CSS
- 开发端口：3000（代理 `/api/*` 到后端 5000）
- 生产构建：`npx vite build` → 产物在 `dist/`，由 Flask 直接托管
- 主要功能：登录页、情绪球体、7 天日历、小时段情绪、生理指标弹窗（呼吸率/压力/HRV）、情绪图集（3D Canvas）、用户资料、呼吸训练报告

---

> **交接说明**：如需在新设备上部署，主要需要确认串口路径（`/dev/ttyS3`、`/dev/ttyUSB0`）和 BLE 设备名（`demo3`）与实际硬件一致，修改对应位置后重新 `docker compose build && docker compose up -d` 即可。
