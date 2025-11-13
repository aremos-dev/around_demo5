from fsm import FSM
from ble import BLE
import serial
import pygame
import threading
import time
import signal
import sys
from hall import hall
import statistics
import os
from data_recorder import DataRecorder

class dot():
    def __init__(self, data_source='both'):
        self.ble = BLE(device_name="demo6_1")
        self.fsm = FSM(data_source=data_source, enable_visualization=True, viz_port=5000, ble_instance=self.ble)
        self.recorder = DataRecorder(self.fsm)
        self.is_here = False
        self.le = True
        self.is_levitating = False
        self.hall = hall()
        pygame.mixer.init()

    def waiting_to_start(self):
        start = time.time()
        while time.time() - start < 30:
            if len(self.fsm.radar.heart_rate) > 0:
                x = len(self.fsm.radar.heart_rate)
                time.sleep(5)
                if len(self.fsm.radar.heart_rate) <= x:
                    break
            print(f'past time:{time.time() - start}')
            time.sleep(5)
        if time.time() - start >= 30:
            self.is_here = True
            if self.ble.is_connected:
                print("BLE device connected successfully.")
                time.sleep(1)
                print("light set to blue")
        
    def run(self,):
        # self.fsm.radar.start_continuous_reading()
        # self.fsm.ppg_device.start_continuous_reading()
        self.fsm.run()
        levitating = threading.Thread(target=self.levitation, daemon=True)
        levitating.start()
        is_here_monitor = threading.Thread(target=self.monitor_here, daemon=True)
        is_here_monitor.start()
        print("started reading data")
           
    def monitor_here(self,):
        print('start monitor here')
        while 1:
            if len(self.fsm.radar.heart_rate) > 0:
                x = len(self.fsm.radar.heart_rate)
                time.sleep(10)
                if len(self.fsm.radar.heart_rate) <= x:
                    self.is_here = False
                    print('nobody')
                else: 
                    self.is_here = True
                    print('some one is here')
            time.sleep(2)
    
    def levitation(self,):
        print('start levitation monitor')
        self.hall.connect()
        self.hall.start_continuous_reading()
        start = time.time()
        while 1:
            if self.le == True:
                if self.hall.hall_value:
                    
                        # print(f'Read hall:{self.hall.hall_value[-1]}')
                    if self.hall.hall_value[-1] < 3200 or self.hall.hall_value[-1]>= 3900:
                        self.is_levitating = True
                        
                    elif self.hall.hall_value[-1] < 3900 and self.hall.hall_value[-1] > 3200:
                        self.is_levitating = False

                    if time.time() - start > 10:
                        start = time.time()
                        print(f'Read hall:{self.is_levitating}')
                    time.sleep(0.1)

    def mindset_wander(self):
        print('start mindset wander')
        num = 0
        # 通过 mindset_stop 事件来支持外部中断
        while num < 3 :
            # 启动跳动
            self.ble.jump_sync(1)
            waited = 0.0
            while waited < 90.0 and not self.is_levitating:
                time.sleep(0.5)
                waited += 0.5
            self.ble.jump_sync(0)
            if self.ble.gyroscope[-1] == 2:
                time.sleep(5)
                if self.ble.gyroscope[-1] == 2:
                    num += 1
                    continue  # TODO 检查
                else :
                    break
            break

    def Stress_relief(self):
        print('start stress relief')
        num = self.fsm.data['br'][-1]
        self.ble.spike_shake_sync(1)
        time.sleep(0.5)
        while not self.is_levitating and num > 5 and not self.is_levitating:
            self.ble.freq_light_sync(num + 5)
            time.sleep(60 / (num + 5))
            num -= 1
        time.sleep(0.5)
        self.ble.spike_shake_sync(-1)
        time.sleep(0.5)

    def fatigue_breath_guide(self):
        print('start breath guide')
        # self.ble.color(255,255,0)
        time.sleep(1)
        self.ble.mode_sync(1)
        time.sleep(1)
        self.ble.spike_shake_sync(1)
        # self.ble.freq_light_sync(5)
        if self.music('breath.WAV'):
            print("breath guide finished")
        self.ble.mode_sync(3)
        time.sleep(0.5)
        self.ble.spike_shake_sync(-1)
        time.sleep(0.5)

    def stop_interaction(self,):
        self.ble.mode_sync(3)#关灯
        time.sleep(0.5)
        self.ble.spike_shake_sync(-1)#关震动
        time.sleep(0.5)
        self.ble.jump_sync(0)#关跳动
        time.sleep(0.5)

    def music(self, sound_file):
        """播放音频文件并等待播放完成"""
        pygame.mixer.music.load(sound_file)
        pygame.mixer.music.play()
        
        # 等待音频播放完成，同时检查is_here状态
        while pygame.mixer.music.get_busy():
            if not self.is_here:
                print("User left, stopping music")
                pygame.mixer.music.stop()
            elif self.is_levitating:
                print("dot put on the base, stopping music")
                pygame.mixer.music.stop()
            time.sleep(0.1)

    def wait_to_accumulate(self,):
        self.ble.mode_sync(1)
        time.sleep(60)
        self.ble.mode_sync(3)
        
    def main(self,):
        self.run()
        self.wait_to_accumulate()
        while 1:
            self.waiting_to_start()
            
            if self.is_here:
                start = time.time()
                while self.is_here:
                    self.ble.color_sync(0,0,255)
                    if not self.is_levitating:
                        # time.sleep(10)
                        # if self.fsm.ppg_device.heartrate == 0:
                        #     self.ble.mode_sync(2)
                        #     print('usr is not touch the ppg')
                        #     while not self.is_levitating:
                        #         if self.ble.gyroscope[-1] == 2:
                        #             self.mindset_wander()
                        #             self.stop_interaction()
                        #             break
                        #         elif self.ble.gyroscope[-1] == 1:
                        #             self.Stress_relief()
                        #             self.stop_interaction()
                        #             break
                        #         elif self.ble.gyroscope[-1] == 0:
                        #             time.sleep(1)
                        # else :
                        print('usr take the dot')#只保留疲劳模式
                        self.fatigue_breath_guide()
                        break
                    # elif (self.fsm.stress_assessment['details']['sdnn']['deviation'] > 10 or \
                    #             self.fsm.stress_assessment['details']['sdnn']['deviation'] < -10 or \
                    #             self.fsm.stress_assessment['details']['lf_hf_ratio']['deviation'] > 10 or \
                    #             self.fsm.stress_assessment['details']['lf_hf_ratio']['deviation'] < -10):
                    #         print('usr is tired')
                    #         self.le = False
                    #         self.is_levitating = False
                    #         self.fatigue_breath_guide()
                    #         self.le = True
                    #         break
                    elif time.time() - start > 2700:
                        print('usr works too much time')
                        self.le = False
                        self.is_levitating = False
                        self.fatigue_breath_guide()
                        self.le = True
                        break
                    time.sleep(1)


def main():
    Fatigue = dot(data_source = 'both')
    Fatigue.main()

if __name__ == "__main__":
    # os.system('sudo systemctl restart bluetooth')
    main()
