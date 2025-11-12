import time
import csv
import os
import statistics
from datetime import datetime
import matplotlib.pyplot as plt

class DataRecorder:
    def __init__(self, fsm_instance):
        """
        初始化个人数据采集器
        """
        self.fsm = fsm_instance
        self.valence_score = None
        self.arousal_score = None

    def record(self):
        """
        采集个人基线数据并保存为CSV文件
        """
        save_path='personal_data.csv'
        time.sleep(5) # 步进，每5s移动一次窗口
        self.arousal_score, self.valence_score = self._calculate_emotion_scores()
        # 保存并绘制
        new_record = self._generate_statistics_record()
        self._save_to_csv(save_path, new_record)
        self._plot_deviation(save_path)
        return self.arousal_score, self.valence_score

    def _generate_statistics_record(self):
        new_record = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'data_source': self.fsm.data_source
        }
        
        # 添加各指标的统计数据
        metrics = ['HF', 'LF', 'lf_hf', 'sdnn', 'hr', 'br', 'spo2']
        for metric in metrics:
            # 通过将deque转换为list来创建一个快照，避免多线程迭代错误
            data = list(self.fsm.data[metric])
            
            # 过滤掉 None 值和非数字值
            filtered_data = [x for x in data if x is not None and isinstance(x, (int, float))]
            
            if filtered_data and len(filtered_data) > 0:
                new_record[f'{metric}_mean'] = round(statistics.mean(filtered_data), 3)
                new_record[f'{metric}_std'] = round(statistics.stdev(filtered_data), 3) if len(filtered_data) > 1 else None
                new_record[f'{metric}_min'] = round(min(filtered_data), 3)
                new_record[f'{metric}_max'] = round(max(filtered_data), 3)
            else:
                new_record[f'{metric}_mean'] = None
                new_record[f'{metric}_std'] = None
                new_record[f'{metric}_min'] = None
                new_record[f'{metric}_max'] = None
    
        new_record['arousal_score'] = round(self.arousal_score, 3) if self.arousal_score is not None else None
        new_record['valence_score'] = round(self.valence_score, 3) if self.valence_score is not None else None
        
        return new_record
    
    def _save_to_csv(self, save_path, record):
        """
        保存记录到CSV文件
        """
        # 确保目录存在
        csv_dir = os.path.dirname(save_path)
        if csv_dir:
            os.makedirs(csv_dir, exist_ok=True)
        
        # CSV字段顺序
        fieldnames = [
            'timestamp', 'data_source',
            'HF_mean', 'HF_std', 'HF_min', 'HF_max',
            'LF_mean', 'LF_std', 'LF_min', 'LF_max',
            'lf_hf_mean', 'lf_hf_std', 'lf_hf_min', 'lf_hf_max',
            'sdnn_mean', 'sdnn_std', 'sdnn_min', 'sdnn_max',
            'hr_mean', 'hr_std', 'hr_min', 'hr_max',
            'br_mean', 'br_std', 'br_min', 'br_max',
            'spo2_mean', 'spo2_std', 'spo2_min', 'spo2_max',
            'arousal_score', 'valence_score'
        ]
        
        write_header = not os.path.exists(save_path)
        
        none_replacement = ''
        with open(save_path, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if write_header:
                writer.writeheader()
            writer.writerow({k: (none_replacement if v is None else v) for k, v in record.items()})
        
        # print(f'[INFO] 个人基线数据已追加到CSV: {save_path}')
        return True
    
    def _get_norm_data(self):
        norm_name = self.fsm.current_norm
        norm_data = self.fsm.norms.get(norm_name)
        return norm_data
    
    def _calculate_emotion_scores(self):
        # 检查是否有足够的数据
        if (len(self.fsm.data['sdnn']) < 5 or
            len(self.fsm.data['lf_hf']) < 5):
            return None, None
        
        # 获取常模数据
        norm_data = self._get_norm_data()
        sdnn_norm_mean = norm_data['sdnn']['mean']
        sdnn_norm_std = norm_data['sdnn']['std']
        hr_norm_mean = norm_data['hr']['mean']
        hr_norm_std = norm_data['hr']['std']
        lf_hf_norm_mean = norm_data['lf_hf_ratio']['mean']
        lf_hf_norm_std = norm_data['lf_hf_ratio']['std']
        br_norm_mean = norm_data['br']['mean'] 
        br_norm_std = norm_data['br']['std']
        
        # 计算各指标，取最近30个样本点的均值
        br_mean = statistics.mean(list(self.fsm.data['br'])[-30:])
        sdnn_mean = statistics.mean(list(self.fsm.data['sdnn'])[-30:])
        hr_mean = statistics.mean(list(self.fsm.data['hr'])[-30:])
        lf_hf_mean = statistics.mean(list(self.fsm.data['lf_hf'])[-30:])

        # 计算各指标的标准化偏差
        hr_deviation = (hr_mean - hr_norm_mean) / hr_norm_std
        lf_hf_deviation = (lf_hf_mean - lf_hf_norm_mean) / lf_hf_norm_std
        sdnn_deviation_component = -((sdnn_mean - sdnn_norm_mean) / sdnn_norm_std)
        
        # 综合唤醒度方程（加权平均）
        w_hr = 0.4         # HR权重
        w_lf_hf = 0.01      # LF/HF权重
        w_sdnn_arousal = 0.59    # SDNN在唤醒度中的权重

        # 纵轴-唤醒度
        arousal_score = (w_hr * hr_deviation + 
                        w_lf_hf * lf_hf_deviation + 
                        w_sdnn_arousal * sdnn_deviation_component)
        
        # 横轴-效价
        br_component = -(br_mean - br_norm_mean) / br_norm_std
        sdnn_valence_component = (sdnn_mean - sdnn_norm_mean) / sdnn_norm_std
        
        # 效价权重配置
        w_br = 0.7
        w_sdnn_valence = 0.3
        valence_score = w_br * br_component + w_sdnn_valence * sdnn_valence_component
        
        return arousal_score, valence_score
    
    def _read_historical_data(self, save_path, num_records=3):
        """
        从CSV文件中读取历史数据的arousal和valence分数
        """
        if not os.path.exists(save_path):
            return []
        
        historical_points = []
        with open(save_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            rows = list(reader)
            
            # 获取最近的num_records条记录（包括当前正在记录的）
            for row in rows[-num_records:]:
                valence = row.get('valence_score', '')
                arousal = row.get('arousal_score', '')
                
                if valence and arousal and valence != 'null' and arousal != 'null':
                        valence_val = float(valence)
                        arousal_val = float(arousal)
                        historical_points.append((valence_val, arousal_val))
        
        return historical_points

    def _plot_deviation(self, save_path):
        """
        绘制Valence-Arousal Model图
        """
        # 设置中文字体
        # plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial']
        # plt.rcParams['axes.unicode_minus'] = False

        if self.arousal_score is None or self.valence_score is None:
            print('[WARNING] Insufficient data.')
            return
        
        # 计算各指标均值
        br_mean = statistics.mean(list(self.fsm.data['br'])[-30:])
        sdnn_mean = statistics.mean(list(self.fsm.data['sdnn'])[-30:])
        hr_mean = statistics.mean(list(self.fsm.data['hr'])[-30:])
        lf_hf_mean = statistics.mean(list(self.fsm.data['lf_hf'])[-30:])
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(10, 10))
        
        # 设置坐标轴范围
        axis_limit = 3.0
        ax.set_xlim(-axis_limit, axis_limit)
        ax.set_ylim(-axis_limit, axis_limit)
    
        # 绘制四象限背景
        ax.add_patch(plt.Rectangle((0, 0), axis_limit, axis_limit, 
                                    facecolor='#FFD700', alpha=0.3, label='Joy'))
        ax.add_patch(plt.Rectangle((-axis_limit, 0), axis_limit, axis_limit, 
                                    facecolor='#FF6B6B', alpha=0.3, label='Tense'))
        ax.add_patch(plt.Rectangle((-axis_limit, -axis_limit), axis_limit, axis_limit, 
                                    facecolor='#87CEEB', alpha=0.3, label='Low'))
        ax.add_patch(plt.Rectangle((0, -axis_limit), axis_limit, axis_limit, 
                                    facecolor='#90EE90', alpha=0.3, label='Calm'))
        
        # 绘制坐标轴线
        # ax.axhline(y=0, color='black', linewidth=1.5, alpha=0.5)
        # ax.axvline(x=0, color='black', linewidth=1.5, alpha=0.5)
        
        # 绘制±1标准差参考圈
        circle1 = plt.Circle((0, 0), 1.0, fill=False, color='gray', 
                            linestyle='--', linewidth=1, alpha=0.5)
        circle2 = plt.Circle((0, 0), 2.0, fill=False, color='gray', 
                            linestyle=':', linewidth=1, alpha=0.3)
        ax.add_patch(circle1)
        ax.add_patch(circle2)
        
        # 读取并绘制历史数据点（前两个）
        historical_points = self._read_historical_data(save_path, num_records=10)
        if historical_points:
            # 按照递减的透明度绘制历史点
            num_history = len(historical_points)
            for i, (val_score, aro_score) in enumerate(historical_points):
                alpha = 0.2 + (i + 1) * (0.3 / (num_history + 1))
                ax.scatter(val_score, aro_score, s=400, 
                          marker='.', color='#096800', alpha=alpha,
                          edgecolors='darkgray', linewidths=1,
                          zorder=10, label=f'History Emotion' if i == 0 else '')
        
        # 绘制当前状态点
        ax.scatter(self.valence_score, self.arousal_score, s=400, 
                    marker='.', edgecolors='#096800',
                    zorder=30, label='Current Emotion')
        
        # 设置标签
        ax.set_xlabel('Valence (←Low valence| High valence→)', fontsize=12, fontweight='bold')
        ax.set_ylabel('Arousal (←Low arousal| High arousal→)', fontsize=12, fontweight='bold')
        ax.set_title('Emotional State Quadrant Chart', fontsize=16, fontweight='bold', pad=20)
        
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        # 添加象限标签
        ax.text(1.5, 1.5, 'Joy', 
                ha='center', va='center', fontsize=30, fontweight='bold',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.3))
        
        ax.text(-1.5, 1.5, 'Tense', 
                ha='center', va='center', fontsize=30, fontweight='bold',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.3))
        
        ax.text(-1.5, -1.5, 'Low', 
                ha='center', va='center', fontsize=30, fontweight='bold',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.3))
        
        ax.text(1.5, -1.5, 'Calm',
                ha='center', va='center', fontsize=30, fontweight='bold',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.3))
        
        # 状态判断
        if self.arousal_score > 0 and self.valence_score > 0:
            state_name = 'Joy'
            state_color = '#FFD700'
        elif self.arousal_score > 0 and self.valence_score <= 0:
            state_name = 'Tense'
            state_color = '#FF6B6B'
        elif self.arousal_score <= 0 and self.valence_score <= 0:
            state_name = 'Low'
            state_color = '#87CEEB'
        else:
            state_name = 'Calm'
            state_color = '#90EE90'

        Degree = (self.arousal_score**2 + self.valence_score**2)**0.5
        if Degree < 1:
            print('[INFO] You are probably feeling Neutral')
        elif Degree < 2:
            print('[INFO] You are probably feeling Mild', state_name)
        else:
            print('[INFO] You are probably feeling Moderate', state_name)

        info_text = f'BR mean: {br_mean:.1f} bpm\n'
        info_text += f'HR mean: {hr_mean:.1f} bpm\n'
        info_text += f'SDNN mean: {sdnn_mean:.1f} ms\n'
        info_text += f'LF/HF mean: {lf_hf_mean:.2f}\n'
        info_text += f'-------------------\n'
        info_text += f'Valence Score: {self.valence_score:.2f}\n'
        info_text += f'Arousal Score: {self.arousal_score:.2f}'

        label_color = "#096800"
        props = dict(boxstyle='round', facecolor=label_color, alpha=0.5, edgecolor='black', linewidth=1)
        ax.text(0.02, 0.98, info_text, transform=ax.transAxes, 
                fontsize=11, verticalalignment='top', bbox=props,
                fontweight='bold')
        
        # 添加图例
        ax.legend(loc='upper right', fontsize=9, framealpha=0.9)
        
        # 设置纵横比为1:1
        ax.set_aspect('equal', adjustable='box')
        
        # 调整布局
        fig.tight_layout()
        
        # 保存图表
        plot_path = save_path.replace('.csv', '.png')
        fig.savefig(plot_path, dpi=150, bbox_inches='tight')
        # print(f'[INFO] 生理状态四象限图已保存到: {plot_path}')
        
        plt.close(fig)
