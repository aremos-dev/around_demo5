# main.py
import os
from db_manager import DBManager
from schema import init_tables
from repo import AyuanRepo

# 建议方案：从环境变量获取密钥，或者读取 /etc/machine-id (Linux 唯一设备码)
# 这样每台设备的数据库密码都不一样，拔出 SD 卡换个机器就打不开
def get_device_key():
    # 这是一个示例，实际可以使用更复杂的派生算法
    # 尝试获取 Linux 的 machine-id 作为基础密钥
    try:
        with open("/etc/machine-id", "r") as f:
            return f.read().strip()
    except:
        return "default_dev_key_fallback" 

def main():
    # 1. 配置
    DB_PATH = "ayuan_data.db"
    # 使用设备 ID 作为加密密钥
    DB_KEY = get_device_key() 
    
    print(f"正在初始化加密数据库，使用密钥: {DB_KEY[:5]}***")

    # 2. 初始化
    manager = DBManager(DB_PATH, DB_KEY)
    
    # 首次运行时建表
    conn = manager.get_connection()
    init_tables(conn)
    manager.close_connection(conn)

    # 3. 业务操作演示
    repo = AyuanRepo(manager)

    # [cite_start]模拟：用户刚做完一次呼吸训练，得分 93 [cite: 265]
    repo.add_breathing_log(duration=108, score=93, details={"hrv": 55})

    # [cite_start]模拟：App 检测到用户当前很放松 (Calm) [cite: 131]
    repo.record_emotion("Calm")

    # 读取数据验证
    logs = repo.get_recent_logs()
    for log in logs:
        print(f"读取到记录: 时间={log['timestamp']}, 分数={log['score']}")

if __name__ == "__main__":
    main()