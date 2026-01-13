def init_tables(conn):
    cursor = conn.cursor()
    
    # 启用外键支持
    cursor.execute("PRAGMA foreign_keys = ON;")

    # [cite_start]1. 用户信息表 (参考 PRD [cite: 241-246])
    # 包含头像、用户名、心情内容
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profile (
        uuid TEXT PRIMARY KEY,
        username TEXT,
        mood_content TEXT,
        avatar_path TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # [cite_start]2. 呼吸训练日志表 (参考 PRD [cite: 261-265])
    # 字段：训练时间、时长、分数
    # 增加 is_deleted 用于未来同步
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS breathing_logs (
        uuid TEXT PRIMARY KEY,
        timestamp INTEGER,  -- 存储 Unix 时间戳
        duration_sec INTEGER, -- 训练时长 (秒)
        score INTEGER,        -- 训练分数 0-100
        detail_json TEXT,     -- 预留存详细指标 (JSON格式)
        is_deleted INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # [cite_start]3. 情绪历史表 (参考 PRD [cite: 130-135])
    # 字段：Calm, Stress, Meditation, Entertainment 等
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emotion_history (
        uuid TEXT PRIMARY KEY,
        timestamp INTEGER,
        emotion_type TEXT,  -- 'Calm', 'Stress', etc.
        level INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()