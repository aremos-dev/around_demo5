from pysqlcipher3 import dbapi2 as sqlite3
import os

class DBManager:
    def __init__(self, db_path, password):
        self.db_path = db_path
        self.password = password

    def get_connection(self):
        """获取一个已解密的数据库连接"""
        conn = sqlite3.connect(self.db_path)
        
        # --- 核心加密逻辑 ---
        # 在执行任何操作前，必须先输入密码
        conn.execute(f"PRAGMA key = '{self.password}';")
        # 强制启用加密（可选，验证用）
        conn.execute("PRAGMA cipher_compatibility = 3;")
        
        # 设置返回字典类型的结果，方便通过列名访问
        conn.row_factory = sqlite3.Row
        return conn

    def close_connection(self, conn):
        if conn:
            conn.close()