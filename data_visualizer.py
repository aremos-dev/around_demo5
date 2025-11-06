import io
import time
import threading
from collections import deque
from flask import Flask, Response, render_template_string
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from scipy.interpolate import make_interp_spline
matplotlib.use('Agg')

# Configure matplotlib font preferences
matplotlib.rcParams['font.family'] = 'sans-serif'
matplotlib.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial Unicode MS', 'Noto Sans CJK SC']
matplotlib.rcParams['axes.unicode_minus'] = False  # ensure minus sign displays correctly


class DataVisualizer:
    """Real-time data visualizer"""
    
    def __init__(self, max_data_points=100, plot_refresh_fps=10, port=5000):
        """
        Initialize the data visualizer

        Args:
            max_data_points: maximum number of data points shown on plots
            plot_refresh_fps: refresh rate of the animated plots (frames per second)
            port: Flask server port
        """
        self.max_data_points = max_data_points
        self.plot_refresh_fps = plot_refresh_fps
        self.port = port
        
        # 使用线程锁来确保在读写数据时不会发生冲突
        self.data_lock = threading.Lock()
        
        # 使用deque可以高效地在末尾添加新数据并从开头删除旧数据
        self.data_history = {
            'hr': deque(maxlen=max_data_points),
            'br': deque(maxlen=max_data_points),
            'lf_hf_ratio': deque(maxlen=max_data_points),
            'hf': deque(maxlen=max_data_points),
            'lf': deque(maxlen=max_data_points),
            'sdnn': deque(maxlen=max_data_points),
            'spo2': deque(maxlen=max_data_points),  # 血氧饱和度
            'time': deque(maxlen=max_data_points)
        }
        
        # LF/HF 比值
        self.lf_hf_ratio = 1.0  # 默认比值
        # 用于显示基线与常模对比的评估状态（例如：'偏高','正常','偏低'）
        self.lf_hf_status = None
        self.is_abnormal_state = False  # 标记是否处于异常状态（用于改变心率呼吸图表颜色）
        
        self.start_time = time.time()
        
        # 创建Flask应用
        self.app = Flask(__name__)
        self._setup_routes()
        
        # Flask应用线程
        self.server_thread = None
        self.running = False
    
    def update_data(self, data_dict):
        """
        更新数据到可视化器
        
        Args:
            data_dict: 包含 hr, br, LF, HF 的字典
        """
        # 获取当前时间戳（相对于程序开始的时间）
        current_time = time.time() - self.start_time
        
        # 使用锁来安全地更新共享数据
        with self.data_lock:
            self.data_history['time'].append(current_time)
            for key in ['hr', 'br', 'spo2']:
                # 如果数据中缺少某个值，就用最后一个值填充，避免图像断裂
                last_value = self.data_history[key][-1] if len(self.data_history[key]) > 0 else 0
                value = data_dict.get(key, last_value)
                
                # 对血氧值进行范围限制：小于80取80，大于100取100
                if key == 'spo2' and value is not None:
                    value = max(80, min(100, float(value)))
                
                self.data_history[key].append(float(value) if value is not None else last_value)
            
            # 更新 HF 和 LF 数据
            for key in ['hf', 'lf']:
                last_value = self.data_history[key][-1] if len(self.data_history[key]) > 0 else 0
                value = data_dict.get(key.upper(), last_value)
                self.data_history[key].append(float(value) if value is not None else last_value)
            
            # 更新 SDNN 数据
            last_sdnn = self.data_history['sdnn'][-1] if len(self.data_history['sdnn']) > 0 else 50
            sdnn_value = data_dict.get('SDNN', last_sdnn)
            self.data_history['sdnn'].append(float(sdnn_value) if sdnn_value is not None else last_sdnn)
            
            # 计算 LF/HF 比值
            lf_value = data_dict.get('LF', None)
            hf_value = data_dict.get('HF', None)
            
            if lf_value is not None and hf_value is not None and hf_value > 0:
                ratio = lf_value / hf_value
                self.lf_hf_ratio = ratio
                self.data_history['lf_hf_ratio'].append(ratio)
                
                # 自动判断是否为异常状态（如果没有通过set_lf_hf_assessment设置）
                if self.lf_hf_status is None:
                    norm_mean = 2.79
                    norm_std = 3.20
                    low_threshold = max(0, norm_mean - norm_std)
                    high_threshold = norm_mean + norm_std
                    
                    if ratio <= low_threshold or ratio >= high_threshold:
                        self.is_abnormal_state = True
                    else:
                        self.is_abnormal_state = False
            else:
                last_ratio = self.data_history['lf_hf_ratio'][-1] if len(self.data_history['lf_hf_ratio']) > 0 else 1.0
                self.lf_hf_ratio = last_ratio
                self.data_history['lf_hf_ratio'].append(last_ratio)

    
    def _setup_routes(self):
        """Setup Flask routes"""
        
        HTML_TEMPLATE = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Real-time Vital Signs Monitor</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body { 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    color: white;
                }
                
                .header h1 {
                    font-size: 2.5em;
                    font-weight: 700;
                    margin-bottom: 10px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .header p {
                    font-size: 1.1em;
                    opacity: 0.9;
                }
                
                .grid-container {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 25px;
                    max-width: 1800px;
                    margin: 0 auto;
                }
                
                .grid-row-2 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 25px;
                    max-width: 1800px;
                    margin: 25px auto 0;
                }
                
                .plot-card {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    padding: 25px;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    padding: 25px;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .plot-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
                }
                
                .plot-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                }
                
                .plot-card.heart::before {
                    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
                }
                
                .plot-card.breath::before {
                    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                }
                
                .plot-card.ratio::before {
                    background: linear-gradient(90deg, #ffeaa7 0%, #fd79a8 100%);
                }
                
                .plot-card.hf::before {
                    background: linear-gradient(90deg, #a29bfe 0%, #6c5ce7 100%);
                }
                
                .plot-card.lf::before {
                    background: linear-gradient(90deg, #fab1a0 0%, #e17055 100%);
                }
                
                .plot-card.sdnn::before {
                    background: linear-gradient(90deg, #81ecec 0%, #00cec9 100%);
                }
                
                .plot-card.spo2::before {
                    background: linear-gradient(90deg, #ff9ff3 0%, #feca57 100%);
                }
                
                .plot-card.hf_lf::before {
                    background: linear-gradient(90deg, #dfe6e9 0%, #74b9ff 100%);
                }
                
                .card-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                .card-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-right: 15px;
                }
                
                .heart .card-icon {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);
                }
                
                .breath .card-icon {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
                }
                
                .ratio .card-icon {
                    background: linear-gradient(135deg, #ffeaa7 0%, #fd79a8 100%);
                    box-shadow: 0 4px 15px rgba(253, 121, 168, 0.3);
                }
                
                .hf .card-icon {
                    background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
                    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
                }
                
                .lf .card-icon {
                    background: linear-gradient(135deg, #fab1a0 0%, #e17055 100%);
                    box-shadow: 0 4px 15px rgba(225, 112, 85, 0.3);
                }
                
                .sdnn .card-icon {
                    background: linear-gradient(135deg, #81ecec 0%, #00cec9 100%);
                    box-shadow: 0 4px 15px rgba(0, 206, 201, 0.3);
                }
                
                .spo2 .card-icon {
                    background: linear-gradient(135deg, #ff9ff3 0%, #feca57 100%);
                    box-shadow: 0 4px 15px rgba(254, 202, 87, 0.3);
                }
                
                .hf_lf .card-icon {
                    background: linear-gradient(135deg, #dfe6e9 0%, #74b9ff 100%);
                    box-shadow: 0 4px 15px rgba(116, 185, 255, 0.3);
                }
                
                .card-title {
                    flex: 1;
                }
                
                .card-title h2 {
                    font-size: 1.4em;
                    font-weight: 600;
                    color: #2d3748;
                    margin-bottom: 3px;
                }
                
                .card-title p {
                    font-size: 0.9em;
                    color: #718096;
                }
                
                .plot-container {
                    border-radius: 12px;
                    overflow: hidden;
                    background: #fafafa;
                    padding: 10px;
                }
                
                .plot-container img {
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                }
                
                @media (max-width: 768px) {
                    .grid-container {
                        grid-template-columns: 1fr;
                    }
                    
                    .header h1 {
                        font-size: 2em;
                    }
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #48bb78;
                    animation: pulse 2s infinite;
                    margin-right: 8px;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🫀 Real-time Vital Signs Monitor</h1>
                <p><span class="status-indicator"></span>System running - Live data updating</p>
            </div>
            
            <div class="grid-container">
                <div class="plot-card heart">
                    <div class="card-header">
                        <div class="card-icon">❤️</div>
                        <div class="card-title">
                            <h2>Heart Rate</h2>
                            <p>Heart Rate Monitor</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/hr.png" alt="Heart Rate">
                    </div>
                </div>
                
                <div class="plot-card breath">
                    <div class="card-header">
                        <div class="card-icon">🌬️</div>
                        <div class="card-title">
                            <h2>Respiration Rate</h2>
                            <p>Respiration Rate Monitor</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/br.png" alt="Respiration Rate">
                    </div>
                </div>
                
                <div class="plot-card ratio">
                    <div class="card-header">
                        <div class="card-icon">�</div>
                        <div class="card-title">
                            <h2>Body Status</h2>
                            <p>Body Status</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/lf_hf_ratio.png" alt="LF/HF Ratio">
                    </div>
                </div>
                
                <div class="plot-card sdnn">
                    <div class="card-header">
                        <div class="card-icon">💪</div>
                        <div class="card-title">
                            <h2>Body Stress</h2>
                            <p>Body Stress (SDNN)</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/sdnn.png" alt="SDNN">
                    </div>
                </div>
                
                <div class="plot-card spo2">
                    <div class="card-header">
                        <div class="card-icon">🩸</div>
                        <div class="card-title">
                            <h2>Blood Oxygen Saturation</h2>
                            <p>Blood Oxygen (SpO2)</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/spo2.png" alt="Blood Oxygen">
                    </div>
                </div>
                
                <div class="plot-card hf_lf">
                    <div class="card-header">
                        <div class="card-icon">📈</div>
                        <div class="card-title">
                            <h2>HF & LF</h2>
                            <p>Frequency Analysis</p>
                        </div>
                    </div>
                    <div class="plot-container">
                        <img src="/plot/hf_lf.png" alt="HF and LF">
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        @self.app.route('/')
        def index():
            return render_template_string(HTML_TEMPLATE)
        
        @self.app.route('/plot/<plot_id>.png')
        def plot_feed(plot_id):
            if plot_id == 'lf_hf_ratio':
                return Response(self._generate_gauge_frames(),
                              mimetype='multipart/x-mixed-replace; boundary=frame')
            elif plot_id == 'hf_lf':
                return Response(self._generate_hf_lf_frames(),
                              mimetype='multipart/x-mixed-replace; boundary=frame')
            elif plot_id in self.data_history:
                return Response(self._generate_plot_frames(plot_id),
                              mimetype='multipart/x-mixed-replace; boundary=frame')
            else:
                return "Plot ID not found", 404
    
    def _smooth_data(self, x_data, y_data, smooth_factor=None):
        """使用样条插值平滑数据。

        优化说明：为了减少每帧计算量，使用自适应的平滑点数（而不是总是用300）。
        当数据点较少时不使用样条插值，避免不必要的计算开销。
        """
        # 样条插值至少需要4个点
        if len(x_data) < 4:
            return x_data, y_data

        # 自适应 smooth_factor，防止过大计算开销
        if smooth_factor is None:
            # 每个原始点生成约3个插值点，但限制在合理范围内
            smooth_factor = min(150, max(30, len(x_data) * 3))

        try:
            # 将数据转换为numpy数组
            x_np = np.array(x_data)
            y_np = np.array(y_data)

            # 创建样条插值（保留 k=3 三次样条以获得平滑效果）
            spl = make_interp_spline(x_np, y_np, k=3)

            # 生成较少的点以实现平滑效果，减轻计算负担
            x_smooth = np.linspace(x_np.min(), x_np.max(), int(smooth_factor))
            y_smooth = spl(x_smooth)

            return x_smooth, y_smooth
        except Exception:
            # 如果平滑失败，返回原始数据（保持鲁棒性）
            return x_data, y_data
    
    def _generate_plot_frames(self, plot_id):
        """为指定的plot_id生成图像帧"""
        while self.running:
            t0 = time.time()
            # 设置图形样式
            fig = Figure(figsize=(7, 4.5), dpi=100)
            fig.patch.set_facecolor('#fafafa')
            axis = fig.add_subplot(1, 1, 1)
            
            with self.data_lock:
                # 复制数据以避免在绘图时数据被修改
                x_data = list(self.data_history['time'])
                y_data = list(self.data_history[plot_id])
                is_abnormal = self.is_abnormal_state

            if x_data and len(x_data) > 1:  # 只有在有足够数据时才绘图
                # 数据平滑处理
                x_smooth, y_smooth = self._smooth_data(x_data, y_data)
                
                # 根据不同类型设置不同的颜色和样式
                if plot_id == 'hr':
                    ylabel = "BPM"
                    if is_abnormal:
                        # 异常状态：使用深橙色（区别于正常的粉红色）
                        color = '#ff6b35'
                        gradient_color = '#ffa500'
                        title = "Heart Rate"
                        show_warning = True
                    else:
                        # 正常状态：使用原始颜色
                        color = '#f5576c'
                        gradient_color = '#f093fb'
                        title = "Heart Rate"
                        show_warning = False
                elif plot_id == 'br':
                    ylabel = "RPM"
                    if is_abnormal:
                        # 异常状态：使用警告色（橙色）
                        color = '#ff9500'
                        gradient_color = '#ffb84d'
                        title = "Respiration Rate"
                        show_warning = True
                    else:
                        # 正常状态：使用原始颜色
                        color = '#00f2fe'
                        gradient_color = '#4facfe'
                        title = "Respiration Rate"
                        show_warning = False
                elif plot_id == 'hf':
                    color = '#6c5ce7'
                    gradient_color = '#a29bfe'
                    title = "High Frequency (HF)"
                    ylabel = "Power (ms²)"
                    show_warning = False
                elif plot_id == 'lf':
                    color = '#e17055'
                    gradient_color = '#fab1a0'
                    title = "Low Frequency (LF)"
                    ylabel = "Power (ms²)"
                    show_warning = False
                elif plot_id == 'sdnn':
                    color = '#00cec9'
                    gradient_color = '#81ecec'
                    title = "SDNN (Body Stress)"
                    ylabel = "SDNN (ms)"
                    show_warning = False
                elif plot_id == 'spo2':
                    color = '#feca57'
                    gradient_color = '#ff9ff3'
                    title = "Blood Oxygen Saturation (SpO2)"
                    ylabel = "SpO2 (%)"
                    show_warning = False
                else:
                    color = '#667eea'
                    gradient_color = '#764ba2'
                    title = f"{plot_id.upper()}"
                    ylabel = "Value"
                    show_warning = False
                
                # 绘制平滑的线条
                line = axis.plot(x_smooth, y_smooth, color=color, linewidth=2.5, 
                                label=title, alpha=0.9)[0]
                
                # 添加渐变填充效果
                axis.fill_between(x_smooth, y_smooth, alpha=0.15, color=gradient_color)
                
                # 设置标题和标签（使用matplotlib配置的中文字体）
                axis.set_title(title, fontsize=14, fontweight='bold', 
                              color='#2d3748', pad=15)
                axis.set_xlabel("Time (s)", fontsize=11, color='#4a5568', 
                              fontweight='500')
                axis.set_ylabel(ylabel, fontsize=11, color='#4a5568', 
                              fontweight='500')
                
                # 美化网格
                axis.grid(True, linestyle='--', alpha=0.3, color='#cbd5e0', linewidth=0.8)
                axis.set_axisbelow(True)
                
                # 设置背景颜色
                axis.set_facecolor('#ffffff')
                
                # 设置坐标轴样式
                axis.spines['top'].set_visible(False)
                axis.spines['right'].set_visible(False)
                axis.spines['left'].set_color('#e2e8f0')
                axis.spines['bottom'].set_color('#e2e8f0')
                axis.spines['left'].set_linewidth(1.5)
                axis.spines['bottom'].set_linewidth(1.5)
                
                # 设置刻度样式
                axis.tick_params(colors='#718096', labelsize=9)
                
                # === 添加美观的警告标识（如果处于异常状态）===
                if show_warning:
                    # 在图表右上角添加警告标识
                    # 创建一个醒目的警告图标
                    warning_x = 0.95  # 相对于坐标轴的位置
                    warning_y = 0.95
                    
                    # 绘制警告背景圆形（带阴影效果）
                    warning_circle = plt.matplotlib.patches.Circle(
                        (warning_x, warning_y), 0.045,
                        transform=axis.transAxes,
                        facecolor='#ff6b35', edgecolor='white', 
                        linewidth=3, zorder=100
                    )
                    axis.add_patch(warning_circle)
                    
                    # 添加感叹号文字
                    axis.text(warning_x, warning_y, '!', 
                             transform=axis.transAxes,
                             ha='center', va='center',
                             fontsize=22, color='white', 
                             weight='bold', zorder=101,
                             family='sans-serif')
                    
                    # 添加警告说明文字
                    axis.text(0.95, 0.85, 'Abnormal', 
                             transform=axis.transAxes,
                             ha='right', va='top',
                             fontsize=10, color='#ff6b35', 
                             weight='bold', zorder=101,
                             bbox=dict(boxstyle='round,pad=0.4', 
                                      facecolor='white', 
                                      edgecolor='#ff6b35', 
                                      linewidth=1.5, alpha=0.9))
                
                # 自动调整坐标轴范围
                if len(x_data) > 1:
                    axis.set_xlim(x_data[0], x_data[-1])
                    
                # 设置Y轴范围
                if plot_id == 'hr':
                    # 心率：固定范围 40-180 BPM（覆盖运动心率）
                    min_hr = min(min(y_data), 60)
                    max_hr = max(max(y_data), 100)
                    axis.set_ylim(min_hr - 5, max_hr + 5)
                elif plot_id == 'br':
                    # 呼吸率：固定范围 5-40 RPM
                    min_br = min(min(y_data), 10)
                    max_br = max(max(y_data), 30)
                    axis.set_ylim(min_br - 2, max_br + 2)
                elif plot_id in ['hf', 'lf']:
                    # HF和LF：动态调整，但确保从0开始
                    max_val = max(y_data) if y_data else 100
                    axis.set_ylim(0, max_val * 1.1)
                elif plot_id == 'sdnn':
                    # SDNN：通常在20-100ms范围内
                    min_sdnn = min(min(y_data), 30)
                    max_sdnn = max(max(y_data), 80)
                    axis.set_ylim(max(0, min_sdnn - 10), max_sdnn + 10)
                elif plot_id == 'spo2':
                    # 血氧饱和度：固定范围 0-100%
                    axis.set_ylim(0, 100)
                else:
                    # 其他数据：动态调整，留出一些边距
                    y_range = max(y_data) - min(y_data)
                    if y_range > 0:
                        axis.set_ylim(min(y_data) - y_range * 0.1, 
                                     max(y_data) + y_range * 0.1)

            fig.tight_layout(pad=1.5)  # 调整布局防止标签重叠
            
            output = io.BytesIO()
            FigureCanvas(fig).print_png(output)
            t1 = time.time()
            try:
                print(f"[TIMING] plot_{plot_id}_frame_total={t1-t0:.3f}s")
            except Exception:
                # 确保测时打印不会影响主逻辑
                pass
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/png\r\n\r\n' + output.getvalue() + b'\r\n')
            
            # 控制网页刷新率
            time.sleep(1 / self.plot_refresh_fps)
    
    def _generate_gauge_frames(self):
        """生成LF/HF比值仪表盘图像帧 - 高端半圆弧设计，三区域等宽"""
        while self.running:
            t0 = time.time()
            # 降低 DPI 以减少每帧渲染开销（仍保持视觉可读性）
            fig = Figure(figsize=(8, 5), dpi=100)
            fig.patch.set_facecolor('#fafafa')
            axis = fig.add_subplot(1, 1, 1)
            axis.set_aspect('equal')
            
            with self.data_lock:
                ratio = self.lf_hf_ratio
                status = self.lf_hf_status
            
            # 常模参数（与FSM中的常模一致）
            norm_mean = 2.79
            norm_std = 3.20
            
            # 计算实际的阈值（基于常模的标准差）
            low_threshold_calc = norm_mean - norm_std    # -0.41，不合理
            high_threshold_calc = norm_mean + norm_std   # 5.99
            
            # 使用更合理的阈值用于判断和显示
            # 根据医学研究，LF/HF比值的合理范围：
            # < 1.5: 副交感神经占优（偏低）
            # 1.5 - 6.0: 正常平衡范围
            # > 6.0: 交感神经占优（偏高）
            low_threshold = 1.5   # 下界阈值
            high_threshold = 6.0  # 上界阈值
            
            # 定义仪表盘显示范围
            display_min = 0.5     # 仪表盘最小值
            display_max = 10.0    # 仪表盘最大值
            
            # 处理None值
            if ratio is None or ratio < 0:
                ratio = display_min
            
            # 限制ratio在显示范围内用于显示
            ratio_display = max(display_min, min(display_max, ratio))
            
            # 将ratio映射到角度（180度到0度，从左到右）
            # 线性映射整个范围到半圆
            angle = 180 - (ratio_display - display_min) / (display_max - display_min) * 180
            
            # 圆心和半径
            cx, cy = 0.5, 0.3
            outer_radius = 0.35
            inner_radius = 0.25
            arc_width = outer_radius - inner_radius
            
            # === 绘制平滑过渡的渐变色圆弧背景 ===
            # 减少分段数以显著降低每帧绘制的补丁数量（性能优化）
            n_segments = 120  # 120 分段在视觉上仍然足够平滑，但渲染快得多
            
            # 整个半圆弧：0° 到 180°
            theta_all = np.linspace(0, 180, n_segments)
            
            # 定义三个关键颜色点（RGB格式）
            color_high = np.array([231, 76, 60]) / 255.0    # 偏高：红色 #e74c3c
            color_normal = np.array([39, 174, 96]) / 255.0  # 正常：绿色 #27ae60
            color_low = np.array([52, 152, 219]) / 255.0    # 偏低：蓝色 #3498db
            
            # 计算阈值对应的角度位置
            low_threshold_angle = 180 - (low_threshold - display_min) / (display_max - display_min) * 180
            high_threshold_angle = 180 - (high_threshold - display_min) / (display_max - display_min) * 180
            
            # 为每个角度计算颜色和透明度
            for i, t in enumerate(theta_all[:-1]):
                # 根据角度判断所在区域
                if t < high_threshold_angle:  # 右侧：偏高区域（0° - high_threshold_angle）
                    # 从最右侧的深红色渐变到high_threshold_angle的正常绿色
                    blend = t / high_threshold_angle if high_threshold_angle > 0 else 0
                    color = color_high * (1 - blend) + color_normal * blend
                    alpha = 0.5 + 0.2 * (1 - blend)
                    
                elif t < low_threshold_angle:  # 中间：正常区域
                    # 保持绿色
                    color = color_normal
                    alpha = 0.6
                    
                else:  # 左侧：偏低区域（low_threshold_angle - 180°）
                    # 从low_threshold_angle的正常绿色渐变到180°的蓝色
                    blend = (t - low_threshold_angle) / (180 - low_threshold_angle) if (180 - low_threshold_angle) > 0 else 0
                    color = color_normal * (1 - blend) + color_low * blend
                    alpha = 0.5 + 0.2 * blend
                
                # 绘制扇形
                wedge = plt.matplotlib.patches.Wedge(
                    (cx, cy), outer_radius, t, theta_all[i+1],
                    width=arc_width, 
                    facecolor=color, alpha=alpha,
                    edgecolor='none', linewidth=0
                )
                axis.add_patch(wedge)
            
            # === 绘制内圈 ===
            circle_inner = plt.matplotlib.patches.Circle(
                (cx, cy), inner_radius, fill=True, 
                facecolor='#f7fafc', edgecolor='none', linewidth=0, zorder=5
            )
            axis.add_patch(circle_inner)
            
            # === 绘制阈值刻度线 ===
            tick_inner_radius = inner_radius - 0.02  # 刻度线内端点
            tick_outer_radius = outer_radius + 0.02  # 刻度线外端点
            
            # 低阈值刻度线（标识正常和偏低的分界）
            low_tick_angle = low_threshold_angle  # 使用计算出的实际角度
            low_tick_rad = np.deg2rad(low_tick_angle)
            low_tick_x1 = cx + tick_inner_radius * np.cos(low_tick_rad)
            low_tick_y1 = cy + tick_inner_radius * np.sin(low_tick_rad)
            low_tick_x2 = cx + tick_outer_radius * np.cos(low_tick_rad)
            low_tick_y2 = cy + tick_outer_radius * np.sin(low_tick_rad)
            # 绘制刻度线（蓝色，较粗）
            axis.plot([low_tick_x1, low_tick_x2], [low_tick_y1, low_tick_y2], 
                     color='#3498db', linewidth=4, zorder=10, solid_capstyle='round')
            
            # 高阈值刻度线（标识正常和偏高的分界）
            high_tick_angle = high_threshold_angle  # 使用计算出的实际角度
            high_tick_rad = np.deg2rad(high_tick_angle)
            high_tick_x1 = cx + tick_inner_radius * np.cos(high_tick_rad)
            high_tick_y1 = cy + tick_inner_radius * np.sin(high_tick_rad)
            high_tick_x2 = cx + tick_outer_radius * np.cos(high_tick_rad)
            high_tick_y2 = cy + tick_outer_radius * np.sin(high_tick_rad)
            # 绘制刻度线（红色，较粗）
            axis.plot([high_tick_x1, high_tick_x2], [high_tick_y1, high_tick_y2], 
                     color='#c0392b', linewidth=4, zorder=10, solid_capstyle='round')
            
            # === 绘制指针 ===
            angle_rad = np.deg2rad(angle)
            # 指针从圆心延伸到外圈
            pointer_length = outer_radius * 0.95
            px = cx + pointer_length * np.cos(angle_rad)
            py = cy + pointer_length * np.sin(angle_rad)
            
            # 绘制指针阴影
            axis.plot([cx, px+0.005], [cy, py-0.005], color='#00000030', 
                     linewidth=5, zorder=11, solid_capstyle='round')
            
            # 绘制主指针
            axis.plot([cx, px], [cy, py], color='#2c3e50', 
                     linewidth=4.5, zorder=12, solid_capstyle='round')
            
            # 指针尖端圆点
            axis.plot(px, py, 'o', markersize=10, color='#2c3e50', 
                     zorder=13, markeredgecolor='white', markeredgewidth=2)
            
            # 中心装饰圆
            axis.plot(cx, cy, '-', markersize=16, color='#34495e', 
                     zorder=14, markeredgecolor='white', markeredgewidth=2.5)
            
            # === 中心状态显示 ===
            # 判断状态和颜色
            if status is not None:
                display_text = status
                if '偏高' in status or 'HIGH' in status.upper():
                    text_color = '#c0392b'
                    icon = '!'
                    eng_text = 'High'
                    eng_exp = 'SNS Dominant'
                elif '正常' in status or 'NORMAL' in status.upper() or 'BALANCED' in status.upper():
                    text_color = '#27ae60'
                    icon = '+'
                    eng_text = 'Normal'
                    eng_exp = 'ANS Balanced'
                elif '偏低' in status or 'LOW' in status.upper():
                    text_color = '#3498db'
                    icon = '-'
                    eng_text = 'Low'
                    eng_exp = 'PNS Dominant'
                else:
                    text_color = '#2c3e50'
                    icon = 'o'
                    eng_text = status
                    eng_exp = 'Monitoring'
            else:
                if ratio <= low_threshold:
                    text_color = '#3498db'
                    icon = '-'
                    eng_text = 'Low'
                    eng_exp = 'PNS Dominant'
                elif ratio <= high_threshold:
                    text_color = '#27ae60'
                    icon = '+'
                    eng_text = 'Normal'
                    eng_exp = 'ANS Balanced'
                else:
                    text_color = '#c0392b'
                    icon = '!'
                    eng_text = 'High'
                    eng_exp = 'SNS Dominant'
            
            # 显示状态图标
            axis.text(cx, cy + 0.12, icon, ha='center', va='center',
                     fontsize=36, color=text_color,
                     zorder=15, weight='bold')
            
            # 显示状态文字
            axis.text(cx, cy + 0.02, eng_text, ha='center', va='center',
                     fontsize=32, fontweight='bold', color=text_color,
                     zorder=20)
            
            # 显示标题
            axis.text(cx, cy - 0.08, 'LF/HF Ratio', ha='center', va='center',
                     fontsize=11, color='#7f8c8d',
                     zorder=20)
            
            # 底部说明文字
            axis.text(cx, cy - 0.15, eng_exp, ha='center', va='center',
                     fontsize=14, color="#718096", style='italic',
                     zorder=20)
            
            # === 添加阈值标签 ===
            # 低阈值标签（下界，标识偏低和正常的分界）
            low_label_angle = low_threshold_angle
            low_label_rad = np.deg2rad(low_label_angle)
            low_label_radius = outer_radius + 0.09
            low_x = cx + low_label_radius * np.cos(low_label_rad)
            low_y = cy + low_label_radius * np.sin(low_label_rad)
            axis.text(low_x, low_y, f'{low_threshold:.1f}', 
                     ha='center', va='bottom',
                     fontsize=11, color='#3498db', weight='bold',
                     bbox=dict(boxstyle='round,pad=0.4', facecolor='white', 
                              edgecolor='#3498db', linewidth=2),
                     zorder=25)
            
            # 高阈值标签（上界，标识正常和偏高的分界）
            high_label_angle = high_threshold_angle
            high_label_rad = np.deg2rad(high_label_angle)
            high_label_radius = outer_radius + 0.09
            high_x = cx + high_label_radius * np.cos(high_label_rad)
            high_y = cy + high_label_radius * np.sin(high_label_rad)
            axis.text(high_x, high_y, f'{high_threshold:.1f}', 
                     ha='center', va='bottom',
                     fontsize=11, color='#c0392b', weight='bold',
                     bbox=dict(boxstyle='round,pad=0.4', facecolor='white', 
                              edgecolor='#c0392b', linewidth=2),
                     zorder=25)
            
            # 添加当前数值显示（在仪表盘底部）
            axis.text(cx, cy - 0.22, f'Current: {ratio:.2f}', 
                     ha='center', va='center',
                     fontsize=12, color='#2c3e50', weight='bold',
                     zorder=20)
            
            # === 设置坐标轴 ===
            axis.set_xlim(0, 1)
            axis.set_ylim(0, 0.8)
            axis.axis('off')
            
            fig.tight_layout()
            
            output = io.BytesIO()
            FigureCanvas(fig).print_png(output)
            t1 = time.time()
            try:
                print(f"[TIMING] gauge_frame_total={t1-t0:.3f}s")
            except Exception:
                pass
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/png\r\n\r\n' + output.getvalue() + b'\r\n')
            
            time.sleep(1 / self.plot_refresh_fps)
    
    def _generate_hf_lf_frames(self):
        """生成HF和LF组合图表帧"""
        while self.running:
            t0 = time.time()
            fig = Figure(figsize=(7, 4.5), dpi=100)
            fig.patch.set_facecolor('#fafafa')
            axis = fig.add_subplot(1, 1, 1)
            
            with self.data_lock:
                # 复制数据以避免在绘图时数据被修改
                x_data = list(self.data_history['time'])
                hf_data = list(self.data_history['hf'])
                lf_data = list(self.data_history['lf'])

            if x_data and len(x_data) > 1:
                # 数据平滑处理
                x_smooth_hf, hf_smooth = self._smooth_data(x_data, hf_data)
                x_smooth_lf, lf_smooth = self._smooth_data(x_data, lf_data)
                
                # 绘制HF线条
                axis.plot(x_smooth_hf, hf_smooth, color='#6c5ce7', linewidth=2.5, 
                         label='HF (High Frequency)', alpha=0.9)
                axis.fill_between(x_smooth_hf, hf_smooth, alpha=0.15, color='#a29bfe')
                
                # 绘制LF线条
                axis.plot(x_smooth_lf, lf_smooth, color='#e17055', linewidth=2.5, 
                         label='LF (Low Frequency)', alpha=0.9)
                axis.fill_between(x_smooth_lf, lf_smooth, alpha=0.15, color='#fab1a0')
                
                # 设置标题和标签
                axis.set_title("HF & LF Power", fontsize=14, fontweight='bold', 
                              color='#2d3748', pad=15)
                axis.set_xlabel("Time (s)", fontsize=11, color='#4a5568', 
                              fontweight='500')
                axis.set_ylabel("Power (ms²)", fontsize=11, color='#4a5568', 
                              fontweight='500')
                
                # 添加图例
                axis.legend(loc='upper right', frameon=True, fancybox=True, 
                           shadow=True, fontsize=9)
                
                # 美化网格
                axis.grid(True, linestyle='--', alpha=0.3, color='#cbd5e0', linewidth=0.8)
                axis.set_axisbelow(True)
                
                # 设置背景颜色
                axis.set_facecolor('#ffffff')
                
                # 设置坐标轴样式
                axis.spines['top'].set_visible(False)
                axis.spines['right'].set_visible(False)
                axis.spines['left'].set_color('#e2e8f0')
                axis.spines['bottom'].set_color('#e2e8f0')
                axis.spines['left'].set_linewidth(1.5)
                axis.spines['bottom'].set_linewidth(1.5)
                
                # 设置刻度样式
                axis.tick_params(colors='#718096', labelsize=9)
                
                # 自动调整坐标轴范围
                if len(x_data) > 1:
                    axis.set_xlim(x_data[0], x_data[-1])
                
                # Y轴从0开始，动态调整上限
                max_val = max(max(hf_data), max(lf_data)) if hf_data and lf_data else 100
                axis.set_ylim(0, max_val * 1.1)

            fig.tight_layout(pad=1.5)
            
            output = io.BytesIO()
            FigureCanvas(fig).print_png(output)
            t1 = time.time()
            try:
                print(f"[TIMING] hf_lf_frame_total={t1-t0:.3f}s")
            except Exception:
                pass
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/png\r\n\r\n' + output.getvalue() + b'\r\n')
            
            time.sleep(1 / self.plot_refresh_fps)
    
    def start_server(self):
        """启动Flask服务器"""
        if not self.running:
            self.running = True
            self.server_thread = threading.Thread(
                target=lambda: self.app.run(host='0.0.0.0', port=self.port, debug=False),
                daemon=True
            )
            self.server_thread.start()
            print(f"[INFO] Data visualizer server started, access at: http://localhost:{self.port}")

    def set_lf_hf_assessment(self, ratio, status=None):
        """External interface: set LF/HF ratio and assessment status.

        ratio: numeric value or None
        status: assessment string (e.g. 'High', 'Normal', 'Low' or 'HIGH SNS')
        """
        with self.data_lock:
            if ratio is not None:
                self.lf_hf_ratio = float(ratio)
            else:
                self.lf_hf_ratio = None
            self.lf_hf_status = status
            
            # 判断是否为异常状态
            if status is not None:
                status_lower = status.lower()
                # 如果状态包含 '偏高'、'偏低'、'high'、'low' 等关键词，标记为异常
                if ('偏高' in status or '偏低' in status or 
                    'high' in status_lower or 'low' in status_lower or
                    'sns dominant' in status_lower or 'pns dominant' in status_lower):
                    # 但排除 'normal' 和 '正常'
                    if 'normal' not in status_lower and '正常' not in status:
                        self.is_abnormal_state = True
                    else:
                        self.is_abnormal_state = False
                else:
                    self.is_abnormal_state = False
            else:
                # 如果没有状态，根据ratio值判断
                if ratio is not None:
                    # 使用与仪表盘相同的阈值
                    norm_mean = 2.79
                    norm_std = 3.20
                    low_threshold = max(0, norm_mean - norm_std)
                    high_threshold = norm_mean + norm_std
                    
                    if ratio <= low_threshold or ratio >= high_threshold:
                        self.is_abnormal_state = True
                    else:
                        self.is_abnormal_state = False
                else:
                    self.is_abnormal_state = False
    
    def stop_server(self):
        """Stop Flask server"""
        self.running = False
        print("[INFO] Data visualizer server stopped")
    
    def is_running(self):
        """检查服务器是否运行中"""
        return self.running
