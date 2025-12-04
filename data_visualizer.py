import io
import time
import threading
from collections import deque
from flask import Flask, Response, render_template, jsonify
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
        
        # 创建Flask应用，指定模板和静态文件夹
        self.app = Flask(__name__, 
                        template_folder='js',  # 使用js文件夹作为模板文件夹
                        static_folder='js')  # js文件夹同时作为静态文件夹
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
                
                # # 对血氧值进行范围限制：小于80取80，大于100取100
                # if key == 'spo2' and value is not None:
                #     value = max(80, min(100, float(value)))
                
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
        
        @self.app.route('/')
        def index():
            return render_template('index.html')

        @self.app.route('/api/state')
        def api_state():
            with self.data_lock:
                payload = {k: list(v) for k, v in self.data_history.items()}
                payload['lf_hf_status'] = self.lf_hf_status
                payload['is_abnormal'] = self.is_abnormal_state
                # 添加 lf_hf 作为 lf_hf_ratio 的别名，方便前端访问
                payload['lf_hf'] = payload.get('lf_hf_ratio', [])
                # 添加radar实例的情绪评分数据（通过fsm_instance访问）
                if hasattr(self, 'fsm_instance') and self.fsm_instance:
                    payload['arousal_score'] = self.fsm_instance.arousal_score
                    payload['valence_score'] = self.fsm_instance.valence_score
                    
                    # 计算情绪状态（二分类：arousal和valence都只有0或1）
                    arousal = self.fsm_instance.arousal_score
                    valence = self.fsm_instance.valence_score
                    
                    if arousal is not None and valence is not None:
                        # 根据2x2象限判断情绪状态
                        # Arousal (唤醒度): 0=Low (平静/冥想), 1=High (压力/娱乐)
                        # Valence (效价): 0=Negative/Neutral (压力/平静), 1=Positive (娱乐/冥想)
                        if arousal == 1 and valence == 0:
                            # 高唤醒 + 消极 = 压力
                            emotion_state = 'Stress'
                            emotion_intensity = 'High'
                        elif arousal == 1 and valence == 1:
                            # 高唤醒 + 积极 = 娱乐
                            emotion_state = 'Entertainment'
                            emotion_intensity = 'High'
                        elif arousal == 0 and valence == 0:
                            # 低唤醒 + 消极 = 平静
                            emotion_state = 'Calm'
                            emotion_intensity = 'Low'
                        else:  # arousal == 0 and valence == 1
                            # 低唤醒 + 积极 = 冥想
                            emotion_state = 'Meditation'
                            emotion_intensity = 'Low'
                        
                        payload['emotion_state'] = emotion_state
                        payload['emotion_intensity'] = emotion_intensity
                    else:
                        payload['emotion_state'] = None
                        payload['emotion_intensity'] = None
                else:
                    payload['arousal_score'] = None
                    payload['valence_score'] = None
                    payload['emotion_state'] = None
                    payload['emotion_intensity'] = None
            return jsonify(payload)
        
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
