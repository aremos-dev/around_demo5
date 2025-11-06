import time
import threading
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import numpy as np
from scipy.interpolate import interp1d
from scipy.signal import welch
import json
from datetime import datetime
import os

from ble import BLE  # 导入BLE类

def intervals_to_peaks_manual(rr_intervals):
    # ... (函数保持不变)
    peaks = []
    cumulative_sum = 0
    for interval in rr_intervals:
        cumulative_sum += interval
        peaks.append(cumulative_sum)
    return peaks
def hrv_frequency_manual(peaks, sampling_rate=1000):
    # ... (函数保持不变)
    # 检查数据点是否足够
    if len(peaks) < 4:
        print(f"Not enough peaks for HRV analysis: {len(peaks)} (minimum 4 required)")
        return {
            "HRV_VLF": 0,
            "HRV_LF": 0,
            "HRV_HF": 0,
            "HRV_LFHF": np.nan,
            "HRV_TotalPower": 0
        }

    rr_intervals_samples = np.diff(peaks)
    rr_intervals_s = rr_intervals_samples / sampling_rate

    rr_time_s = np.cumsum(rr_intervals_s) - rr_intervals_s[0]

    # 检查时间序列是否有效
    if len(rr_time_s) < 4 or rr_time_s[-1] - rr_time_s[0] < 1.0:
        print(f"Time series too short for HRV analysis: {rr_time_s[-1] - rr_time_s[0]:.2f}s")
        return {
            "HRV_VLF": 0,
            "HRV_LF": 0,
            "HRV_HF": 0,
            "HRV_LFHF": np.nan,
            "HRV_TotalPower": 0
        }

    resample_rate = 4.0
    
    # 创建插值函数，根据数据点数量选择插值方法

    if len(rr_time_s) >= 4:
        # 使用三次插值
        interp_func = interp1d(rr_time_s, rr_intervals_s, kind='cubic', fill_value='extrapolate')
    else:
        # 数据点不够时使用线性插值
        interp_func = interp1d(rr_time_s, rr_intervals_s, kind='linear', fill_value='extrapolate')

    new_time_axis = np.arange(rr_time_s[0], rr_time_s[-1], 1/resample_rate)
    
    # 确保有足够的重采样点
    if len(new_time_axis) < 10:
        print(f"Not enough resampled points: {len(new_time_axis)}")
        return {
            "HRV_VLF": 0,
            "HRV_LF": 0,
            "HRV_HF": 0,
            "HRV_LFHF": np.nan,
            "HRV_TotalPower": 0
        }

    resampled_rr = interp_func(new_time_axis)

    # 根据信号长度动态调整Welch参数
    signal_length = len(resampled_rr)
    # nperseg应该小于信号长度，通常取信号长度的1/4到1/8
    nperseg = min(256, max(8, signal_length // 4))
    # noverlap应该小于nperseg
    noverlap = min(128, nperseg // 2)
    
    freqs, psd = welch(x=resampled_rr, fs=resample_rate, nperseg=nperseg, noverlap=noverlap)

    vlf_band = (0.003, 0.04)
    lf_band = (0.04, 0.15)
    hf_band = (0.15, 0.4)

    def calculate_band_power(freqs, psd, band):
        band_indices = np.where((freqs >= band[0]) & (freqs < band[1]))[0]
        if len(band_indices) < 2:
            return 0
        # 使用梯形法则数值积分来获得功率
        power = np.trapz(psd[band_indices], freqs[band_indices])
        return power

    vlf_power = calculate_band_power(freqs, psd, vlf_band)
    lf_power = calculate_band_power(freqs, psd, lf_band)
    hf_power = calculate_band_power(freqs, psd, hf_band)
    
    total_power = vlf_power + lf_power + hf_power
    
    # 7. 计算 LF/HF 比率
    lf_hf_ratio = lf_power / hf_power if hf_power > 0 else np.nan

    # 8. 将结果整理成字典，类似于 NeuroKit2 的输出
    results = {
        "HRV_VLF": vlf_power,  # 甚低频功率
        "HRV_LF": lf_power,    # 低频功率
        "HRV_HF": hf_power,    # 高频功率
        "HRV_LFHF": lf_hf_ratio, # LF/HF 比率
        "HRV_TotalPower": total_power # 总功率
    }
    
    return results

class PPG:
    def __init__(self, ble_instance: BLE):
        """
        Initialize PPG data reader, using a provided BLE instance.
        """
        if not ble_instance:
            raise ValueError("A BLE instance must be provided to PPG.")
        
        # 1. 使用传入的BLE实例
        self.ble = ble_instance
        
        self.is_reading = False
        
        # 2. 生理参数，将从 self.ble 获取数据
        self.heartrate = 0
        self.blood_oxygen = 0
        self.sdnn = 0
        self.HF = None
        self.LF = None

        # rra现在直接使用ble的rri数据
        self.rra = self.ble.rri
        
        self.data_valid = False

    def print_data(self):
        """Print current physiological parameters"""
        if self.data_valid:
            print(f"Heart Rate: {self.heartrate} bpm | Blood Oxygen: {self.blood_oxygen}% | "
                  f"SDNN: {self.sdnn} | HF: {self.HF} | LF: {self.LF}")

    def connect(self):
        """
        Connect to the BLE device by starting its continuous reading thread.
        This method now starts the data flow from the BLE device.
        """
        print("PPG class: Connecting via BLE...")
        self.ble.start_continuous_reading()
        # 假设一旦开始读取，连接就建立了
        # 在实际应用中，可能需要等待ble.is_connected变为True
        while not self.ble.is_connected:
            print("Waiting for BLE device to connect...")
            time.sleep(2)
        return True

    def disconnect(self):
        """Disconnect the BLE connection"""
        if self.ble.is_connected:
            self.ble.stop_continuous_reading()
            print("PPG class: BLE connection disconnected.")

    def _update_data_from_ble(self):
        """Internal method to update PPG's data from the BLE instance."""
        if self.ble.data_valid and self.ble.is_connected:
            if len(self.ble.hr) > 0:
                self.heartrate = self.ble.hr[-1]
            if len(self.ble.blood_oxygen) > 0:
                self.blood_oxygen = self.ble.blood_oxygen[-1]
            if len(self.ble.sdnn) > 0:
                self.sdnn = self.ble.sdnn[-1]

            self.data_valid = True
        else:
            self.data_valid = False

    def read_line(self):
        """
        This method now updates data from the BLE source and runs HRV calculation.
        """
        self._update_data_from_ble()
        if self.data_valid:
            self.HRV()
            # self.print_data()
            return True
        return False

    def start_continuous_reading(self):
        """
        Start a thread to continuously update data from the BLE source.
        """
        if not self.ble.is_connected:
            print("Cannot start reading, BLE device not connected.")
            return

        self.is_reading = True
        print("PPG class: Starting continuous data synchronization from BLE.")
        
        def sync_loop():
            while self.is_reading:
                self.read_line()
                time.sleep(1)  # Update data every second
        
        self.read_thread = threading.Thread(target=sync_loop)
        self.read_thread.daemon = True
        self.read_thread.start()

    def HRV(self):
        if len(self.rra) < 10:
            # print(f'data is not long enough: {len(self.rra)}/10 (minimum 10 RR intervals required)')
            return None
        else:    
            # rra现在包含的是多个rri值的列表，需要处理
            # 假设rri是 [r1, r2, r3], [r4, r5, r6], ...
            # 我们需要将它们扁平化
            # flat_rri = [item for sublist in self.rra for item in sublist]
            
            if len(self.rra) < 10:
                return None

            rr_intervals = np.array(self.rra, dtype=float)
            
            if np.std(rr_intervals) < 0.01:
                # print('RR intervals have insufficient variability for HRV analysis')
                return None
            
            if np.any(rr_intervals <= 0) or np.any(rr_intervals > 3000):
                # print('RR intervals contain invalid values')
                return None
            
            peaks = intervals_to_peaks_manual(rr_intervals)
            
            hrv_freq_analysis = hrv_frequency_manual(peaks, sampling_rate=1000)
            
            if isinstance(hrv_freq_analysis['HRV_LF'], (list, np.ndarray)):
                self.LF = hrv_freq_analysis['HRV_LF'][0] if len(hrv_freq_analysis['HRV_LF']) > 0 and hrv_freq_analysis['HRV_LF'][0] < 1 else 0
            else:
                self.LF = hrv_freq_analysis['HRV_LF'] if hrv_freq_analysis['HRV_LF'] < 1 else 0
            
            if isinstance(hrv_freq_analysis['HRV_HF'], (list, np.ndarray)):
                self.HF = hrv_freq_analysis['HRV_HF'][0] if len(hrv_freq_analysis['HRV_HF']) > 0 and hrv_freq_analysis['HRV_HF'][0] < 1 else 0
            else:
                self.HF = hrv_freq_analysis['HRV_HF'] if hrv_freq_analysis['HRV_HF'] < 1 else 0

    def stop_reading(self):
        """Stop the data synchronization thread"""
        self.is_reading = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)
        print("PPG class: Stopped data synchronization.")

def main():
    """Main function - demonstrates how to use the modified PPG class"""
    ble = BLE(device_name="around4")
    ppg_reader = PPG(ble_instance=ble)

    try:
        if not ppg_reader.connect():
            print("Unable to connect to BLE device, program exit")
            return
        
        ppg_reader.start_continuous_reading()
        
        print("Starting real-time data display, press Ctrl+C to exit...")
        
        while True:
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
    
    finally:
        ppg_reader.stop_reading()
        ppg_reader.disconnect()
        print("Program ended")

if __name__ == "__main__":
    main()