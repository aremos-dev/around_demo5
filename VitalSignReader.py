# author: kylin, cql22@mails.tsinghua.edu.cn
# Modified: Data reader class without GUI
import serial
import time
import numpy as np
import struct
from collections import deque
from scipy import signal
import pyhrv.time_domain as td
import pyhrv.frequency_domain as fd
import threading


class VitalSignReader:
    """
    毫米波雷达生命体征数据读取类
    用于读取和解析XWR系列雷达的生命体征数据
    """
    
    def __init__(self, config_file_path='./xwr1642_profile_VitalSigns_20fps_Front.cfg'):
        """
        初始化生命体征读取器
        
        Args:
            config_file_path: 配置文件路径
        """
        self.config_file_path = config_file_path

        self.is_reading = False
        
        # 串口对象
        self.cli_port = None
        self.data_port = None
        
        # 配置参数
        self.config_parameters = None
        
        # 数据缓冲区
        self.byte_buffer = np.zeros(2 ** 15, dtype='uint8')
        self.byte_buffer_length = 0
        self.num_range_bin_processed = 33 - 11 + 1
        
        # 存储生命体征数据 (使用deque，maxlen=250自动限制长度并移除旧数据)
        self.breath_signal = deque(maxlen=250)  # 呼吸波形
        self.heartbeat_signal = deque(maxlen=250)  # 心跳波形
        self.chest_displacement = deque(maxlen=250)  # 胸部位移
        self.breath_rate = deque(maxlen=250)  # 呼吸率
        self.heart_rate = deque(maxlen=250)  # 心率
        self.frame_timestamps = deque(maxlen=250)  # 帧时间戳

        # 最新的生命体征信息
        self.latest_vitalsign = {}
        
        # HRV数据 (使用deque存储历史HRV数据)
        self.sdnn = deque(maxlen=250)  # SDNN历史数据
        self.lf = deque(maxlen=250)    # LF功率历史数据
        self.hf = deque(maxlen=250)    # HF功率历史数据
        
        # 魔术字
        self.magic_word = [2, 1, 4, 3, 6, 5, 8, 7]
        
        # TLV类型定义
        self.MMWDEMO_UART_MSG_DETECTED_POINTS = 1
        self.MMWDEMO_UART_MSG_RANGE_PROFILE = 2
        self.MMWDEMO_UART_MSG_VITALSIGN = 6
        
        # 初始化串口和配置
        self._init_serial()
        
    def serialConfig(self, configFileName):
        self.cli_port = serial.Serial('COM5', 115200)
        self.data_port = serial.Serial('COM4', 921600)
        config = [line.rstrip('\r\n') for line in open(configFileName)]
        for i in config:
            print(i)
            self.cli_port.write((i + '\n').encode())
            time.sleep(0.03)

    def parseConfigFile(self, configFileName):
        configParameters = {}
        config = [line.rstrip('\r\n') for line in open(configFileName)]
        for i in config:

            splitWords = i.split(" ")
            numRxAnt = 4
            numTxAnt = 2
            if "profileCfg" in splitWords[0]:
                startFreq = int(float(splitWords[2]))
                idleTime = int(splitWords[3])
                rampEndTime = float(splitWords[5])
                freqSlopeConst = float(splitWords[8])
                numAdcSamples = int(splitWords[10])
                numAdcSamplesRoundTo2 = 1

                while numAdcSamples > numAdcSamplesRoundTo2:
                    numAdcSamplesRoundTo2 = numAdcSamplesRoundTo2 * 2

                digOutSampleRate = int(splitWords[11])
            elif "frameCfg" in splitWords[0]:
                chirpStartIdx = int(splitWords[1])
                chirpEndIdx = int(splitWords[2])
                numLoops = int(splitWords[3])
                numFrames = int(splitWords[4])
                framePeriodicity = float(splitWords[5])

            elif "vitalSignsCfg" in splitWords[0]:
                rangeStart = float(splitWords[1])
                rangeEnd = float(splitWords[2])
        numChirpsPerFrame = (chirpEndIdx - chirpStartIdx + 1) * numLoops
        configParameters["numDopplerBins"] = numChirpsPerFrame / numTxAnt
        configParameters["numRangeBins"] = numAdcSamplesRoundTo2
        configParameters["rangeResolutionMeters"] = (3e8 * digOutSampleRate * 1e3) / (
                2 * freqSlopeConst * 1e12 * numAdcSamples)
        configParameters["rangeIdxToMeters"] = (3e8 * digOutSampleRate * 1e3) / (
                2 * freqSlopeConst * 1e12 * configParameters["numRangeBins"])
        configParameters["dopplerResolutionMps"] = 3e8 / (
                2 * startFreq * 1e9 * (idleTime + rampEndTime) * 1e-6 * configParameters["numDopplerBins"] * numTxAnt)
        configParameters["maxRange"] = (300 * 0.9 * digOutSampleRate) / (2 * freqSlopeConst * 1e3)
        configParameters["maxVelocity"] = 3e8 / (4 * startFreq * 1e9 * (idleTime + rampEndTime) * 1e-6 * numTxAnt)
        configParameters["rangeStart"] = rangeStart
        configParameters["rangeEnd"] = rangeEnd
        return configParameters
    
    def _init_serial(self):
        """初始化串口连接和配置参数"""
        try:
            self.serialConfig(self.config_file_path)
            self.config_parameters = self.parseConfigFile(self.config_file_path)
            print(f"串口初始化成功!")
            print(f"配置参数: {self.config_parameters}")
        except Exception as e:
            print(f"串口初始化失败: {e}")
            raise
    
    def read_and_parse_data(self):
        """
        读取并解析雷达数据
        
        Returns:
            tuple: (dataOK, frameNumber, vitalsign)
                - dataOK: 数据是否有效
                - frameNumber: 帧号
                - vitalsign: 生命体征字典
        """
        max_buffer_size = 2 ** 15
        
        magic_ok = 0
        data_ok = 0
        frame_number = 0
        vitalsign = {}
        
        # 读取串口数据
        read_buffer = self.data_port.read(self.data_port.in_waiting)
        byte_vec = np.frombuffer(read_buffer, dtype='uint8')
        byte_count = len(byte_vec)
        
        # 将数据添加到缓冲区
        if (self.byte_buffer_length + byte_count) < max_buffer_size:
            self.byte_buffer[self.byte_buffer_length:(self.byte_buffer_length + byte_count)] = byte_vec[0:byte_count]
            self.byte_buffer_length = self.byte_buffer_length + byte_count
        
        # 查找魔术字
        if self.byte_buffer_length > 16:
            possible_locs = np.where(self.byte_buffer == self.magic_word[0])[0]
            start_idx = []
            for loc in possible_locs:
                check = self.byte_buffer[loc:loc + 8]
                if np.all(check == self.magic_word):
                    start_idx.append(loc)
            
            if start_idx:
                if 0 < start_idx[0] < self.byte_buffer_length:
                    self.byte_buffer[:self.byte_buffer_length - start_idx[0]] = self.byte_buffer[start_idx[0]:self.byte_buffer_length]
                    self.byte_buffer[self.byte_buffer_length - start_idx[0]:] = np.zeros(
                        len(self.byte_buffer[self.byte_buffer_length - start_idx[0]:]), dtype='uint8')
                    self.byte_buffer_length = self.byte_buffer_length - start_idx[0]
                
                if self.byte_buffer_length < 0:
                    self.byte_buffer_length = 0
                if self.byte_buffer_length < 16:
                    return data_ok, None, None
                    
                total_packet_len = int.from_bytes(self.byte_buffer[12:12 + 4], byteorder='little')
                if (self.byte_buffer_length >= total_packet_len) and (self.byte_buffer_length != 0):
                    magic_ok = 1
        
        # 解析数据包
        if magic_ok:
            idx = 0
            magic_number = self.byte_buffer[idx:idx + 8]
            idx += 8
            version = format(int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little'), 'x')
            idx += 4
            total_packet_len = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            platform = format(int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little'), 'x')
            idx += 4
            frame_number = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            time_cpu_cycles = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            vitalsign["numDetectedObj"] = num_detected_obj = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            num_tlvs = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            sub_frame_number = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
            idx += 4
            
            # 解析TLV数据
            for tlv_idx in range(num_tlvs):
                tlv_type = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
                idx += 4
                tlv_length = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
                idx += 4
                
                # 解析生命体征数据
                if tlv_type == self.MMWDEMO_UART_MSG_VITALSIGN:
                    vitalsign["rangeBinIndexMax"] = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                    idx += 2
                    vitalsign["rangeBinIndexPhase"] = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                    idx += 2
                    vitalsign["maxVal"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["processingCyclesOut"] = int.from_bytes(self.byte_buffer[idx:idx + 4], byteorder='little')
                    idx += 4
                    vitalsign["rangeBinStartIndex"] = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                    idx += 2
                    vitalsign["rangeBinEndIndex"] = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                    idx += 2
                    vitalsign["unwrapPhasePeak_mm"] = self.byte_buffer[idx:idx + 4].view(dtype=np.float32)[0]
                    idx += 4
                    vitalsign["outputFilterBreathOut"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["outputFilterHeartOut"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["heartRateEst_FFT"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["heartRateEst_FFT_4Hz"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0] / 2
                    idx += 4
                    vitalsign["heartRateEst_xCorr"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["heartRateEst_peakCount"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["breathingRateEst_FFT"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["breathingRateEst_xCorr"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["breathingRateEst_peakCount"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["confidenceMetricBreathOut"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["confidenceMetricBreathOut_xCorr"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["confidenceMetricHeartOut"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["confidenceMetricHeartOut_4Hz"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["confidenceMetricHeartOut_xCorr"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["sumEnergyBreathWfm"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["sumEnergyHeartWfm"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    vitalsign["motionDetectedFlag"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    idx += 4
                    idx += 40
                    vitalsign["RPlength"] = struct.unpack('<f', self.byte_buffer[idx:idx + 4])[0]
                    data_ok = 1
                
                # 解析距离剖面数据
                if tlv_type == self.MMWDEMO_UART_MSG_RANGE_PROFILE:
                    if vitalsign.__contains__("rangeBinEndIndex"):
                        self.num_range_bin_processed = vitalsign["rangeBinEndIndex"] - vitalsign["rangeBinStartIndex"] + 1
                    vitalsign["RangeProfile"] = []
                    for i in range(self.num_range_bin_processed):
                        rp_real_part = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                        idx += 2
                        rp_image_part = int.from_bytes(self.byte_buffer[idx:idx + 2], byteorder='little')
                        idx += 2
                        vitalsign["RangeProfile"].append(pow(rp_real_part * rp_real_part + rp_image_part * rp_image_part, 0.5))
            
            # 清理已处理的缓冲区数据
            if 0 < idx < self.byte_buffer_length:
                shift_size = total_packet_len
                self.byte_buffer[:self.byte_buffer_length - shift_size] = self.byte_buffer[shift_size:self.byte_buffer_length]
                self.byte_buffer[self.byte_buffer_length - shift_size:] = np.zeros(
                    len(self.byte_buffer[self.byte_buffer_length - shift_size:]), dtype='uint8')
                self.byte_buffer_length = self.byte_buffer_length - shift_size
                if self.byte_buffer_length < 0:
                    self.byte_buffer_length = 0
        
        return data_ok, frame_number, vitalsign
    
    def update_data(self):
        """
        更新数据并存储到类成员变量中
        
        Returns:
            bool: 数据是否更新成功
        """
        data_ok, frame_number, vitalsign = self.read_and_parse_data()
        
        if data_ok:
            # 更新最新数据
            self.latest_vitalsign = vitalsign
            # self.latest_frame_number = frame_number
            
            # 记录时间戳（用于HRV计算）
            current_time = time.time()
            self.frame_timestamps.append(current_time)
            
            # 更新各项数据列表
            self.breath_signal.append(vitalsign["outputFilterBreathOut"])
            self.heartbeat_signal.append(vitalsign["outputFilterHeartOut"])
            self.chest_displacement.append(float(vitalsign["unwrapPhasePeak_mm"]))
            self.breath_rate.append(vitalsign["breathingRateEst_FFT"])
            self.heart_rate.append(vitalsign["heartRateEst_FFT"])
            
            if vitalsign.__contains__("RangeProfile"):
                self.range_profile = vitalsign["RangeProfile"]
            
            return True
        
        return False
    
    def calculate_hrv(self):
        """
        使用pyhrv库计算HRV（心率变异性）指标
        
        Returns:
            dict: 包含sdnn, lf, hf的字典，如果数据不足则返回None
        """
        # 至少需要50个数据点（约2.5秒的数据，20fps）
        if len(self.heartbeat_signal) < 50:
            return None
        
        # 将deque转换为numpy数组
        heartbeat_data = np.array(self.heartbeat_signal)
        timestamps = np.array(self.frame_timestamps)
        
        # 1. 使用峰值检测找到R波峰值
        # distance参数：最小峰值间隔，20fps下，心率60-180bpm对应0.33-1秒，即7-20帧
        # prominence参数：峰值突出程度，可以根据实际数据调整
        peaks, properties = signal.find_peaks(
            heartbeat_data, 
            distance=7,  # 最快180bpm时的最小间隔
            prominence=np.std(heartbeat_data) * 0.3  # 自适应阈值
        )
        
        # 需要至少5个峰值才能计算HRV
        if len(peaks) < 5:
            return None
        
        # 2. 计算R-R间期（单位：毫秒）
        peak_times = timestamps[peaks]
        rr_intervals = np.diff(peak_times) * 1000  # 转换为毫秒
        
        # 过滤异常值：正常R-R间期应该在300-2000ms之间（30-200bpm）
        valid_mask = (rr_intervals >= 300) & (rr_intervals <= 2000)
        rr_intervals = rr_intervals[valid_mask]
        
        if len(rr_intervals) < 4:
            return None
        
        # 3. 使用pyhrv计算时域指标（SDNN）
        time_domain_results = td.sdnn(rr_intervals)
        sdnn = time_domain_results['sdnn']
        
        # 4. 使用pyhrv计算频域指标（LF和HF）
        # pyhrv要求至少10秒的数据用于频域分析
        duration = np.sum(rr_intervals) / 1000  # 总时长（秒）
        if duration < 10:
            # 数据不足时，只存储SDNN
            self.sdnn.append(float(sdnn))

        
        # 使用Welch方法计算频域指标
        frequency_results = fd.welch_psd(
            rr_intervals,
            fbands={'ulf': (0, 0.003), 'vlf': (0.003, 0.04), 'lf': (0.04, 0.15), 'hf': (0.15, 0.4)},
            show=False  # 不显示图形
        )
        
        lf_power = frequency_results['fft_abs'][0]  # LF绝对功率
        hf_power = frequency_results['fft_abs'][1]  # HF绝对功率
        
        # 存储到deque中
        self.sdnn.append(float(sdnn))
        self.lf.append(float(lf_power))
        self.hf.append(float(hf_power))

        # 返回结果
 
    def close(self):
        """关闭串口连接"""
        self.is_reading = False
        if self.cli_port:
            self.cli_port.write(('sensorStop\n').encode())
            self.cli_port.close()
        if self.data_port:
            self.data_port.close()
        
        print("串口已关闭")
    

    def start_continuous_reading(self):
        """开始持续读取数据并打印"""
        self.is_reading = True
        def read_loop():
            while self.is_reading:
                self.update_data()
                self.calculate_hrv()

        self.read_thread = threading.Thread(target=read_loop)
        self.read_thread.start()


if __name__ == "__main__":
    # 创建读取器实例
    config_file = './xwr1642_profile_VitalSigns_20fps_Front.cfg'

    # 使用with语句自动管理资源
    reader = VitalSignReader(config_file)

    reader.start_continuous_reading()
    start = time.time()
    while time.time() - start < 300:  # 运行30秒
        print(f"Breath Rate: {reader.breath_rate[-1] if reader.breath_rate else 'N/A'} bpm, "
              f"Heart Rate: {reader.heart_rate[-1] if reader.heart_rate else 'N/A'} bpm, "
              f"SDNN: {reader.sdnn[-1] if reader.sdnn else 'N/A'} ms, "
              f"LF: {reader.lf[-1] if reader.lf else 'N/A'} ms², "
              f"HF: {reader.hf[-1] if reader.hf else 'N/A'} ms²")
        time.sleep(5)

    reader.close()