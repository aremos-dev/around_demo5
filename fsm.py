import time
from micRadar3 import MicRadar
import ppg
import threading
import os
from datetime import datetime
from data_visualizer import DataVisualizer
from collections import deque
from data_recorder import DataRecorder
from ble import BLE

class FSM():
    def __init__(self, data_source='radar', enable_visualization=True, viz_port=5000, ble_instance=None):
        """
        初始化FSM状态机
        data_source: 'radar', 'ppg', 或 'both' (同时使用两种数据源)
        enable_visualization: 是否启用可视化
        viz_port: 可视化服务端口
        ble_instance: 外部传入的BLE实例
        """
        self.data_source = data_source
        self.enable_visualization = enable_visualization
        self.viz_port = viz_port
        self.state = None
        self.recorder = DataRecorder(self)
        
        self.data = {
            'HF' : deque(maxlen=240),
            'LF' : deque(maxlen=240),
            'lf_hf' : deque(maxlen=240),
            'sdnn' : deque(maxlen=240),
            'hr' : deque(maxlen=240),
            'br' : deque(maxlen=240),
            'spo2' : deque(maxlen=240),
        }
        # 常模数据库
        self.norms = {
            'young_male': {  # 年轻男性常模
                'hr': {'mean': 63.90, 'std': 7.72},
                'sdnn': {'mean': 50.0, 'std': 20.9},
                'lf_hf_ratio': {'mean': 2.79, 'std': 3.20},
                'br': {'mean': 16.0, 'std': 3.0} 
            },
            'young_female': {  # 年轻女性常模
                'hr': {'mean': 66.7, 'std': 7.6},
                'sdnn': {'mean': 48.7, 'std': 19.0},
                'lf_hf_ratio': {'mean': 1.75, 'std': 1.78},
                'br': {'mean': 16.5, 'std': 3.0} 
            },
            'old_male': {  # 年老男性常模
                'hr': {'mean': 64.86, 'std': 8.42},
                'sdnn': {'mean': 44.6, 'std': 16.8},
                'lf_hf_ratio': {'mean': 3.62, 'std': 3.73},
                'br': {'mean': 15.5, 'std': 2.5} 
            },
        }
        self.current_norm = 'young_male'
        self.stress_assessment = {
            'physical_stress': None,
            'mental_stress': None,
            'overall_status': None,
            'assessment_time': None,
            'details': {}
        }
        self.running = True
        self.visualizer = None
        
        self.arousal_score = None
        self.valence_score = None
        
        # 根据数据源初始化相应的设备
        if data_source in ['radar', 'both']:
            self.radar = MicRadar(port ='/dev/ttyS5',window_size=20)
        else:
            self.radar = None
            
        if data_source in ['ppg', 'both']:
            # 使用传入的ble_instance来初始化PPG
            self.ppg_device = ppg.PPG(ble_instance=ble_instance)
            self.ppg_device.connect()
        else:
            self.ppg_device = None
        
    def update_current_data(self):
        """从多种数据源获取实时数据并融合"""
        # 从PPG获取数据
        if self.data_source == 'ppg' or self.data_source == 'both':
            # if self.ppg_device.SDNN is not None:
            #     self.data['sdnn'].append(self.ppg_device.SDNN)
            if self.ppg_device.HF is not None:
                self.data['HF'].append(self.ppg_device.HF)
            if self.ppg_device.LF is not None:
                self.data['LF'].append(self.ppg_device.LF)
            if self.ppg_device.blood_oxygen is not None and self.ppg_device.blood_oxygen > 0:
                self.data['spo2'].append(self.ppg_device.blood_oxygen)
        
        # 从Radar获取数据   
        if self.data_source == 'radar' or self.data_source == 'both':
            if self.radar.HF is not None:
                self.data['HF'].append(self.radar.HF)
            if self.radar.LF is not None:
                self.data['LF'].append(self.radar.LF)
            if self.radar.LF_HF_ratio is not None:
                self.data['lf_hf'].append(self.radar.LF_HF_ratio)
            if self.radar.SDNN is not None:
                self.data['sdnn'].append(self.radar.SDNN)
            if self.radar.breath_rate and len(self.radar.breath_rate) > 0:
                self.data['br'].append(self.radar.breath_rate[-1])
            if self.radar.heart_rate and len(self.radar.heart_rate) > 0:
                self.data['hr'].append(self.radar.heart_rate[-1])

    def update_visualizer_only(self):
        """更新可视化器"""
        if self.visualizer and self.visualizer.is_running():
            viz_data = {}
            if self.data['hr'] and len(self.data['hr']) > 0:
                viz_data['hr'] = self.data['hr'][-1]
            if self.data['br'] and len(self.data['br']) > 0:
                viz_data['br'] = self.data['br'][-1]
            if self.data['LF'] and len(self.data['LF']) > 0:
                viz_data['LF'] = self.data['LF'][-1]
            if self.data['HF'] and len(self.data['HF']) > 0:
                viz_data['HF'] = self.data['HF'][-1]
            if self.data['spo2'] and len(self.data['spo2']) > 0:
                viz_data['spo2'] = self.data['spo2'][-1]
            if self.data['sdnn'] and len(self.data['sdnn']) > 0:
                viz_data['SDNN'] = self.data['sdnn'][-1]
            
            # 只在有数据时更新
            if viz_data:
                self.visualizer.update_data(viz_data)

    def emotion_monitor(self,):
        time.sleep(60)
        while 1:
            self.arousal_score, self.valence_score = self.recorder.record()

    def run(self):
        """启动FSM主循环 - 支持多数据源"""
        print(f"[INFO] 启动FSM... 数据源: {self.data_source}")
        
        # 启动雷达相关线程（只有在基线采集时没有启动的情况下才启动）
        if self.radar:
            self.radar.connect()    
            self.radar.start_continuous_reading()
        
        # 启动PPG相关线程
        if self.ppg_device:
            self.ppg_device.start_continuous_reading()

        # 启动状态监控线程
        t_state = threading.Thread(target=self.state_monitor, daemon=True)
        t_state.start()

        # emotion_recorder = threading.Thread(
        #     target=self.emotion_monitor,
        #     daemon=True,
        # )
        # emotion_recorder.start()
        
        print("[INFO] 所有线程已启动，FSM运行中...")

    def state_monitor(self):
        """状态监控线程"""
        if self.enable_visualization:
            self.visualizer = DataVisualizer(port=self.viz_port)
            self.visualizer.fsm_instance = self
            self.visualizer.start_server()
        else:
            self.visualizer = None
        while self.running:
            self.update_current_data()
            self.update_visualizer_only()
            
            time.sleep(1)  # 改为1秒，实现每秒更新可视化
    
    def stop(self):
        self.running = False
        # 停止可视化器
        if self.visualizer:
            self.visualizer.stop_server()
        # 停止PPG设备
        if self.ppg_device:
            self.ppg_device.stop_reading()
            self.ppg_device.disconnect()
        # 停止雷达
        if self.radar:
            self.radar.disconnect()
        time.sleep(1)
        print("[INFO] FSM已停止")


if __name__ == "__main__":
    # 支持命令行参数选择数据源和可视化选项
    data_source = 'radar'  # 修改为ppg以测试串口连接
    enable_visualization = True  # 设置为True启用可视化
    viz_port = 5000  # 可视化服务端口
    ble_instance = BLE(device_name="demo6_3", max_buffer_size=120)

    
    fsm_instance = FSM(
        data_source=data_source, 
        enable_visualization=enable_visualization,
        viz_port=viz_port,
        ble_instance = ble_instance
    )
    fsm_instance.run()
    recorder = DataRecorder(fsm_instance)
    time.sleep(60)  # 等待FSM完全启动
    while True:
        recorder.record()

