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
        self.ble.message_sync('m=1')
        self.music('fengsheng.MP3', max_duration=80,loops=100)
        
        self._music_thread = threading.Thread(
            target=self.music, args=('fengsheng.MP3',), kwargs={'max_duration': 225, 'loops': 100}, daemon=True
        )
        self._music_thread.start()
        for i in range(5):
            self.ble.message_sync('v=1')
            time.sleep(45)
        self.ble.message_sync('v=1')
        time.sleep(80)
        self.music('songbo.MP3',loops=1)
        self.ble.message_sync('m=0')

    def planB(self,):
        self._music_thread = threading.Thread(
            target=self.music, args=('hailang.MP3',), kwargs={'max_duration': 96}, daemon=True
        )
        self._music_thread.start()
        for i in range(8):
            self.ble.message_sync('m=0')
            time.sleep(4)
            self.ble.message_sync('v=2')

    def planC(self):
        """方案 C，暂未实现"""
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

        try:
            while True:
                print("\n输入 a: 执行 planA | b: 执行 planB | c: 执行 planC | q: 退出")
                choice = input("请选择: ").strip().lower()
                if choice == 'q':
                    break
                if choice == 'a':
                    self.planA()
                elif choice == 'b':
                    self.planB()
                elif choice == 'c':
                    self.planC()
                else:
                    print("请输入 a、b、c 或 q")
        finally:
            self.ble.stop_reading_sync()
            self.ble.message_sync('m=0')
            self.ble.message_sync('s=1')
            print("BLE 已断开，程序退出")


if __name__ == '__main__':
    heal_mode().main()