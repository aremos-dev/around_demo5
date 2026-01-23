from ble import BLE
import pygame
import threading
import time


class heal_mode():
    def __init__(self):
        self.ble = BLE(device_name="liubai")
        self.is_levitating = False  # music() 中用于检测底座，单独运行时默认为 False
        pygame.mixer.init()

    def music(self, sound_file, max_duration=None, loops=0):
        """播放音频文件并等待播放完成
        
        Args:
            sound_file: 音频文件路径
            max_duration: 最大播放时长（秒），None表示播放完整音频
            loops: 循环播放次数，0表示播放1次，1表示播放2次（原始+重复1次），以此类推
        """
        pygame.mixer.music.load(sound_file)
        pygame.mixer.music.play(loops=loops)
        
        start_time = time.time()
        # 等待音频播放完成，同时检查is_here状态和播放时长
        while pygame.mixer.music.get_busy():
            if self.is_levitating:
                print("dot put on the base, stopping music")
                pygame.mixer.music.stop()
                break
            elif max_duration and (time.time() - start_time >= max_duration):
                print(f"Reached max duration {max_duration}s, stopping music")
                pygame.mixer.music.stop()
                break
            time.sleep(0.1)

    def planA(self,):
        self.ble.message_sync('c=64,25,3')
        time.sleep(0.5)
        self.ble.message_sync('v=1')
        time.sleep(1)
        self.ble.message_sync('v=0')
        time.sleep(34)
        self.ble.message_sync('c=255,110,10')
        time.sleep(0.5)
        self.ble.message_sync('v=1')
        time.sleep(2)
        self.ble.message_sync('v=0')
        time.sleep(58)
        self.ble.message_sync('c=255,110,10')
        time.sleep(0.5)
        self.ble.message_sync('v=1')
        time.sleep(1)
        self.ble.message_sync('v=0')
        time.sleep(58)
        self.ble.message_sync('v=1')
        time.sleep(1)
        self.ble.message_sync('v=0')
        time.sleep(54)
        self.ble.message_sync('c=64,25,3')
        time.sleep(0.5)
        self.ble.message_sync('v=1')
        time.sleep(1)
        self.ble.message_sync('v=0')
        time.sleep(0.5)
        self.ble.message_sync('v=1')
        time.sleep(1)
        self.ble.message_sync('v=0')
        time.sleep(28)
        self.ble.message_sync('c=0')

    def planB(self,):
        # TODO: 在这里实现方案B的逻辑
        print("方案B待实现")
        pass

    def main(self):
        # 启动 BLE 连接与连续读取
        self.ble.start_continuous_reading()
        print("正在连接 BLE 设备，请稍候...")
        time.sleep(3)
        while not self.ble.is_connected:
            print("BLE 未连接，持续扫描中...")
            time.sleep(2)
        print("BLE 已连接")

        self.ble.message_sync('s=0')

        # 让用户选择方案
        while True:
            choice = input("请选择方案 (输入 A 或 B): ").strip().upper()
            if choice == 'A':
                print("执行方案A...")
                self.planA()
                break
            elif choice == 'B':
                print("执行方案B...")
                self.planB()
                break
            else:
                print("无效输入，请输入 A 或 B")

if __name__ == '__main__':
    heal_mode().main()