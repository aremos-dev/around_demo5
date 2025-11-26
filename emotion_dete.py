import pandas as pd
import numpy as np
import pickle
import neurokit2 as nk
import glob
import os
import joblib
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import classification_report
from scipy.stats import linregress

# =========================================
# 配置项
# =========================================
WESAD_ROOT_DIR = ''   # 你的 WESAD 文件夹路径,下面应该有 S2/S2.pkl, S3/S3.pkl...
SAMPLING_RATE = 700
WINDOW_SIZE = 60
STEP_SIZE = 10
MODEL_SAVE_PATH = 'stress_detection_model.pkl'  # 模型保存路径

# WESAD 所有受试者 ID (S12 数据通常有问题,一般排除)
SUBJECT_IDS = ['S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S13', 'S14', 'S15', 'S16', 'S17']


def radar_simulation_from_wesad(file_path):
    print(f"正在加载並处理数据: {file_path} ...")
    
    with open(file_path, 'rb') as file:
        data = pickle.load(file, encoding='latin1')

    # 提取原始信号
    ecg_signal = data['signal']['chest']['ECG'].flatten()
    resp_signal = data['signal']['chest']['Resp'].flatten()
    labels = data['label']

    # --- A. 处理 ECG 得到心率 (HR) ---
    print("正在从 ECG 提取心率 (模拟雷达 HR)...")
    # 清洗并找到 R 波
    ecg_cleaned = nk.ecg_clean(ecg_signal, sampling_rate=SAMPLING_RATE)
    peaks, _ = nk.ecg_peaks(ecg_cleaned, sampling_rate=SAMPLING_RATE)
    # 计算瞬时心率 (与原始信号长度一致)
    hr_series = nk.signal_rate(peaks, sampling_rate=SAMPLING_RATE, desired_length=len(ecg_signal))

    # --- B. 处理 Resp 得到呼吸率 (RR) ---
    print("正在从 Resp 提取呼吸率 (模拟雷达 RR)...")
    resp_cleaned = nk.rsp_clean(resp_signal, sampling_rate=SAMPLING_RATE)
    df_resp, _ = nk.rsp_process(resp_cleaned, sampling_rate=SAMPLING_RATE)
    # NeuroKit2 的 rsp_process 会直接输出 'RSP_Rate' 列
    rr_series = df_resp['RSP_Rate'].values

    # --- C. 降采样到 1Hz (关键步骤) ---
    # 创建一个临时 DataFrame 来对齐数据
    df_raw = pd.DataFrame({
        'HR': hr_series,
        'RR': rr_series,
        'Label': labels
    })

    # 每 700 个点 (1秒) 取一次平均，模拟雷达每秒输出一次数据
    # 对于 Label，我们取该秒内的众数
    df_1hz = df_raw.groupby(df_raw.index // SAMPLING_RATE).agg({
        'HR': 'mean',
        'RR': 'mean',
        'Label': lambda x: x.mode()[0] if not x.mode().empty else 0
    })

    print(f"预处理完成。1Hz 数据形状: {df_1hz.shape}")
    return df_1hz

# =========================================
# 2. 特徵工程：提取衍生数据 (Windowing & Stats)
# =========================================
def extract_features_dual_label(df_1hz):
    X_features = []
    y_arousal = []
    y_valence = []

    # WESAD 原始标签: 1=Baseline, 2=Stress, 3=Amusement, 4=Meditation
    # 我们全部都要用
    valid_labels = [1, 2, 3, 4]

    # --- 标签映射逻辑：基于任务类型的固定映射 ---
    # Arousal (唤醒度): 0=Low (平静/冥想), 1=High (压力/娱乐)
    map_arousal = {1: 0, 4: 0, 2: 1, 3: 1}
    
    # Valence (效价): 0=Negative/Neutral (压力/平静), 1=Positive (娱乐/冥想)
    map_valence = {1: 0, 2: 0, 3: 1, 4: 1}

    for i in range(0, len(df_1hz) - 60, 10): # 窗口60，步长10
        window = df_1hz.iloc[i : i + 60]
        label = window['Label'].mode()[0]
        
        if label not in valid_labels:
            continue

        # --- 特征提取 (保持不变) ---
        feat = {}
        feat['HR_mean'] = window['HR'].mean()
        feat['HR_std'] = window['HR'].std()
        feat['HR_range'] = window['HR'].max() - window['HR'].min()
        feat['RR_mean'] = window['RR'].mean()
        feat['RR_std'] = window['RR'].std()
        # 简单斜率
        slope, _, _, _, _ = linregress(np.arange(len(window)), window['HR'].values)
        feat['HR_slope'] = slope
        # 脉搏呼吸商
        feat['PRQ'] = feat['HR_mean'] / (feat['RR_mean'] + 1e-5)
        
        X_features.append(feat)
        
        # --- 使用固定映射进行二分类 ---
        y_arousal.append(map_arousal[label])
        y_valence.append(map_valence[label])

    return pd.DataFrame(X_features), np.array(y_arousal), np.array(y_valence)

# =========================================
# 1. 升级版数据加载：循环 + 标准化
# =========================================
def load_and_preprocess_all_subjects(subject_ids):
    all_subjects_features = []
    all_subjects_arousal_labels = []
    all_subjects_valence_labels = []
    all_subjects_groups = [] # 用于记录这行数据属于哪个人

    for subj_id in subject_ids:
        file_path = os.path.join(WESAD_ROOT_DIR, subj_id, f'{subj_id}.pkl')
        
        if not os.path.exists(file_path):
            print(f"跳过: 找不到 {file_path}")
            continue
            
        print(f"正在处理受试者: {subj_id} ...")
        

        try:
            df_1hz = radar_simulation_from_wesad(file_path)
        except Exception as e:
            print(f"处理 {subj_id} 出错: {e}")
            continue

        # --- B. 关键步骤：个体标准化 (Z-Score) ---
        # 目的：把 HR=60 变成 "-1.2" (相对值)，消除个体差异
        scaler = StandardScaler()
        # 只对数值列做标准化，不要动 Label
        cols_to_norm = ['HR', 'RR']
        df_1hz[cols_to_norm] = scaler.fit_transform(df_1hz[cols_to_norm])

        # --- C. 特征提取 ---
        # 调用上一段代码定义的 extract_features
        X_df, y_arousal, y_valence = extract_features_dual_label(df_1hz)
        
        if len(X_df) > 0:
            all_subjects_features.append(X_df)
            all_subjects_arousal_labels.append(y_arousal)
            all_subjects_valence_labels.append(y_valence)
            # 记录这批数据属于当前这个受试者
            all_subjects_groups.append(np.full(len(X_df), subj_id))

    # 合并所有人的数据
    if not all_subjects_features:
        return None, None, None, None

    X_final = pd.concat(all_subjects_features, ignore_index=True)
    y_arousal_final = np.concatenate(all_subjects_arousal_labels)
    y_valence_final = np.concatenate(all_subjects_valence_labels)
    groups_final = np.concatenate(all_subjects_groups)
    
    return X_final, y_arousal_final, y_valence_final, groups_final

# =========================================
# 2. 升级版主程序：使用 LOSO 验证
# =========================================
def main_multi_user():
    # 1. 加载所有数据
    print("开始加载多用户数据...")
    result = load_and_preprocess_all_subjects(SUBJECT_IDS)
    
    if result[0] is None:
        print("未加载到数据。")
        return
    
    X, y_arousal, y_valence, groups = result

    print(f"\n数据加载完成！")
    print(f"总样本数: {len(X)}")
    print(f"特征列表: {X.columns.tolist()}")
    arousal_counts = np.bincount(y_arousal)
    valence_counts = np.bincount(y_valence)
    print(f"Arousal标签分布: Low={arousal_counts[0]}, High={arousal_counts[1]}")
    print(f"Valence标签分布: Negative={valence_counts[0]}, Positive={valence_counts[1] if len(valence_counts) > 1 else 0}")
    
    # 2. 训练策略：留一法 (Leave-One-Subject-Out, LOSO)
    # 这是验证“通用模型”最严格的方法：
    # 比如：用 S2-S16 训练，用 S17 测试。看看模型能否从未见过的人身上识别情绪。
    
    logo = LeaveOneGroupOut()
    
    # 这里我们只演示第一折 (只验证一次)，实际科研会循环所有折取平均
    train_idx, test_idx = next(logo.split(X, y_arousal, groups))
    
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_arousal_train, y_arousal_test = y_arousal[train_idx], y_arousal[test_idx]
    y_valence_train, y_valence_test = y_valence[train_idx], y_valence[test_idx]
    test_subject_id = groups[test_idx][0]
    
    print(f"\n正在进行交叉验证...")
    print(f"训练集人数: {len(np.unique(groups[train_idx]))} 人")
    print(f"测试集对象: {test_subject_id}")
    
    # 3. 训练 Arousal 分类器
    print("\n=== 训练 Arousal (唤醒度) 分类器 ===")
    # 使用 class_weight='balanced' 自动处理类别不平衡
    clf_arousal = RandomForestClassifier(
        n_estimators=100, 
        max_depth=10, 
        random_state=42, 
        n_jobs=-1,
        class_weight='balanced'  # 关键：自动平衡类别权重
    )
    clf_arousal.fit(X_train, y_arousal_train)
    
    # 保存 Arousal 模型
    arousal_model_path = MODEL_SAVE_PATH.replace('.pkl', '_arousal.pkl')
    print(f"正在保存 Arousal 模型到 {arousal_model_path}...")
    joblib.dump(clf_arousal, arousal_model_path)
    print("Arousal 模型保存成功!")
    
    # 评估 Arousal
    y_arousal_pred = clf_arousal.predict(X_test)
    print("\n" + "="*40)
    print(f"测试对象 {test_subject_id} 的 Arousal 分类报告")
    print("="*40)
    print(f"实际标签分布: Low={np.sum(y_arousal_test==0)}, High={np.sum(y_arousal_test==1)}")
    print(f"预测标签分布: Low={np.sum(y_arousal_pred==0)}, High={np.sum(y_arousal_pred==1)}")
    print(classification_report(y_arousal_test, y_arousal_pred, target_names=['Low Arousal (<5)', 'High Arousal (>=5)'], zero_division=0))
    
    # 4. 训练 Valence 分类器
    print("\n=== 训练 Valence (效价) 分类器 ===")
    # 使用 class_weight='balanced' 自动处理类别不平衡
    clf_valence = RandomForestClassifier(
        n_estimators=100, 
        max_depth=10, 
        random_state=42, 
        n_jobs=-1,
        class_weight='balanced'  # 关键：自动平衡类别权重
    )
    clf_valence.fit(X_train, y_valence_train)
    
    # 保存 Valence 模型
    valence_model_path = MODEL_SAVE_PATH.replace('.pkl', '_valence.pkl')
    print(f"正在保存 Valence 模型到 {valence_model_path}...")
    joblib.dump(clf_valence, valence_model_path)
    print("Valence 模型保存成功!")
    
    # 评估 Valence
    y_valence_pred = clf_valence.predict(X_test)
    print("\n" + "="*40)
    print(f"测试对象 {test_subject_id} 的 Valence 分类报告")
    print("="*40)
    print(f"实际标签分布: Negative={np.sum(y_valence_test==0)}, Positive={np.sum(y_valence_test==1)}")
    print(f"预测标签分布: Negative={np.sum(y_valence_pred==0)}, Positive={np.sum(y_valence_pred==1)}")
    print(classification_report(y_valence_test, y_valence_pred, target_names=['Negative Valence (<5)', 'Positive Valence (>=5)'], zero_division=0))

class EmotionDetector:
    """
    情绪检测器类：用于预测 Arousal（唤醒度）和 Valence（效价）
    在初始化时加载模型，避免每次预测都重新加载
    """
    
    def __init__(self, arousal_model_path=None, valence_model_path=None):
        """
        初始化情绪检测器并加载模型
        
        参数:
            arousal_model_path: Arousal模型路径，默认自动寻找
            valence_model_path: Valence模型路径，默认自动寻找
        """
        # 设置默认路径
        if arousal_model_path is None:
            arousal_model_path = MODEL_SAVE_PATH.replace('.pkl', '_arousal.pkl')
        if valence_model_path is None:
            valence_model_path = MODEL_SAVE_PATH.replace('.pkl', '_valence.pkl')
        
        # 加载模型
        print("正在初始化情绪检测器...")
        self.arousal_model = self._load_model(arousal_model_path, "Arousal")
        self.valence_model = self._load_model(valence_model_path, "Valence")
        
        if self.arousal_model is None or self.valence_model is None:
            raise ValueError("模型加载失败，请检查模型文件路径")
        
        print("情绪检测器初始化完成！\n")
    
    def _load_model(self, model_path, model_name):
        """
        加载单个模型
        
        参数:
            model_path: 模型文件路径
            model_name: 模型名称（用于显示）
        
        返回:
            加载的模型对象
        """
        if not os.path.exists(model_path):
            print(f"错误: {model_name}模型文件 {model_path} 不存在")
            return None
        
        print(f"  加载{model_name}模型: {model_path}")
        model = joblib.load(model_path)
        return model
    
    def predict_from_features(self, X_new, verbose=True):
        """
        从特征DataFrame预测 Arousal 和 Valence
        
        参数:
            X_new: 新数据 (DataFrame 或 numpy array)，应包含7个特征列
                   ['HR_mean', 'HR_std', 'HR_range', 'RR_mean', 'RR_std', 'HR_slope', 'PRQ']
            verbose: 是否打印预测结果
        
        返回:
            dict: {'arousal': 类别值(0或1), 'valence': 类别值(0或1)}
                  arousal: 0=Low(<5), 1=High(>=5)
                  valence: 0=Negative(<5), 1=Positive(>=5)
        """
        # 预测
        arousal_pred = self.arousal_model.predict(X_new)[0]
        valence_pred = self.valence_model.predict(X_new)[0]
        
        # 返回结果
        result = {
            'arousal': int(arousal_pred),
            'valence': int(valence_pred)
        }
        
        if verbose:
            print(f"\n预测结果: Arousal={'High(>=5)' if arousal_pred == 1 else 'Low(<5)'}, Valence={'Positive(>=5)' if valence_pred == 1 else 'Negative(<5)'}")
        
        return result
    
    def predict_from_signals(self, hr_array, rr_array, verbose=True):
        """
        直接从60秒的心率和呼吸率数据预测 Arousal 和 Valence
        
        参数:
            hr_array: 心率数组，长度为60（每秒1个值）
            rr_array: 呼吸率数组，长度为60（每秒1个值）
            verbose: 是否打印预测结果
        
        返回:
            dict: {'arousal': 0或1, 'valence': 0或1}
        
        示例:
            detector = EmotionDetector()
            hr = [70, 72, 71, 73, ...] # 60个心率值
            rr = [15, 16, 15, 14, ...] # 60个呼吸率值
            result = detector.predict_from_signals(hr, rr)
        """
        # 转换为numpy数组
        hr_array = np.array(hr_array)
        rr_array = np.array(rr_array)
        
        # 验证长度
        if len(hr_array) != 60 or len(rr_array) != 60:
            print(f"错误: 输入数据长度必须为60秒，当前 HR={len(hr_array)}, RR={len(rr_array)}")
            return None
        
        # 提取特征
        feat = {}
        feat['HR_mean'] = hr_array.mean()
        feat['HR_std'] = hr_array.std()
        feat['HR_range'] = hr_array.max() - hr_array.min()
        feat['RR_mean'] = rr_array.mean()
        feat['RR_std'] = rr_array.std()
        
        # 计算心率斜率
        slope, _, _, _, _ = linregress(np.arange(60), hr_array)
        feat['HR_slope'] = slope
        
        # 计算脉搏呼吸商
        feat['PRQ'] = feat['HR_mean'] / (feat['RR_mean'] + 1e-5)
        
        # 转换为DataFrame
        X_new = pd.DataFrame([feat])
        
        # 调用预测函数
        return self.predict_from_features(X_new, verbose=verbose)

# =========================================
# 向后兼容的函数（已废弃，建议使用EmotionDetector类）
# =========================================
def load_model(model_path=MODEL_SAVE_PATH):
    """已废弃：建议使用 EmotionDetector 类"""
    if not os.path.exists(model_path):
        print(f"错误: 模型文件 {model_path} 不存在")
        return None
    model = joblib.load(model_path)
    return model

def predict_from_signals(hr_array, rr_array, arousal_model_path=None, valence_model_path=None):
    """已废弃：建议使用 EmotionDetector 类"""
    detector = EmotionDetector(arousal_model_path, valence_model_path)
    return detector.predict_from_signals(hr_array, rr_array)

if __name__ == "__main__":
    main_multi_user()