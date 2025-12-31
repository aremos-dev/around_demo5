import asyncio
import threading
from collections import deque
from bleak import BleakScanner, BleakClient
import time
import subprocess
import os

def check_dbus_available():
    """检查 D-Bus 是否可用"""
    dbus_paths = ['/var/run/dbus/system_bus_socket', '/run/dbus/system_bus_socket']
    for path in dbus_paths:
        if os.path.exists(path):
            return True
    return False

def wait_for_bluetooth_ready(max_retries=30):
    """等待蓝牙服务完全就绪"""
    if not check_dbus_available():
        return False
    
    for i in range(max_retries):
        try:
            result = subprocess.run(
                ["bluetoothctl", "show"],
                timeout=5,
                capture_output=True,
                text=True
            )
            if "Powered: yes" in result.stdout:
                print("蓝牙服务已就绪")
                return True
            print(f"等待蓝牙服务就绪... ({i+1}/{max_retries})")
            time.sleep(2)
        except Exception as e:
            print(f"检查蓝牙状态时出错: {e}")
            time.sleep(2)
    
    return False

def reset_bluetooth():
    """使用 bluetoothctl 重置蓝牙适配器"""
    # 先检查 D-Bus 是否可用，避免因 D-Bus 不可用导致崩溃和 core dump
    if not check_dbus_available():
        print("警告: D-Bus socket 不可用，跳过蓝牙重置。")
        print("如果在 Docker 中运行，请确保挂载了 /var/run/dbus")
        return
    
    # 先等待蓝牙服务就绪，避免 "Operation already in progress" 错误
    print("等待蓝牙服务完全就绪...")
    wait_for_bluetooth_ready(max_retries=15)
    
    try:
        print("重置蓝牙适配器...")
        # 关闭蓝牙（使用 stderr 重定向避免错误输出）
        result = subprocess.run(
            ["bluetoothctl", "power", "off"], 
            timeout=10, 
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"关闭蓝牙警告: {result.stderr.strip()}")
        
        time.sleep(2)
        
        # 开启蓝牙
        result = subprocess.run(
            ["bluetoothctl", "power", "on"], 
            timeout=10, 
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"开启蓝牙警告: {result.stderr.strip()}")
        else:
            print("蓝牙适配器已重置。")
        
        time.sleep(3)  # 等待蓝牙适配器完全准备就绪
        
    except subprocess.TimeoutExpired:
        print("重置蓝牙超时，继续运行...")
    except FileNotFoundError:
        print("bluetoothctl 未安装，跳过蓝牙重置。")
    except Exception as e:
        print(f"重置蓝牙时出错: {e}")
        print("继续运行...")

VOLTAGE_SOC_TABLE = [
    (4.20, 100.0),
    (4.15, 95.0),
    (4.11, 90.0),
    (4.08, 85.0),
    (4.02, 80.0),
    (3.98, 75.0),
    (3.95, 70.0),
    (3.91, 65.0),
    (3.87, 60.0),
    (3.85, 55.0),
    (3.84, 50.0),
    (3.82, 45.0),
    (3.80, 40.0),
    (3.79, 35.0),
    (3.77, 30.0),
    (3.75, 25.0),
    (3.73, 20.0),
    (3.71, 15.0),
    (3.69, 10.0),
    (3.61, 5.0),
    (3.27, 0.0),
]

class BLE():
    """BLE 数据读取器类"""
    
    def __init__(self, device_name, max_buffer_size=120):
        """
        初始化 BLE 数据读取器
        
        Args:
            device_name: 要连接的设备名称
            max_buffer_size: deque 最大缓冲区大小
        """
        
        reset_bluetooth()
        self.device_name = device_name
        self.hr = deque(maxlen=max_buffer_size)  # 存储心率数据
        self.blood_oxygen = deque(maxlen=max_buffer_size)  # 存储血氧数据
        self.sdnn = deque(maxlen=max_buffer_size)  # 存储SDNN数据
        self.rri = deque(maxlen=max_buffer_size * 4)  # 存储RRI数据
        self.voltage = None
        self.client = None
        self.is_running = False
        self.is_connected = False
        self.data_valid = False
        self.receive_buffer = bytearray()  # 用于接收数据的缓冲区
        self.touch = deque(maxlen=max_buffer_size)  # 存储触摸数据
        self.gyroscope = deque(maxlen=max_buffer_size)  # 存储晃动数据
        
        # Threading 相关
        self.loop = None
        self.thread = None
        
        # 配置参数
        self.notify_characteristic_uuid = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
        self.write_characteristic_uuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
        self.frame_size = 10  # 每帧数据包含9个字节
        self.header_byte = 0xFF  # 包头校验位
        
    def _notification_handler(self, sender, data: bytearray):
        """
        当接收到BLE通知时，此函数被调用
        
        Args:
            sender: 发送方
            data: 接收到的原始数据
        """
        # 将接收到的数据添加到缓冲区
        self.receive_buffer.extend(data)
        
        # 解析缓冲区中的完整帧
        while len(self.receive_buffer) >= self.frame_size:
            # 查找包头
            header_index = self.receive_buffer.find(self.header_byte)
            
            if header_index == -1:
                # 没有找到包头,清空缓冲区
                self.receive_buffer.clear()
                break
            
            # 丢弃包头之前的数据
            if header_index > 0:
                self.receive_buffer = self.receive_buffer[header_index:]
            
            # 检查是否有完整的一帧数据
            if len(self.receive_buffer) >= self.frame_size:
                # 提取一帧数据
                frame = self.receive_buffer[:self.frame_size]
                
                # 验证包头
                if frame[0] == self.header_byte:
                    # 提取后8位有效数据，转换为整型
                    valid_data = [int(b) for b in frame[1:10]]
                    if valid_data[0] < 50 or valid_data[0] > 190:
                        self.hr.append(0)
                    else :
                        self.hr.append(valid_data[0])
                    self.blood_oxygen.append(valid_data[1])
                    self.sdnn.append(valid_data[2])
                    self.rri.extend(valid_data[3:6])
                    # self.voltage = self.calculate_percentage_lookup(valid_data[6] / 10)
                    self.gyroscope.append(valid_data[6])  # 低4位为shake
                    # self.touch.append((valid_data[7]) & 0x0F)  # 高4位为touch

                    self.data_valid = True
                    print(f"收到数据帧: HR={valid_data[0]}, SpO2={valid_data[1]}, SDNN={valid_data[2]}, "\
                          f"RRI={valid_data[3:6]},gyro={valid_data[6]}")

                # 从缓冲区移除已处理的帧
                self.receive_buffer = self.receive_buffer[self.frame_size:]
            else:
                break
    
    async def connect(self):
        """连接到 BLE 设备，如果失败则持续重试。"""
        while self.is_running: # 只要持续读取的标志位为True，就不断尝试
            device = None
            try:
                print(f"正在扫描BLE设备，寻找 '{self.device_name}'...")
                # 增加扫描超时，避免永久阻塞
                device = await BleakScanner.find_device_by_name(self.device_name, timeout=10.0)
                
                if device is None:
                    print(f"找不到设备 '{self.device_name}'，将在5秒后重试...")
                    await asyncio.sleep(5)
                    continue # 继续下一次循环尝试

                print(f"成功找到设备: 地址 {device.address}")
                
                self.client = BleakClient(device)
                print(f"正在尝试连接到 {device.address}...")
                await self.client.connect()
                
                if self.client.is_connected:
                    print(f"成功连接到 {device.address}")
                    self.is_connected = True
                    return True # 连接成功，退出connect方法

            except Exception as e:
                error_str = str(e)
                print(f"连接过程中发生错误: {e}")
                
                # 如果是 "Operation already in progress" 错误，等待更长时间让蓝牙服务就绪
                if "InProgress" in error_str or "already in progress" in error_str.lower():
                    print("检测到蓝牙操作正在进行中，等待蓝牙服务完成...")
                    await asyncio.sleep(10)  # 等待更长时间
                    reset_bluetooth()  # 重置蓝牙适配器
                    await asyncio.sleep(3)
                    continue
            
            # 如果代码执行到这里，说明发生了错误或连接未成功
            print("连接失败，将在5秒后重试...")
            if self.client:
                try:
                    if self.client.is_connected:
                        await self.client.disconnect()
                except Exception:
                    pass
            await asyncio.sleep(5)
        
        return False # 如果 self.is_running 变为 False，则退出循环并返回
    
    async def start_reading(self):
        """开始读取数据"""
        if self.client is None or not self.client.is_connected:
            print("错误：设备未连接")
            return
        
        print(f"\n正在尝试监听特征 {self.notify_characteristic_uuid}...")
        await self.client.start_notify(
            self.notify_characteristic_uuid, 
            self._notification_handler
        )
        
        print("成功开始监听。")
        
        # 发送 p=1 指令以触发数据采集
        print("发送 p=1 指令以启动数据采集...")
        await self.client.write_gatt_char(
            self.write_characteristic_uuid, 
            b"p=1\n"
        )
        print("已发送 p=1 指令，等待接收数据。")
        
        self.is_running = True
        
        # 持续运行以接收数据，直到程序被中断
        while self.is_running:
            await asyncio.sleep(1.0)
            
            # 打印当前数据
            # self.print_data()
            
            if not self.client.is_connected:
                print("设备已断开连接。")
                break
    
    async def stop_reading(self):
        """停止读取数据"""
        self.is_running = False
        
        if self.client and self.client.is_connected:
            # 停止通知
            await self.client.stop_notify(self.notify_characteristic_uuid)
            
            # 发送 p=0 指令以停止数据采集
            await self.client.write_gatt_char(
                self.write_characteristic_uuid, 
                b"p=0\n"
            )
            print("已发送 p=0 指令以停止数据采集。")
    
    def stop_reading_sync(self,):
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.stop_reading(), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.stop_reading())
        except TimeoutError:
            print("[WARNING] stop_reading_sync 超时")
        except Exception as e:
            print(f"[WARNING] stop_reading_sync 失败: {e}")

    async def disconnect(self):
        """断开设备连接"""
        if self.client and self.client.is_connected:
            await self.client.disconnect()
            print("设备已断开连接。")
    
    # ========== Threading 包装方法（与 PPG 类接口保持一致）==========
    
    def start_continuous_reading(self):
        """
        开始连续读取数据（类似 PPG.start_continuous_reading()）
        在独立线程中运行 asyncio 事件循环，支持自动重连
        """
        self.is_running = True
        print("Starting continuous BLE data reading...")
        
        def async_thread():
            """在线程中运行 asyncio 事件循环"""
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            
            
            while self.is_running:
                # 在同一个事件循环中连接和读取
                self.loop.run_until_complete(self.connect())
                
                if self.is_connected:
                    self.loop.run_until_complete(self.start_reading())
                    # 如果退出 start_reading 是因为断开连接
                    if self.is_running:
                        time.sleep(2)
                    else:
                        break
                else:
                    time.sleep(2)

            # 清理
            if self.client and self.client.is_connected:
                self.loop.run_until_complete(self.disconnect())
            self.loop.close()
        
        # 启动线程
        self.thread = threading.Thread(target=async_thread)
        self.thread.daemon = True
        self.thread.start()
    
    def stop_continuous_reading(self):
        """停止连续读取（类似 PPG.stop_reading()）"""
        self.is_running = False
        print("Stop reading BLE data")
        
        # 等待线程结束
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
    
    def disconnect_sync(self):
        """同步断开连接（类似 PPG.disconnect()）"""
        self.stop_continuous_reading()
        
        if self.loop and self.client:
            # 如果事件循环还在运行，在其中执行断开
            if self.loop.is_running():
                asyncio.run_coroutine_threadsafe(self.disconnect(), self.loop)
            else:
                # 创建新的事件循环来断开连接
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.disconnect())
                loop.close()
        
        self.is_connected = False
    
    def print_data(self):
        """打印当前数据（类似 PPG.print_data()）"""
        if self.data_valid and len(self.hr) > 0:
            print(f"Heart Rate: {list(self.hr)[-1]} bpm | Blood Oxygen: {list(self.blood_oxygen)[-1]}% | "
                  f"SDNN: {list(self.sdnn)[-1]} | Voltage: {self.voltage}%")

    def calculate_percentage_lookup(self, voltage):

        # 处理边界情况
        if voltage >= VOLTAGE_SOC_TABLE[0][0]:
            return 100.0
        if voltage <= VOLTAGE_SOC_TABLE[-1][0]:
            return 0.0

        # 查找电压所在的区间
        for i in range(len(VOLTAGE_SOC_TABLE) - 1):
            v_high, soc_high = VOLTAGE_SOC_TABLE[i]
            v_low, soc_low = VOLTAGE_SOC_TABLE[i+1]
            
            if v_low <= voltage <= v_high:
                # 在找到的区间内进行线性插值
                # 公式: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
                percentage = soc_low + (voltage - v_low) * (soc_high - soc_low) / (v_high - v_low)
                return percentage
    
    async def color(self, r, g, b):
        """
        设置LED颜色
        
        Args:
            r: 红色值 (0-255)
            g: 绿色值 (0-255)
            b: 蓝色值 (0-255)
        """
        if self.client and self.client.is_connected:
            command = f'c={r},{g},{b}\n'.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送颜色指令: RGB({r},{g},{b})")
    
    def color_sync(self, r, g, b):
        """同步版本的color方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.color(r, g, b), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.color(r, g, b))
        except TimeoutError:
            print(f"[WARNING] color_sync 超时: RGB({r},{g},{b})")
        except Exception as e:
            print(f"[WARNING] color_sync 失败: {e}")
        
    async def jump(self,a):
        if self.client and self.client.is_connected:
            command = f'l={a}\n'.encode('ascii')#l = 0, 1, 2
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送跳跃指令: {a}")
    
    def jump_sync(self, a):
        """同步版本的jump方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.jump(a), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.jump(a))
        except TimeoutError:
            print(f"[WARNING] jump_sync 超时: {a}")
        except Exception as e:
            print(f"[WARNING] jump_sync 失败: {e}")

    async def bright(self, brightness):
        """
        设置LED亮度
        
        Args:
            brightness: 亮度值 (0-255)
        """
        if self.client and self.client.is_connected:
            command = f'b={brightness}\n'.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送亮度指令: {brightness}")
    
    def bright_sync(self, brightness):
        """同步版本的bright方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.bright(brightness), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.bright(brightness))
        except TimeoutError:
            print(f"[WARNING] bright_sync 超时: {brightness}")
        except Exception as e:
            print(f"[WARNING] bright_sync 失败: {e}")
    
    async def mode(self, mode):
        """
        设置模式
        
        Args:
            mode: 模式值 (0, 1, 2, 3)
        """
        if self.client and self.client.is_connected:
            command = f'm={mode}\n'.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送模式指令: {mode}")

    def mode_sync(self, mode):
        """同步版本的mode方法，可在非异步环境中调用"""
        try:
            if self.loop and self.loop.is_running():
                # 如果事件循环在运行（即在后台线程中），在该循环中执行
                future = asyncio.run_coroutine_threadsafe(self.mode(mode), self.loop)
                future.result(timeout=5.0)  # 等待执行完成，最多5秒
            else:
                # 如果没有运行的事件循环，创建一个新的
                asyncio.run(self.mode(mode))
        except TimeoutError:
            print(f"[WARNING] mode_sync 超时: {mode}")
        except Exception as e:
            print(f"[WARNING] mode_sync 失败: {e}")
    
    async def shake(self, v=1):
        """
        震动控制
        
        Args:
            v: 震动参数，默认为1
        """
        if self.client and self.client.is_connected:
            command = f'v={v}\n'.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送震动指令: {v}")
    
    def shake_sync(self, v=1):
        """同步版本的shake方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.shake(v), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.shake(v))
        except TimeoutError:
            print(f"[WARNING] shake_sync 超时: {v}")
        except Exception as e:
            print(f"[WARNING] shake_sync 失败: {e}")

    async def message(self, a):
        """
        震动控制
        
        Args:
            v: 震动参数，默认为1
        """
        if self.client and self.client.is_connected:
            command = a.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送指令: {a}")
    
    def message_sync(self, a):
        """同步版本的shake方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.message(a), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.message(a))
        except TimeoutError:
            print(f"[WARNING] shake_sync 超时: {a}")
        except Exception as e:
            print(f"[WARNING] shake_sync 失败: {e}")
    
    
    async def ppg(self, p=0):
        """
        PPG数据采集控制
        
        Args:
            p: 1表示开始采集, 0表示停止采集
        """
        if self.client and self.client.is_connected:
            if p == 1:
                command = b'p=1\n'
                print("已发送PPG开始采集指令")
            elif p == 0:
                command = b'p=0\n'
                print("已发送PPG停止采集指令")
            else:
                return
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)

    async def freq_light(self, f=5):
        """
        频率呼吸灯控制
        
        Args:
            f: 呼吸灯频率
        """
        if self.client and self.client.is_connected:
            command = f'F={f}\n'.encode('ascii')
            await self.client.write_gatt_char(self.write_characteristic_uuid, command)
            print(f"已发送频率呼吸灯指令: {f}")

    def freq_light_sync(self, f=5):
        """同步版本的freq_light方法"""
        try:
            if self.loop and self.loop.is_running():
                future = asyncio.run_coroutine_threadsafe(self.freq_light(f), self.loop)
                future.result(timeout=5.0)
            else:
                asyncio.run(self.freq_light(f))
        except TimeoutError:
            print(f"[WARNING] freq_light_sync 超时: {f}")
        except Exception as e:
            print(f"[WARNING] freq_light_sync 失败: {e}")


if __name__ == "__main__":
     # 在初始化时重置蓝牙
    ble = BLE(device_name="demo6", max_buffer_size=120)
    # 直接开始连续读取，connect 会在后台线程中自动执行
    ble.start_continuous_reading()
    time.sleep(0.5)
    ble.shake_sync(0)
    time.sleep(0.5)
    ble.mode_sync(3)
    time.sleep(1)
    ble.color_sync(0,0,0)
    time.sleep(1)
    ble.stop_reading_sync()
    
    
    # time.sleep(100)
