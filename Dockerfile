# 1. 选择基础镜像
# 使用官方 Python 轻量级版本 (slim)，体积小且够用
FROM python:3.9

ENV PYTHONUNBUFFERED=1

# 2. 设置工作目录
# 容器启动后，所有命令都会在这个目录下执行
WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libhdf5-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get install -y \
    bluez \
    dbus \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

# 3. 复制依赖文件并安装
# 先只复制 requirements.txt 是为了利用 Docker 缓存机制，加速构建
COPY requirements.txt . 

# 安装依赖 (--no-cache-dir 可以减小镜像体积)
RUN pip install --no-cache-dir -r requirements.txt 
# -i https://pypi.tuna.tsinghua.edu.cn/simple --default-timeout=100

# 4. 复制项目代码
# 将当前目录下的所有文件复制到容器的 /app 目录
COPY . .

EXPOSE 5000

# 5. 设置启动命令
# 当容器启动时执行的命令
CMD ["python", "main.py"]