from fsm import FSM
from ble import BLE
from transitions import Machine, State
import pygame
import threading
import time
from hall import hall
from data_recorder import DataRecorder

class dot():
    def __init__(self, data_source='both'):
        self.ble = BLE(device_name="demo")
        self.fsm = FSM(data_source=data_source, enable_visualization=True, viz_port=5000, ble_instance=self.ble)
        self.recorder = DataRecorder(self.fsm)
        self.is_here = False
        self.le = True
        self.is_levitating = False
        self.last_interaction_ts = time.time()
        self.idle_mode_running = False
        self.hall = hall(port='/dev/ttyS7')
        
        pygame.mixer.init()

        states = [
            State(name='booting'),
            State(name='baseline', on_enter=['_enter_baseline']),
            State(name='waiting', on_enter=['_enter_waiting']),
            State(name='engaged', on_enter=['_enter_engaged'], on_exit=['stop_interaction']),
            State(name='guiding_fatigue', on_enter=['_enter_guiding_fatigue'], on_exit=['stop_interaction']),
            State(name='guiding_mode1', on_enter=['_enter_guiding_mode1'], on_exit=['stop_interaction']),
            State(name='guiding_mode2', on_enter=['_enter_guiding_mode2'], on_exit=['stop_interaction']),
            State(name='guiding_mode3', on_enter=['_enter_guiding_mode3'], on_exit=['stop_interaction']),
            State(name='desk_idle', on_enter=['_enter_desk_idle_mode'], on_exit=['stop_interaction']),
        ]
   
        transitions = [
            {'trigger': 'start', 'source': 'booting', 'dest': 'baseline'},
            {'trigger': 'baseline_done', 'source': 'baseline', 'dest': 'waiting'},
            {'trigger': 'person_detected', 'source': 'waiting', 'dest': 'engaged'},
            {'trigger': 'lost_person', 'source': ['engaged', 'guiding_fatigue', 'guiding_mode1', 'guiding_mode2', 'guiding_mode3'], 'dest': 'waiting'},
            {'trigger': 'need_fatigue', 'source': 'engaged', 'dest': 'guiding_fatigue'},
            {'trigger': 'need_mode1', 'source': ['engaged', 'desk_idle'], 'dest': 'guiding_mode1'},
            {'trigger': 'need_mode2', 'source': ['engaged', 'desk_idle'], 'dest': 'guiding_mode2'},
            {'trigger': 'need_mode3', 'source': ['engaged', 'desk_idle'], 'dest': 'guiding_mode3'},
            {'trigger': 'enter_idle', 'source': ['guiding_mode1', 'guiding_mode2', 'guiding_mode3', 'engaged'], 'dest': 'desk_idle'},
            {'trigger': 'idle_done', 'source': 'desk_idle', 'dest': 'waiting'},
            {'trigger': 'lost_person', 'source': ['desk_idle'], 'dest': 'waiting'},
            {'trigger': 'guide_finished', 'source': ['guiding_fatigue', 'guiding_mode1', 'guiding_mode2', 'guiding_mode3'], 'dest': 'waiting'},
        ]

        self.machine = Machine(
            model=self,
            states=states,
            transitions=transitions,
            initial='booting',
            auto_transitions=False,
            ignore_invalid_triggers=True,
            queued=True,
        )

    def waiting_to_start(self):
        start = time.time()
        while time.time() - start < 6:
            if len(self.fsm.radar.heart_rate) > 0:
                x = len(self.fsm.radar.heart_rate)
                time.sleep(2)
                if len(self.fsm.radar.heart_rate) <= x:
                    break
            print(f'past time:{time.time() - start}')
            time.sleep(2)
        if time.time() - start >= 6:
            self.is_here = True
            if self.ble.is_connected:
                print("BLE device connected successfully.")
                time.sleep(1)
                print("light set to blue")
        
    def start_services(self):
        self.fsm.run()
        threading.Thread(target=self.levitation, daemon=True).start()
        threading.Thread(target=self.monitor_here, daemon=True).start()
        print("started reading data")
           
    def monitor_here(self,):
        print('start monitor here')
        last_presence = None
        while 1:
            # Use radar heartbeat freshness instead of deque length (len stops growing at maxlen).
            last_hr_ts = getattr(self.fsm.radar, '_last_hr_time', 0)
            fresh = (time.time() - last_hr_ts) < 8  # consider present if new HR within 8s

            self.is_here = bool(fresh)
            if self.is_here:
                print('some one is here')
            else:
                print('nobody')

            if self.is_here != last_presence:
                last_presence = self.is_here
                if self.is_here and self.state == 'waiting':
                    self.person_detected()
                if (not self.is_here) and self.state in ['engaged', 'guiding_fatigue', 'guiding_mode1', 'guiding_mode2', 'guiding_mode3']:
                    self.lost_person()
            time.sleep(2)

    def _mark_interaction(self):
        self.last_interaction_ts = time.time()
    
    def levitation(self,):
        print('start levitation monitor')
        self.hall.connect()
        self.hall.start_continuous_reading()
        start = time.time()
        while 1:
            if self.le == True:
                if self.hall.hall_value:
                    # print(f'Read hall:{self.hall.hall_value[-1]}')
                    if self.hall.hall_value[-1]>= 1400 and self.hall.hall_value[-1] <= 1900:
                        self.is_levitating = True
                        self.hall.write_string('coil_flag=1')
                        time.sleep(0.7)
                        self.hall.write_string('platform_flag*2')
                    elif self.hall.hall_value[-1] >= 350 and self.hall.hall_value[-1] <= 450:
                        self.is_levitating = False
                        self.hall.write_string('platform_flag*0')
                    elif self.hall.hall_value[-1] >= 2500 and self.hall.hall_value[-1] <= 2600:
                        self.is_levitating = True
                    elif self.hall.hall_value[-1]>= 2800 and self.hall.hall_value[-1] <= 2900:
                        #预留待机模式
                        print("****")

                    if time.time() - start > 10:
                        start = time.time()
                        print(f'Read hall:{self.is_levitating}')
                    time.sleep(0.1)

    def mode1(self):
        print('mode1')
        # if self.is_levitating:
        #     self.guide_finished()
        #     return
        duration = 10
        start = time.time()
        self.ble.mode_sync(7)  # warm yellow flash
        time.sleep(0.5)
        self.ble.shake_sync(2)
        while not self.is_levitating and (time.time() - start) < duration and self.state == 'guiding_mode1':
            time.sleep(0.5)
        self.ble.shake_sync(0)
        self._mark_interaction()
        if not self.is_levitating:
            self.enter_idle()
        else:
            self.guide_finished()

    def mode2(self):
        print('mode2')
        duration = 8.0
        start = time.time()
        self.ble.mode_sync(2)  # blue-purple slow flow
        time.sleep(0.5)
        self.ble.shake_sync(1)
        while not self.is_levitating and (time.time() - start) < duration and self.state == 'guiding_mode2':
            time.sleep(0.5)
        self.ble.shake_sync(0)
        self._mark_interaction()
        if not self.is_levitating:
            self.enter_idle()
        else:
            self.guide_finished()

    def fatigue_breath_guide(self):
        print('start breath guide')
        # self.ble.color(255,255,0)
        time.sleep(1)
        self.ble.mode_sync(1)
        time.sleep(1)
        self.ble.shake_sync(4)
        # self.ble.freq_light_sync(5)
        self.music('breath3.WAV', max_duration=180, loops=5)
        print("breath guide finished")
        self.ble.mode_sync(3)
        time.sleep(0.5)
        self.ble.shake_sync(0)
        time.sleep(0.5)
        self.guide_finished()

    def stop_interaction(self,):
        time.sleep(0.5)
        self.ble.mode_sync(3)#关灯
        time.sleep(0.5)
        self.ble.shake_sync(0)#关震动
        time.sleep(0.5)
        self.ble.jump_sync(0)#关跳动
        time.sleep(0.5)

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
            self.ble.message_sync('E=1')
            time.sleep(0.1)

    def wait_to_accumulate(self,):
        self.ble.mode_sync(6)
        self.le = False
        self.is_levitating = False
        self.music('start.WAV', max_duration=10)
        self.le = True
        self.ble.mode_sync(3)

    def _enter_baseline(self, event=None):
        time.sleep(3)
        self.hall.write_string('platform_flag*0')
        self.wait_to_accumulate()
        self.hall.write_string('coil_flag=1')
        time.sleep(0.7)
        self.hall.write_string('platform_flag*2')
        self.ble.color_sync(100, 100, 100)
        self.baseline_done()

    def _enter_waiting(self, event=None):
        threading.Thread(target=self._waiting_loop, daemon=True).start()

    def _waiting_loop(self):
        self.waiting_to_start()
        if self.is_here:
            self.person_detected()

    def _enter_engaged(self, event=None):
        threading.Thread(target=self._engaged_loop, daemon=True).start()

    def _engaged_loop(self):
        print('usr engaged')
        start = time.time()
        self._mark_interaction()
        while self.state == 'engaged':
            self.ble.color_sync(78, 58, 158)
            if not self.is_levitating:
                print('start mode monitoring')
                time.sleep(20)
                if self.fsm.ppg_device.heartrate != 0:
                    self.need_fatigue()
                    return
                self._mark_interaction()
                self.ble.mode_sync(2)
                while not self.is_levitating:
                    print('start inspiration monitoring')
                    if self.ble.gyroscope[-1] == 1 and self.ble.gyroscope[-2] == 1:
                        self.need_mode1()
                        return
                    elif self.ble.gyroscope[-1] == 2 and self.ble.gyroscope[-2] == 2:
                        self.need_mode2()
                        return
                    elif self.ble.gyroscope[-1] == 3 and self.ble.gyroscope[-2] == 3:
                        self.need_mode3()
                        return
                    elif self.ble.gyroscope[-1] == 0 or self.ble.gyroscope[-2] == 0:
                        idle_elapsed = time.time() - self.last_interaction_ts
                        print(f'idle elapsed: {idle_elapsed}s')
                        if idle_elapsed > 10 and not self.idle_mode_running:
                            self.enter_idle()
                            return
                        if idle_elapsed <= 10:
                            time.sleep(1)
                            continue  
                    else :
                        time.sleep(0.5)   
            # if time.time() - start > 2700:
            #     print('usr works too much time')
            #     self.le = False
            #     self.is_levitating = False
            #     self.need_fatigue()
            #     return
            if not self.is_here:
                self.lost_person()
                return
            time.sleep(1)

    def _desk_idle_mode(self):
        print('enter desk idle mode')
        if self.idle_mode_running:
            return
        if self.state != 'desk_idle':
            return
        self.idle_mode_running = True
        self.ble.color_sync(200, 220, 255)  # soft white steady
        idle_start = time.time()
        while self.state == 'desk_idle' and (time.time() - idle_start) < 300 and not self.is_levitating and self.is_here:
            # gentle pulse every 30s
            self.ble.shake_sync(3)
            time.sleep(0.5)
            self.ble.shake_sync(0)
            for _ in range(30):
                if self.ble.gyroscope:
                    gyro_val1 = self.ble.gyroscope[-1]
                    gyro_val2 = self.ble.gyroscope[-2]
                    if gyro_val1 != 0 and gyro_val2 != 0:
                        self._mark_interaction()
                        self.idle_mode_running = False
                        if gyro_val1 == 1 and gyro_val2 == 1:
                            self.need_mode1()
                        elif gyro_val1 == 2 and gyro_val2 == 2:
                            self.need_mode2()
                        elif gyro_val1 == 3 and gyro_val2 == 3:
                            self.need_mode3()
                        else:
                            if self.state == 'desk_idle':
                                self.idle_done()
                        return
                if self.is_levitating or self.state != 'desk_idle' or not self.is_here:
                    self.idle_mode_running = False
                    if self.state == 'desk_idle':
                        self.idle_done()
                    return
                time.sleep(1)
        # after 5 minutes of stillness, fully stop outputs
        self.stop_interaction()
        self.idle_mode_running = False
        self._mark_interaction()
        if self.state == 'desk_idle':
            self.idle_done()

    def _enter_desk_idle_mode(self, event=None):
        threading.Thread(target=self._desk_idle_mode, daemon=True).start()

    def mode3(self):
        print('mode3: intense shake response')
        duration = 12.0
        start = time.time()
        self.ble.mode_sync(4)  # orange fast flow
        time.sleep(0.5) 
        self.ble.shake_sync(3)
        while not self.is_levitating and (time.time() - start) < duration and self.state == 'guiding_mode3':
            time.sleep(0.25)
        self.ble.shake_sync(0)
        self._mark_interaction()
        if not self.is_levitating:
            self.enter_idle()
        else:
            self.guide_finished()

    def _enter_guiding_fatigue(self, event=None):
        threading.Thread(target=self.fatigue_breath_guide, daemon=True).start()

    def _enter_guiding_mode1(self, event=None):
        print('usr take the dot (mode1 )')
        threading.Thread(target=self.mode1, daemon=True).start()

    def _enter_guiding_mode2(self, event=None):
        threading.Thread(target=self.mode2, daemon=True).start()

    def _enter_guiding_mode3(self, event=None):
        threading.Thread(target=self.mode3, daemon=True).start()
        
    def main(self,):
        self.start_services()
        self.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_interaction()
            self.fsm.stop()


def main():
    Fatigue = dot(data_source = 'both')
    Fatigue.main()

if __name__ == "__main__":
    # os.system('sudo systemctl restart bluetooth')
    main()
