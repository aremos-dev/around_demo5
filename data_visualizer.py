import io
import time
import threading
import os
from collections import deque
from flask import Flask, Response, render_template, jsonify, send_from_directory, request
from flask_socketio import SocketIO, emit
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

# 前端目录配置
# 优先使用 around-front-master/dist（新的React前端构建输出）
# 如果不存在，回退到 js 目录（旧的原生JS前端）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NEW_FRONTEND_DIR = os.path.join(BASE_DIR, 'around-front-master', 'dist')
OLD_FRONTEND_DIR = os.path.join(BASE_DIR, 'js')

# 检查使用哪个前端
USE_NEW_FRONTEND = os.path.exists(NEW_FRONTEND_DIR) and os.path.exists(os.path.join(NEW_FRONTEND_DIR, 'index.html'))


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
        
        # 创建Flask应用，根据前端类型配置目录
        if USE_NEW_FRONTEND:
            # 新的React前端 - 使用 around-front-master/dist 目录
            print(f"[INFO] 使用新的React前端: {NEW_FRONTEND_DIR}")
            self.app = Flask(__name__, 
                            static_folder=NEW_FRONTEND_DIR,
                            static_url_path='')
            self.use_new_frontend = True
        else:
            # 旧的原生JS前端 - 使用 js 目录
            print(f"[INFO] 使用旧的JS前端: {OLD_FRONTEND_DIR}")
            self.app = Flask(__name__, 
                            template_folder=OLD_FRONTEND_DIR,
                            static_folder=OLD_FRONTEND_DIR)
            self.use_new_frontend = False
        
        # 创建 SocketIO 实例（支持 WebSocket）
        self.socketio = SocketIO(self.app, cors_allowed_origins="*", async_mode='threading')
        self._setup_routes()
        self._setup_socketio()
        
        # Flask应用线程
        self.server_thread = None
        self.running = False
        # WebSocket 推送线程
        self.ws_push_thread = None
    
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
            if self.use_new_frontend:
                # React SPA - 直接发送 index.html
                return send_from_directory(NEW_FRONTEND_DIR, 'index.html')
            else:
                # 旧的模板渲染
                return render_template('index.html')
        
        # React SPA 路由支持 - 所有非 API、非静态资源的路由都返回 index.html
        if self.use_new_frontend:
            @self.app.route('/<path:path>')
            def serve_spa(path):
                # 如果请求的是静态文件，直接返回
                full_path = os.path.join(NEW_FRONTEND_DIR, path)
                if os.path.exists(full_path) and os.path.isfile(full_path):
                    return send_from_directory(NEW_FRONTEND_DIR, path)
                # 否则返回 index.html（SPA 路由）
                return send_from_directory(NEW_FRONTEND_DIR, 'index.html')

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
        
        @self.app.route('/api/special_mode', methods=['POST'])
        def api_special_mode():
            """
            接收前端双击情绪球时发送的特殊模式命令
            """
            try:
                data = request.get_json() if request.is_json else {}
                command = data.get('command', 'enter_special_mode')
                timestamp = data.get('timestamp', '')
                
                print(f"[INFO] Received special mode command: {command} at {timestamp}")
                
                # 通知 demo.py 进入特殊模式
                if hasattr(self, 'special_mode_callback') and self.special_mode_callback:
                    self.special_mode_callback(command)
                    return jsonify({
                        'success': True,
                        'message': 'Special mode command received and processed'
                    })
                else:
                    # 如果没有设置回调，将命令存储起来供 demo.py 轮询
                    self.pending_special_mode_command = command
                    return jsonify({
                        'success': True,
                        'message': 'Special mode command received (pending)'
                    })
            except Exception as e:
                print(f"[ERROR] Failed to process special mode command: {e}")
                return jsonify({
                    'success': False,
                    'message': str(e)
                }), 500
    
    def _setup_socketio(self):
        """Setup WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            print("[INFO] WebSocket client connected")
            emit('connected', {'status': 'connected'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            print("[INFO] WebSocket client disconnected")
    
    def _ws_push_breathing_rate(self):
        """后台线程：每秒推送呼吸频率数据"""
        while self.running:
            try:
                with self.data_lock:
                    # 获取最新的呼吸频率值
                    if len(self.data_history['br']) > 0:
                        latest_br = self.data_history['br'][-1]
                        latest_time = self.data_history['time'][-1] if len(self.data_history['time']) > 0 else 0
                        
                        # 通过 WebSocket 推送数据
                        self.socketio.emit('breathing_rate_update', {
                            'br': latest_br,
                            'time': latest_time,
                            'timestamp': time.time()
                        })
                time.sleep(1.0)  # 每秒推送一次
            except Exception as e:
                print(f"[ERROR] WebSocket push error: {e}")
                time.sleep(1.0)
        
    def start_server(self):
        """启动Flask服务器和WebSocket推送线程"""
        if not self.running:
            self.running = True
            
            # 启动 WebSocket 推送线程（每秒推送呼吸频率）
            self.ws_push_thread = threading.Thread(
                target=self._ws_push_breathing_rate,
                daemon=True
            )
            self.ws_push_thread.start()
            print("[INFO] WebSocket breathing rate push thread started")
            
            # 启动 Flask + SocketIO 服务器
            self.server_thread = threading.Thread(
                target=lambda: self.socketio.run(
                    self.app, 
                    host='0.0.0.0', 
                    port=self.port, 
                    debug=False,
                    allow_unsafe_werkzeug=True
                ),
                daemon=True
            )
            self.server_thread.start()
            print(f"[INFO] Data visualizer server started with WebSocket support, access at: http://localhost:{self.port}")

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
