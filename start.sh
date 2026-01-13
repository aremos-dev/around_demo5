#!/bin/bash

# 禁用 core dump，防止生成大量 core 文件
ulimit -c 0

# 等待 D-Bus socket 可用（Docker 环境中很重要）
echo "等待 D-Bus socket..."
for i in {1..30}; do
    if [ -S /var/run/dbus/system_bus_socket ] || [ -S /run/dbus/system_bus_socket ]; then
        echo "D-Bus socket 已就绪"
        break
    fi
    echo "等待 D-Bus... ($i/30)"
    sleep 1
done

# 检查蓝牙适配器是否可用
echo "检查蓝牙适配器..."
if command -v bluetoothctl &> /dev/null; then
    bluetoothctl show 2>/dev/null || echo "警告: 蓝牙适配器可能未正确挂载"
fi

# 后台跑蓝牙服务
python ble_server.py &
sleep 2  # 给蓝牙服务一点启动时间

# 运行主程序
python demo.py