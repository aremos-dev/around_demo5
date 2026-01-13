import pygame
import time

pygame.mixer.init()

def music(sound_file, max_duration=None, loops=0):
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
            if max_duration and (time.time() - start_time >= max_duration):
                print(f"Reached max duration {max_duration}s, stopping music")
                pygame.mixer.music.stop()
                break
            time.sleep(0.1)


music(sound_file = 'breath2.WAV', max_duration=5, loops=1)