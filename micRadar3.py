import serial
import struct
import time
import threading
from collections import deque
from HRVcalculate import HRVcalculate
from emotion_dete import EmotionDetector

class MicRadar:
    def __init__(self, port="COM14", baudrate=115200, window_size=40):
        self.port = port
        self.baudrate = baudrate
        self.buffer = bytearray()
        self.is_reading = False 

        self.window_size = window_size
        self.rri_mat = None
        self.read_thread = None

        self.heart_rate = deque(maxlen=480)
        self.breath_rate = deque(maxlen=480)
        self.motion_para = deque(maxlen=480)
        self.BodyDetection = deque(maxlen=480)

        self.read_thread = None
        self.hrv_thread = None

        self.SDNN = None
        self.LF = None
        self.HF = None
        self.LF_HF_ratio = None

        self.hrv_calculator = HRVcalculate(self, None, window_size=self.window_size)
        self.emotion_detector = EmotionDetector()
        self.arousal = None
        self.valence = None

    def wait_for_ack(self, expected_cmd, timeout=3):
        """
        等待设备返回确认指令
        :param expected_cmd: 期望收到的确认指令
        :param timeout: 超时时间（秒）
        :return: True if ACK received, False if timeout
        """
        start_time = time.time()
        temp_buffer = bytearray()
        
        while time.time() - start_time < timeout:
            # 读取串口数据
            chunk = self.ser.read(self.ser.in_waiting or 1)
            if chunk:
                temp_buffer.extend(chunk)
                
                # 在缓冲区中查找期望的确认指令
                if expected_cmd in temp_buffer:
                    # 找到确认指令，清除缓冲区中该指令之前的数据
                    idx = temp_buffer.find(expected_cmd)
                    temp_buffer = temp_buffer[idx + len(expected_cmd):]
                    return True
                
                # 如果缓冲区太大，清理一下
                if len(temp_buffer) > 1000:
                    temp_buffer = temp_buffer[-500:]
            
            time.sleep(0.01)  # 短暂休眠避免过度占用CPU
        return False

    def send_turnon(self):
        # 发送开启命令
        heart_cmd  = b'\x53\x59\x85\x00\x00\x01\x01\x33\x54\x43'
        breath_cmd = b'\x53\x59\x81\x00\x00\x01\x01\x2F\x54\x43'
        body_cmd   = b'\x53\x59\x80\x00\x00\x01\x01\x2E\x54\x43' 
        real_time  = b'\x53\x59\x84\x0F\x00\x01\x00\x40\x54\x43'
        
        # 发送心率命令并等待确认
        self.ser.write(heart_cmd)
        if not self.wait_for_ack(heart_cmd, timeout=3):
            print("心率命令确认失败")
        
        # 发送呼吸命令并等待确认
        self.ser.write(breath_cmd)
        if not self.wait_for_ack(breath_cmd, timeout=3):
            print("呼吸命令确认失败")
        
        # 发送体动命令并等待确认
        self.ser.write(body_cmd)  # 使用正确的变量名
        if not self.wait_for_ack(body_cmd, timeout=3):
            print("体动命令确认失败")
        
        # 发送实时数据命令并等待确认
        self.ser.write(real_time)
        if not self.wait_for_ack(real_time, timeout=3):
            print("实时数据命令确认失败")
        
        print("已发送开启命令")

    def connect(self):
        self.ser = serial.Serial(self.port, self.baudrate, timeout=0.1)
        if not self.ser.is_open:
            self.ser.open()
        self.send_turnon()

    def disconnect(self):
        self.is_reading = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)  # 添加超时避免无限等待
        self.ser.close()
        print("已关闭串口连接")
        
    def read_line(self):
        """
        连续从串口读取并解析帧：
        帧结构：53 59 | CTRL(1) | CMD(1) | LEN(2) | PAYLOAD | CKSUM(1) | 54 43
        CTRL/CMD 均可动态判断，LEN 为 payload 长度
        """  
        while self.is_reading:
            chunk = self.ser.read(self.ser.in_waiting or 1)
            if not chunk:
                continue
            self.buffer.extend(chunk)

            # 找到帧头
            idx = self.buffer.find(b'\x53\x59')
            if idx < 0 or len(self.buffer) < idx + 8:
                # 不足以读取 CTRL/CMD/LEN，再等数据
                continue

            # 读 CTRL(1)、CMD(1)、LEN(2)
            ctrl, cmd, length = struct.unpack_from('>BBH', self.buffer, idx+2)
            total_len = 2 + 1 + 1 + 2 + length + 1 + 2  # header+ctrl+cmd+len+payload+cksum+footer

            # 判断缓存是否有整帧
            if len(self.buffer) < idx + total_len:
                continue

            frame = self.buffer[idx:idx+total_len]  
            # 校验帧尾
            if frame[-2:] != b'\x54\x43':
                # 如果帧尾不对，跳过一个字节继续
                self.buffer = self.buffer[idx+1:]
                continue

            # 验证校验和
            core = frame[: 2+1+1+2+length]  # header…payload
            if self.calc_checksum(core) != frame[2+1+1+2+length]:
                # 校验失败则跳过
                self.buffer = self.buffer[idx+1:]
                continue

            # 根据 CTRL/CMD 分发处理
            payload = frame[2+1+1+2 : 2+1+1+2+length]
            if (ctrl, cmd) == (0x85, 0x02):
                # 心率：payload[0] 单字节
                hr = payload[0]
                if self.preprocess_data(hr=hr):
                    if hr != 0:
                        self.heart_rate.append(hr)
                        print(f"HR_Rad: {hr} BPM")
            # elif (ctrl, cmd) == (0x85, 0x05):
            #     # 心率波形：payload[5] 五个字节
            #     hr_wave = list(payload[:5])
            #     self.heart_rate.append(hr_wave)
            #     print(f"心率波形：{hr_wave} ")
            elif (ctrl, cmd) == (0x81, 0x02):
                # 呼吸率：payload[0] 单字节
                br = payload[0]
                if self.preprocess_data(br=br):
                    self.breath_rate.append(br)
                    print(f"BR_Rad：{br} RPM")
            elif (ctrl, cmd) == (0x80, 0x03):
                # 体动参数：payload[0] 单字节
                motion = payload[0]
                if self.preprocess_data(motion=motion):
                    self.motion_para.append(motion)
                    # print(f"Motion：{motion}")

            # 丢弃已处理帧
            self.buffer = self.buffer[idx+total_len:]

        
    def start_continuous_reading(self):
        self.is_reading = True
        print("Starting continuous radar data reading...")
        
        def read_loop():
            while self.is_reading:
                self.read_line()

        def hrv_loop():
            while self.is_reading:
                time_result = self.hrv_calculator.compute_time()
                if time_result:
                    _, _, hr_mean, SDNN = time_result
                    self.SDNN = SDNN
                    self.hr_mean = hr_mean
                    # print(f"meanHR_Rad: {hr_mean:.2f} BPM, SDNN: {SDNN:.2f} ms")
                
                freq_result = self.hrv_calculator.compute_freq()
                if freq_result:
                    LF_HF_ratio, LF, HF = freq_result
                    self.LF = LF
                    self.HF = HF
                    self.LF_HF_ratio = LF_HF_ratio
                    # print(f"LF/HF Ratio_Rad: {LF_HF_ratio:.2f}, LF: {LF:.2f} ms^2, HF: {HF:.2f} ms^2")

                if len(self.heart_rate) >= 60 and len(self.breath_rate) >= 60:
                    self.arousal, self.valence = self.emotion_detector.predict_from_signals(
                        list(self.heart_rate)[-60:], 
                        list(self.breath_rate)[-60:]
                    )
                
                time.sleep(3)  # 避免多次输出

        self.read_thread = threading.Thread(target=read_loop)
        self.read_thread.daemon = True
        self.read_thread.start()
        self.hrv_thread = threading.Thread(target=hrv_loop)
        self.hrv_thread.daemon = True
        self.hrv_thread.start()
        return True

    def calc_checksum(self, data: bytes) -> int:
        return sum(data) & 0xFF
    
    def preprocess_data(self, hr=None, br=None, motion=None, rr=None):
        # 体动参数连续5次大于10
        # if motion is not None:
        #     if not hasattr(self, '_motion_count'):
        #         self._motion_count = 0
        #     if not hasattr(self, '_motion_consecutive'):
        #         self._motion_consecutive = 0
        #     if motion > 10:
        #         self._motion_count += 1
        #         self._motion_consecutive += 1
        #     else:
        #         self._motion_consecutive = 0
        #     # if self._motion_consecutive >= 5:
        #     #     # print("测量期间请保持静止")
        #     # if self._motion_count >= 30:
        #     #     print("身体没有保持静止，请重新测量")
        #     #     # self.disconnect()
        #     #     return False
        # rr值为0不输出
        if rr is not None and rr == 0:
            return False
        # 连续10秒没有读取到hr
        if not hasattr(self, '_last_hr_time'):
            self._last_hr_time = time.time()
        if hr is not None and hr != 0:
            self._last_hr_time = time.time()
        # if time.time() - self._last_hr_time > 20:
        #     print("测量终止，请重新测量")
        #     self.disconnect()
        #     return False
        return True

if __name__ == "__main__":
    radar = MicRadar(port = '/dev/ttyS5') 
    # radar = MicRadar(port = 'COM14') 
    radar.connect()
    radar.start_continuous_reading()
    time.sleep(300)
    radar.disconnect()