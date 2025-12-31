import numpy as np
import pyhrv.frequency_domain as fd

class HRVcalculate:
    def __init__(self, radar, ppg, window_size=40):
        """
        初始化 HRVcalculate 类
        :param radar: MicRadar 实例，须包含 heart_rate 队列
        :param window_size: 触发计算的心率样本数量，每3s一个，40个即120s
        """
        self.radar = radar
        self.ppg = ppg
        self.window_size = window_size
        self.rri_mat = None

    def compute_time(self):
        if len(self.radar.heart_rate) >= self.window_size:
            # 构建 1×window_size 的心率矩阵
            hr_list = list(self.radar.heart_rate)[-self.window_size:]
            heart_mat = np.array(hr_list, dtype=float).reshape(1, -1)

            # 重复3次
            # hr_mat = np.tile(heart_mat, 3)

            # 计算 RR 间期矩阵
            self.rri_mat = 60000.0 / heart_mat

            # 计算均值和标准差
            hr_mean = np.mean(hr_list)
            rri_mean = np.mean(self.rri_mat)
            sdnn = np.std(self.rri_mat)
            rmssd = np.sqrt(np.mean(np.diff(self.rri_mat)**2))

            return  rmssd, sdnn
        else:
            return None

    def compute_freq(self):
        if self.rri_mat is not None and len(self.radar.heart_rate) >= self.window_size:
            # 展平并截取 window_size 个值
            nni = self.rri_mat
            # 过滤掉可能的 nan 或非正值
            nni = nni[np.isfinite(nni) & (nni > 0)]
            result = fd.welch_psd(
                nni=nni,
                nfft=128,
                detrend=True,
                window='hamming',
                show=False
            )

            # 提取 LF 和 HF 绝对功率
            fft_abs = result['fft_abs']
            fft_ratio = result['fft_ratio']

            # 转换为 float
            vlf_power = float(fft_abs[0])
            self.LF  = float(fft_abs[1])
            self.HF  = float(fft_abs[2])
            self.LF_HF_ratio = float(fft_ratio) if not isinstance(fft_ratio, (list, np.ndarray)) \
                        else float(fft_ratio[0])

            return self.LF_HF_ratio, self.LF, self.HF
        return None
        
    def compute_time_rri(self):
        if self.window_size * 1.5 - 1 < len(self.ppg.rra) <= self.window_size * 1.5 + 1:
            hr_list = list(self.ppg.heart_rate)[-self.window_size:]
            hr_mean = np.mean(hr_list)

            rri_mean = np.mean(self.ppg.rra)
            self.SDNN = np.std(self.ppg.rra)

            return hr_mean, self.SDNN
        else:
            return None

    def compute_freq_rri(self):
        if self.window_size * 1.5 - 1 < len(self.ppg.rra) <= self.window_size * 1.5 + 1:
            # 将ppg.rra复制三列后展平
            rra_array = np.array(self.ppg.rra)
            nni = np.tile(rra_array, 3)

            # 过滤掉可能的 nan 或非正值
            nni = nni[np.isfinite(nni) & (nni > 0)]
            result = fd.welch_psd(
                nni=nni,
                nfft=128,
                detrend=True,
                window='hamming',
                show=False
            )

            # 提取 LF 和 HF 绝对功率
            fft_abs = result['fft_abs']
            fft_ratio = result['fft_ratio']

            # 转换为 float
            vlf_power = float(fft_abs[0])
            self.LF  = float(fft_abs[1])
            self.HF  = float(fft_abs[2])
            self.LF_HF_ratio = float(fft_ratio) if not isinstance(fft_ratio, (list, np.ndarray)) \
                        else float(fft_ratio[0])

            return self.LF_HF_ratio, self.LF, self.HF
        return None