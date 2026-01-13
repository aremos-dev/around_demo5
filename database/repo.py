import uuid
import time
import json

class AyuanRepo:
    def __init__(self, db_manager):
        self.db = db_manager

    # --- 呼吸训练相关 ---
    def add_breathing_log(self, duration, score, details=None):
        """
        [cite_start]插入一条呼吸训练记录 [cite: 261-265]
        """
        new_id = str(uuid.uuid4())
        now = int(time.time())
        json_details = json.dumps(details) if details else "{}"
        
        sql = """
        INSERT INTO breathing_logs (uuid, timestamp, duration_sec, score, detail_json)
        VALUES (?, ?, ?, ?, ?)
        """
        
        conn = self.db.get_connection()
        try:
            conn.execute(sql, (new_id, now, duration, score, json_details))
            conn.commit()
            print(f"日志已加密保存: ID {new_id}")
        finally:
            self.db.close_connection(conn)

    def get_recent_logs(self, limit=10):
        """获取最近的训练记录用于列表展示"""
        conn = self.db.get_connection()
        try:
            cursor = conn.execute("""
                SELECT * FROM breathing_logs 
                WHERE is_deleted = 0 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (limit,))
            # 将结果转换为字典列表
            return [dict(row) for row in cursor.fetchall()]
        finally:
            self.db.close_connection(conn)

    # --- 情绪状态相关 ---
    def record_emotion(self, emotion_type):
        """
        [cite_start]记录实时情绪状态 [cite: 130-135]
        emotion_type: 'Calm', 'Stress', 'Meditation', 'Entertainment'
        """
        new_id = str(uuid.uuid4())
        now = int(time.time())
        
        sql = "INSERT INTO emotion_history (uuid, timestamp, emotion_type) VALUES (?, ?, ?)"
        
        conn = self.db.get_connection()
        try:
            conn.execute(sql, (new_id, now, emotion_type))
            conn.commit()
        finally:
            self.db.close_connection(conn)