# 1. 使用完整版 Python 3.9 (基于 Debian 12 Bookworm)
# 建议加上 -bookworm 后缀，防止未来自动升级到不稳定版本导致源配置失效
FROM python:3.9-bookworm

# 设置 Python 输出不缓存 (方便看日志)
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 2. 【关键步骤】配置国内 APT 源 (阿里云)
# 完整版也需要这一步，否则 apt-get install bluez 会卡住
RUN rm -rf /etc/apt/sources.list.d/* && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm main non-free non-free-firmware contrib" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security/ bookworm-security main non-free non-free-firmware contrib" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main non-free non-free-firmware contrib" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-backports main non-free non-free-firmware contrib" >> /etc/apt/sources.list

# 3. 安装必要的系统级库
# 即使是完整版，也不包含 bluez(蓝牙), dbus(总线), libsndfile1(音频处理)
# 这些必须手动安装，否则你的 ble.py 和 WAV 处理会报错
# 注意：添加 rfkill 用于蓝牙控制，容器以 root 运行不需要 sudo
RUN apt-get update && apt-get install -y \
    build-essential \
    libhdf5-dev \
    pkg-config \
    libdbus-1-dev \
    libdbus-glib-1-dev \
    libffi-dev \
    # PyGObject/pycairo build deps
    libgirepository1.0-dev \
    gir1.2-glib-2.0 \
    libcairo2-dev \
    gobject-introspection \
    bluez \
    dbus \
    rfkill \
    libsndfile1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. 升级 pip (使用清华源)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel -i https://mirrors.aliyun.com/pypi/simple/

# 5. 复制依赖并安装
COPY requirements.txt .
# 强制使用清华源加速下载
RUN pip install h5py -i https://mirrors.aliyun.com/pypi/simple/
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 6. 复制项目代码
COPY . .

# 7. 赋予脚本执行权限
RUN chmod +x start.sh

# 8. 【重要修正】使用脚本启动，而不是直接跑 python main.py
# 只有这样，start.sh 里的后台进程 (worker.py 等) 才会一起启动
CMD ["./start.sh"]