import time
import serial
import threading
import struct
import csv
from collections import deque
from datetime import datetime

class radarrecoder():
    def __init__(self, port="COM14", baudrate=115200, max_buffer_size=1000, csv_filename=None):
        # 使用循环缓冲区,只保留最近的数据
        self.heart = deque(maxlen=max_buffer_size)
        self.resp = deque(maxlen=max_buffer_size)
        self.port = port
        self.baudrate = baudrate
        self.buffer = bytearray()
        
        # CSV文件设置
        if csv_filename is None:
            csv_filename = f"radar_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        self.csv_filename = csv_filename
        self.csv_file = None
        self.csv_writer = None
        self._init_csv_file()
    
    def _init_csv_file(self):
        """初始化CSV文件并写入表头"""
        try:
            self.csv_file = open(self.csv_filename, 'w', newline='', buffering=1)
            self.csv_writer = csv.writer(self.csv_file)
            # 写入表头: 时间戳,数据类型,值1-5
            self.csv_writer.writerow(['timestamp', 'type', 'v1', 'v2', 'v3', 'v4', 'v5'])
            print(f"CSV文件已创建: {self.csv_filename}")
        except Exception as e:
            print(f"创建CSV文件失败: {e}")
            self.csv_file = None
            self.csv_writer = None
    
    def _write_to_csv(self, data_type, values):
        """写入数据到CSV文件"""
        if self.csv_writer:
            try:
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
                self.csv_writer.writerow([timestamp, data_type] + values)
            except Exception as e:
                print(f"写入CSV失败: {e}")
    
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
        
        # 发送心率命令并等待确认
        self.ser.write(heart_cmd)
        if not self.wait_for_ack(heart_cmd, timeout=3):
            print("心率命令确认失败")
        
        # 发送呼吸命令并等待确认
        self.ser.write(breath_cmd)
        if not self.wait_for_ack(breath_cmd, timeout=3):
            print("呼吸命令确认失败")
        
        
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
        
        # 关闭CSV文件
        if self.csv_file:
            self.csv_file.close()
            print(f"CSV文件已保存: {self.csv_filename}")
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
            if (ctrl, cmd) == (0x85, 0x05):
                # 心率波形：payload[5] 五个字节
                hr_wave = list(payload[:5])
                # 添加到循环缓冲区(用于实时访问)
                self.heart.extend(hr_wave)
                # 写入CSV文件(用于持久化存储)
                self._write_to_csv('heart', hr_wave)
                print(f"心率波形：{hr_wave} ")
            elif (ctrl, cmd) == (0x81, 0x05):
                # 呼吸率：payload[0] 单字节
                br_wave = list(payload[:5])
                # 添加到循环缓冲区(用于实时访问)
                self.resp.extend(br_wave)
                # 写入CSV文件(用于持久化存储)
                self._write_to_csv('resp', br_wave)
                print(f"呼吸波形：{br_wave} ")
            # 丢弃已处理帧
            self.buffer = self.buffer[idx+total_len:]

    def start_continuous_reading(self):
        self.is_reading = True
        print("Starting continuous radar data reading...")
        
        def read_loop():
            while self.is_reading:
                self.read_line()

        self.read_thread = threading.Thread(target=read_loop)
        self.read_thread.daemon = True
        self.read_thread.start()

        return True
    
    def calc_checksum(self, data: bytes) -> int:
        return sum(data) & 0xFF
    

if __name__ == "__main__":
    radar = radarrecoder(port = '/dev/ttyS5') 
    # radar = MicRadar(port = 'COM14') 
    radar.connect()
    radar.start_continuous_reading()
    time.sleep(300)
    radar.disconnect()